package ru.samoh.lessonsportal.presentation.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp

@Composable fun ListSkeleton(rows: Int = 6) = LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
    items(rows) { Column(Modifier.fillMaxWidth().clip(MaterialTheme.shapes.medium).background(MaterialTheme.colorScheme.surfaceVariant).padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Box(Modifier.fillMaxWidth(.7f).height(20.dp).clip(MaterialTheme.shapes.small).background(MaterialTheme.colorScheme.outlineVariant))
        Box(Modifier.fillMaxWidth().height(14.dp).clip(MaterialTheme.shapes.small).background(MaterialTheme.colorScheme.outlineVariant))
        Box(Modifier.fillMaxWidth(.45f).height(14.dp).clip(MaterialTheme.shapes.small).background(MaterialTheme.colorScheme.outlineVariant))
    } }
}

@Composable fun DetailSkeleton() = Column(Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
    Box(Modifier.fillMaxWidth(.8f).height(32.dp).background(MaterialTheme.colorScheme.surfaceVariant))
    repeat(6) { Box(Modifier.fillMaxWidth(if (it == 5) .6f else 1f).height(16.dp).background(MaterialTheme.colorScheme.surfaceVariant)) }
}

@Composable fun EmptyState(text: String, modifier: Modifier = Modifier) = Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) { Text("○", style = MaterialTheme.typography.displayMedium, color = MaterialTheme.colorScheme.outline); Text(text) }
}
