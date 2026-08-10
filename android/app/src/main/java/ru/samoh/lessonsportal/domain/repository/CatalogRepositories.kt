package ru.samoh.lessonsportal.domain.repository

import androidx.paging.PagingData
import kotlinx.coroutines.flow.Flow
import ru.samoh.lessonsportal.domain.model.*

interface CategoriesRepository { suspend fun getCategories(forceRefresh: Boolean = false): Result<List<Category>> }
interface ArticlesRepository {
    fun getArticles(categoryId: String? = null, search: String? = null): Flow<PagingData<ArticleListItem>>
    suspend fun getArticle(id: String): Result<Article>
}
interface CommentsRepository {
    suspend fun getComments(articleId: String): Result<List<Comment>>
    suspend fun addComment(articleId: String, body: String): Result<Comment>
}
interface VideosRepository { suspend fun getVideos(articleId: String): Result<List<Video>> }
