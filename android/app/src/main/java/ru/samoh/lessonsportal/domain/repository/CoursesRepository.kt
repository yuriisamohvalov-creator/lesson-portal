package ru.samoh.lessonsportal.domain.repository

import androidx.paging.PagingData
import kotlinx.coroutines.flow.Flow
import ru.samoh.lessonsportal.domain.model.Course

interface CoursesRepository {
    fun getCourses(categoryId: String? = null): Flow<PagingData<Course>>
    suspend fun getCourse(id: String): Result<Course>
}
