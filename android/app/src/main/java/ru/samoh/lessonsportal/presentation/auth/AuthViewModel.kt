package ru.samoh.lessonsportal.presentation.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import ru.samoh.lessonsportal.domain.model.User
import ru.samoh.lessonsportal.domain.usecase.GetCurrentUserUseCase
import ru.samoh.lessonsportal.domain.usecase.LoginUseCase
import ru.samoh.lessonsportal.domain.usecase.LogoutUseCase
import ru.samoh.lessonsportal.domain.usecase.ObserveAuthenticationUseCase
import ru.samoh.lessonsportal.domain.usecase.RegisterUseCase

sealed interface AuthUiState {
    data object Idle : AuthUiState
    data object Loading : AuthUiState
    data class Authenticated(val user: User) : AuthUiState
    data class Error(val message: String) : AuthUiState
}

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val loginUseCase: LoginUseCase,
    private val registerUseCase: RegisterUseCase,
    private val logoutUseCase: LogoutUseCase,
    private val getCurrentUser: GetCurrentUserUseCase,
    observeAuthentication: ObserveAuthenticationUseCase,
) : ViewModel() {
    private val _state = MutableStateFlow<AuthUiState>(AuthUiState.Idle)
    val state: StateFlow<AuthUiState> = _state.asStateFlow()
    val isAuthenticated = observeAuthentication()

    fun login(email: String, password: String) {
        if (!isValidEmail(email) || !isValidPassword(password)) {
            _state.value = AuthUiState.Error("Проверьте email и пароль")
            return
        }
        viewModelScope.launch {
            _state.value = AuthUiState.Loading
            loginUseCase(email, password)
                .onSuccess { _state.value = AuthUiState.Authenticated(it) }
                .onFailure { _state.value = AuthUiState.Error(it.message ?: "Ошибка входа") }
        }
    }

    fun register(email: String, password: String, displayName: String) {
        if (!isValidEmail(email) || !isValidPassword(password) || displayName.isBlank()) {
            _state.value = AuthUiState.Error("Проверьте введённые данные")
            return
        }
        viewModelScope.launch {
            _state.value = AuthUiState.Loading
            registerUseCase(email, password, displayName)
                .onSuccess { _state.value = AuthUiState.Authenticated(it) }
                .onFailure { _state.value = AuthUiState.Error(it.message ?: "Ошибка регистрации") }
        }
    }

    fun logout() = viewModelScope.launch {
        logoutUseCase()
        _state.value = AuthUiState.Idle
    }

    fun loadCurrentUser() = viewModelScope.launch {
        _state.value = AuthUiState.Loading
        getCurrentUser()
            .onSuccess { _state.value = AuthUiState.Authenticated(it) }
            .onFailure { _state.value = AuthUiState.Error(it.message ?: "Не удалось загрузить профиль") }
    }
}
