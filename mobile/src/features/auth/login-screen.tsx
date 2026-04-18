import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "@/components/providers/auth-provider";
import { ActionButton, Card, Screen } from "@/components/ui";
import { palette } from "@/styles/theme";

export function LoginScreen() {
  const router = useRouter();
  const { errorMessage, isAuthenticating, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function submit() {
    const ok = await signIn({
      email: email.trim(),
      password,
    });

    if (ok) {
      router.replace("/(tabs)/wallet");
    }
  }

  return (
    <Screen
      title="Your ticket wallet"
      subtitle="Sign in to view your tickets, entry QR codes, transfers, and updates."
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <Card>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={palette.muted}
              style={styles.input}
              value={email}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              autoComplete="password"
              onChangeText={setPassword}
              placeholder="Enter password"
              placeholderTextColor={palette.muted}
              secureTextEntry
              style={styles.input}
              value={password}
            />
          </View>
          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          <ActionButton
            loading={isAuthenticating}
            onPress={() => void submit()}
            title="Sign in"
          />
        </Card>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    color: palette.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  flex: {
    flex: 1,
  },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#dfcfbe",
    borderRadius: 16,
    borderWidth: 1,
    color: palette.ink,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  label: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
});
