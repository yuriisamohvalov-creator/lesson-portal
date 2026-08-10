package ru.samoh.lessonsportal.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import ru.samoh.lessonsportal.presentation.auth.AuthViewModel
import ru.samoh.lessonsportal.presentation.auth.LoginScreen
import ru.samoh.lessonsportal.presentation.auth.RegisterScreen

@Composable
fun AppNavigation(viewModel: AuthViewModel) {
    val isAuthenticated by viewModel.isAuthenticated.collectAsState(initial = false)
    val state by viewModel.state.collectAsState()
    val navController = rememberNavController()

    if (isAuthenticated) {
        CatalogNavigation()
        return
    }

    NavHost(navController = navController, startDestination = "login") {
        composable("login") { LoginScreen(state, viewModel::login) { navController.navigate("register") } }
        composable("register") { RegisterScreen(state, viewModel::register) { navController.popBackStack() } }
    }
}
