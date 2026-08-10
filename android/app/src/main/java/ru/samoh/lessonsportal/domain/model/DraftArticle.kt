package ru.samoh.lessonsportal.domain.model

data class DraftArticle(
    val id: String,
    val articleId: String?,
    val title: String,
    val content: String,
    val categoryId: String?,
    val updatedAt: Long,
    val isSynced: Boolean,
    val lastError: String?,
)
