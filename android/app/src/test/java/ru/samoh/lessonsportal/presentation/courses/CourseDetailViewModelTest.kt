package ru.samoh.lessonsportal.presentation.courses

import androidx.lifecycle.SavedStateHandle
import androidx.paging.PagingData
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Rule
import org.junit.Test
import ru.samoh.lessonsportal.domain.model.*
import ru.samoh.lessonsportal.domain.repository.CoursesRepository
import ru.samoh.lessonsportal.domain.usecase.GetCourseDetailUseCase
import ru.samoh.lessonsportal.testing.MainDispatcherRule

@OptIn(ExperimentalCoroutinesApi::class)
class CourseDetailViewModelTest {
    @get:Rule val dispatcherRule = MainDispatcherRule()

    @Test
    fun loadsCourseFromNavigationArgument() = runTest {
        val viewModel = CourseDetailViewModel(GetCourseDetailUseCase(FakeRepository()), SavedStateHandle(mapOf("courseId" to "course-id")))
        runCurrent()

        assertFalse(viewModel.state.value.loading)
        assertEquals("course-id", viewModel.state.value.course?.id)
        assertEquals("Статья", viewModel.state.value.course?.articles?.single()?.title)
    }

    private class FakeRepository : CoursesRepository {
        override fun getCourses(categoryId: String?): Flow<PagingData<Course>> = emptyFlow()
        override suspend fun getCourse(id: String) = Result.success(
            Course(id, "Курс", null, "course", "PUBLISHED", Author("a", "Автор"), "2026-01-01", listOf(CourseArticle("m", "article-id", "Статья", "article", ArticleStatus.PUBLISHED, 1))),
        )
    }
}
