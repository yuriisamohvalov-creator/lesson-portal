package ru.samoh.lessonsportal.domain.usecase

import javax.inject.Inject
import ru.samoh.lessonsportal.domain.model.UserRole
import ru.samoh.lessonsportal.domain.repository.*

class GetPendingArticlesUseCase @Inject constructor(private val r: ModerationRepository) { suspend operator fun invoke() = r.getPendingArticles() }
class ApproveArticleUseCase @Inject constructor(private val r: ModerationRepository) { suspend operator fun invoke(id: String) = r.approveArticle(id) }
class RejectArticleUseCase @Inject constructor(private val r: ModerationRepository) { suspend operator fun invoke(id: String, reason: String) = r.rejectArticle(id, reason) }
class GetUsersUseCase @Inject constructor(private val r: AdminRepository) { suspend operator fun invoke() = r.getUsers() }
class ChangeUserRoleUseCase @Inject constructor(private val r: AdminRepository) { suspend operator fun invoke(id: String, role: UserRole) = r.changeRole(id, role) }
class SetUserBlockedUseCase @Inject constructor(private val r: AdminRepository) { suspend operator fun invoke(id: String, blocked: Boolean) = r.setBlocked(id, blocked) }
class CreateCategoryUseCase @Inject constructor(private val r: AdminRepository) { suspend operator fun invoke(name: String, slug: String) = r.createCategory(name, slug) }
class UpdateCategoryUseCase @Inject constructor(private val r: AdminRepository) { suspend operator fun invoke(id: String, name: String, slug: String) = r.updateCategory(id, name, slug) }
