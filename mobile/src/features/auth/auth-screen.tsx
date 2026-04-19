import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type TextInputProps,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "@/components/providers/auth-provider";
import { SupportCard } from "@/components/support/support-card";
import { ActionButton, Card, Screen } from "@/components/ui";
import { palette } from "@/styles/theme";

type AuthMode = "login" | "register";

function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value);
}

export function AuthScreen({ defaultMode = "login" }: { defaultMode?: AuthMode }) {
  const router = useRouter();
  const params = useLocalSearchParams<{
    eventSlug?: string;
    eventTitle?: string;
    quantity?: string;
    ticketTypeId?: string;
  }>();
  const { errorMessage, isAuthenticating, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loginValues, setLoginValues] = useState({
    email: "",
    password: "",
  });
  const [registerValues, setRegisterValues] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    phoneNumber: "",
  });

  const contextLabel = useMemo(() => {
    if (typeof params.eventTitle === "string" && params.eventTitle.trim()) {
      return `You are continuing from ${params.eventTitle.trim()}.`;
    }

    if (typeof params.eventSlug === "string" && params.eventSlug.trim()) {
      return `You are continuing from the public event page for ${params.eventSlug.trim()}.`;
    }

    return null;
  }, [params.eventSlug, params.eventTitle]);

  function goToPostAuthDestination() {
    if (
      typeof params.eventSlug === "string" &&
      params.eventSlug &&
      typeof params.ticketTypeId === "string" &&
      params.ticketTypeId
    ) {
      router.replace({
        pathname: "/checkout/start",
        params: {
          eventSlug: params.eventSlug,
          quantity: typeof params.quantity === "string" ? params.quantity : "1",
          ticketTypeId: params.ticketTypeId,
        },
      });
      return;
    }

    router.replace("/(tabs)/wallet");
  }

  async function submitLogin() {
    const email = loginValues.email.trim().toLowerCase();

    if (!isValidEmail(email)) {
      setValidationError("Enter a valid email address.");
      return;
    }

    if (!loginValues.password) {
      setValidationError("Enter your password.");
      return;
    }

    setValidationError(null);
    const ok = await signIn({
      email,
      password: loginValues.password,
    });

    if (ok) {
      goToPostAuthDestination();
    }
  }

  async function submitRegister() {
    const email = registerValues.email.trim().toLowerCase();

    if (!isValidEmail(email)) {
      setValidationError("Enter a valid email address.");
      return;
    }

    if (registerValues.password.length < 8) {
      setValidationError("Use at least 8 characters for your password.");
      return;
    }

    if (!/[A-Z]/.test(registerValues.password) || !/[a-z]/.test(registerValues.password) || !/\d/.test(registerValues.password)) {
      setValidationError(
        "Your password must include an uppercase letter, a lowercase letter, and a number.",
      );
      return;
    }

    setValidationError(null);
    const ok = await signUp({
      accountType: "ATTENDEE",
      email,
      firstName: registerValues.firstName.trim() || undefined,
      lastName: registerValues.lastName.trim() || undefined,
      password: registerValues.password,
      phoneNumber: registerValues.phoneNumber.trim() || undefined,
    });

    if (ok) {
      goToPostAuthDestination();
    }
  }

  const activeError = validationError ?? errorMessage;

  return (
    <Screen
      title={mode === "register" ? "Create your account" : "Your ticket wallet"}
      subtitle={
        mode === "register"
          ? "Create an attendee account to keep tickets, transfers, and event access in one place."
          : "Sign in to view your tickets, entry QR codes, transfers, and updates."
      }
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {contextLabel ? (
            <Card tone="accent">
              <Text style={styles.contextLabel}>Continue with event context</Text>
              <Text style={styles.copy}>{contextLabel}</Text>
            </Card>
          ) : null}

          <View style={styles.modeSwitch}>
            <Pressable
              onPress={() => setMode("login")}
              style={[styles.modeChip, mode === "login" ? styles.modeChipActive : null]}
            >
              <Text style={[styles.modeChipText, mode === "login" ? styles.modeChipTextActive : null]}>
                Sign in
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMode("register")}
              style={[styles.modeChip, mode === "register" ? styles.modeChipActive : null]}
            >
              <Text
                style={[
                  styles.modeChipText,
                  mode === "register" ? styles.modeChipTextActive : null,
                ]}
              >
                Create account
              </Text>
            </Pressable>
          </View>

          <Card>
            {mode === "register" ? (
              <>
                <Field
                  label="First name"
                  onChangeText={(value) =>
                    setRegisterValues((current) => ({ ...current, firstName: value }))
                  }
                  placeholder="Ada"
                  value={registerValues.firstName}
                />
                <Field
                  label="Last name"
                  onChangeText={(value) =>
                    setRegisterValues((current) => ({ ...current, lastName: value }))
                  }
                  placeholder="Lovelace"
                  value={registerValues.lastName}
                />
                <Field
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  label="Email"
                  onChangeText={(value) =>
                    setRegisterValues((current) => ({ ...current, email: value }))
                  }
                  placeholder="you@example.com"
                  value={registerValues.email}
                />
                <Field
                  autoComplete="tel"
                  keyboardType="phone-pad"
                  label="Phone number"
                  onChangeText={(value) =>
                    setRegisterValues((current) => ({ ...current, phoneNumber: value }))
                  }
                  placeholder="+353 87 000 0010"
                  value={registerValues.phoneNumber}
                />
                <Field
                  autoComplete="password"
                  label="Password"
                  onChangeText={(value) =>
                    setRegisterValues((current) => ({ ...current, password: value }))
                  }
                  placeholder="Use a strong password"
                  secureTextEntry
                  value={registerValues.password}
                />
              </>
            ) : (
              <>
                <Field
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  label="Email"
                  onChangeText={(value) =>
                    setLoginValues((current) => ({ ...current, email: value }))
                  }
                  placeholder="you@example.com"
                  value={loginValues.email}
                />
                <Field
                  autoComplete="password"
                  label="Password"
                  onChangeText={(value) =>
                    setLoginValues((current) => ({ ...current, password: value }))
                  }
                  placeholder="Enter password"
                  secureTextEntry
                  value={loginValues.password}
                />
              </>
            )}

            {activeError ? <Text style={styles.error}>{activeError}</Text> : null}

            {mode === "login" ? (
              <Link href="/(auth)/forgot-password" style={styles.supportLink}>
                Reset password
              </Link>
            ) : null}

            <ActionButton
              loading={isAuthenticating}
              onPress={() => void (mode === "register" ? submitRegister() : submitLogin())}
              title={mode === "register" ? "Create attendee account" : "Sign in"}
            />
          </Card>

          {typeof params.eventSlug === "string" ? (
            <Link
              href={{
                pathname: "/(public)/events/[slug]",
                params: { slug: params.eventSlug },
              }}
              style={styles.backLink}
            >
              Return to event details
            </Link>
          ) : (
            <Link href="/(public)" style={styles.backLink}>
              Back to discovery
            </Link>
          )}

          <SupportCard
            body="If sign-in still fails after checking your password or using the reset flow, contact support so the team can review account status before your next event."
            subject="TicketSystem account access help"
            title="Still having trouble signing in?"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Field({
  label,
  ...props
}: TextInputProps & {
  label: string;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={palette.muted}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backLink: {
    color: palette.accentDeep,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  content: {
    gap: 16,
    padding: 20,
    paddingBottom: 48,
  },
  contextLabel: {
    color: palette.accentDeep,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
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
  modeChip: {
    backgroundColor: palette.backgroundMuted,
    borderColor: palette.divider,
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  modeChipActive: {
    backgroundColor: palette.accentSoft,
    borderColor: "#e7b98f",
  },
  modeChipText: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.7,
    textAlign: "center",
    textTransform: "uppercase",
  },
  modeChipTextActive: {
    color: palette.accentDeep,
  },
  modeSwitch: {
    flexDirection: "row",
    gap: 10,
  },
  supportLink: {
    color: palette.accentDeep,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
  },
});
