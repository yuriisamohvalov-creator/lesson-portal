package ru.samoh.lessonsportal.data.repository

import javax.inject.Inject
import javax.inject.Singleton
import ru.samoh.lessonsportal.data.remote.api.UpdateProfileRequest
import ru.samoh.lessonsportal.data.remote.api.UserApi
import ru.samoh.lessonsportal.data.remote.error.apiResult
import ru.samoh.lessonsportal.domain.model.User
import ru.samoh.lessonsportal.domain.repository.UserRepository

@Singleton
class UserRepositoryImpl @Inject constructor(
    private val userApi: UserApi,
) : UserRepository {
    override suspend fun getCurrentUser(): Result<User> = apiResult { userApi.getCurrentUser().toDomain() }

    override suspend fun updateProfile(displayName: String): Result<User> =
        apiResult { userApi.updateProfile(UpdateProfileRequest(displayName.trim())).toDomain() }
}
