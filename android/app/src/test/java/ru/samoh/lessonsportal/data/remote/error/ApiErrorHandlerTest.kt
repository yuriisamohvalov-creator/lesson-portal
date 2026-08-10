package ru.samoh.lessonsportal.data.remote.error

import java.io.IOException
import org.junit.Assert.assertEquals
import org.junit.Test

class ApiErrorHandlerTest {
    @Test
    fun parsesNestStringMessage() {
        assertEquals("Validation failed", ApiErrorHandler.parseMessage("""{"statusCode":400,"message":"Validation failed"}"""))
    }

    @Test
    fun parsesNestMessageArray() {
        assertEquals("Ошибка email\nОшибка пароля", ApiErrorHandler.parseMessage("""{"message":["Ошибка email","Ошибка пароля"]}"""))
    }

    @Test
    fun mapsIoExceptionToNetworkMessage() {
        val result = ApiErrorHandler.map(IOException("offline"))

        assertEquals(AppException.Kind.NETWORK, result.kind)
        assertEquals("Проверьте подключение к интернету", result.message)
    }
}
