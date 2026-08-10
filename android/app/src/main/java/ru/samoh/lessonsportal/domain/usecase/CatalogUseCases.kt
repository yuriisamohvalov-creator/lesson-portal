package ru.samoh.lessonsportal.domain.usecase

import javax.inject.Inject
import ru.samoh.lessonsportal.domain.repository.*
import android.net.Uri

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
class CreateArticleUseCase @Inject constructor(private val repository: ArticlesRepository) {
    suspend operator fun invoke(title: String, content: String, categoryId: String) = repository.createArticle(title, content, categoryId)
}
class UpdateArticleUseCase @Inject constructor(private val repository: ArticlesRepository) {
    suspend operator fun invoke(id: String, title: String, content: String, categoryId: String) = repository.updateArticle(id, title, content, categoryId)
}
class DeleteArticleUseCase @Inject constructor(private val repository: ArticlesRepository) { suspend operator fun invoke(id: String) = repository.deleteArticle(id) }
class SubmitArticleUseCase @Inject constructor(private val repository: ArticlesRepository) { suspend operator fun invoke(id: String) = repository.submitArticle(id) }
class GetMyArticlesUseCase @Inject constructor(private val repository: ArticlesRepository) { suspend operator fun invoke() = repository.getMyArticles() }
class UploadImageUseCase @Inject constructor(private val repository: UploadsRepository) { suspend operator fun invoke(uri: Uri) = repository.uploadImage(uri) }
class ImportPdfUseCase @Inject constructor(private val repository: PdfImportRepository) { suspend operator fun invoke(uri: Uri) = repository.importPdf(uri) }
