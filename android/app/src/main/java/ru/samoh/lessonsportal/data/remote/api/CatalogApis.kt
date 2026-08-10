package ru.samoh.lessonsportal.data.remote.api

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query
import ru.samoh.lessonsportal.data.remote.dto.*

interface CategoriesApi {
    @GET("categories") suspend fun getCategories(): List<CategoryDto>
}

interface ArticlesApi {
    @GET("articles") suspend fun getArticles(
        @Query("page") page: Int, @Query("limit") limit: Int,
        @Query("categoryId") categoryId: String? = null, @Query("search") search: String? = null,
    ): ArticleListResponseDto
    @GET("articles/{id}") suspend fun getArticle(@Path("id") id: String): ArticleDto
}

interface CommentsApi {
    @GET("articles/{articleId}/comments") suspend fun getComments(@Path("articleId") articleId: String): List<CommentDto>
    @POST("articles/{articleId}/comments") suspend fun addComment(@Path("articleId") articleId: String, @Body request: CreateCommentRequest): CommentDto
}

interface VideosApi {
    @GET("articles/{articleId}/videos") suspend fun getVideos(@Path("articleId") articleId: String): List<VideoDto>
}
