package ru.samoh.lessonsportal.presentation.profile

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import ru.samoh.lessonsportal.R
import ru.samoh.lessonsportal.domain.model.UserRole

@Composable
fun ProfileScreen(state: ProfileUiState, onRetry: () -> Unit, onEdit: () -> Unit, onModeration: () -> Unit, onAdmin: () -> Unit, onLogout: () -> Unit) {
    var confirmLogout by remember { mutableStateOf(false) }
    if (confirmLogout) AlertDialog(
        onDismissRequest = { confirmLogout = false },
        title = { Text(stringResource(R.string.logout_confirmation_title)) },
        text = { Text(stringResource(R.string.logout_confirmation_message)) },
        confirmButton = { TextButton(onClick = { confirmLogout = false; onLogout() }) { Text(stringResource(R.string.logout)) } },
        dismissButton = { TextButton(onClick = { confirmLogout = false }) { Text(stringResource(R.string.cancel)) } },
    )
    when {
        state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        state.user == null -> Column(Modifier.padding(24.dp)) { Text(state.error ?: stringResource(R.string.profile_not_found)); Button(onClick = onRetry) { Text(stringResource(R.string.retry)) } }
        else -> Column(Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Surface(shape = MaterialTheme.shapes.extraLarge, color = MaterialTheme.colorScheme.primaryContainer, modifier = Modifier.size(88.dp)) {
                Box(contentAlignment = Alignment.Center) { Text(state.user.displayName.take(2).uppercase(), style = MaterialTheme.typography.headlineMedium) }
            }
            Text(state.user.displayName, style = MaterialTheme.typography.headlineSmall)
            Text(state.user.email)
            AssistChip(onClick = {}, label = { Text(state.user.role.label()) })
            Button(onClick = onEdit, modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.edit_profile)) }
            if (state.user.role == UserRole.MODERATOR || state.user.role == UserRole.ADMIN) OutlinedButton(onClick = onModeration, modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.moderation)) }
            if (state.user.role == UserRole.ADMIN) OutlinedButton(onClick = onAdmin, modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.admin_panel)) }
            TextButton(onClick = { confirmLogout = true }, modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.logout)) }
            state.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        }
    }
}

@Composable
fun EditProfileScreen(state: ProfileUiState, onSave: (String) -> Unit, onBack: () -> Unit) {
    var name by remember(state.user?.displayName) { mutableStateOf(state.user?.displayName.orEmpty()) }
    Column(Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        OutlinedButton(onClick = onBack) { Text(stringResource(R.string.back)) }
        Text(stringResource(R.string.edit_profile), style = MaterialTheme.typography.headlineSmall)
        OutlinedTextField(name, { name = it }, label = { Text(stringResource(R.string.display_name)) }, modifier = Modifier.fillMaxWidth(), supportingText = { Text("${name.length}/100") })
        Button(onClick = { onSave(name) }, enabled = name.isNotBlank() && name.length <= 100 && !state.saving, modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.save)) }
        state.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
    }
}

fun UserRole.label() = when (this) {
    UserRole.USER -> "Пользователь"
    UserRole.MODERATOR -> "Модератор"
    UserRole.ADMIN -> "Администратор"
}
