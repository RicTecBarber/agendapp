import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../styles/theme';

const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, isAuthenticated } = useAuth();

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    setIsLoading(true);
    try {
      await signIn(username, password);
    } catch (error) {
      Alert.alert(
        'Erro de Autenticação',
        'Usuário ou senha incorretos. Por favor, tente novamente.'
      );
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <StatusBar style="dark" />
        
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>AgendApp</Text>
          <Text style={styles.logoTagline}>Gerenciamento Profissional</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.welcomeText}>Bem-vindo(a) de volta!</Text>
          <Text style={styles.instructionText}>
            Faça login para acessar o painel administrativo
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Usuário</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite seu nome de usuário"
              placeholderTextColor={theme.colors.textSecondary}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Senha</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite sua senha"
              placeholderTextColor={theme.colors.textSecondary}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <Text style={styles.loginButtonText}>Entrar</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerText}>
            <Text style={styles.versionText}>
              AgendApp Serviços - v1.0.0
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  logoText: {
    fontSize: 36,
    fontWeight: theme.fontWeights.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  logoTagline: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.textSecondary,
  },
  formContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  welcomeText: {
    fontSize: theme.fontSizes.xl,
    fontWeight: theme.fontWeights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  instructionText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
  },
  inputContainer: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSizes.md,
    color: theme.colors.text,
  },
  loginButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    marginTop: theme.spacing.md,
  },
  loginButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.semiBold,
  },
  footerText: {
    marginTop: theme.spacing.xl,
    alignItems: 'center',
  },
  versionText: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.textSecondary,
  },
});

export default LoginScreen;