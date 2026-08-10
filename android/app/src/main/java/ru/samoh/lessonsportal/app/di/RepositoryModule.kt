package ru.samoh.lessonsportal.app.di

import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton
import ru.samoh.lessonsportal.data.repository.AuthRepositoryImpl
import ru.samoh.lessonsportal.data.repository.UserRepositoryImpl
import ru.samoh.lessonsportal.domain.repository.AuthRepository
import ru.samoh.lessonsportal.domain.repository.UserRepository

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {
    @Binds
    @Singleton
    abstract fun bindAuthRepository(implementation: AuthRepositoryImpl): AuthRepository

    @Binds
    @Singleton
    abstract fun bindUserRepository(implementation: UserRepositoryImpl): UserRepository
}
