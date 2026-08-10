package ru.samoh.lessonsportal.presentation.editor

import org.commonmark.parser.Parser
import org.commonmark.renderer.html.HtmlRenderer

fun markdownToHtml(markdown: String): String =
    // Existing articles and PDF imports arrive as sanitized backend HTML; preserve those blocks
    // while still rendering newly entered Markdown around them.
    HtmlRenderer.builder().escapeHtml(false).build().render(Parser.builder().build().parse(markdown))
