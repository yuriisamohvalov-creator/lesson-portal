package ru.samoh.lessonsportal.domain.model

data class CourseArticle(
    val membershipId: String,
    val articleId: String,
    val title: String,
    val slug: String,
    val status: ArticleStatus,
    val order: Int,
)

data class Course(
    val id: String,
    val name: String,
    val description: String?,
    val slug: String,
    val status: String,
    val author: Author,
    val createdAt: String,
    val articles: List<CourseArticle>,
)
