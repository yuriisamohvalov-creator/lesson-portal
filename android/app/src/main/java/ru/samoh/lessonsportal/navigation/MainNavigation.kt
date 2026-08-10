package ru.samoh.lessonsportal.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.*
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import androidx.paging.compose.collectAsLazyPagingItems
import ru.samoh.lessonsportal.presentation.catalog.*
import ru.samoh.lessonsportal.presentation.courses.*
import ru.samoh.lessonsportal.presentation.editor.*
import ru.samoh.lessonsportal.presentation.myarticles.*
import ru.samoh.lessonsportal.presentation.profile.*
import ru.samoh.lessonsportal.presentation.moderation.*
import ru.samoh.lessonsportal.presentation.admin.*
import ru.samoh.lessonsportal.domain.model.UserRole

private data class MainTab(val route: String, val label: String, val short: String)
private val mainTabs = listOf(
    MainTab("categories", "Каталог", "К"), MainTab("courses", "Курсы", "У"),
    MainTab("my_articles", "Мои статьи", "С"), MainTab("profile", "Профиль", "П"),
)

@Composable
fun MainNavigation(width: WindowWidthSizeClass) {
    val navController = rememberNavController()
    val entry by navController.currentBackStackEntryAsState()
    val route = entry?.destination?.route
    Scaffold(bottomBar = {
        NavigationBar {
            mainTabs.forEach { tab -> NavigationBarItem(
                selected = route == tab.route,
                onClick = { navController.navigate(tab.route) { popUpTo("categories") { saveState = true }; launchSingleTop = true; restoreState = true } },
                icon = { Text(tab.short) }, label = { Text(tab.label) },
            ) }
        }
    }) { padding ->
        NavHost(navController, "categories", modifier = androidx.compose.ui.Modifier.padding(padding)) {
            composable("categories") {
                val vm: CategoriesViewModel = hiltViewModel(); val state by vm.state.collectAsState()
                CategoriesScreen(state, { vm.refresh() }, { navController.navigate("articles?categoryId=$it") }, { navController.navigate("articles?categoryId=all") }, { navController.navigate("my_articles") }, { navController.navigate("editor?articleId=new&draftId=none") })
            }
            composable("articles?categoryId={categoryId}", listOf(navArgument("categoryId") { type = NavType.StringType; defaultValue = "all" })) {
                val vm: ArticlesViewModel = hiltViewModel()
                ArticlesScreen(vm, { navController.navigate("article/$it") }, { navController.navigate("editor?articleId=new&draftId=none") }, { navController.popBackStack() })
            }
            composable("article/{articleId}", listOf(navArgument("articleId") { type = NavType.StringType })) {
                val vm: ArticleDetailViewModel = hiltViewModel(); val state by vm.state.collectAsState()
                ArticleDetailScreen(state, { navController.popBackStack() }, vm::load, vm::refreshComments, vm::addComment)
            }
            composable("courses") {
                val vm: CoursesViewModel = hiltViewModel()
                CoursesScreen(vm.courses.collectAsLazyPagingItems(), width) { navController.navigate("course/$it") }
            }
            composable("course/{courseId}", listOf(navArgument("courseId") { type = NavType.StringType })) {
                val vm: CourseDetailViewModel = hiltViewModel(); val state by vm.state.collectAsState()
                CourseDetailScreen(state) { navController.navigate("article/$it") }
            }
            composable("my_articles") {
                val vm: MyArticlesViewModel = hiltViewModel(); val state by vm.state.collectAsState()
                MyArticlesScreen(state, vm::select, vm::refresh, { navController.navigate("categories") }, { navController.navigate("editor?articleId=new&draftId=none") }, { navController.navigate("editor?articleId=$it&draftId=none") }, { navController.navigate("editor?articleId=new&draftId=$it") }, vm::deleteArticle, vm::deleteDraft)
            }
            composable("editor?articleId={articleId}&draftId={draftId}", listOf(
                navArgument("articleId") { type = NavType.StringType; defaultValue = "new" },
                navArgument("draftId") { type = NavType.StringType; defaultValue = "none" },
            )) {
                val vm: ArticleEditorViewModel = hiltViewModel(); val state by vm.state.collectAsState()
                ArticleEditorScreen(state, vm) { navController.popBackStack() }
            }
            composable("profile") {
                val vm: ProfileViewModel = hiltViewModel(); val state by vm.state.collectAsState()
                ProfileScreen(state, vm::load, { navController.navigate("profile/edit") }, { navController.navigate("moderation") }, { navController.navigate("admin") }, vm::logout)
            }
            composable("profile/edit") {
                val vm: ProfileViewModel = hiltViewModel(); val state by vm.state.collectAsState()
                LaunchedEffect(state.updated) { if (state.updated) navController.navigate("profile") { popUpTo("profile") { inclusive = true } } }
                EditProfileScreen(state, vm::update) { navController.popBackStack() }
            }
            composable("moderation") {
                val profile: ProfileViewModel = hiltViewModel(); val profileState by profile.state.collectAsState()
                when {
                    profileState.loading -> CircularProgressIndicator()
                    profileState.user?.role !in listOf(UserRole.MODERATOR, UserRole.ADMIN) -> AccessDeniedScreen { navController.popBackStack() }
                    else -> { val vm: ModerationViewModel = hiltViewModel(); val state by vm.state.collectAsState(); ModerationScreen(state, { navController.popBackStack() }, vm::refresh, vm::approve, vm::reject, vm::consumeMessage) }
                }
            }
            composable("admin") {
                val profile: ProfileViewModel = hiltViewModel(); val profileState by profile.state.collectAsState()
                when {
                    profileState.loading -> CircularProgressIndicator()
                    profileState.user?.role != UserRole.ADMIN -> AccessDeniedScreen { navController.popBackStack() }
                    else -> { val vm: AdminViewModel = hiltViewModel(); val state by vm.state.collectAsState(); AdminScreen(state, { navController.popBackStack() }, vm::refresh, vm::changeRole, vm::setBlocked, vm::saveCategory, vm::consumeMessage) }
                }
            }
        }
    }
}
