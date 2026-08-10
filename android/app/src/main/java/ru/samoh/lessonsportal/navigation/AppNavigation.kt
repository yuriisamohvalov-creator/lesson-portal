package ru.samoh.lessonsportal.navigation

import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.res.stringResource
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import ru.samoh.lessonsportal.R
import ru.samoh.lessonsportal.presentation.auth.AuthViewModel
import ru.samoh.lessonsportal.presentation.auth.LoginScreen
import ru.samoh.lessonsportal.presentation.auth.RegisterScreen

@Composable
fun AppNavigation(viewModel: AuthViewModel) {
    val isAuthenticated by viewModel.isAuthenticated.collectAsState(initial = false)
    val state by viewModel.state.collectAsState()
    val navController = rememberNavController()

    if (isAuthenticated) {
        Text(stringResource(R.string.main_placeholder))
        return
    }

    NavHost(navController = navController, startDestination = "login") {
        composable("login") { LoginScreen(state, viewModel::login) { navController.navigate("register") } }
        composable("register") { RegisterScreen(state, viewModel::register) { navController.popBackStack() } }
    }
}
