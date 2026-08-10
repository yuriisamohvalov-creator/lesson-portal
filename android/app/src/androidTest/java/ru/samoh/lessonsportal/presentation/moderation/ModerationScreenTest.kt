package ru.samoh.lessonsportal.presentation.moderation

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import ru.samoh.lessonsportal.domain.model.*
import ru.samoh.lessonsportal.presentation.theme.LessonsPortalTheme

class ModerationScreenTest {
    @get:Rule val rule = createComposeRule()
    @Test fun approveInvokesArticleAction() {
        var approved: String? = null
        val article = Article("article-id", "Проверяемая статья", "article", "Текст", ArticleStatus.PENDING, Author("a", "Автор"), Category("c", "Категория", "cat"), "2026-01-01", null, null, emptyList())
        rule.setContent { LessonsPortalTheme { ModerationScreen(ModerationUiState(false, listOf(article)), {}, {}, { approved = it }, { _, _ -> }, {}) } }
        rule.onNodeWithText("Одобрить").performClick()
        assertEquals("article-id", approved)
    }
}
