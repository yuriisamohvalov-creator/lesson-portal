package ru.samoh.lessonsportal.presentation.main

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import dagger.hilt.android.AndroidEntryPoint
import ru.samoh.lessonsportal.navigation.AppNavigation
import ru.samoh.lessonsportal.presentation.auth.AuthViewModel
import ru.samoh.lessonsportal.presentation.theme.LessonsPortalTheme

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    private val authViewModel: AuthViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { LessonsPortalTheme { AppNavigation(authViewModel) } }
    }
}
