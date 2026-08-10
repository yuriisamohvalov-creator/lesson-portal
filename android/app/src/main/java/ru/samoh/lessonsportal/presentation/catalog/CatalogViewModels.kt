package ru.samoh.lessonsportal.presentation.catalog

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.paging.PagingData
import androidx.paging.cachedIn
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.async
import ru.samoh.lessonsportal.domain.model.*
import ru.samoh.lessonsportal.domain.usecase.*

data class CategoriesUiState(val loading: Boolean = true, val categories: List<Category> = emptyList(), val error: String? = null)

@HiltViewModel
class CategoriesViewModel @Inject constructor(private val getCategories: GetCategoriesUseCase) : ViewModel() {
    private val _state = MutableStateFlow(CategoriesUiState())
    val state = _state.asStateFlow()
    init { refresh(false) }
    fun refresh(force: Boolean = true) = viewModelScope.launch {
        _state.update { it.copy(loading = true, error = null) }
        getCategories(force).onSuccess { categories -> _state.value = CategoriesUiState(categories = categories, loading = false) }
            .onFailure { error -> _state.value = CategoriesUiState(loading = false, error = error.message) }
    }
}

@OptIn(ExperimentalCoroutinesApi::class, FlowPreview::class)
@HiltViewModel
class ArticlesViewModel @Inject constructor(
    getArticles: GetArticlesUseCase,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {
    val categoryId: String? = savedStateHandle.get<String>("categoryId")?.takeUnless { it == "all" }
    private val query = MutableStateFlow("")
    val searchQuery = query.asStateFlow()
    val articles: Flow<PagingData<ArticleListItem>> = query
        .debounce(300)
        .distinctUntilChanged()
        .flatMapLatest { getArticles(categoryId, it) }
        .cachedIn(viewModelScope)
    fun setSearch(value: String) { query.value = value }
}

data class ArticleDetailUiState(
    val loading: Boolean = true,
    val article: Article? = null,
    val comments: List<Comment> = emptyList(),
    val refreshingComments: Boolean = false,
    val submittingComment: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class ArticleDetailViewModel @Inject constructor(
    private val getArticle: GetArticleDetailUseCase,
    private val getComments: GetArticleCommentsUseCase,
    private val addCommentUseCase: AddCommentUseCase,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {
    private val articleId: String = checkNotNull(savedStateHandle["articleId"])
    private val _state = MutableStateFlow(ArticleDetailUiState())
    val state = _state.asStateFlow()
    init { load() }

    fun load() = viewModelScope.launch {
        _state.update { it.copy(loading = true, error = null) }
        val articleRequest = async { getArticle(articleId) }
        val commentsRequest = async { getComments(articleId) }
        val article = articleRequest.await()
        val comments = commentsRequest.await()
        article.onSuccess { item ->
            _state.value = ArticleDetailUiState(
                loading = false, article = item,
                comments = comments.getOrDefault(emptyList()),
                error = comments.exceptionOrNull()?.message,
            )
        }.onFailure { _state.value = ArticleDetailUiState(loading = false, error = it.message) }
    }

    fun addComment(body: String) {
        if (body.isBlank()) return
        viewModelScope.launch {
            _state.update { it.copy(submittingComment = true, error = null) }
            addCommentUseCase(articleId, body).onSuccess { comment ->
                _state.update { it.copy(comments = it.comments + comment, submittingComment = false) }
            }.onFailure { error -> _state.update { it.copy(submittingComment = false, error = error.message) } }
        }
    }

    fun refreshComments() = viewModelScope.launch {
        _state.update { it.copy(refreshingComments = true, error = null) }
        getComments(articleId).onSuccess { comments ->
            _state.update { it.copy(comments = comments, refreshingComments = false) }
        }.onFailure { error ->
            _state.update { it.copy(refreshingComments = false, error = error.message) }
        }
    }
}
