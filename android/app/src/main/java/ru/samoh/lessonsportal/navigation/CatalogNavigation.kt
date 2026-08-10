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
            )
        }
        composable(
            route = "articles?categoryId={categoryId}",
            arguments = listOf(navArgument("categoryId") { type = NavType.StringType; defaultValue = "all" }),
        ) {
            val viewModel: ArticlesViewModel = hiltViewModel()
            ArticlesScreen(viewModel, onArticle = { navController.navigate("article/$it") }, onBack = { navController.popBackStack() })
        }
        composable(
            route = "article/{articleId}",
            arguments = listOf(navArgument("articleId") { type = NavType.StringType }),
        ) {
            val viewModel: ArticleDetailViewModel = hiltViewModel()
            val state by viewModel.state.collectAsState()
            ArticleDetailScreen(state, onBack = { navController.popBackStack() }, onRetry = viewModel::load, onAddComment = viewModel::addComment)
        }
    }
}
