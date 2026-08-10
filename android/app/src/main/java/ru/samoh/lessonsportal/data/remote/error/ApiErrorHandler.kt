package ru.samoh.lessonsportal.data.remote.error

import java.io.IOException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonPrimitive
import retrofit2.HttpException

class AppException(
    val kind: Kind,
    override val message: String,
    cause: Throwable? = null,
) : Exception(message, cause) {
    enum class Kind { NETWORK, UNAUTHORIZED, FORBIDDEN, VALIDATION, CONFLICT, SERVER, UNKNOWN }
}

object ApiErrorHandler {
    private val json = Json { ignoreUnknownKeys = true }

    fun map(error: Throwable): AppException = when (error) {
        is AppException -> error
        is IOException -> AppException(AppException.Kind.NETWORK, "Проверьте подключение к интернету", error)
        is HttpException -> fromHttp(error)
        else -> AppException(AppException.Kind.UNKNOWN, "Не удалось выполнить запрос", error)
    }

    private fun fromHttp(error: HttpException): AppException {
        val backendMessage = error.response()?.errorBody()?.string()?.let(::parseMessage)
        val kind = when (error.code()) {
            400, 422 -> AppException.Kind.VALIDATION
            401 -> AppException.Kind.UNAUTHORIZED
            403 -> AppException.Kind.FORBIDDEN
            409 -> AppException.Kind.CONFLICT
            in 500..599 -> AppException.Kind.SERVER
            else -> AppException.Kind.UNKNOWN
        }
        val fallback = when (kind) {
            AppException.Kind.UNAUTHORIZED -> "Сессия истекла, войдите снова"
            AppException.Kind.FORBIDDEN -> "Недостаточно прав"
            AppException.Kind.CONFLICT -> "Данные уже существуют или были изменены"
            AppException.Kind.SERVER -> "Ошибка сервера, попробуйте позже"
            AppException.Kind.VALIDATION -> "Проверьте введённые данные"
            else -> "Не удалось выполнить запрос"
        }
        return AppException(kind, backendMessage ?: fallback, error)
    }

    internal fun parseMessage(body: String): String? = runCatching {
        when (val message = (json.parseToJsonElement(body) as? JsonObject)?.get("message")) {
            is JsonArray -> message.mapNotNull { it.jsonPrimitive.contentOrNull }.joinToString("\n").ifBlank { null }
            else -> message?.jsonPrimitive?.contentOrNull
        }
    }.getOrNull()
}

suspend inline fun <T> apiResult(crossinline request: suspend () -> T): Result<T> =
    try {
        Result.success(request())
    } catch (error: Throwable) {
        Result.failure(ApiErrorHandler.map(error))
    }
