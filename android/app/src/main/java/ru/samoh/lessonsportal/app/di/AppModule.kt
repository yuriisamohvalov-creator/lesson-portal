package ru.samoh.lessonsportal.app.di

import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton
import ru.samoh.lessonsportal.data.datastore.EncryptedTokenDataStore
import ru.samoh.lessonsportal.data.datastore.TokenDataStore

@Module
@InstallIn(SingletonComponent::class)
abstract class AppModule {
    @Binds
    @Singleton
    abstract fun bindTokenDataStore(implementation: EncryptedTokenDataStore): TokenDataStore
}
