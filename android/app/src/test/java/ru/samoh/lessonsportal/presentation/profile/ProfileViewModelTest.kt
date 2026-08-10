package ru.samoh.lessonsportal.presentation.profile

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import ru.samoh.lessonsportal.domain.model.*
import ru.samoh.lessonsportal.domain.repository.AuthRepository
import ru.samoh.lessonsportal.domain.repository.UserRepository
import ru.samoh.lessonsportal.domain.usecase.*
import ru.samoh.lessonsportal.testing.MainDispatcherRule

@OptIn(ExperimentalCoroutinesApi::class)
class ProfileViewModelTest {
    @get:Rule val dispatcherRule = MainDispatcherRule()

    @Test
    fun loadsAndUpdatesProfile() = runTest {
        val users = FakeUserRepository()
        val viewModel = ProfileViewModel(GetCurrentUserUseCase(users), UpdateProfileUseCase(users), LogoutUseCase(FakeAuthRepository()))
        runCurrent()
        assertEquals("Старое имя", viewModel.state.value.user?.displayName)

        viewModel.update("Новое имя")
        runCurrent()
        assertEquals("Новое имя", viewModel.state.value.user?.displayName)
        assertTrue(viewModel.state.value.updated)
    }

    @Test
    fun rejectsBlankNameWithoutCallingRepository() = runTest {
        val users = FakeUserRepository()
        val viewModel = ProfileViewModel(GetCurrentUserUseCase(users), UpdateProfileUseCase(users), LogoutUseCase(FakeAuthRepository()))
        runCurrent()
        viewModel.update(" ")
        runCurrent()
        assertEquals(0, users.updateCalls)
        assertNotNull(viewModel.state.value.error)
    }

    @Test
    fun logoutClearsAuthentication() = runTest {
        val auth = FakeAuthRepository()
        val viewModel = ProfileViewModel(GetCurrentUserUseCase(FakeUserRepository()), UpdateProfileUseCase(FakeUserRepository()), LogoutUseCase(auth))
        runCurrent()
        viewModel.logout()
        runCurrent()
        assertTrue(auth.loggedOut)
        assertTrue(viewModel.state.value.loggedOut)
    }

    private class FakeUserRepository : UserRepository {
        var updateCalls = 0
        private var user = User("user-id", "user@example.com", "Старое имя", UserRole.USER)
        override suspend fun getCurrentUser() = Result.success(user)
        override suspend fun updateProfile(displayName: String): Result<User> {
            updateCalls++
            user = user.copy(displayName = displayName)
            return Result.success(user)
        }
    }

    private class FakeAuthRepository : AuthRepository {
        var loggedOut = false
        private val authenticated = MutableStateFlow(true)
        override suspend fun login(email: String, password: String) = error("unused")
        override suspend fun register(email: String, password: String, displayName: String) = error("unused")
        override suspend fun logout() { loggedOut = true; authenticated.value = false }
        override fun observeAuthentication(): Flow<Boolean> = authenticated
    }
}
