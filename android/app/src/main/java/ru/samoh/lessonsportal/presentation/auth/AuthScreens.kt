package ru.samoh.lessonsportal.presentation.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import ru.samoh.lessonsportal.R

@Composable
fun LoginScreen(state: AuthUiState, onLogin: (String, String) -> Unit, onRegister: () -> Unit) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    AuthForm {
        OutlinedTextField(email, { email = it }, label = { Text(stringResource(R.string.email)) }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(password, { password = it }, label = { Text(stringResource(R.string.password)) }, visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth())
        Button(onClick = { onLogin(email, password) }, enabled = state !is AuthUiState.Loading, modifier = Modifier.fillMaxWidth()) {
            if (state is AuthUiState.Loading) CircularProgressIndicator() else Text(stringResource(R.string.login))
        }
        OutlinedButton(onClick = onRegister, modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.create_account)) }
        if (state is AuthUiState.Error) Text(state.message)
    }
}

@Composable
fun RegisterScreen(state: AuthUiState, onRegister: (String, String, String) -> Unit, onLogin: () -> Unit) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordConfirmation by remember { mutableStateOf("") }
    var displayName by remember { mutableStateOf("") }
    var passwordsMismatch by remember { mutableStateOf(false) }
    AuthForm {
        OutlinedTextField(email, { email = it }, label = { Text(stringResource(R.string.email)) }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(displayName, { displayName = it }, label = { Text(stringResource(R.string.display_name)) }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(password, { password = it }, label = { Text(stringResource(R.string.password)) }, visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth())
        OutlinedTextField(passwordConfirmation, { passwordConfirmation = it }, label = { Text(stringResource(R.string.password_confirmation)) }, visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth())
        Button(onClick = {
            passwordsMismatch = password != passwordConfirmation
            if (!passwordsMismatch) onRegister(email, password, displayName)
        }, enabled = state !is AuthUiState.Loading, modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.register)) }
        OutlinedButton(onClick = onLogin, modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.already_registered)) }
        if (passwordsMismatch) Text(stringResource(R.string.passwords_mismatch))
        if (state is AuthUiState.Error) Text(state.message)
    }
}

@Composable
private fun AuthForm(content: @Composable () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) { content() }
}
