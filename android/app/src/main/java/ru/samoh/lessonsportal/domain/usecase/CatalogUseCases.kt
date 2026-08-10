package ru.samoh.lessonsportal.domain.usecase

import javax.inject.Inject
import ru.samoh.lessonsportal.domain.repository.*

class GetCategoriesUseCase @Inject constructor(private val repository: CategoriesRepository) {
    suspend operator fun invoke(forceRefresh: Boolean = false) = repository.getCategories(forceRefresh)
}
class GetArticlesUseCase @Inject constructor(private val repository: ArticlesRepository) {
    operator fun invoke(categoryId: String? = null, search: String? = null) = repository.getArticles(categoryId, search)
}
class GetArticleDetailUseCase @Inject constructor(private val repository: ArticlesRepository) {
    suspend operator fun invoke(id: String) = repository.getArticle(id)
}
class GetArticleCommentsUseCase @Inject constructor(private val repository: CommentsRepository) {
    suspend operator fun invoke(articleId: String) = repository.getComments(articleId)
}
class AddCommentUseCase @Inject constructor(private val repository: CommentsRepository) {
    suspend operator fun invoke(articleId: String, body: String) = repository.addComment(articleId, body)
}
