package ru.samoh.lessonsportal.domain.usecase

import javax.inject.Inject
import kotlinx.coroutines.flow.Flow
import ru.samoh.lessonsportal.domain.model.User
import ru.samoh.lessonsportal.domain.repository.AuthRepository
import ru.samoh.lessonsportal.domain.repository.UserRepository

class LoginUseCase @Inject constructor(private val repository: AuthRepository) {
    suspend operator fun invoke(email: String, password: String): Result<User> = repository.login(email, password)
}

class RegisterUseCase @Inject constructor(private val repository: AuthRepository) {
    suspend operator fun invoke(email: String, password: String, displayName: String): Result<User> =
        repository.register(email, password, displayName)
}

class LogoutUseCase @Inject constructor(private val repository: AuthRepository) {
    suspend operator fun invoke() = repository.logout()
}

class ObserveAuthenticationUseCase @Inject constructor(private val repository: AuthRepository) {
    operator fun invoke(): Flow<Boolean> = repository.observeAuthentication()
}

class GetCurrentUserUseCase @Inject constructor(private val repository: UserRepository) {
    suspend operator fun invoke(): Result<User> = repository.getCurrentUser()
}

class UpdateProfileUseCase @Inject constructor(private val repository: UserRepository) {
    suspend operator fun invoke(displayName: String): Result<User> = repository.updateProfile(displayName)
}
