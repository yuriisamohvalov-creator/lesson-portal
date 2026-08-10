package ru.samoh.lessonsportal.presentation.editor

import android.net.Uri
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import java.util.UUID
import javax.inject.Inject
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import ru.samoh.lessonsportal.domain.model.Category
import ru.samoh.lessonsportal.domain.model.DraftArticle
import ru.samoh.lessonsportal.domain.usecase.*

data class EditorUiState(
    val draftId: String = UUID.randomUUID().toString(),
    val articleId: String? = null,
    val title: String = "",
    val content: String = "",
    val categoryId: String? = null,
    val categories: List<Category> = emptyList(),
    val loading: Boolean = true,
    val saving: Boolean = false,
    val uploading: Boolean = false,
    val submitted: Boolean = false,
    val deleted: Boolean = false,
    val error: String? = null,
)

@OptIn(FlowPreview::class)
@HiltViewModel
class ArticleEditorViewModel @Inject constructor(
    private val getCategories: GetCategoriesUseCase,
    private val getArticle: GetArticleDetailUseCase,
    private val getDraft: GetDraftUseCase,
    private val saveDraft: SaveDraftUseCase,
    private val deleteDraft: DeleteDraftUseCase,
    private val createArticle: CreateArticleUseCase,
    private val updateArticle: UpdateArticleUseCase,
    private val deleteArticle: DeleteArticleUseCase,
    private val submitArticle: SubmitArticleUseCase,
    private val uploadImage: UploadImageUseCase,
    private val importPdf: ImportPdfUseCase,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {
    private val requestedArticleId = savedStateHandle.get<String>("articleId")?.takeUnless { it == "new" }
    private val requestedDraftId = savedStateHandle.get<String>("draftId")?.takeUnless { it == "none" }
    private val _state = MutableStateFlow(EditorUiState(articleId = requestedArticleId, draftId = requestedDraftId ?: UUID.randomUUID().toString()))
    val state = _state.asStateFlow()

    init {
        load()
        viewModelScope.launch {
            state.drop(1).debounce(1_000).filter { !it.loading && (it.title.isNotBlank() || it.content.isNotBlank()) }.collect { persistDraft(it) }
        }
    }

    private fun load() = viewModelScope.launch {
        val categories = getCategories().getOrDefault(emptyList())
        val draft = getDraft(requestedDraftId, requestedArticleId)
        if (draft != null) {
            _state.value = _state.value.copy(draftId = draft.id, articleId = draft.articleId, title = draft.title, content = draft.content, categoryId = draft.categoryId, categories = categories, loading = false)
        } else if (requestedArticleId != null) {
            getArticle(requestedArticleId).onSuccess { article ->
                _state.value = _state.value.copy(title = article.title, content = article.content.orEmpty(), categoryId = article.category.id, categories = categories, loading = false)
            }.onFailure { error -> _state.update { current -> current.copy(categories = categories, loading = false, error = error.message ?: "Не удалось загрузить статью") } }
        } else _state.update { it.copy(categories = categories, loading = false) }
    }

    fun setTitle(value: String) = _state.update { it.copy(title = value) }
    fun setContent(value: String) = _state.update { it.copy(content = value) }
    fun setCategory(value: String) = _state.update { it.copy(categoryId = value) }
    fun appendMarkdown(value: String) = _state.update { it.copy(content = it.content + value) }
    fun saveLocally() = viewModelScope.launch { persistDraft(_state.value) }

    private suspend fun persistDraft(value: EditorUiState) {
        saveDraft(DraftArticle(value.draftId, value.articleId, value.title, value.content, value.categoryId, System.currentTimeMillis(), false, null))
    }

    fun saveToServer(submit: Boolean) = viewModelScope.launch {
        val value = _state.value
        val categoryId = value.categoryId
        if (value.title.isBlank() || categoryId == null) { _state.update { it.copy(error = "Укажите заголовок и категорию") }; return@launch }
        _state.update { it.copy(saving = true, error = null) }
        val saved = if (value.articleId == null) createArticle(value.title, markdownToHtml(value.content), categoryId)
        else updateArticle(value.articleId, value.title, markdownToHtml(value.content), categoryId)
        saved.onSuccess { article ->
            _state.update { it.copy(articleId = article.id) }
            if (submit) submitArticle(article.id).onSuccess { deleteDraft(value.draftId); _state.update { it.copy(saving = false, submitted = true) } }
                .onFailure { error -> _state.update { it.copy(saving = false, error = error.message) } }
            else { deleteDraft(value.draftId); _state.update { it.copy(saving = false, articleId = article.id) } }
        }.onFailure { error -> _state.update { it.copy(saving = false, error = error.message) } }
    }

    fun delete() = viewModelScope.launch {
        val articleId = _state.value.articleId
        val result = if (articleId == null) Result.success(Unit) else deleteArticle(articleId)
        result.onSuccess { deleteDraft(_state.value.draftId); _state.update { it.copy(deleted = true) } }
            .onFailure { error -> _state.update { it.copy(error = error.message) } }
    }

    fun uploadImage(uri: Uri) = viewModelScope.launch {
        _state.update { it.copy(uploading = true, error = null) }
        uploadImage.invoke(uri).onSuccess { url -> appendMarkdown("\n![Изображение]($url)\n"); _state.update { it.copy(uploading = false) } }
            .onFailure { error -> _state.update { it.copy(uploading = false, error = error.message) } }
    }

    fun importPdf(uri: Uri) = viewModelScope.launch {
        _state.update { it.copy(uploading = true, error = null) }
        importPdf.invoke(uri).onSuccess { result ->
            _state.update { it.copy(title = if (it.title.isBlank()) result.suggestedTitle.orEmpty() else it.title, content = it.content + "\n" + result.html, uploading = false) }
        }.onFailure { error -> _state.update { it.copy(uploading = false, error = error.message) } }
    }
}
