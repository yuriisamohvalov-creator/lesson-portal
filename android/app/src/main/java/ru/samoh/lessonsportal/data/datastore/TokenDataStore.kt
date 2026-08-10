package ru.samoh.lessonsportal.data.datastore

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

interface TokenDataStore {
    suspend fun saveTokens(accessToken: String, refreshToken: String)
    suspend fun saveAccessToken(accessToken: String)
    suspend fun getAccessToken(): String?
    suspend fun getRefreshToken(): String?
    suspend fun clearTokens()
    fun observeAccessToken(): Flow<String?>
}

@Singleton
class EncryptedTokenDataStore @Inject constructor(
    @ApplicationContext context: Context,
) : TokenDataStore {
    private val preferences = EncryptedSharedPreferences.create(
        "auth_tokens",
        MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC),
        context,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )
    private val accessToken = MutableStateFlow(preferences.getString(ACCESS_TOKEN, null))

    override suspend fun saveTokens(accessToken: String, refreshToken: String) {
        preferences.edit().putString(ACCESS_TOKEN, accessToken).putString(REFRESH_TOKEN, refreshToken).apply()
        this.accessToken.value = accessToken
    }

    override suspend fun saveAccessToken(accessToken: String) {
        preferences.edit().putString(ACCESS_TOKEN, accessToken).apply()
        this.accessToken.value = accessToken
    }

    override suspend fun getAccessToken(): String? = preferences.getString(ACCESS_TOKEN, null)
    override suspend fun getRefreshToken(): String? = preferences.getString(REFRESH_TOKEN, null)

    override suspend fun clearTokens() {
        preferences.edit().remove(ACCESS_TOKEN).remove(REFRESH_TOKEN).apply()
        accessToken.value = null
    }

    override fun observeAccessToken(): Flow<String?> = accessToken.asStateFlow()

    private companion object {
        const val ACCESS_TOKEN = "access_token"
        const val REFRESH_TOKEN = "refresh_token"
    }
}
