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
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.remember
import ru.samoh.lessonsportal.presentation.components.OfflineBanner
import ru.samoh.lessonsportal.presentation.components.rememberIsOnline

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    private val authViewModel: AuthViewModel by viewModels()

    @OptIn(ExperimentalMaterial3WindowSizeClassApi::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            val windowSize = calculateWindowSizeClass(this)
            LessonsPortalTheme {
                val globalSnackbar = remember { SnackbarHostState() }
                Box(Modifier.fillMaxSize()) {
                    AppNavigation(authViewModel, windowSize.widthSizeClass)
                    if (!rememberIsOnline()) OfflineBanner(Modifier.align(Alignment.TopCenter))
                    SnackbarHost(globalSnackbar, Modifier.align(Alignment.BottomCenter))
                }
            }
        }
    }
}
