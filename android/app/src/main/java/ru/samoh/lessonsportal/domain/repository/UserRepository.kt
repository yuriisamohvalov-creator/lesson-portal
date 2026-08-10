package ru.samoh.lessonsportal.domain.repository

import ru.samoh.lessonsportal.domain.model.User

interface UserRepository {
    suspend fun getCurrentUser(): Result<User>
    suspend fun updateProfile(displayName: String): Result<User>
}
