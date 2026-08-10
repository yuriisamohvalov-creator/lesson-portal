package ru.samoh.lessonsportal.data.repository

import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import ru.samoh.lessonsportal.data.local.DraftArticleDao
import ru.samoh.lessonsportal.data.local.DraftArticleEntity
import ru.samoh.lessonsportal.domain.model.DraftArticle
import ru.samoh.lessonsportal.domain.repository.DraftRepository

private fun DraftArticleEntity.toDomain() = DraftArticle(id, articleId, title, content, categoryId, updatedAt, isSynced, lastError)
private fun DraftArticle.toEntity() = DraftArticleEntity(id, articleId, title, content, categoryId, updatedAt, isSynced, lastError)

@Singleton
class DraftRepositoryImpl @Inject constructor(private val dao: DraftArticleDao) : DraftRepository {
    override fun observeDrafts(): Flow<List<DraftArticle>> = dao.observeDrafts().map { rows -> rows.map { it.toDomain() } }
    override suspend fun get(id: String?, articleId: String?): DraftArticle? =
        (id?.let { dao.getById(it) } ?: articleId?.let { dao.getByArticleId(it) })?.toDomain()
    override suspend fun save(draft: DraftArticle) = dao.save(draft.toEntity())
    override suspend fun delete(id: String) = dao.delete(id)
}
