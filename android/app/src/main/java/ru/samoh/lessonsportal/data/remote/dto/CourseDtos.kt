package ru.samoh.lessonsportal.data.remote.dto

import kotlinx.serialization.Serializable

@Serializable data class CourseArticleSummaryDto(
    val id: String,
    val title: String,
    val slug: String,
    val status: String,
)
@Serializable data class CourseArticleDto(
    val id: String,
    val articleId: String,
    val order: Int,
    val article: CourseArticleSummaryDto,
)
@Serializable data class CourseDto(
    val id: String,
    val name: String,
    val description: String? = null,
    val slug: String,
    val status: String,
    val author: AuthorDto,
    val createdAt: String,
    val articles: List<CourseArticleDto> = emptyList(),
)
@Serializable data class CourseListResponseDto(val data: List<CourseDto>, val meta: PageMetaDto)
