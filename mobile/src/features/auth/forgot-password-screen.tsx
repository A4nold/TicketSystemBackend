import { Link } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { SupportCard } from "@/components/support/support-card";
import { ActionButton, Card, Screen } from "@/components/ui";
import { requestPasswordReset } from "@/lib/auth/auth-client";
import { palette } from "@/styles/theme";

function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value);
}

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      setErrorMessage("Enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await requestPasswordReset({
        email: normalizedEmail,
      });
      setSuccessMessage(response.message);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We could not start password recovery. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen
      title="Reset your password"
      subtitle="Enter the email on your account and we will send a secure reset link."
    >
      <View style={styles.content}>
        <Card tone="accent">
          <Text style={styles.kicker}>Account recovery</Text>
          <Text style={styles.copy}>
            The reset link expires after 30 minutes. For privacy, the same confirmation
            message is shown whether or not the email is registered.
          </Text>
        </Card>

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

          {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}
          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

          <ActionButton
            loading={isSubmitting}
            onPress={() => void handleSubmit()}
            title="Send reset link"
          />
        </Card>

        <View style={styles.footer}>
          <Text style={styles.footerCopy}>Remembered your password?</Text>
          <Link href="/(auth)/login" style={styles.footerLink}>
            Back to sign in
          </Link>
        </View>

        <SupportCard
          body="If the reset email does not arrive after a few minutes, contact support so they can verify the account and help you recover access before an event."
          subject="TicketSystem password reset help"
          title="Still waiting on the reset email?"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    padding: 20,
    paddingBottom: 48,
  },
  copy: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  error: {
    color: palette.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  footer: {
    alignItems: "center",
    gap: 6,
  },
  footerCopy: {
    color: palette.muted,
    fontSize: 14,
  },
  footerLink: {
    color: palette.accentDeep,
    fontSize: 14,
    fontWeight: "700",
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
  kicker: {
    color: palette.accentDeep,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  label: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  success: {
    color: "#246b46",
    fontSize: 14,
    lineHeight: 20,
  },
});
