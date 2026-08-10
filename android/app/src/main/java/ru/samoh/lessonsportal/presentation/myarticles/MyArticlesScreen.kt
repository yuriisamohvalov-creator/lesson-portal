package ru.samoh.lessonsportal.presentation.myarticles

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import ru.samoh.lessonsportal.R
import ru.samoh.lessonsportal.domain.model.ArticleStatus

@Composable
fun MyArticlesScreen(state: MyArticlesUiState, onSelect: (ArticleStatus) -> Unit, onRefresh: () -> Unit, onBack: () -> Unit, onNew: () -> Unit, onEditArticle: (String) -> Unit, onEditDraft: (String) -> Unit, onDeleteArticle: (String) -> Unit, onDeleteDraft: (String) -> Unit) {
    Column(Modifier.fillMaxSize()) {
        Row(Modifier.padding(8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = onBack) { Text(stringResource(R.string.back)) }
            Button(onClick = onNew) { Text(stringResource(R.string.new_article)) }
            TextButton(onClick = onRefresh) { Text(stringResource(R.string.retry)) }
        }
        ScrollableTabRow(selectedTabIndex = ArticleStatus.entries.indexOf(state.selectedStatus)) {
            ArticleStatus.entries.forEach { status -> Tab(state.selectedStatus == status, onClick = { onSelect(status) }, text = { Text(status.label()) }) }
        }
        if (state.loading) LinearProgressIndicator(Modifier.fillMaxWidth())
        state.error?.let { Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(12.dp)) }
        LazyColumn(contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            if (state.selectedStatus == ArticleStatus.DRAFT) {
                items(state.drafts, key = { "local-${it.id}" }) { draft ->
                    Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(14.dp)) { Text(draft.title.ifBlank { stringResource(R.string.untitled) }); Text(stringResource(R.string.local_draft)); Row { TextButton(onClick = { onEditDraft(draft.id) }) { Text(stringResource(R.string.edit_article)) }; TextButton(onClick = { onDeleteDraft(draft.id) }) { Text(stringResource(R.string.delete)) } } } }
                }
            }
            items(state.articles.filter { it.status == state.selectedStatus }, key = { it.id }) { article ->
                Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(14.dp)) { Text(article.title); Text(article.status.label()); Row { TextButton(onClick = { onEditArticle(article.id) }) { Text(stringResource(R.string.edit_article)) }; if (article.status == ArticleStatus.DRAFT || article.status == ArticleStatus.REJECTED) TextButton(onClick = { onDeleteArticle(article.id) }) { Text(stringResource(R.string.delete)) } } } }
            }
        }
    }
}

@Composable fun ArticleStatus.label() = when (this) {
    ArticleStatus.DRAFT -> stringResource(R.string.drafts)
    ArticleStatus.PENDING -> stringResource(R.string.pending)
    ArticleStatus.PUBLISHED -> stringResource(R.string.published)
    ArticleStatus.REJECTED -> stringResource(R.string.rejected)
}
