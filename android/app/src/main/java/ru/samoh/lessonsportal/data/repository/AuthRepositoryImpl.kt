package ru.samoh.lessonsportal.data.repository

import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import ru.samoh.lessonsportal.data.datastore.TokenDataStore
import ru.samoh.lessonsportal.data.remote.api.AuthApi
import ru.samoh.lessonsportal.data.remote.dto.LoginRequest
import ru.samoh.lessonsportal.data.remote.dto.RegisterRequest
import ru.samoh.lessonsportal.data.remote.error.apiResult
import ru.samoh.lessonsportal.domain.model.User
import ru.samoh.lessonsportal.domain.repository.AuthRepository

@Singleton
class AuthRepositoryImpl @Inject constructor(
    private val authApi: AuthApi,
    private val tokenDataStore: TokenDataStore,
) : AuthRepository {
    override suspend fun login(email: String, password: String): Result<User> = apiResult {
        val response = authApi.login(LoginRequest(email.trim(), password))
        tokenDataStore.saveTokens(response.accessToken, response.refreshToken)
        response.user.toDomain()
    }

    override suspend fun register(email: String, password: String, displayName: String): Result<User> = apiResult {
        authApi.register(RegisterRequest(email.trim(), password, displayName.trim()))
        val response = authApi.login(LoginRequest(email.trim(), password))
        tokenDataStore.saveTokens(response.accessToken, response.refreshToken)
        response.user.toDomain()
    }

    override suspend fun logout() {
        runCatching { authApi.logout() }
        tokenDataStore.clearTokens()
    }

    override fun observeAuthentication(): Flow<Boolean> =
        tokenDataStore.observeAccessToken().map { it != null }
}
