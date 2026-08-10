package ru.samoh.lessonsportal.domain.usecase

import javax.inject.Inject
import ru.samoh.lessonsportal.domain.model.DraftArticle
import ru.samoh.lessonsportal.domain.repository.DraftRepository

class ObserveDraftsUseCase @Inject constructor(private val repository: DraftRepository) { operator fun invoke() = repository.observeDrafts() }
class GetDraftUseCase @Inject constructor(private val repository: DraftRepository) { suspend operator fun invoke(id: String?, articleId: String?) = repository.get(id, articleId) }
class SaveDraftUseCase @Inject constructor(private val repository: DraftRepository) { suspend operator fun invoke(draft: DraftArticle) = repository.save(draft) }
class DeleteDraftUseCase @Inject constructor(private val repository: DraftRepository) { suspend operator fun invoke(id: String) = repository.delete(id) }
