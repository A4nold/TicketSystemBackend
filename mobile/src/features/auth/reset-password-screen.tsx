import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { SupportCard } from "@/components/support/support-card";
import { ActionButton, Card, Screen } from "@/components/ui";
import { resetPassword } from "@/lib/auth/auth-client";
import { palette } from "@/styles/theme";

function isStrongPassword(value: string) {
  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value)
  );
}

export function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === "string" ? params.token : "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!token) {
      setErrorMessage("This reset link is incomplete. Request a new one.");
      return;
    }

    if (!isStrongPassword(password)) {
      setErrorMessage(
        "Use at least 8 characters with an uppercase letter, a lowercase letter, and a number.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await resetPassword({
        password,
        token,
      });
      setSuccessMessage(response.message);
      setTimeout(() => {
        router.replace("/(auth)/login");
      }, 1200);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We could not reset your password. Request a fresh link and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen
      title="Choose a new password"
      subtitle="Save a fresh password, then head back into your wallet, organizer tools, or scanner access."
    >
      <View style={styles.content}>
        <Card tone={token ? "accent" : "warning"}>
          <Text style={styles.kicker}>Reset link</Text>
          <Text style={styles.copy}>
            {token
              ? "This link can be used once. Older reset links stop working after a successful change."
              : "This screen needs a valid reset token. Request another recovery email to continue."}
          </Text>
        </Card>

        <Card>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>New password</Text>
            <TextInput
              autoComplete="password-new"
              onChangeText={setPassword}
              placeholder="Use a strong password"
              placeholderTextColor={palette.muted}
              secureTextEntry
              style={styles.input}
              value={password}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              autoComplete="password-new"
              onChangeText={setConfirmPassword}
              placeholder="Re-enter password"
              placeholderTextColor={palette.muted}
              secureTextEntry
              style={styles.input}
              value={confirmPassword}
            />
          </View>

          {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}
          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

          <ActionButton
            disabled={!token}
            loading={isSubmitting}
            onPress={() => void handleSubmit()}
            title="Update password"
          />
        </Card>

        <View style={styles.footer}>
          <Text style={styles.footerCopy}>Need another link?</Text>
          <Link href="/(auth)/forgot-password" style={styles.footerLink}>
            Request password reset
          </Link>
        </View>

        <SupportCard
          body="If the reset link keeps failing or has already expired, request a new one first. If the problem continues, contact support with the email on the affected account."
          subject="TicketSystem reset link issue"
          title="Still not able to reset your password?"
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
