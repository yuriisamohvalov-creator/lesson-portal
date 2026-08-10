package ru.samoh.lessonsportal.presentation.admin

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import ru.samoh.lessonsportal.domain.model.*
import ru.samoh.lessonsportal.domain.usecase.*

data class AdminUiState(val loading: Boolean = true, val users: List<User> = emptyList(), val categories: List<Category> = emptyList(), val error: String? = null, val message: String? = null)

@HiltViewModel class AdminViewModel @Inject constructor(
    private val getUsers: GetUsersUseCase,
    private val changeRoleUseCase: ChangeUserRoleUseCase,
    private val setBlocked: SetUserBlockedUseCase,
    private val getCategories: GetCategoriesUseCase,
    private val createCategoryUseCase: CreateCategoryUseCase,
    private val updateCategoryUseCase: UpdateCategoryUseCase,
) : ViewModel() {
    private val _state = MutableStateFlow(AdminUiState())
    val state = _state.asStateFlow()
    init { refresh() }
    fun refresh() = viewModelScope.launch {
        _state.update { it.copy(loading = true, error = null) }
        val users = async { getUsers() }; val categories = async { getCategories(true) }
        val userResult = users.await(); val categoryResult = categories.await()
        if (userResult.isSuccess && categoryResult.isSuccess) _state.value = AdminUiState(false, userResult.getOrThrow(), categoryResult.getOrThrow())
        else _state.update { it.copy(loading = false, error = userResult.exceptionOrNull()?.message ?: categoryResult.exceptionOrNull()?.message) }
    }
    fun changeRole(id: String, role: UserRole) = mutateUser { changeRoleUseCase(id, role) }
    fun setBlocked(id: String, blocked: Boolean) = mutateUser { setBlocked.invoke(id, blocked) }
    private fun mutateUser(request: suspend () -> Result<User>) = viewModelScope.launch {
        request().onSuccess { user -> _state.update { it.copy(users = it.users.map { current -> if (current.id == user.id) user else current }, message = "Пользователь обновлён", error = null) } }
            .onFailure { error -> _state.update { it.copy(error = error.message) } }
    }
    fun saveCategory(id: String?, name: String) = viewModelScope.launch {
        val normalized = name.trim(); if (normalized.isEmpty()) { _state.update { it.copy(error = "Название обязательно") }; return@launch }
        val slug = transliterate(normalized)
        val result = if (id == null) createCategoryUseCase(normalized, slug) else updateCategoryUseCase(id, normalized, slug)
        result.onSuccess { category -> _state.update { state -> state.copy(categories = if (id == null) (state.categories + category).sortedBy { it.name } else state.categories.map { if (it.id == id) category else it }, message = "Категория сохранена", error = null) } }
            .onFailure { error -> _state.update { it.copy(error = error.message) } }
    }
    fun consumeMessage() { _state.update { it.copy(message = null) } }
}

internal fun transliterate(value: String): String {
    val from = "абвгдеёжзийклмнопрстуфхцчшщъыьэюя"
    val to = listOf("a","b","v","g","d","e","e","zh","z","i","y","k","l","m","n","o","p","r","s","t","u","f","h","ts","ch","sh","sch","","y","","e","yu","ya")
    return value.lowercase().map { char -> from.indexOf(char).takeIf { it >= 0 }?.let { to[it] } ?: char.toString() }.joinToString("").replace(Regex("[^a-z0-9]+"), "-").trim('-')
}
