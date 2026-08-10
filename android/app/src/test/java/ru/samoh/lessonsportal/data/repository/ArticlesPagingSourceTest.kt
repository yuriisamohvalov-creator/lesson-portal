package ru.samoh.lessonsportal.data.repository

import androidx.paging.PagingSource
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import ru.samoh.lessonsportal.data.remote.api.ArticlesApi
import ru.samoh.lessonsportal.data.remote.dto.*
import ru.samoh.lessonsportal.data.local.ArticleDao
import ru.samoh.lessonsportal.data.local.ArticleEntity
import ru.samoh.lessonsportal.data.local.ArticleListEntity

class ArticlesPagingSourceTest {
    @Test
    fun mapsPaginatedBackendResponseAndStopsAtLastPage() = runTest {
        val source = ArticlesPagingSource(FakeArticlesApi(), FakeArticleDao(), "category-id", "oil")
        val result = source.load(PagingSource.LoadParams.Refresh(key = 1, loadSize = 20, placeholdersEnabled = false))
            as PagingSource.LoadResult.Page

        assertEquals("article-id", result.data.single().id)
        assertEquals("category-id", result.data.single().category.id)
        assertNull(result.prevKey)
        assertNull(result.nextKey)
    }

    @Test
    fun returnsCachedPageWhenNetworkFails() = runTest {
        val dao = FakeArticleDao().apply {
            saveList(listOf(ArticleListEntity("cached-id", "Кеш", "cached", "PUBLISHED", "author", "Автор", "category-id", "Двигатель", "engine", "2026-01-01", null, null, false)))
        }
        val source = ArticlesPagingSource(FailingArticlesApi(), dao, "category-id", null)
        val result = source.load(PagingSource.LoadParams.Refresh(key = 1, loadSize = 20, placeholdersEnabled = false))
            as PagingSource.LoadResult.Page

        assertEquals("cached-id", result.data.single().id)
    }

    private class FakeArticlesApi : ArticlesApi {
        override suspend fun getArticles(page: Int, limit: Int, categoryId: String?, search: String?) =
            ArticleListResponseDto(
                data = listOf(ArticleListItemDto("article-id", "Замена масла", "oil", "PUBLISHED", AuthorDto("author-id", "Автор"), CategoryDto("category-id", "Двигатель", "engine"), "2026-01-01T00:00:00Z")),
                meta = PageMetaDto(1, 1, 20, 1),
            )
        override suspend fun getArticle(id: String): ArticleDto = error("unused")
        override suspend fun createArticle(request: CreateArticleRequest): ArticleDto = error("unused")
        override suspend fun updateArticle(id: String, request: UpdateArticleRequest): ArticleDto = error("unused")
        override suspend fun deleteArticle(id: String) = DeleteArticleResponse(true)
        override suspend fun submitArticle(id: String): ArticleDto = error("unused")
        override suspend fun getMyArticles(): List<ArticleDto> = emptyList()
    }

    private class FailingArticlesApi : ArticlesApi {
        override suspend fun getArticles(page: Int, limit: Int, categoryId: String?, search: String?): ArticleListResponseDto = error("offline")
        override suspend fun getArticle(id: String): ArticleDto = error("offline")
        override suspend fun createArticle(request: CreateArticleRequest): ArticleDto = error("offline")
        override suspend fun updateArticle(id: String, request: UpdateArticleRequest): ArticleDto = error("offline")
        override suspend fun deleteArticle(id: String): DeleteArticleResponse = error("offline")
        override suspend fun submitArticle(id: String): ArticleDto = error("offline")
        override suspend fun getMyArticles(): List<ArticleDto> = error("offline")
    }

    private class FakeArticleDao : ArticleDao {
        private val items = mutableListOf<ArticleListEntity>()
        override suspend fun getById(id: String): ArticleEntity? = null
        override suspend fun save(article: ArticleEntity) = Unit
        override suspend fun saveList(items: List<ArticleListEntity>) { this.items.addAll(items) }
        override suspend fun getList(categoryId: String?, search: String?, limit: Int, offset: Int): List<ArticleListEntity> = items.drop(offset).take(limit)
    }
}
