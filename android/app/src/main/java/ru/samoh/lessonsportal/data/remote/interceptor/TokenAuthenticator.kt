package ru.samoh.lessonsportal.data.remote.interceptor

import javax.inject.Inject
import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import ru.samoh.lessonsportal.app.di.RefreshClient
import ru.samoh.lessonsportal.data.datastore.TokenDataStore
import ru.samoh.lessonsportal.data.remote.api.AuthApi
import ru.samoh.lessonsportal.data.remote.dto.RefreshRequest

class TokenAuthenticator @Inject constructor(
    private val tokenDataStore: TokenDataStore,
    @RefreshClient private val refreshApi: AuthApi,
) : Authenticator {
    private val refreshLock = Any()

    override fun authenticate(route: Route?, response: Response): Request? {
        if (responseCount(response) >= 2 || response.request.url.encodedPath.endsWith("/auth/refresh")) {
            runBlocking { tokenDataStore.clearTokens() }
            return null
        }

        return synchronized(refreshLock) {
            val requestToken = response.request.header("Authorization")?.removePrefix("Bearer ")
            val currentToken = runBlocking { tokenDataStore.getAccessToken() }
            if (currentToken != null && currentToken != requestToken) {
                return@synchronized response.request.newBuilder()
                    .header("Authorization", "Bearer $currentToken")
                    .build()
            }

            val refreshToken = runBlocking { tokenDataStore.getRefreshToken() } ?: return@synchronized null
            val newAccessToken = runCatching {
                runBlocking { refreshApi.refresh(RefreshRequest(refreshToken)).accessToken }
            }.getOrElse {
                runBlocking { tokenDataStore.clearTokens() }
                return@synchronized null
            }
            runBlocking { tokenDataStore.saveAccessToken(newAccessToken) }
            response.request.newBuilder().header("Authorization", "Bearer $newAccessToken").build()
        }
    }

    private fun responseCount(response: Response): Int {
        var current: Response? = response
        var count = 1
        while (current?.priorResponse != null) {
            count++
            current = current.priorResponse
        }
        return count
    }
}
