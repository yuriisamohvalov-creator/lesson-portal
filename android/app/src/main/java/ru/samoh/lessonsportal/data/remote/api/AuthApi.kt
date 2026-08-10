package ru.samoh.lessonsportal.data.remote.api

import retrofit2.http.Body
import retrofit2.http.POST
import ru.samoh.lessonsportal.data.remote.dto.AccessTokenResponse
import ru.samoh.lessonsportal.data.remote.dto.LoginRequest
import ru.samoh.lessonsportal.data.remote.dto.LoginResponse
import ru.samoh.lessonsportal.data.remote.dto.RefreshRequest
import ru.samoh.lessonsportal.data.remote.dto.RegisterRequest
import ru.samoh.lessonsportal.data.remote.dto.UserDto

interface AuthApi {
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): LoginResponse

    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): UserDto

    @POST("auth/refresh")
    suspend fun refresh(@Body request: RefreshRequest): AccessTokenResponse

    @POST("auth/logout")
    suspend fun logout()
}
