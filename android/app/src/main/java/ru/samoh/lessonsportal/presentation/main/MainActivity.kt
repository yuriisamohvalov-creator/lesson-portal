package ru.samoh.lessonsportal.presentation.main

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import dagger.hilt.android.AndroidEntryPoint
import ru.samoh.lessonsportal.navigation.AppNavigation
import ru.samoh.lessonsportal.presentation.auth.AuthViewModel
import ru.samoh.lessonsportal.presentation.theme.LessonsPortalTheme
import androidx.compose.material3.windowsizeclass.calculateWindowSizeClass
import androidx.compose.material3.windowsizeclass.ExperimentalMaterial3WindowSizeClassApi

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    private val authViewModel: AuthViewModel by viewModels()

    @OptIn(ExperimentalMaterial3WindowSizeClassApi::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            val windowSize = calculateWindowSizeClass(this)
            LessonsPortalTheme { AppNavigation(authViewModel, windowSize.widthSizeClass) }
        }
    }
}
