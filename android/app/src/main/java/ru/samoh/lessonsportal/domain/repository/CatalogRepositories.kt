package ru.samoh.lessonsportal.domain.repository

import androidx.paging.PagingData
import kotlinx.coroutines.flow.Flow
import android.net.Uri
import ru.samoh.lessonsportal.domain.model.*

interface CategoriesRepository { suspend fun getCategories(forceRefresh: Boolean = false): Result<List<Category>> }
interface ArticlesRepository {
    fun getArticles(categoryId: String? = null, search: String? = null): Flow<PagingData<ArticleListItem>>
    suspend fun getArticle(id: String): Result<Article>
    suspend fun createArticle(title: String, content: String, categoryId: String): Result<Article>
    suspend fun updateArticle(id: String, title: String, content: String, categoryId: String): Result<Article>
    suspend fun deleteArticle(id: String): Result<Unit>
    suspend fun submitArticle(id: String): Result<Article>
    suspend fun getMyArticles(): Result<List<Article>>
}
interface CommentsRepository {
    suspend fun getComments(articleId: String): Result<List<Comment>>
    suspend fun addComment(articleId: String, body: String): Result<Comment>
}
interface VideosRepository { suspend fun getVideos(articleId: String): Result<List<Video>> }
interface UploadsRepository { suspend fun uploadImage(uri: Uri): Result<String> }
data class PdfImportResult(val html: String, val text: String, val suggestedTitle: String?)
interface PdfImportRepository { suspend fun importPdf(uri: Uri): Result<PdfImportResult> }
