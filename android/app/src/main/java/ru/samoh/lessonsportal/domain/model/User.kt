package ru.samoh.lessonsportal.domain.model

data class User(
    val id: String,
    val email: String,
    val displayName: String,
    val role: UserRole,
    val isBlocked: Boolean = false,
    val createdAt: String? = null,
)

enum class UserRole { USER, MODERATOR, ADMIN }
