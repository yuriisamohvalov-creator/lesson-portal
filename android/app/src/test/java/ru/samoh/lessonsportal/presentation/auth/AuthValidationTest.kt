package ru.samoh.lessonsportal.presentation.auth

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AuthValidationTest {
    @Test fun validEmailIsAccepted() = assertTrue(isValidEmail("user@example.com"))
    @Test fun invalidEmailIsRejected() = assertFalse(isValidEmail("not-an-email"))
    @Test fun shortPasswordIsRejected() = assertFalse(isValidPassword("1234567"))
    @Test fun eightCharacterPasswordIsAccepted() = assertTrue(isValidPassword("12345678"))
}
