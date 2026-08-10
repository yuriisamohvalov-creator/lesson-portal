package ru.samoh.lessonsportal.data.repository

import javax.inject.Inject
import javax.inject.Singleton
import ru.samoh.lessonsportal.data.remote.api.*
import ru.samoh.lessonsportal.data.remote.dto.*
import ru.samoh.lessonsportal.data.remote.error.apiResult
import ru.samoh.lessonsportal.domain.model.*
import ru.samoh.lessonsportal.domain.repository.*

@Singleton class ModerationRepositoryImpl @Inject constructor(private val api: ModerationApi) : ModerationRepository {
    override suspend fun getPendingArticles() = apiResult { api.getQueue().data.map { it.toDomain() } }
    override suspend fun approveArticle(id: String) = apiResult { api.approve(id).toDomain() }
    override suspend fun rejectArticle(id: String, reason: String) = apiResult { api.reject(id, ModerateArticleRequest(reason)).toDomain() }
}

@Singleton class AdminRepositoryImpl @Inject constructor(private val api: AdminApi) : AdminRepository {
    override suspend fun getUsers() = apiResult { api.getUsers().data.map { it.toDomain() } }
    override suspend fun changeRole(userId: String, role: UserRole) = apiResult { api.changeRole(userId, ChangeRoleRequest(role.name)).toDomain() }
    override suspend fun setBlocked(userId: String, blocked: Boolean) = apiResult { (if (blocked) api.block(userId) else api.unblock(userId)).toDomain() }
    override suspend fun createCategory(name: String, slug: String) = apiResult { api.createCategory(CategoryMutationRequest(name, slug)).toDomain() }
    override suspend fun updateCategory(id: String, name: String, slug: String) = apiResult { api.updateCategory(id, CategoryMutationRequest(name, slug)).toDomain() }
}
