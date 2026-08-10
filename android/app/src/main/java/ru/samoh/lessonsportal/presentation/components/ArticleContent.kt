package ru.samoh.lessonsportal.presentation.components

import android.webkit.WebView
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.unit.dp
import ru.samoh.lessonsportal.BuildConfig

@Composable
fun HtmlContent(html: String, modifier: Modifier = Modifier) {
    AndroidView(
        modifier = modifier.fillMaxWidth().heightIn(min = 180.dp),
        factory = { context -> WebView(context).apply { settings.javaScriptEnabled = false } },
        update = { webView -> if (webView.tag != html) { webView.tag = html; webView.loadDataWithBaseURL(BuildConfig.API_BASE_URL, wrapHtml(html), "text/html", "UTF-8", null) } },
    )
}

@Composable
fun YouTubePlayer(videoId: String, modifier: Modifier = Modifier) {
    AndroidView(
        modifier = modifier.fillMaxWidth().aspectRatio(16f / 9f),
        factory = { context -> WebView(context).apply { settings.javaScriptEnabled = true } },
        update = { if (it.tag != videoId) { it.tag = videoId; it.loadDataWithBaseURL("https://www.youtube.com", """<html><body style="margin:0"><iframe width="100%" height="100%" src="https://www.youtube.com/embed/$videoId" frameborder="0" allowfullscreen></iframe></body></html>""", "text/html", "UTF-8", null) } },
    )
}

fun extractYouTubeId(url: String): String? = Regex("(?:youtu\\.be/|v=|embed/)([A-Za-z0-9_-]{6,})").find(url)?.groupValues?.get(1)

private fun wrapHtml(content: String) = """
    <!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/>
    <style>body{font-family:sans-serif;line-height:1.55;margin:0;color:#202124}img{max-width:100%;height:auto}pre{overflow:auto;background:#f3f4f6;padding:12px}</style>
    </head><body>$content</body></html>
""".trimIndent()
