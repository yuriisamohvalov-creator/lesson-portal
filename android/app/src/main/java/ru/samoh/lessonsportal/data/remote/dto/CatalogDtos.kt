package ru.samoh.lessonsportal.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable data class AuthorDto(val id: String, val displayName: String)
@Serializable data class CategoryCountDto(val articles: Int = 0)
@Serializable data class CategoryDto(val id: String, val name: String, val slug: String, @SerialName("_count") val count: CategoryCountDto? = null)
@Serializable data class PageMetaDto(val total: Int, val page: Int, val limit: Int, val totalPages: Int)
@Serializable data class ArticleListItemDto(
    val id: String, val title: String, val slug: String, val status: String,
    val author: AuthorDto, val category: CategoryDto, val createdAt: String,
    val publishedAt: String? = null, val coverUrl: String? = null, val hasVideo: Boolean = false,
)
@Serializable data class ArticleListResponseDto(val data: List<ArticleListItemDto>, val meta: PageMetaDto)
@Serializable data class VideoDto(val id: String, val type: String, val youtubeUrl: String? = null, val url: String? = null)
@Serializable data class ArticleDto(
    val id: String, val title: String, val slug: String, val content: String? = null,
    val status: String, val author: AuthorDto? = null, val category: CategoryDto,
    val createdAt: String, val publishedAt: String? = null, val rejectionReason: String? = null,
    val videos: List<VideoDto> = emptyList(),
)
@Serializable data class CommentDto(val id: String, val body: String, val author: AuthorDto, val createdAt: String)
@Serializable data class CreateCommentRequest(val body: String)
@Serializable data class CreateArticleRequest(val title: String, val content: String, val categoryId: String)
@Serializable data class UpdateArticleRequest(val title: String? = null, val content: String? = null, val categoryId: String? = null)
@Serializable data class DeleteArticleResponse(val success: Boolean)
@Serializable data class UploadImageResponse(val url: String)
@Serializable data class PdfImportResponse(val text: String, val html: String, val suggestedTitle: String? = null)
