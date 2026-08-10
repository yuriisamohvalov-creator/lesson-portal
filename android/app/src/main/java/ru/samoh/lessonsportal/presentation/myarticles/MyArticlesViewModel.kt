package ru.samoh.lessonsportal.presentation.myarticles

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import ru.samoh.lessonsportal.domain.model.Article
import ru.samoh.lessonsportal.domain.model.ArticleStatus
import ru.samoh.lessonsportal.domain.model.DraftArticle
import ru.samoh.lessonsportal.domain.usecase.GetMyArticlesUseCase
import ru.samoh.lessonsportal.domain.usecase.ObserveDraftsUseCase
import ru.samoh.lessonsportal.domain.usecase.DeleteArticleUseCase
import ru.samoh.lessonsportal.domain.usecase.DeleteDraftUseCase

data class MyArticlesUiState(
    val loading: Boolean = true,
    val selectedStatus: ArticleStatus = ArticleStatus.DRAFT,
    val articles: List<Article> = emptyList(),
    val drafts: List<DraftArticle> = emptyList(),
    val error: String? = null,
)

@HiltViewModel
class MyArticlesViewModel @Inject constructor(
    private val getMyArticles: GetMyArticlesUseCase,
    observeDrafts: ObserveDraftsUseCase,
    private val deleteArticle: DeleteArticleUseCase,
    private val deleteDraft: DeleteDraftUseCase,
) : ViewModel() {
    private val _state = MutableStateFlow(MyArticlesUiState())
    val state = _state.asStateFlow()
    init {
        viewModelScope.launch { observeDrafts().collect { drafts -> _state.update { it.copy(drafts = drafts) } } }
        refresh()
    }
    fun select(status: ArticleStatus) = _state.update { it.copy(selectedStatus = status) }
    fun refresh() = viewModelScope.launch {
        _state.update { it.copy(loading = true, error = null) }
        getMyArticles().onSuccess { articles -> _state.update { it.copy(articles = articles, loading = false) } }
            .onFailure { error -> _state.update { it.copy(loading = false, error = error.message) } }
    }
    fun deleteArticle(id: String) = viewModelScope.launch {
        deleteArticle.invoke(id).onSuccess { refresh() }.onFailure { error -> _state.update { it.copy(error = error.message) } }
    }
    fun deleteDraft(id: String) = viewModelScope.launch { deleteDraft.invoke(id) }
}
