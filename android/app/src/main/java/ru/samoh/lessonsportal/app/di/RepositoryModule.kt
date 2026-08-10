package ru.samoh.lessonsportal.app.di

import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton
import ru.samoh.lessonsportal.data.repository.AuthRepositoryImpl
import ru.samoh.lessonsportal.data.repository.UserRepositoryImpl
import ru.samoh.lessonsportal.data.repository.ArticlesRepositoryImpl
import ru.samoh.lessonsportal.data.repository.CategoriesRepositoryImpl
import ru.samoh.lessonsportal.data.repository.CommentsRepositoryImpl
import ru.samoh.lessonsportal.data.repository.VideosRepositoryImpl
import ru.samoh.lessonsportal.data.repository.UploadsRepositoryImpl
import ru.samoh.lessonsportal.data.repository.PdfImportRepositoryImpl
import ru.samoh.lessonsportal.data.repository.DraftRepositoryImpl
import ru.samoh.lessonsportal.data.repository.CoursesRepositoryImpl
import ru.samoh.lessonsportal.domain.repository.AuthRepository
import ru.samoh.lessonsportal.domain.repository.UserRepository
import ru.samoh.lessonsportal.domain.repository.ArticlesRepository
import ru.samoh.lessonsportal.domain.repository.CategoriesRepository
import ru.samoh.lessonsportal.domain.repository.CommentsRepository
import ru.samoh.lessonsportal.domain.repository.VideosRepository
import ru.samoh.lessonsportal.domain.repository.UploadsRepository
import ru.samoh.lessonsportal.domain.repository.PdfImportRepository
import ru.samoh.lessonsportal.domain.repository.DraftRepository
import ru.samoh.lessonsportal.domain.repository.CoursesRepository

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {
    @Binds
    @Singleton
    abstract fun bindAuthRepository(implementation: AuthRepositoryImpl): AuthRepository

    @Binds
    @Singleton
    abstract fun bindUserRepository(implementation: UserRepositoryImpl): UserRepository

    @Binds @Singleton abstract fun bindArticlesRepository(implementation: ArticlesRepositoryImpl): ArticlesRepository
    @Binds @Singleton abstract fun bindCategoriesRepository(implementation: CategoriesRepositoryImpl): CategoriesRepository
    @Binds @Singleton abstract fun bindCommentsRepository(implementation: CommentsRepositoryImpl): CommentsRepository
    @Binds @Singleton abstract fun bindVideosRepository(implementation: VideosRepositoryImpl): VideosRepository
    @Binds @Singleton abstract fun bindUploadsRepository(implementation: UploadsRepositoryImpl): UploadsRepository
    @Binds @Singleton abstract fun bindPdfImportRepository(implementation: PdfImportRepositoryImpl): PdfImportRepository
    @Binds @Singleton abstract fun bindDraftRepository(implementation: DraftRepositoryImpl): DraftRepository
    @Binds @Singleton abstract fun bindCoursesRepository(implementation: CoursesRepositoryImpl): CoursesRepository
}
