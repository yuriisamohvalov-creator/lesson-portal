package ru.samoh.lessonsportal.presentation.catalog

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import ru.samoh.lessonsportal.domain.model.Category
import ru.samoh.lessonsportal.domain.repository.CategoriesRepository
import ru.samoh.lessonsportal.domain.usecase.GetCategoriesUseCase
import ru.samoh.lessonsportal.testing.MainDispatcherRule

@OptIn(ExperimentalCoroutinesApi::class)
class CatalogViewModelTest {
    @get:Rule val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun loadsCategoriesAndSupportsForcedRefresh() = runTest {
        val repository = FakeCategoriesRepository()
        val viewModel = CategoriesViewModel(GetCategoriesUseCase(repository))
        runCurrent()

        assertEquals("Двигатель", viewModel.state.value.categories.single().name)
        viewModel.refresh()
        runCurrent()
        assertEquals(true, repository.lastForceRefresh)
    }

    private class FakeCategoriesRepository : CategoriesRepository {
        var lastForceRefresh = false
        override suspend fun getCategories(forceRefresh: Boolean): Result<List<Category>> {
            lastForceRefresh = forceRefresh
            return Result.success(listOf(Category("id", "Двигатель", "engine", 2)))
        }
    }
}
