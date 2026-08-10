package ru.samoh.lessonsportal.presentation.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import ru.samoh.lessonsportal.domain.model.User
import ru.samoh.lessonsportal.domain.usecase.GetCurrentUserUseCase
import ru.samoh.lessonsportal.domain.usecase.LogoutUseCase
import ru.samoh.lessonsportal.domain.usecase.UpdateProfileUseCase

data class ProfileUiState(val loading: Boolean = true, val user: User? = null, val saving: Boolean = false, val updated: Boolean = false, val loggedOut: Boolean = false, val error: String? = null)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val getProfile: GetCurrentUserUseCase,
    private val updateProfile: UpdateProfileUseCase,
    private val logout: LogoutUseCase,
) : ViewModel() {
    private val _state = MutableStateFlow(ProfileUiState())
    val state = _state.asStateFlow()
    init { load() }
    fun load() = viewModelScope.launch {
        _state.update { it.copy(loading = true, error = null) }
        getProfile().onSuccess { _state.value = ProfileUiState(false, it) }
            .onFailure { _state.value = ProfileUiState(false, error = it.message) }
    }
    fun update(displayName: String) = viewModelScope.launch {
        if (displayName.isBlank() || displayName.length > 100) { _state.update { it.copy(error = "Имя должно содержать от 1 до 100 символов") }; return@launch }
        _state.update { it.copy(saving = true, error = null) }
        updateProfile(displayName).onSuccess { user -> _state.update { it.copy(user = user, saving = false, updated = true) } }
            .onFailure { error -> _state.update { it.copy(saving = false, error = error.message) } }
    }
    fun logout() = viewModelScope.launch { logout.invoke(); _state.update { it.copy(loggedOut = true) } }
}
