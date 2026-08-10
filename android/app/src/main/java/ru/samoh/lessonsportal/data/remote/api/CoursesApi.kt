package ru.samoh.lessonsportal.data.remote.api

import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query
import ru.samoh.lessonsportal.data.remote.dto.CourseDto
import ru.samoh.lessonsportal.data.remote.dto.CourseListResponseDto

interface CoursesApi {
    @GET("courses") suspend fun getCourses(@Query("page") page: Int, @Query("limit") limit: Int, @Query("categoryId") categoryId: String? = null): CourseListResponseDto
    @GET("courses/{id}") suspend fun getCourse(@Path("id") id: String): CourseDto
}
