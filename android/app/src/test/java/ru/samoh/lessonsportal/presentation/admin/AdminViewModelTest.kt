package ru.samoh.lessonsportal.presentation.admin

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.*
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import ru.samoh.lessonsportal.domain.model.*
import ru.samoh.lessonsportal.domain.repository.*
import ru.samoh.lessonsportal.domain.usecase.*
import ru.samoh.lessonsportal.testing.MainDispatcherRule

@OptIn(ExperimentalCoroutinesApi::class) class AdminViewModelTest {
    @get:Rule val rule = MainDispatcherRule()
    @Test fun loadsUsersAndSupportsAllMutations() = runTest {
        val admin = FakeAdminRepository(); val vm = viewModel(admin); runCurrent(); assertEquals(1, vm.state.value.users.size); assertEquals(1, vm.state.value.categories.size)
        vm.changeRole("u", UserRole.MODERATOR); runCurrent(); assertEquals(UserRole.MODERATOR, vm.state.value.users.single().role)
        vm.setBlocked("u", true); runCurrent(); assertTrue(vm.state.value.users.single().isBlocked)
        vm.saveCategory(null, "Новая категория"); runCurrent(); assertTrue(vm.state.value.categories.any { it.slug == "novaya-kategoriya" })
        vm.saveCategory("c", "Обновлено"); runCurrent(); assertEquals("Обновлено", vm.state.value.categories.first { it.id == "c" }.name)
    }
    @Test fun transliteratesCategorySlug() { assertEquals("zamena-masla", transliterate("Замена масла")) }
    private fun viewModel(r: FakeAdminRepository) = AdminViewModel(GetUsersUseCase(r), ChangeUserRoleUseCase(r), SetUserBlockedUseCase(r), GetCategoriesUseCase(FakeCategoriesRepository()), CreateCategoryUseCase(r), UpdateCategoryUseCase(r))
    private class FakeCategoriesRepository : CategoriesRepository { override suspend fun getCategories(forceRefresh: Boolean) = Result.success(listOf(Category("c", "Старая", "staraya"))) }
    private class FakeAdminRepository : AdminRepository {
        private var user = User("u", "u@example.com", "Иван", UserRole.USER)
        override suspend fun getUsers() = Result.success(listOf(user))
        override suspend fun changeRole(userId: String, role: UserRole) = Result.success(user.copy(role = role).also { user = it })
        override suspend fun setBlocked(userId: String, blocked: Boolean) = Result.success(user.copy(isBlocked = blocked).also { user = it })
        override suspend fun createCategory(name: String, slug: String) = Result.success(Category("new", name, slug))
        override suspend fun updateCategory(id: String, name: String, slug: String) = Result.success(Category(id, name, slug))
    }
}
