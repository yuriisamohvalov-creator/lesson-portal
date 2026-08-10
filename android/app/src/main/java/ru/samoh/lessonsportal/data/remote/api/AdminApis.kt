package ru.samoh.lessonsportal.data.remote.api

import retrofit2.http.*
import ru.samoh.lessonsportal.data.remote.dto.*

interface ModerationApi {
    @GET("moderation/queue") suspend fun getQueue(@Query("page") page: Int = 1, @Query("limit") limit: Int = 50): ModerationQueueResponseDto
    @POST("moderation/articles/{id}/approve") suspend fun approve(@Path("id") id: String): ArticleDto
    @POST("moderation/articles/{id}/reject") suspend fun reject(@Path("id") id: String, @Body request: ModerateArticleRequest): ArticleDto
}

interface AdminApi {
    @GET("users") suspend fun getUsers(@Query("page") page: Int = 1, @Query("limit") limit: Int = 50): UsersResponseDto
    @PATCH("users/{id}/role") suspend fun changeRole(@Path("id") id: String, @Body request: ChangeRoleRequest): UserDto
    @PATCH("users/{id}/block") suspend fun block(@Path("id") id: String): UserDto
    @PATCH("users/{id}/unblock") suspend fun unblock(@Path("id") id: String): UserDto
    @POST("categories") suspend fun createCategory(@Body request: CategoryMutationRequest): CategoryDto
    @PATCH("categories/{id}") suspend fun updateCategory(@Path("id") id: String, @Body request: CategoryMutationRequest): CategoryDto
}
