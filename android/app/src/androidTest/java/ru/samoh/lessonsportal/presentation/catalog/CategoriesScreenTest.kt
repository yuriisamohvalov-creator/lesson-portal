package ru.samoh.lessonsportal.presentation.catalog

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import ru.samoh.lessonsportal.domain.model.Category
import ru.samoh.lessonsportal.presentation.theme.LessonsPortalTheme

class CategoriesScreenTest {
    @get:Rule val composeRule = createComposeRule()

    @Test
    fun categoryClickOpensSelectedCategory() {
        var selectedCategory: String? = null
        composeRule.setContent {
            LessonsPortalTheme {
                CategoriesScreen(
                    state = CategoriesUiState(loading = false, categories = listOf(Category("engine-id", "Двигатель", "engine", 3))),
                    onRefresh = {},
                    onCategory = { selectedCategory = it },
                    onAll = {},
                )
            }
        }

        composeRule.onNodeWithText("Двигатель").assertIsDisplayed().performClick()
        assertEquals("engine-id", selectedCategory)
    }
}
