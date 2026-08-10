package ru.samoh.lessonsportal.presentation.admin

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.pullrefresh.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ru.samoh.lessonsportal.domain.model.*

@OptIn(ExperimentalMaterialApi::class, ExperimentalMaterial3Api::class)
@Composable fun AdminScreen(state: AdminUiState, onBack: () -> Unit, onRefresh: () -> Unit, onRole: (String, UserRole) -> Unit, onBlocked: (String, Boolean) -> Unit, onSaveCategory: (String?, String) -> Unit, onMessageShown: () -> Unit) {
    var tab by remember { mutableIntStateOf(0) }; var categoryDialog by remember { mutableStateOf<Category?>(null) }; var creating by remember { mutableStateOf(false) }
    val snackbar = remember { SnackbarHostState() }; LaunchedEffect(state.message) { state.message?.let { snackbar.showSnackbar(it); onMessageShown() } }
    if (creating || categoryDialog != null) CategoryDialog(categoryDialog, { creating = false; categoryDialog = null }) { id, name -> onSaveCategory(id, name); creating = false; categoryDialog = null }
    Scaffold(topBar = { TopAppBar(title = { Text("Админ-панель") }, navigationIcon = { TextButton(onClick = onBack) { Text("Назад") } }) }, floatingActionButton = { if (tab == 1) FloatingActionButton(onClick = { creating = true }) { Text("+") } }, snackbarHost = { SnackbarHost(snackbar) }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            TabRow(tab) { Tab(tab == 0, { tab = 0 }, text = { Text("Пользователи") }); Tab(tab == 1, { tab = 1 }, text = { Text("Категории") }) }
            state.error?.let { Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(12.dp)) }
            val pull = rememberPullRefreshState(state.loading, onRefresh)
            Box(Modifier.fillMaxSize().pullRefresh(pull)) {
                if (state.loading && state.users.isEmpty()) CircularProgressIndicator(Modifier.align(Alignment.Center))
                else if (tab == 0) UsersTab(state.users, onRole, onBlocked) else CategoriesTab(state.categories) { categoryDialog = it }
                PullRefreshIndicator(state.loading, pull, Modifier.align(Alignment.TopCenter))
            }
        }
    }
}

@Composable private fun UsersTab(users: List<User>, onRole: (String, UserRole) -> Unit, onBlocked: (String, Boolean) -> Unit) = LazyColumn(contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
    items(users, key = { it.id }) { user -> var menu by remember { mutableStateOf(false) }; Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(14.dp)) {
        Text(user.displayName, style = MaterialTheme.typography.titleMedium); Text(user.email); Text("${user.role.label()} • ${if (user.isBlocked) "Заблокирован" else "Активен"}")
        Box { TextButton(onClick = { menu = true }) { Text("Действия") }; DropdownMenu(menu, { menu = false }) {
            UserRole.entries.forEach { role -> DropdownMenuItem(text = { Text("Роль: ${role.label()}") }, onClick = { menu = false; onRole(user.id, role) }, enabled = role != user.role) }
            DropdownMenuItem(text = { Text(if (user.isBlocked) "Разблокировать" else "Заблокировать") }, onClick = { menu = false; onBlocked(user.id, !user.isBlocked) })
        } }
    } } }
}

@Composable private fun CategoriesTab(categories: List<Category>, edit: (Category) -> Unit) = LazyColumn(contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
    items(categories, key = { it.id }) { category -> Card(Modifier.fillMaxWidth().clickable { edit(category) }) { Column(Modifier.padding(14.dp)) { Text(category.name, style = MaterialTheme.typography.titleMedium); Text(category.slug); Text("Статей: ${category.articleCount}") } } }
}

@Composable private fun CategoryDialog(category: Category?, dismiss: () -> Unit, save: (String?, String) -> Unit) {
    var name by remember(category) { mutableStateOf(category?.name.orEmpty()) }
    AlertDialog(onDismissRequest = dismiss, title = { Text(if (category == null) "Новая категория" else "Редактирование категории") }, text = { Column { OutlinedTextField(name, { name = it }, label = { Text("Название") }); Text("Slug: ${transliterate(name)}", style = MaterialTheme.typography.bodySmall) } }, confirmButton = { TextButton(onClick = { save(category?.id, name) }, enabled = name.isNotBlank() && transliterate(name).isNotBlank()) { Text("Сохранить") } }, dismissButton = { TextButton(onClick = dismiss) { Text("Отмена") } })
}

private fun UserRole.label() = when (this) { UserRole.USER -> "Пользователь"; UserRole.MODERATOR -> "Модератор"; UserRole.ADMIN -> "Администратор" }

@Composable fun AccessDeniedScreen(onBack: () -> Unit) { Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Column(horizontalAlignment = Alignment.CenterHorizontally) { Text("Доступ запрещён", style = MaterialTheme.typography.headlineSmall); Button(onClick = onBack) { Text("Назад") } } } }
