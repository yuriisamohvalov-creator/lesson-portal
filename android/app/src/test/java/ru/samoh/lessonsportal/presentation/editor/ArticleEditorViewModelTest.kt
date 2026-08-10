package ru.samoh.lessonsportal.presentation.editor

import android.net.Uri
import androidx.lifecycle.SavedStateHandle
import androidx.paging.PagingData
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import ru.samoh.lessonsportal.domain.model.*
import ru.samoh.lessonsportal.domain.repository.*
import ru.samoh.lessonsportal.domain.usecase.*
import ru.samoh.lessonsportal.testing.MainDispatcherRule

@OptIn(ExperimentalCoroutinesApi::class)
class ArticleEditorViewModelTest {
    @get:Rule val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun changesAreAutosavedAfterDebounce() = runTest {
        val drafts = FakeDraftRepository()
        val viewModel = createViewModel(FakeArticlesRepository(), drafts)
        runCurrent()
        viewModel.setTitle("Новая статья")
        viewModel.setCategory("category-id")
        viewModel.setContent("Текст")
        advanceTimeBy(1_001)
        runCurrent()

        assertEquals("Новая статья", drafts.saved?.title)
        assertEquals("category-id", drafts.saved?.categoryId)
    }

    @Test
    fun createsArticleAsHtmlAndSubmitsIt() = runTest {
        val articles = FakeArticlesRepository()
        val drafts = FakeDraftRepository()
        val viewModel = createViewModel(articles, drafts)
        runCurrent()
        viewModel.setTitle("Новая статья")
        viewModel.setCategory("category-id")
        viewModel.setContent("## Раздел")

        viewModel.saveToServer(submit = true)
        runCurrent()

        assertTrue(articles.createdContent?.contains("<h2>Раздел</h2>") == true)
        assertEquals("article-id", articles.submittedId)
        assertTrue(viewModel.state.value.submitted)
        assertNotNull(drafts.deletedId)
    }

    private fun createViewModel(articles: FakeArticlesRepository, drafts: FakeDraftRepository) = ArticleEditorViewModel(
        GetCategoriesUseCase(FakeCategoriesRepository()), GetArticleDetailUseCase(articles),
        GetDraftUseCase(drafts), SaveDraftUseCase(drafts), DeleteDraftUseCase(drafts),
        CreateArticleUseCase(articles), UpdateArticleUseCase(articles), DeleteArticleUseCase(articles), SubmitArticleUseCase(articles),
        UploadImageUseCase(FakeUploadsRepository()), ImportPdfUseCase(FakePdfRepository()),
        SavedStateHandle(mapOf("articleId" to "new", "draftId" to "none")),
    )

    private class FakeCategoriesRepository : CategoriesRepository {
        override suspend fun getCategories(forceRefresh: Boolean) = Result.success(listOf(Category("category-id", "Категория", "category")))
    }
    private class FakeDraftRepository : DraftRepository {
        private val drafts = MutableStateFlow<List<DraftArticle>>(emptyList())
        var saved: DraftArticle? = null
        var deletedId: String? = null
        override fun observeDrafts(): Flow<List<DraftArticle>> = drafts
        override suspend fun get(id: String?, articleId: String?): DraftArticle? = null
        override suspend fun save(draft: DraftArticle) { saved = draft }
        override suspend fun delete(id: String) { deletedId = id }
    }
    private class FakeArticlesRepository : ArticlesRepository {
        var createdContent: String? = null
        var submittedId: String? = null
        private val article = Article("article-id", "Статья", "article", "", ArticleStatus.DRAFT, Author("a", "Автор"), Category("category-id", "Категория", "category"), "2026", null, null, emptyList())
        override fun getArticles(categoryId: String?, search: String?): Flow<PagingData<ArticleListItem>> = emptyFlow()
        override suspend fun getArticle(id: String) = Result.success(article)
        override suspend fun createArticle(title: String, content: String, categoryId: String): Result<Article> { createdContent = content; return Result.success(article.copy(title = title, content = content)) }
        override suspend fun updateArticle(id: String, title: String, content: String, categoryId: String) = Result.success(article.copy(title = title, content = content))
        override suspend fun deleteArticle(id: String) = Result.success(Unit)
        override suspend fun submitArticle(id: String): Result<Article> { submittedId = id; return Result.success(article.copy(status = ArticleStatus.PENDING)) }
        override suspend fun getMyArticles() = Result.success(listOf(article))
    }
    private class FakeUploadsRepository : UploadsRepository { override suspend fun uploadImage(uri: Uri) = Result.success("/api/uploads/image.jpg") }
    private class FakePdfRepository : PdfImportRepository { override suspend fun importPdf(uri: Uri) = Result.success(PdfImportResult("<p>x</p>", "x", null)) }
}
