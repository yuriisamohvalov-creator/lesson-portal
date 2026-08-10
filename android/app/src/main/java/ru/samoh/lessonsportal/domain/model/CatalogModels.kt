package ru.samoh.lessonsportal.domain.model

data class Author(val id: String, val displayName: String)
data class Category(val id: String, val name: String, val slug: String, val articleCount: Int = 0)
enum class ArticleStatus { DRAFT, PENDING, PUBLISHED, REJECTED }

data class ArticleListItem(
    val id: String, val title: String, val slug: String, val status: ArticleStatus,
    val author: Author, val category: Category, val createdAt: String,
    val publishedAt: String?, val coverUrl: String?, val hasVideo: Boolean,
)

data class Article(
    val id: String, val title: String, val slug: String, val content: String?,
    val status: ArticleStatus, val author: Author, val category: Category,
    val createdAt: String, val publishedAt: String?, val rejectionReason: String?,
    val videos: List<Video>, val isOffline: Boolean = false,
)

data class Comment(val id: String, val body: String, val author: Author, val createdAt: String)
data class Video(val id: String, val type: String, val youtubeUrl: String?, val url: String?)
