package ru.samoh.lessonsportal.presentation.auth

private val emailPattern = Regex("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$")

fun isValidEmail(value: String): Boolean = value.matches(emailPattern)
fun isValidPassword(value: String): Boolean = value.length >= 8
