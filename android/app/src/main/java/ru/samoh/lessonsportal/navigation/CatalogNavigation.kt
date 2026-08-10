package ru.samoh.lessonsportal.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import ru.samoh.lessonsportal.presentation.catalog.*
import ru.samoh.lessonsportal.presentation.editor.ArticleEditorScreen
import ru.samoh.lessonsportal.presentation.editor.ArticleEditorViewModel
import ru.samoh.lessonsportal.presentation.myarticles.MyArticlesScreen
import ru.samoh.lessonsportal.presentation.myarticles.MyArticlesViewModel

@Composable
fun CatalogNavigation() {
    val navController = rememberNavController()
    NavHost(navController, startDestination = "categories") {
        composable("categories") {
            val viewModel: CategoriesViewModel = hiltViewModel()
            val state by viewModel.state.collectAsState()
            CategoriesScreen(
                state = state,
                onRefresh = { viewModel.refresh() },
                onCategory = { navController.navigate("articles?categoryId=$it") },
                onAll = { navController.navigate("articles?categoryId=all") },
                onMyArticles = { navController.navigate("my_articles") },
                onNewArticle = { navController.navigate("editor?articleId=new&draftId=none") },
            )
        }
        composable(
            route = "articles?categoryId={categoryId}",
            arguments = listOf(navArgument("categoryId") { type = NavType.StringType; defaultValue = "all" }),
        ) {
            val viewModel: ArticlesViewModel = hiltViewModel()
            ArticlesScreen(viewModel, onArticle = { navController.navigate("article/$it") }, onNewArticle = { navController.navigate("editor?articleId=new&draftId=none") }, onBack = { navController.popBackStack() })
        }
        composable("my_articles") {
            val viewModel: MyArticlesViewModel = hiltViewModel()
            val state by viewModel.state.collectAsState()
            MyArticlesScreen(
                state, viewModel::select, viewModel::refresh,
                onBack = { navController.popBackStack() },
                onNew = { navController.navigate("editor?articleId=new&draftId=none") },
                onEditArticle = { navController.navigate("editor?articleId=$it&draftId=none") },
                onEditDraft = { navController.navigate("editor?articleId=new&draftId=$it") },
                onDeleteArticle = viewModel::deleteArticle,
                onDeleteDraft = viewModel::deleteDraft,
            )
        }
        composable(
            route = "editor?articleId={articleId}&draftId={draftId}",
            arguments = listOf(
                navArgument("articleId") { type = NavType.StringType; defaultValue = "new" },
                navArgument("draftId") { type = NavType.StringType; defaultValue = "none" },
            ),
        ) {
            val viewModel: ArticleEditorViewModel = hiltViewModel()
            val state by viewModel.state.collectAsState()
            ArticleEditorScreen(state, viewModel) { navController.popBackStack() }
        }
        composable(
            route = "article/{articleId}",
            arguments = listOf(navArgument("articleId") { type = NavType.StringType }),
        ) {
            val viewModel: ArticleDetailViewModel = hiltViewModel()
            val state by viewModel.state.collectAsState()
            ArticleDetailScreen(state, onBack = { navController.popBackStack() }, onRetry = viewModel::load, onRefreshComments = viewModel::refreshComments, onAddComment = viewModel::addComment)
        }
    }
}
