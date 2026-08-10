package ru.samoh.lessonsportal.presentation.editor

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import ru.samoh.lessonsportal.R
import ru.samoh.lessonsportal.presentation.components.HtmlContent
import ru.samoh.lessonsportal.worker.DraftSyncWorker

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ArticleEditorScreen(state: EditorUiState, viewModel: ArticleEditorViewModel, onBack: () -> Unit) {
    val context = LocalContext.current
    var preview by remember { mutableStateOf(false) }
    var categoriesExpanded by remember { mutableStateOf(false) }
    val imagePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { it?.let(viewModel::uploadImage) }
    val pdfPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { it?.let(viewModel::importPdf) }
    LaunchedEffect(state.submitted, state.deleted) { if (state.submitted || state.deleted) onBack() }

    if (state.loading) { Box(Modifier.fillMaxSize(), contentAlignment = androidx.compose.ui.Alignment.Center) { CircularProgressIndicator() }; return }
    Column(Modifier.fillMaxSize().padding(12.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = onBack) { Text(stringResource(R.string.back)) }
            Text(stringResource(if (state.articleId == null) R.string.new_article else R.string.edit_article), style = MaterialTheme.typography.titleLarge)
        }
        OutlinedTextField(state.title, viewModel::setTitle, label = { Text(stringResource(R.string.title)) }, modifier = Modifier.fillMaxWidth())
        ExposedDropdownMenuBox(expanded = categoriesExpanded, onExpandedChange = { categoriesExpanded = it }) {
            OutlinedTextField(
                value = state.categories.firstOrNull { it.id == state.categoryId }?.name.orEmpty(),
                onValueChange = {}, readOnly = true, label = { Text(stringResource(R.string.category)) },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(categoriesExpanded) },
                modifier = Modifier.menuAnchor().fillMaxWidth(),
            )
            ExposedDropdownMenu(expanded = categoriesExpanded, onDismissRequest = { categoriesExpanded = false }) {
                state.categories.forEach { category -> DropdownMenuItem(text = { Text(category.name) }, onClick = { viewModel.setCategory(category.id); categoriesExpanded = false }) }
            }
        }
        TabRow(selectedTabIndex = if (preview) 1 else 0) {
            Tab(!preview, onClick = { preview = false }, text = { Text(stringResource(R.string.editor)) })
            Tab(preview, onClick = { preview = true }, text = { Text(stringResource(R.string.preview)) })
        }
        if (preview) HtmlContent(markdownToHtml(state.content), Modifier.heightIn(min = 320.dp)) else {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                listOf("**B**" to "**текст**", "_I_" to "_текст_", "H2" to "\n## Заголовок\n", "•" to "\n- пункт", "🔗" to "[ссылка](https://)").forEach { (label, value) ->
                    OutlinedButton(onClick = { viewModel.appendMarkdown(value) }, contentPadding = PaddingValues(8.dp)) { Text(label) }
                }
            }
            OutlinedTextField(state.content, viewModel::setContent, label = { Text(stringResource(R.string.markdown)) }, modifier = Modifier.fillMaxWidth().heightIn(min = 320.dp))
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = { imagePicker.launch("image/*") }, enabled = !state.uploading) { Text(stringResource(R.string.image)) }
            OutlinedButton(onClick = { pdfPicker.launch("application/pdf") }, enabled = !state.uploading) { Text("PDF") }
        }
        state.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        Button(onClick = { viewModel.saveLocally(); DraftSyncWorker.enqueue(context) }, modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.save_draft)) }
        OutlinedButton(onClick = { viewModel.saveToServer(false) }, enabled = !state.saving, modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.save_server)) }
        Button(onClick = { viewModel.saveToServer(true) }, enabled = !state.saving, modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.submit_moderation)) }
        if (state.articleId != null) TextButton(onClick = viewModel::delete, modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.delete)) }
    }
}
