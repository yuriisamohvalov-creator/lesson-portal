package ru.samoh.lessonsportal.data.repository

import androidx.paging.Pager
import androidx.paging.PagingConfig
import androidx.paging.PagingData
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import ru.samoh.lessonsportal.data.local.ArticleDao
import ru.samoh.lessonsportal.data.local.CategoryDao
import ru.samoh.lessonsportal.data.remote.api.*
import ru.samoh.lessonsportal.data.remote.dto.CreateCommentRequest
import ru.samoh.lessonsportal.data.remote.dto.CreateArticleRequest
import ru.samoh.lessonsportal.data.remote.dto.UpdateArticleRequest
import ru.samoh.lessonsportal.data.remote.error.ApiErrorHandler
import ru.samoh.lessonsportal.data.remote.error.apiResult
import ru.samoh.lessonsportal.domain.model.*
import ru.samoh.lessonsportal.domain.repository.*

@Singleton
class CategoriesRepositoryImpl @Inject constructor(
    private val api: CategoriesApi,
    private val dao: CategoryDao,
) : CategoriesRepository {
    override suspend fun getCategories(forceRefresh: Boolean): Result<List<Category>> {
        if (!forceRefresh) dao.getAll().takeIf { it.isNotEmpty() }?.let { return Result.success(it.map { row -> row.toDomain() }) }
        return try {
            val remote = api.getCategories()
            dao.clear()
            dao.replaceAll(remote.map { it.toEntity() })
            Result.success(remote.map { it.toDomain() })
        } catch (error: Throwable) {
            dao.getAll().takeIf { it.isNotEmpty() }?.let { Result.success(it.map { row -> row.toDomain() }) }
                ?: Result.failure(ApiErrorHandler.map(error))
        }
    }
}

@Singleton
class ArticlesRepositoryImpl @Inject constructor(
    private val api: ArticlesApi,
    private val dao: ArticleDao,
) : ArticlesRepository {
    override fun getArticles(categoryId: String?, search: String?): Flow<PagingData<ArticleListItem>> =
        Pager(PagingConfig(pageSize = 20, initialLoadSize = 20)) { ArticlesPagingSource(api, dao, categoryId, search) }.flow

    override suspend fun getArticle(id: String): Result<Article> = try {
        val remote = api.getArticle(id)
        dao.save(remote.toEntity())
        Result.success(remote.toDomain())
    } catch (error: Throwable) {
        dao.getById(id)?.let { Result.success(it.toDomain()) } ?: Result.failure(ApiErrorHandler.map(error))
    }

    override suspend fun createArticle(title: String, content: String, categoryId: String): Result<Article> =
        apiResult { api.createArticle(CreateArticleRequest(title, content, categoryId)).toDomain() }
    override suspend fun updateArticle(id: String, title: String, content: String, categoryId: String): Result<Article> =
        apiResult { api.updateArticle(id, UpdateArticleRequest(title, content, categoryId)).toDomain() }
    override suspend fun deleteArticle(id: String): Result<Unit> = apiResult { api.deleteArticle(id); Unit }
    override suspend fun submitArticle(id: String): Result<Article> = apiResult { api.submitArticle(id).toDomain() }
    override suspend fun getMyArticles(): Result<List<Article>> = apiResult { api.getMyArticles().map { it.toDomain() } }
}

@Singleton
class CommentsRepositoryImpl @Inject constructor(private val api: CommentsApi) : CommentsRepository {
    override suspend fun getComments(articleId: String): Result<List<Comment>> = apiResult { api.getComments(articleId).map { it.toDomain() } }
    override suspend fun addComment(articleId: String, body: String): Result<Comment> = apiResult { api.addComment(articleId, CreateCommentRequest(body.trim())).toDomain() }
}

@Singleton
class VideosRepositoryImpl @Inject constructor(private val api: VideosApi) : VideosRepository {
    override suspend fun getVideos(articleId: String): Result<List<Video>> = apiResult { api.getVideos(articleId).map { it.toDomain() } }
}
