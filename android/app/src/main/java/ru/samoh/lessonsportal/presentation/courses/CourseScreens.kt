package ru.samoh.lessonsportal.presentation.courses

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material.pullrefresh.PullRefreshIndicator
import androidx.compose.material.pullrefresh.pullRefresh
import androidx.compose.material.pullrefresh.rememberPullRefreshState
import androidx.compose.material3.*
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.paging.LoadState
import androidx.paging.compose.LazyPagingItems
import ru.samoh.lessonsportal.R
import ru.samoh.lessonsportal.domain.model.ArticleStatus
import ru.samoh.lessonsportal.domain.model.Course
import ru.samoh.lessonsportal.presentation.components.ListSkeleton
import ru.samoh.lessonsportal.presentation.components.DetailSkeleton
import ru.samoh.lessonsportal.presentation.components.EmptyState

@OptIn(androidx.compose.material.ExperimentalMaterialApi::class)
@Composable
fun CoursesScreen(courses: LazyPagingItems<Course>, width: WindowWidthSizeClass, onCourse: (String) -> Unit) {
    when (val refresh = courses.loadState.refresh) {
        is LoadState.Loading -> ListSkeleton()
        is LoadState.Error -> Column(Modifier.padding(24.dp)) { Text(refresh.error.message ?: stringResource(R.string.loading_error)); Button(onClick = courses::retry) { Text(stringResource(R.string.retry)) } }
        else -> if (courses.itemCount == 0) EmptyState(stringResource(R.string.courses_empty)) else {
            val refreshing = courses.loadState.refresh is LoadState.Loading
            val pullRefreshState = rememberPullRefreshState(refreshing, courses::refresh)
            Box(Modifier.fillMaxSize().pullRefresh(pullRefreshState)) {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(if (width == WindowWidthSizeClass.Expanded) 2 else 1),
                    contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(courses.itemCount, key = { index -> courses.peek(index)?.id ?: index }) { index -> courses[index]?.let { CourseCard(it) { onCourse(it.id) } } }
                    if (courses.loadState.append is LoadState.Loading) item { LinearProgressIndicator(Modifier.fillMaxWidth()) }
                }
                PullRefreshIndicator(refreshing, pullRefreshState, Modifier.align(Alignment.TopCenter))
            }
        }
    }
}

@Composable
private fun CourseCard(course: Course, onClick: () -> Unit) {
    Card(Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(course.name, style = MaterialTheme.typography.titleLarge)
            course.description?.let { Text(it, maxLines = 2, overflow = TextOverflow.Ellipsis) }
            Text(stringResource(R.string.article_count, course.articles.count { it.status == ArticleStatus.PUBLISHED }), style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
fun CourseDetailScreen(state: CourseDetailUiState, onArticle: (String) -> Unit) {
    when {
        state.loading -> DetailSkeleton()
        state.course == null -> Text(state.error ?: stringResource(R.string.course_not_found), modifier = Modifier.padding(24.dp))
        else -> LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            item { Text(state.course.name, style = MaterialTheme.typography.headlineMedium) }
            state.course.description?.let { item { Text(it) } }
            val publishedArticles = state.course.articles.filter { it.status == ArticleStatus.PUBLISHED }
            items(publishedArticles.size, key = { publishedArticles[it].membershipId }) { index ->
                val item = publishedArticles[index]
                Card(Modifier.fillMaxWidth().clickable { onArticle(item.articleId) }) { Text("${item.order}. ${item.title}", modifier = Modifier.padding(16.dp)) }
            }
        }
    }
}
