package ru.samoh.lessonsportal.data.repository

import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import ru.samoh.lessonsportal.data.local.*
import ru.samoh.lessonsportal.data.remote.dto.*
import ru.samoh.lessonsportal.domain.model.*

private val cacheJson = Json { ignoreUnknownKeys = true }
private fun status(value: String) = ArticleStatus.entries.firstOrNull { it.name == value } ?: ArticleStatus.DRAFT
internal fun AuthorDto.toDomain() = Author(id, displayName)
internal fun CategoryDto.toDomain() = Category(id, name, slug, count?.articles ?: 0)
internal fun CategoryDto.toEntity() = CategoryEntity(id, name, slug, count?.articles ?: 0)
internal fun CategoryEntity.toDomain() = Category(id, name, slug, articleCount)
internal fun VideoDto.toDomain() = Video(id, type, youtubeUrl, url)
internal fun CommentDto.toDomain() = Comment(id, body, author.toDomain(), createdAt)
internal fun ArticleListItemDto.toDomain() = ArticleListItem(id, title, slug, status(status), author.toDomain(), category.toDomain(), createdAt, publishedAt, coverUrl, hasVideo)
internal fun ArticleListItemDto.toEntity() = ArticleListEntity(id, title, slug, status, author.id, author.displayName, category.id, category.name, category.slug, createdAt, publishedAt, coverUrl, hasVideo)
internal fun ArticleListEntity.toDomain() = ArticleListItem(id, title, slug, status(status), Author(authorId, authorName), Category(categoryId, categoryName, categorySlug), createdAt, publishedAt, coverUrl, hasVideo)
internal fun ArticleDto.toDomain(isOffline: Boolean = false) = Article(id, title, slug, content, status(status), author.toDomain(), category.toDomain(), createdAt, publishedAt, rejectionReason, videos.map { it.toDomain() }, isOffline)
internal fun ArticleDto.toEntity() = ArticleEntity(
    id, title, slug, content, status, author.id, author.displayName, category.id, category.name,
    category.slug, createdAt, publishedAt, rejectionReason, cacheJson.encodeToString(videos),
)
internal fun ArticleEntity.toDomain() = Article(
    id, title, slug, content, status(status), Author(authorId, authorName),
    Category(categoryId, categoryName, categorySlug), createdAt, publishedAt, rejectionReason,
    runCatching { cacheJson.decodeFromString<List<VideoDto>>(videosJson).map { it.toDomain() } }.getOrDefault(emptyList()),
    isOffline = true,
)
