package ru.samoh.lessonsportal.presentation.components

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign

@Composable fun rememberIsOnline(): Boolean {
    val context = LocalContext.current
    val manager = remember { context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager }
    fun current() = manager.activeNetwork?.let { manager.getNetworkCapabilities(it) }?.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED) == true
    var online by remember { mutableStateOf(current()) }
    DisposableEffect(manager) {
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) { online = current() }
            override fun onLost(network: Network) { online = current() }
            override fun onCapabilitiesChanged(network: Network, capabilities: NetworkCapabilities) { online = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED) }
        }
        manager.registerDefaultNetworkCallback(callback)
        onDispose { manager.unregisterNetworkCallback(callback) }
    }
    return online
}

@Composable fun OfflineBanner(modifier: Modifier = Modifier) {
    Surface(modifier.fillMaxWidth(), color = MaterialTheme.colorScheme.errorContainer) {
        Text("Нет подключения — показаны сохранённые данные", color = MaterialTheme.colorScheme.onErrorContainer, textAlign = TextAlign.Center)
    }
}
