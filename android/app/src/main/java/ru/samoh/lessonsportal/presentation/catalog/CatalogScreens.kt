package ru.samoh.lessonsportal.presentation.catalog

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.pullrefresh.PullRefreshIndicator
import androidx.compose.material.pullrefresh.pullRefresh
import androidx.compose.material.pullrefresh.rememberPullRefreshState
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.paging.LoadState
import androidx.paging.compose.LazyPagingItems
import androidx.paging.compose.collectAsLazyPagingItems
import ru.samoh.lessonsportal.domain.model.*
import ru.samoh.lessonsportal.R
import ru.samoh.lessonsportal.presentation.components.HtmlContent
import ru.samoh.lessonsportal.presentation.components.YouTubePlayer
import ru.samoh.lessonsportal.presentation.components.extractYouTubeId

@Composable
@OptIn(ExperimentalMaterialApi::class)
fun CategoriesScreen(state: CategoriesUiState, onRefresh: () -> Unit, onCategory: (String) -> Unit, onAll: () -> Unit) {
    when {
        state.loading && state.categories.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = androidx.compose.ui.Alignment.Center) { CircularProgressIndicator() }
        state.error != null && state.categories.isEmpty() -> ErrorState(state.error, onRefresh)
        else -> {
          val pullState = rememberPullRefreshState(state.loading, onRefresh)
          Box(Modifier.fillMaxSize().pullRefresh(pullState)) {
          Column(Modifier.fillMaxSize()) {
            Text(stringResource(R.string.catalog), style = MaterialTheme.typography.headlineMedium, modifier = Modifier.padding(16.dp))
            OutlinedButton(onClick = onAll, modifier = Modifier.padding(horizontal = 16.dp).fillMaxWidth()) { Text(stringResource(R.string.all_articles)) }
            LazyVerticalGrid(columns = GridCells.Fixed(2), contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(state.categories, key = { it.id }) { category ->
                    Card(Modifier.fillMaxWidth().clickable { onCategory(category.id) }) {
                        Column(Modifier.padding(16.dp)) {
                            Text(category.name, fontWeight = FontWeight.SemiBold)
                            Text(stringResource(R.string.article_count, category.articleCount), style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
          }
          PullRefreshIndicator(state.loading, pullState, Modifier.align(androidx.compose.ui.Alignment.TopCenter))
          }
        }
    }
}

@Composable
@OptIn(ExperimentalMaterialApi::class)
fun ArticlesScreen(viewModel: ArticlesViewModel, onArticle: (String) -> Unit, onBack: () -> Unit) {
    val query by viewModel.searchQuery.collectAsState()
    val articles = viewModel.articles.collectAsLazyPagingItems()
    val refreshing = articles.loadState.refresh is LoadState.Loading
    val pullState = rememberPullRefreshState(refreshing, articles::refresh)
    Box(Modifier.fillMaxSize().pullRefresh(pullState)) {
      Column(Modifier.fillMaxSize()) {
        Row(Modifier.fillMaxWidth().padding(8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = onBack) { Text(stringResource(R.string.back)) }
            OutlinedTextField(query, viewModel::setSearch, label = { Text(stringResource(R.string.article_search)) }, singleLine = true, modifier = Modifier.weight(1f))
        }
        ArticleList(articles, onArticle)
      }
      PullRefreshIndicator(refreshing, pullState, Modifier.align(androidx.compose.ui.Alignment.TopCenter))
    }
}

@Composable
private fun ArticleList(articles: LazyPagingItems<ArticleListItem>, onArticle: (String) -> Unit) {
    when (val refresh = articles.loadState.refresh) {
        is LoadState.Loading -> Box(Modifier.fillMaxSize(), contentAlignment = androidx.compose.ui.Alignment.Center) { CircularProgressIndicator() }
        is LoadState.Error -> ErrorState(refresh.error.message ?: stringResource(R.string.loading_error)) { articles.retry() }
        else -> if (articles.itemCount == 0) Box(Modifier.fillMaxSize(), contentAlignment = androidx.compose.ui.Alignment.Center) { Text(stringResource(R.string.articles_empty)) }
        else LazyColumn(contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(articles.itemCount, key = { index -> articles.peek(index)?.id ?: index }) { index ->
                articles[index]?.let { ArticleCard(it) { onArticle(it.id) } }
            }
            if (articles.loadState.append is LoadState.Loading) item { LinearProgressIndicator(Modifier.fillMaxWidth()) }
        }
    }
}

@Composable
private fun ArticleCard(article: ArticleListItem, onClick: () -> Unit) {
    Card(Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(article.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Text("${article.author.displayName} • ${article.createdAt.take(10)}", style = MaterialTheme.typography.bodySmall)
            Text(article.category.name, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.labelMedium)
        }
    }
}

@Composable
fun ArticleDetailScreen(state: ArticleDetailUiState, onBack: () -> Unit, onRetry: () -> Unit, onAddComment: (String) -> Unit) {
    when {
        state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = androidx.compose.ui.Alignment.Center) { CircularProgressIndicator() }
        state.article == null -> ErrorState(state.error ?: stringResource(R.string.article_not_found), onRetry)
        else -> {
            val article = state.article
            var comment by remember { mutableStateOf("") }
            LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                item { OutlinedButton(onClick = onBack) { Text(stringResource(R.string.back)) } }
                if (article.isOffline) item { AssistChip(onClick = {}, label = { Text(stringResource(R.string.offline_version)) }) }
                item { Text(article.title, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold) }
                item { Text("${article.author.displayName} • ${article.category.name} • ${(article.publishedAt ?: article.createdAt).take(10)}") }
                article.content?.let { html -> item { HtmlContent(html) } }
                items(article.videos, key = { it.id }) { video -> video.youtubeUrl?.let(::extractYouTubeId)?.let { YouTubePlayer(it) } }
                item { Text(stringResource(R.string.comments), style = MaterialTheme.typography.titleLarge) }
                items(state.comments, key = { it.id }) { item ->
                    Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(12.dp)) { Text(item.author.displayName, fontWeight = FontWeight.SemiBold); Text(item.body); Text(item.createdAt.take(10), style = MaterialTheme.typography.bodySmall) } }
                }
                item {
                    OutlinedTextField(comment, { comment = it }, label = { Text(stringResource(R.string.comment)) }, modifier = Modifier.fillMaxWidth())
                    Button(onClick = { onAddComment(comment); comment = "" }, enabled = comment.isNotBlank() && !state.submittingComment, modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) { Text(stringResource(R.string.send)) }
                    state.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                }
            }
        }
    }
}

@Composable
private fun ErrorState(message: String, retry: () -> Unit) {
    Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center) {
        Text(message, color = MaterialTheme.colorScheme.error)
        Button(onClick = retry, modifier = Modifier.padding(top = 12.dp)) { Text(stringResource(R.string.retry)) }
    }
}
