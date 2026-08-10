package ru.samoh.lessonsportal.domain.repository

import kotlinx.coroutines.flow.Flow
import ru.samoh.lessonsportal.domain.model.User

interface AuthRepository {
    suspend fun login(email: String, password: String): Result<User>
    suspend fun register(email: String, password: String, displayName: String): Result<User>
    suspend fun logout()
    fun observeAuthentication(): Flow<Boolean>
}
