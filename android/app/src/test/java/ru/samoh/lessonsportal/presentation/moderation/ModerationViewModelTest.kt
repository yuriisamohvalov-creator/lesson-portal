package ru.samoh.lessonsportal.presentation.moderation

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.*
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import ru.samoh.lessonsportal.domain.model.*
import ru.samoh.lessonsportal.domain.repository.ModerationRepository
import ru.samoh.lessonsportal.domain.usecase.*
import ru.samoh.lessonsportal.testing.MainDispatcherRule

@OptIn(ExperimentalCoroutinesApi::class) class ModerationViewModelTest {
    @get:Rule val rule = MainDispatcherRule()
    @Test fun loadsApprovesAndRejectsPendingArticles() = runTest {
        val repository = FakeRepository(); val vm = ModerationViewModel(GetPendingArticlesUseCase(repository), ApproveArticleUseCase(repository), RejectArticleUseCase(repository)); runCurrent()
        assertEquals(2, vm.state.value.articles.size)
        vm.approve("one"); runCurrent(); assertEquals(listOf("two"), vm.state.value.articles.map { it.id }); assertEquals("one", repository.approved)
        vm.reject("two", "Недостаточно данных"); runCurrent(); assertTrue(vm.state.value.articles.isEmpty()); assertEquals("Недостаточно данных", repository.reason)
    }
    @Test fun rejectsTooShortReasonLocally() = runTest {
        val repository = FakeRepository(); val vm = ModerationViewModel(GetPendingArticlesUseCase(repository), ApproveArticleUseCase(repository), RejectArticleUseCase(repository)); runCurrent(); vm.reject("one", "нет"); runCurrent()
        assertNull(repository.reason); assertNotNull(vm.state.value.error)
    }
    private class FakeRepository : ModerationRepository {
        var approved: String? = null; var reason: String? = null
        private val articles = listOf(article("one"), article("two"))
        override suspend fun getPendingArticles() = Result.success(articles)
        override suspend fun approveArticle(id: String) = Result.success(article(id).also { approved = id })
        override suspend fun rejectArticle(id: String, reason: String) = Result.success(article(id).also { this.reason = reason })
    }
    companion object { fun article(id: String) = Article(id, "Статья $id", id, "Текст", ArticleStatus.PENDING, Author("a", "Автор"), Category("c", "Категория", "cat"), "2026-01-01", null, null, emptyList()) }
}
