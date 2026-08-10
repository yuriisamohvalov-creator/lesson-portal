package ru.samoh.lessonsportal.presentation.moderation

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.pullrefresh.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import ru.samoh.lessonsportal.domain.model.Article

@OptIn(ExperimentalMaterialApi::class, ExperimentalMaterial3Api::class)
@Composable fun ModerationScreen(state: ModerationUiState, onBack: () -> Unit, onRefresh: () -> Unit, onApprove: (String) -> Unit, onReject: (String, String) -> Unit, onMessageShown: () -> Unit) {
    var rejecting by remember { mutableStateOf<Article?>(null) }
    val snackbar = remember { SnackbarHostState() }
    LaunchedEffect(state.message) { state.message?.let { snackbar.showSnackbar(it); onMessageShown() } }
    rejecting?.let { article -> RejectDialog(article.title, { rejecting = null }) { onReject(article.id, it); rejecting = null } }
    Scaffold(topBar = { TopAppBar(title = { Text("Модерация") }, navigationIcon = { TextButton(onClick = onBack) { Text("Назад") } }) }, snackbarHost = { SnackbarHost(snackbar) }) { padding ->
        val pull = rememberPullRefreshState(state.loading, onRefresh)
        Box(Modifier.fillMaxSize().padding(padding).pullRefresh(pull)) {
            when {
                state.loading && state.articles.isEmpty() -> CircularProgressIndicator(Modifier.align(Alignment.Center))
                state.error != null && state.articles.isEmpty() -> Column(Modifier.align(Alignment.Center), horizontalAlignment = Alignment.CenterHorizontally) { Text(state.error); Button(onClick = onRefresh) { Text("Повторить") } }
                state.articles.isEmpty() -> Text("Очередь модерации пуста", Modifier.align(Alignment.Center))
                else -> LazyColumn(contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(state.articles, key = { it.id }) { article -> ModerationArticleCard(article, state.actingId == article.id, { onApprove(article.id) }, { rejecting = article }) }
                }
            }
            PullRefreshIndicator(state.loading, pull, Modifier.align(Alignment.TopCenter))
        }
    }
}

@Composable private fun ModerationArticleCard(article: Article, busy: Boolean, approve: () -> Unit, reject: () -> Unit) {
    Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(article.title, style = MaterialTheme.typography.titleMedium)
        Text("${article.author.displayName} • ${article.createdAt.take(10)}", style = MaterialTheme.typography.bodySmall)
        Text(article.content.orEmpty().replace(Regex("<[^>]*>"), " ").replace(Regex("\\s+"), " "), maxLines = 3, overflow = TextOverflow.Ellipsis)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = approve, enabled = !busy, colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32))) { Text("Одобрить") }
            Button(onClick = reject, enabled = !busy, colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)) { Text("Отклонить") }
        }
    } }
}

@Composable private fun RejectDialog(title: String, dismiss: () -> Unit, reject: (String) -> Unit) {
    var reason by remember { mutableStateOf("") }
    AlertDialog(onDismissRequest = dismiss, title = { Text("Отклонить «$title»") }, text = { OutlinedTextField(reason, { reason = it }, label = { Text("Причина") }, minLines = 3) }, confirmButton = { TextButton(onClick = { reject(reason) }, enabled = reason.trim().length >= 5) { Text("Отклонить") } }, dismissButton = { TextButton(onClick = dismiss) { Text("Отмена") } })
}
