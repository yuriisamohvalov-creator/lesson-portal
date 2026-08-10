package ru.samoh.lessonsportal.data.repository

import androidx.paging.PagingSource
import androidx.paging.PagingState
import ru.samoh.lessonsportal.data.remote.api.ArticlesApi
import ru.samoh.lessonsportal.data.local.ArticleDao
import ru.samoh.lessonsportal.domain.model.ArticleListItem

class ArticlesPagingSource(
    private val api: ArticlesApi,
    private val dao: ArticleDao,
    private val categoryId: String?,
    private val search: String?,
) : PagingSource<Int, ArticleListItem>() {
    override suspend fun load(params: LoadParams<Int>): LoadResult<Int, ArticleListItem> = try {
        val page = params.key ?: 1
        val limit = params.loadSize.coerceAtMost(50)
        val response = api.getArticles(page, limit, categoryId, search?.takeIf { it.isNotBlank() })
        dao.saveList(response.data.map { it.toEntity() })
        LoadResult.Page(
            data = response.data.map { it.toDomain() },
            prevKey = if (page == 1) null else page - 1,
            nextKey = if (page >= response.meta.totalPages) null else page + 1,
        )
    } catch (error: Throwable) {
        val page = params.key ?: 1
        val limit = params.loadSize.coerceAtMost(50)
        val cached = dao.getList(categoryId, search?.takeIf { it.isNotBlank() }, limit, (page - 1) * limit)
        if (cached.isEmpty()) LoadResult.Error(error) else LoadResult.Page(cached.map { it.toDomain() }, if (page == 1) null else page - 1, if (cached.size < limit) null else page + 1)
    }

    override fun getRefreshKey(state: PagingState<Int, ArticleListItem>): Int? =
        state.anchorPosition?.let { position -> state.closestPageToPosition(position)?.let { page -> page.prevKey?.plus(1) ?: page.nextKey?.minus(1) } }
}
