package ru.samoh.lessonsportal.presentation.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColors = lightColorScheme(primary = PortalBlue, surface = PortalSurface)
private val DarkColors = darkColorScheme(primary = PortalBlueDark, surface = PortalSurfaceDark)

@Composable
fun LessonsPortalTheme(darkTheme: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = if (darkTheme) DarkColors else LightColors, typography = PortalTypography, content = content)
}
