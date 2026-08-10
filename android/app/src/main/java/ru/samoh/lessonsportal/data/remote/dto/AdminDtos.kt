package ru.samoh.lessonsportal.data.remote.dto

import kotlinx.serialization.Serializable

@Serializable data class ModerateArticleRequest(val comment: String)
@Serializable data class ChangeRoleRequest(val role: String)
@Serializable data class CategoryMutationRequest(val name: String, val slug: String)
@Serializable data class ModerationQueueResponseDto(val data: List<ArticleDto>, val meta: PageMetaDto)
@Serializable data class UsersResponseDto(val data: List<UserDto>, val meta: PageMetaDto)
