package ru.samoh.lessonsportal.data.remote.api

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query
import retrofit2.http.DELETE
import retrofit2.http.PATCH
import retrofit2.http.Multipart
import retrofit2.http.Part
import okhttp3.MultipartBody
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
    @POST("articles") suspend fun createArticle(@Body request: CreateArticleRequest): ArticleDto
    @PATCH("articles/{id}") suspend fun updateArticle(@Path("id") id: String, @Body request: UpdateArticleRequest): ArticleDto
    @DELETE("articles/{id}") suspend fun deleteArticle(@Path("id") id: String): DeleteArticleResponse
    @POST("articles/{id}/submit") suspend fun submitArticle(@Path("id") id: String): ArticleDto
    @GET("articles/mine") suspend fun getMyArticles(): List<ArticleDto>
}

interface CommentsApi {
    @GET("articles/{articleId}/comments") suspend fun getComments(@Path("articleId") articleId: String): List<CommentDto>
    @POST("articles/{articleId}/comments") suspend fun addComment(@Path("articleId") articleId: String, @Body request: CreateCommentRequest): CommentDto
}

interface VideosApi {
    @GET("articles/{articleId}/videos") suspend fun getVideos(@Path("articleId") articleId: String): List<VideoDto>
}

interface UploadsApi {
    @Multipart @POST("uploads/image") suspend fun uploadImage(@Part file: MultipartBody.Part): UploadImageResponse
}

interface PdfImportApi {
    @Multipart @POST("pdf-import") suspend fun importPdf(@Part file: MultipartBody.Part): PdfImportResponse
}
