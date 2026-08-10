package ru.samoh.lessonsportal.domain.repository

import ru.samoh.lessonsportal.domain.model.*

interface ModerationRepository {
    suspend fun getPendingArticles(): Result<List<Article>>
    suspend fun approveArticle(id: String): Result<Article>
    suspend fun rejectArticle(id: String, reason: String): Result<Article>
}

interface AdminRepository {
    suspend fun getUsers(): Result<List<User>>
    suspend fun changeRole(userId: String, role: UserRole): Result<User>
    suspend fun setBlocked(userId: String, blocked: Boolean): Result<User>
    suspend fun createCategory(name: String, slug: String): Result<Category>
    suspend fun updateCategory(id: String, name: String, slug: String): Result<Category>
}
