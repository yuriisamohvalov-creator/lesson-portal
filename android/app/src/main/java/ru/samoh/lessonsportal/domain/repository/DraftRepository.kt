package ru.samoh.lessonsportal.domain.repository

import kotlinx.coroutines.flow.Flow
import ru.samoh.lessonsportal.domain.model.DraftArticle

interface DraftRepository {
    fun observeDrafts(): Flow<List<DraftArticle>>
    suspend fun get(id: String?, articleId: String?): DraftArticle?
    suspend fun save(draft: DraftArticle)
    suspend fun delete(id: String)
}
