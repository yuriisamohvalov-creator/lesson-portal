package ru.samoh.lessonsportal.presentation.auth

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import ru.samoh.lessonsportal.domain.model.User
import ru.samoh.lessonsportal.domain.model.UserRole
import ru.samoh.lessonsportal.domain.repository.AuthRepository
import ru.samoh.lessonsportal.domain.repository.UserRepository
import ru.samoh.lessonsportal.domain.usecase.GetCurrentUserUseCase
import ru.samoh.lessonsportal.domain.usecase.LoginUseCase
import ru.samoh.lessonsportal.domain.usecase.LogoutUseCase
import ru.samoh.lessonsportal.domain.usecase.ObserveAuthenticationUseCase
import ru.samoh.lessonsportal.domain.usecase.RegisterUseCase
import ru.samoh.lessonsportal.testing.MainDispatcherRule

@OptIn(ExperimentalCoroutinesApi::class)
class AuthViewModelTest {
    @get:Rule val mainDispatcherRule = MainDispatcherRule()

    private lateinit var authRepository: FakeAuthRepository
    private lateinit var userRepository: FakeUserRepository
    private lateinit var viewModel: AuthViewModel

    @Before
    fun setUp() {
        authRepository = FakeAuthRepository()
        userRepository = FakeUserRepository()
        viewModel = AuthViewModel(
            LoginUseCase(authRepository),
            RegisterUseCase(authRepository),
            LogoutUseCase(authRepository),
            GetCurrentUserUseCase(userRepository),
            ObserveAuthenticationUseCase(authRepository),
        )
    }

    @Test
    fun successfulLoginMovesFromLoadingToAuthenticated() = runTest {
        authRepository.delayMillis = 1_000
        viewModel.login("user@example.com", "password123")
        runCurrent()
        assertEquals(AuthUiState.Loading, viewModel.state.value)

        advanceUntilIdle()

        assertEquals(AuthUiState.Authenticated(TEST_USER), viewModel.state.value)
        assertEquals("user@example.com", authRepository.lastLoginEmail)
    }

    @Test
    fun failedLoginShowsRepositoryError() = runTest {
        authRepository.loginResult = Result.failure(IllegalStateException("Неверные данные"))

        viewModel.login("user@example.com", "password123")
        runCurrent()

        assertEquals(AuthUiState.Error("Неверные данные"), viewModel.state.value)
    }

    @Test
    fun invalidCredentialsAreRejectedWithoutRepositoryCall() {
        viewModel.login("bad-email", "short")

        assertTrue(viewModel.state.value is AuthUiState.Error)
        assertEquals(null, authRepository.lastLoginEmail)
    }

    @Test
    fun successfulRegistrationAuthenticatesUser() = runTest {
        viewModel.register("new@example.com", "password123", "Новый пользователь")
        runCurrent()

        assertEquals(AuthUiState.Authenticated(TEST_USER), viewModel.state.value)
        assertEquals("Новый пользователь", authRepository.lastDisplayName)
    }

    @Test
    fun loadCurrentUserReturnsProfile() = runTest {
        userRepository.delayMillis = 1_000
        viewModel.loadCurrentUser()
        runCurrent()
        assertEquals(AuthUiState.Loading, viewModel.state.value)

        advanceUntilIdle()

        assertEquals(AuthUiState.Authenticated(TEST_USER), viewModel.state.value)
        assertEquals(1, userRepository.profileRequests)
    }

    @Test
    fun logoutClearsAuthenticationState() = runTest {
        authRepository.authenticated.value = true

        viewModel.logout()
        runCurrent()

        assertEquals(AuthUiState.Idle, viewModel.state.value)
        assertTrue(authRepository.logoutCalled)
        assertEquals(false, authRepository.authenticated.value)
    }

    private class FakeAuthRepository : AuthRepository {
        val authenticated = MutableStateFlow(false)
        var loginResult: Result<User> = Result.success(TEST_USER)
        var registerResult: Result<User> = Result.success(TEST_USER)
        var lastLoginEmail: String? = null
        var lastDisplayName: String? = null
        var logoutCalled = false
        var delayMillis = 0L

        override suspend fun login(email: String, password: String): Result<User> {
            lastLoginEmail = email
            delay(delayMillis)
            if (loginResult.isSuccess) authenticated.value = true
            return loginResult
        }

        override suspend fun register(email: String, password: String, displayName: String): Result<User> {
            lastDisplayName = displayName
            if (registerResult.isSuccess) authenticated.value = true
            return registerResult
        }

        override suspend fun logout() {
            logoutCalled = true
            authenticated.value = false
        }

        override fun observeAuthentication(): Flow<Boolean> = authenticated
    }

    private class FakeUserRepository : UserRepository {
        var profileResult: Result<User> = Result.success(TEST_USER)
        var profileRequests = 0
        var delayMillis = 0L

        override suspend fun getCurrentUser(): Result<User> {
            profileRequests++
            delay(delayMillis)
            return profileResult
        }

        override suspend fun updateProfile(displayName: String): Result<User> =
            profileResult.map { it.copy(displayName = displayName) }
    }

    private companion object {
        val TEST_USER = User("user-id", "user@example.com", "Пользователь", UserRole.USER)
    }
}
