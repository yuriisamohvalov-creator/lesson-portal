package ru.samoh.lessonsportal.worker

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.*
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import ru.samoh.lessonsportal.data.local.DraftArticleDao
import ru.samoh.lessonsportal.domain.repository.ArticlesRepository

@HiltWorker
class DraftSyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val dao: DraftArticleDao,
    private val articles: ArticlesRepository,
) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        var retry = false
        dao.getUnsynced().forEach { draft ->
            val categoryId = draft.categoryId
            if (categoryId == null || draft.title.isBlank()) return@forEach
            val result = if (draft.articleId == null) {
                articles.createArticle(draft.title, draft.content, categoryId)
            } else {
                articles.updateArticle(draft.articleId, draft.title, draft.content, categoryId)
            }
            result.onSuccess { dao.markSynced(draft.id, it.id) }
                .onFailure { error -> dao.markError(draft.id, error.message ?: "Sync failed"); retry = true }
        }
        return if (retry) Result.retry() else Result.success()
    }

    companion object {
        fun enqueue(context: Context) {
            val request = OneTimeWorkRequestBuilder<DraftSyncWorker>()
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .build()
            WorkManager.getInstance(context).enqueueUniqueWork("draft-sync", ExistingWorkPolicy.KEEP, request)
        }
    }
}
