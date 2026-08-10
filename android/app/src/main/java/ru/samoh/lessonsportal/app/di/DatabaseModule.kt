package ru.samoh.lessonsportal.app.di

import android.content.Context
import androidx.room.Room
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton
import ru.samoh.lessonsportal.data.local.LessonsPortalDatabase

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): LessonsPortalDatabase =
        Room.databaseBuilder(context, LessonsPortalDatabase::class.java, "lessons-portal.db").build()
}
