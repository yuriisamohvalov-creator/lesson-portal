package ru.samoh.lessonsportal.presentation.catalog

import androidx.lifecycle.SavedStateHandle
import androidx.paging.PagingData
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import ru.samoh.lessonsportal.domain.model.*
import ru.samoh.lessonsportal.domain.repository.ArticlesRepository
import ru.samoh.lessonsportal.domain.repository.CommentsRepository
import ru.samoh.lessonsportal.domain.usecase.AddCommentUseCase
import ru.samoh.lessonsportal.domain.usecase.GetArticleCommentsUseCase
import ru.samoh.lessonsportal.domain.usecase.GetArticleDetailUseCase
import ru.samoh.lessonsportal.testing.MainDispatcherRule

@OptIn(ExperimentalCoroutinesApi::class)
class ArticleDetailViewModelTest {
    @get:Rule val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun loadsArticleAndAppendsCreatedComment() = runTest {
        val comments = FakeCommentsRepository()
        val viewModel = ArticleDetailViewModel(
            GetArticleDetailUseCase(FakeArticlesRepository()),
            GetArticleCommentsUseCase(comments),
            AddCommentUseCase(comments),
            SavedStateHandle(mapOf("articleId" to "article-id")),
        )
        runCurrent()
        assertEquals("Статья", viewModel.state.value.article?.title)

        viewModel.addComment("Полезно")
        runCurrent()
        assertEquals("Полезно", viewModel.state.value.comments.single().body)
    }

    private class FakeArticlesRepository : ArticlesRepository {
        override fun getArticles(categoryId: String?, search: String?): Flow<PagingData<ArticleListItem>> = emptyFlow()
        override suspend fun getArticle(id: String) = Result.success(
            Article(id, "Статья", "article", "<p>Текст</p>", ArticleStatus.PUBLISHED, Author("a", "Автор"), Category("c", "Категория", "cat"), "2026-01-01", "2026-01-01", null, emptyList())
        )
        override suspend fun createArticle(title: String, content: String, categoryId: String) = getArticle("new")
        override suspend fun updateArticle(id: String, title: String, content: String, categoryId: String) = getArticle(id)
        override suspend fun deleteArticle(id: String) = Result.success(Unit)
        override suspend fun submitArticle(id: String) = getArticle(id)
        override suspend fun getMyArticles() = Result.success(emptyList<Article>())
    }

    private class FakeCommentsRepository : CommentsRepository {
        override suspend fun getComments(articleId: String): Result<List<Comment>> = Result.success(emptyList())
        override suspend fun addComment(articleId: String, body: String): Result<Comment> = Result.success(Comment("comment-id", body, Author("a", "Автор"), "2026-01-01"))
    }
}
