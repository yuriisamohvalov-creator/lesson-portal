package ru.samoh.lessonsportal.data.repository

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import dagger.hilt.android.qualifiers.ApplicationContext
import java.io.ByteArrayOutputStream
import javax.inject.Inject
import javax.inject.Singleton
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import ru.samoh.lessonsportal.data.remote.api.PdfImportApi
import ru.samoh.lessonsportal.data.remote.api.UploadsApi
import ru.samoh.lessonsportal.data.remote.error.apiResult
import ru.samoh.lessonsportal.domain.repository.PdfImportRepository
import ru.samoh.lessonsportal.domain.repository.PdfImportResult
import ru.samoh.lessonsportal.domain.repository.UploadsRepository

@Singleton
class UploadsRepositoryImpl @Inject constructor(
    @ApplicationContext private val context: Context,
    private val api: UploadsApi,
) : UploadsRepository {
    override suspend fun uploadImage(uri: Uri): Result<String> = apiResult {
        val bitmap = context.contentResolver.openInputStream(uri)?.use(BitmapFactory::decodeStream)
            ?: error("Не удалось прочитать изображение")
        val scaled = scale(bitmap, 1920)
        val output = ByteArrayOutputStream()
        var quality = 90
        do {
            output.reset()
            scaled.compress(Bitmap.CompressFormat.JPEG, quality, output)
            quality -= 10
        } while (output.size() > 1024 * 1024 && quality >= 40)
        if (scaled !== bitmap) scaled.recycle()
        bitmap.recycle()
        val body = output.toByteArray().toRequestBody("image/jpeg".toMediaType())
        api.uploadImage(MultipartBody.Part.createFormData("file", "article-image.jpg", body)).url
    }

    private fun scale(bitmap: Bitmap, maxSide: Int): Bitmap {
        val side = maxOf(bitmap.width, bitmap.height)
        if (side <= maxSide) return bitmap
        val ratio = maxSide.toFloat() / side
        return Bitmap.createScaledBitmap(bitmap, (bitmap.width * ratio).toInt(), (bitmap.height * ratio).toInt(), true)
    }
}

@Singleton
class PdfImportRepositoryImpl @Inject constructor(
    @ApplicationContext private val context: Context,
    private val api: PdfImportApi,
) : PdfImportRepository {
    override suspend fun importPdf(uri: Uri): Result<PdfImportResult> = apiResult {
        val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
            ?: error("Не удалось прочитать PDF")
        val body = bytes.toRequestBody("application/pdf".toMediaType())
        val response = api.importPdf(MultipartBody.Part.createFormData("file", "document.pdf", body))
        PdfImportResult(response.html, response.text, response.suggestedTitle)
    }
}
