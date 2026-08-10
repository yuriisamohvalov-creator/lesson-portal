package ru.samoh.lessonsportal.presentation.components

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class YouTubeIdTest {
    @Test fun extractsWatchUrl() = assertEquals("abcDEF_123", extractYouTubeId("https://youtube.com/watch?v=abcDEF_123"))
    @Test fun extractsShortUrl() = assertEquals("abcDEF_123", extractYouTubeId("https://youtu.be/abcDEF_123"))
    @Test fun rejectsUnrelatedUrl() = assertNull(extractYouTubeId("https://example.com/video"))
}
