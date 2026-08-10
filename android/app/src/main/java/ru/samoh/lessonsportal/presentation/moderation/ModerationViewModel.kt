package ru.samoh.lessonsportal.presentation.moderation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import ru.samoh.lessonsportal.domain.model.Article
import ru.samoh.lessonsportal.domain.usecase.*

data class ModerationUiState(val loading: Boolean = true, val articles: List<Article> = emptyList(), val actingId: String? = null, val error: String? = null, val message: String? = null)

@HiltViewModel class ModerationViewModel @Inject constructor(
    private val getPending: GetPendingArticlesUseCase,
    private val approveArticle: ApproveArticleUseCase,
    private val rejectArticle: RejectArticleUseCase,
) : ViewModel() {
    private val _state = MutableStateFlow(ModerationUiState())
    val state = _state.asStateFlow()
    init { refresh() }
    fun refresh() = viewModelScope.launch {
        _state.update { it.copy(loading = true, error = null) }
        getPending().onSuccess { _state.value = ModerationUiState(false, it) }.onFailure { _state.value = ModerationUiState(false, error = it.message) }
    }
    fun approve(id: String) = act(id, "Статья опубликована") { approveArticle(id) }
    fun reject(id: String, reason: String) {
        if (reason.length < 5) { _state.update { it.copy(error = "Причина должна содержать не менее 5 символов") }; return }
        act(id, "Статья отклонена") { rejectArticle(id, reason) }
    }
    private fun act(id: String, message: String, request: suspend () -> Result<Article>) = viewModelScope.launch {
        _state.update { it.copy(actingId = id, error = null) }
        request().onSuccess { _state.update { state -> state.copy(articles = state.articles.filterNot { it.id == id }, actingId = null, message = message) } }
            .onFailure { error -> _state.update { it.copy(actingId = null, error = error.message) } }
    }
    fun consumeMessage() { _state.update { it.copy(message = null) } }
}
