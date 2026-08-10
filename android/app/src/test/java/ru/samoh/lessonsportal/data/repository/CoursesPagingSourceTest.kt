package ru.samoh.lessonsportal.data.repository

import androidx.paging.PagingSource
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import ru.samoh.lessonsportal.data.remote.api.CoursesApi
import ru.samoh.lessonsportal.data.remote.dto.*

class CoursesPagingSourceTest {
    @Test
    fun mapsCourseArticlesInBackendOrderAndStopsAtLastPage() = runTest {
        val result = CoursesPagingSource(FakeCoursesApi(), "category-id").load(
            PagingSource.LoadParams.Refresh(key = 1, loadSize = 20, placeholdersEnabled = false),
        ) as PagingSource.LoadResult.Page

        val course = result.data.single()
        assertEquals("course-id", course.id)
        assertEquals(listOf("article-1", "article-2"), course.articles.map { it.articleId })
        assertNull(result.prevKey)
        assertNull(result.nextKey)
    }

    private class FakeCoursesApi : CoursesApi {
        override suspend fun getCourses(page: Int, limit: Int, categoryId: String?) = CourseListResponseDto(
            listOf(course()), PageMetaDto(1, 1, 20, 1),
        )
        override suspend fun getCourse(id: String) = course()

        private fun course() = CourseDto(
            "course-id", "Основы", null, "basics", "PUBLISHED", AuthorDto("author-id", "Автор"), "2026-01-01",
            listOf(
                CourseArticleDto("link-2", "article-2", 2, CourseArticleSummaryDto("article-2", "Вторая", "second", "PUBLISHED")),
                CourseArticleDto("link-1", "article-1", 1, CourseArticleSummaryDto("article-1", "Первая", "first", "PUBLISHED")),
            ),
        )
    }
}
