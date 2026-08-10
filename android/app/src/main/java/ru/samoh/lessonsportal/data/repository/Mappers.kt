package ru.samoh.lessonsportal.data.repository

import ru.samoh.lessonsportal.data.remote.dto.UserDto
import ru.samoh.lessonsportal.domain.model.User
import ru.samoh.lessonsportal.domain.model.UserRole

internal fun UserDto.toDomain(): User = User(
    id = id,
    email = email,
    displayName = displayName,
    role = UserRole.entries.firstOrNull { it.name == role } ?: UserRole.USER,
    isBlocked = isBlocked,
    createdAt = createdAt,
)
