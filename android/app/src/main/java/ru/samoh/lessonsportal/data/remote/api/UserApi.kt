package ru.samoh.lessonsportal.data.remote.api

import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import ru.samoh.lessonsportal.data.remote.dto.UserDto

@Serializable
data class UpdateProfileRequest(val displayName: String)

interface UserApi {
    @GET("users/me")
    suspend fun getCurrentUser(): UserDto

    @PATCH("users/me")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): UserDto
}
