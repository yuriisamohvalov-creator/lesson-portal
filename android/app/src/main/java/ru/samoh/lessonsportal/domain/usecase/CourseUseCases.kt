package ru.samoh.lessonsportal.domain.usecase

import javax.inject.Inject
import ru.samoh.lessonsportal.domain.repository.CoursesRepository

class GetCoursesUseCase @Inject constructor(private val repository: CoursesRepository) { operator fun invoke(categoryId: String? = null) = repository.getCourses(categoryId) }
class GetCourseDetailUseCase @Inject constructor(private val repository: CoursesRepository) { suspend operator fun invoke(id: String) = repository.getCourse(id) }
