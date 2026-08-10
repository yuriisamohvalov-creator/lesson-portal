package ru.samoh.lessonsportal.app.di

import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Qualifier
import javax.inject.Singleton
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import ru.samoh.lessonsportal.BuildConfig
import ru.samoh.lessonsportal.data.remote.api.AuthApi
import ru.samoh.lessonsportal.data.remote.api.UserApi
import ru.samoh.lessonsportal.data.remote.api.ArticlesApi
import ru.samoh.lessonsportal.data.remote.api.CategoriesApi
import ru.samoh.lessonsportal.data.remote.api.CommentsApi
import ru.samoh.lessonsportal.data.remote.api.VideosApi
import ru.samoh.lessonsportal.data.remote.api.UploadsApi
import ru.samoh.lessonsportal.data.remote.api.PdfImportApi
import ru.samoh.lessonsportal.data.remote.api.CoursesApi
import ru.samoh.lessonsportal.data.remote.api.ModerationApi
import ru.samoh.lessonsportal.data.remote.api.AdminApi
import ru.samoh.lessonsportal.data.remote.interceptor.AuthInterceptor
import ru.samoh.lessonsportal.data.remote.interceptor.TokenAuthenticator

@Qualifier
annotation class RefreshClient

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    @OptIn(ExperimentalSerializationApi::class)
    private val json = Json { ignoreUnknownKeys = true; explicitNulls = false }

    @Provides
    @Singleton
    @RefreshClient
    fun provideRefreshAuthApi(): AuthApi = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL)
        .client(OkHttpClient.Builder().build())
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()
        .create(AuthApi::class.java)

    @Provides
    @Singleton
    fun provideOkHttpClient(
        authInterceptor: AuthInterceptor,
        tokenAuthenticator: TokenAuthenticator,
    ): OkHttpClient = OkHttpClient.Builder()
        .addInterceptor(authInterceptor)
        .authenticator(tokenAuthenticator)
        .apply {
            if (BuildConfig.DEBUG) addInterceptor(HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BASIC
            })
        }
        .build()

    @Provides
    @Singleton
    fun provideRetrofit(client: OkHttpClient): Retrofit = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL)
        .client(client)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()

    @Provides
    @Singleton
    fun provideAuthApi(retrofit: Retrofit): AuthApi = retrofit.create(AuthApi::class.java)

    @Provides
    @Singleton
    fun provideUserApi(retrofit: Retrofit): UserApi = retrofit.create(UserApi::class.java)

    @Provides @Singleton fun provideArticlesApi(retrofit: Retrofit): ArticlesApi = retrofit.create(ArticlesApi::class.java)
    @Provides @Singleton fun provideCategoriesApi(retrofit: Retrofit): CategoriesApi = retrofit.create(CategoriesApi::class.java)
    @Provides @Singleton fun provideCommentsApi(retrofit: Retrofit): CommentsApi = retrofit.create(CommentsApi::class.java)
    @Provides @Singleton fun provideVideosApi(retrofit: Retrofit): VideosApi = retrofit.create(VideosApi::class.java)
    @Provides @Singleton fun provideUploadsApi(retrofit: Retrofit): UploadsApi = retrofit.create(UploadsApi::class.java)
    @Provides @Singleton fun providePdfImportApi(retrofit: Retrofit): PdfImportApi = retrofit.create(PdfImportApi::class.java)
    @Provides @Singleton fun provideCoursesApi(retrofit: Retrofit): CoursesApi = retrofit.create(CoursesApi::class.java)
    @Provides @Singleton fun provideModerationApi(retrofit: Retrofit): ModerationApi = retrofit.create(ModerationApi::class.java)
    @Provides @Singleton fun provideAdminApi(retrofit: Retrofit): AdminApi = retrofit.create(AdminApi::class.java)
}
