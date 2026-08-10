package ru.samoh.lessonsportal.data.repository

import androidx.paging.*
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import ru.samoh.lessonsportal.data.remote.api.CoursesApi
import ru.samoh.lessonsportal.data.remote.dto.CourseDto
import ru.samoh.lessonsportal.data.remote.error.apiResult
import ru.samoh.lessonsportal.domain.model.*
import ru.samoh.lessonsportal.domain.repository.CoursesRepository

internal fun CourseDto.toDomain() = Course(
    id, name, description, slug, status, author.toDomain(), createdAt,
    articles.sortedBy { it.order }.map { CourseArticle(it.id, it.articleId, it.article.title, it.article.slug, ArticleStatus.entries.firstOrNull { status -> status.name == it.article.status } ?: ArticleStatus.DRAFT, it.order) },
)

class CoursesPagingSource(
    private val api: CoursesApi,
    private val categoryId: String?,
) : PagingSource<Int, Course>() {
    override suspend fun load(params: LoadParams<Int>): LoadResult<Int, Course> = try {
        val page = params.key ?: 1
        val response = api.getCourses(page, params.loadSize.coerceAtMost(50), categoryId)
        LoadResult.Page(response.data.map { it.toDomain() }, if (page == 1) null else page - 1, if (page >= response.meta.totalPages) null else page + 1)
    } catch (error: Throwable) { LoadResult.Error(error) }
    override fun getRefreshKey(state: PagingState<Int, Course>): Int? = state.anchorPosition?.let { state.closestPageToPosition(it)?.prevKey?.plus(1) ?: state.closestPageToPosition(it)?.nextKey?.minus(1) }
}

@Singleton
class CoursesRepositoryImpl @Inject constructor(private val api: CoursesApi) : CoursesRepository {
    override fun getCourses(categoryId: String?): Flow<PagingData<Course>> = Pager(PagingConfig(pageSize = 20, initialLoadSize = 20)) { CoursesPagingSource(api, categoryId) }.flow
    override suspend fun getCourse(id: String): Result<Course> = apiResult { api.getCourse(id).toDomain() }
}
