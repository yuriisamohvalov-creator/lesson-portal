package ru.samoh.lessonsportal.presentation.courses

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.paging.cachedIn
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import ru.samoh.lessonsportal.domain.model.Course
import ru.samoh.lessonsportal.domain.usecase.GetCourseDetailUseCase
import ru.samoh.lessonsportal.domain.usecase.GetCoursesUseCase

@HiltViewModel
class CoursesViewModel @Inject constructor(getCourses: GetCoursesUseCase) : ViewModel() {
    val courses = getCourses().cachedIn(viewModelScope)
}

data class CourseDetailUiState(val loading: Boolean = true, val course: Course? = null, val error: String? = null)

@HiltViewModel
class CourseDetailViewModel @Inject constructor(
    private val getCourse: GetCourseDetailUseCase,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {
    private val courseId: String = checkNotNull(savedStateHandle["courseId"])
    private val _state = MutableStateFlow(CourseDetailUiState())
    val state = _state.asStateFlow()
    init { load() }
    fun load() = viewModelScope.launch {
        _state.update { it.copy(loading = true, error = null) }
        getCourse(courseId).onSuccess { _state.value = CourseDetailUiState(false, it) }
            .onFailure { _state.value = CourseDetailUiState(false, error = it.message) }
    }
}
