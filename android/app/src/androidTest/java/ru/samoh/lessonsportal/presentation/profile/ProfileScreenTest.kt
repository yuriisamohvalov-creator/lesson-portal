package ru.samoh.lessonsportal.presentation.profile

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import ru.samoh.lessonsportal.domain.model.User
import ru.samoh.lessonsportal.domain.model.UserRole
import ru.samoh.lessonsportal.presentation.theme.LessonsPortalTheme

class ProfileScreenTest {
    @get:Rule val composeRule = createComposeRule()

    @Test
    fun editProfileButtonOpensEditor() {
        var editOpened = false
        composeRule.setContent {
            LessonsPortalTheme {
                ProfileScreen(
                    state = ProfileUiState(loading = false, user = User("id", "user@example.com", "Иван", UserRole.USER)),
                    onRetry = {},
                    onEdit = { editOpened = true },
                    onModeration = {},
                    onAdmin = {},
                    onLogout = {},
                )
            }
        }

        composeRule.onNodeWithText("Редактировать профиль").assertIsDisplayed().performClick()
        assertTrue(editOpened)
    }
}
