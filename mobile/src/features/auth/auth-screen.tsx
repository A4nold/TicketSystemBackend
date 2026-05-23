import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { forwardRef, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type TextInputProps,
  TextInput,
  UIManager,
  View,
} from "react-native";

import { useAuth } from "@/components/providers/auth-provider";
import { SupportCard } from "@/components/support/support-card";
import { ActionButton, Card, Screen } from "@/components/ui";
import { palette } from "@/styles/theme";

type AuthMode = "login" | "register";
type AuthFieldKey = "email" | "password" | "general";

function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value);
}

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function animateStepChange() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

export function AuthScreen({ defaultMode = "login" }: { defaultMode?: AuthMode }) {
  const router = useRouter();
  const params = useLocalSearchParams<{
    eventSlug?: string;
    eventTitle?: string;
    flow?: string;
    offerPrice?: string;
    quantity?: string;
    ticketTypeId?: string;
  }>();
  const { errorMessage, isAuthenticating, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationField, setValidationField] = useState<AuthFieldKey | null>(null);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showOptionalRegisterDetails, setShowOptionalRegisterDetails] = useState(false);
  const [authStep, setAuthStep] = useState<1 | 2>(1);
  const [isCompletingAuth, setIsCompletingAuth] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const emailInputRef = useRef<TextInput>(null);
  const loginPasswordInputRef = useRef<TextInput>(null);
  const registerPasswordInputRef = useRef<TextInput>(null);
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

  const checkoutIntentLabel = useMemo(() => {
    if (!(typeof params.ticketTypeId === "string" && params.ticketTypeId)) {
      return null;
    }

    const quantityNumber = Number(params.quantity ?? "1");
    const quantityLabel = Number.isFinite(quantityNumber) && quantityNumber > 1 ? `${quantityNumber} tickets` : "1 ticket";
    const flowLabel = params.flow === "offer-range" ? "Offer flow" : "Checkout flow";

    return `${flowLabel} · ${quantityLabel}`;
  }, [params.flow, params.quantity, params.ticketTypeId]);

  function goToPostAuthDestination() {
    if (
      params.flow === "offer-range" &&
      typeof params.eventSlug === "string" &&
      params.eventSlug &&
      typeof params.ticketTypeId === "string" &&
      params.ticketTypeId
    ) {
      router.replace({
        pathname: "/(public)/events/[slug]",
        params: {
          authReturn: "1",
          slug: params.eventSlug,
          offerPrice: typeof params.offerPrice === "string" ? params.offerPrice : undefined,
          quantity: typeof params.quantity === "string" ? params.quantity : "1",
          ticketTypeId: params.ticketTypeId,
        },
      });
      return;
    }

    if (
      typeof params.eventSlug === "string" &&
      params.eventSlug &&
      typeof params.ticketTypeId === "string" &&
      params.ticketTypeId
    ) {
      router.replace({
        pathname: "/checkout/start",
        params: {
          authReturn: "1",
          eventSlug: params.eventSlug,
          quantity: typeof params.quantity === "string" ? params.quantity : "1",
          ticketTypeId: params.ticketTypeId,
        },
      });
      return;
    }

    router.replace("/(tabs)/wallet");
  }

  function beginCompletionTransition(message: string) {
    setSuccessMessage(message);
    setIsCompletingAuth(true);
  }

  async function submitLogin() {
    const email = loginValues.email.trim().toLowerCase();

    if (!isValidEmail(email)) {
      setValidationField("email");
      setValidationError("Enter a valid email address.");
      return;
    }

    if (!loginValues.password) {
      setValidationField("password");
      setValidationError("Enter your password.");
      return;
    }

    setValidationField(null);
    setValidationError(null);
    const ok = await signIn({
      email,
      password: loginValues.password,
    });

    if (ok) {
      beginCompletionTransition(
        checkoutContextActive ? "Signed in. Returning to checkout..." : "Signed in. Redirecting...",
      );
      await new Promise((resolve) => setTimeout(resolve, 220));
      goToPostAuthDestination();
    }
  }

  async function submitRegister() {
    const email = registerValues.email.trim().toLowerCase();

    if (!isValidEmail(email)) {
      setValidationField("email");
      setValidationError("Enter a valid email address.");
      return;
    }

    if (registerValues.password.length < 8) {
      setValidationField("password");
      setValidationError("Use at least 8 characters for your password.");
      return;
    }

    if (!/[A-Z]/.test(registerValues.password) || !/[a-z]/.test(registerValues.password) || !/\d/.test(registerValues.password)) {
      setValidationField("password");
      setValidationError(
        "Your password must include an uppercase letter, a lowercase letter, and a number.",
      );
      return;
    }

    setValidationField(null);
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
      beginCompletionTransition(
        checkoutContextActive ? "Account created. Returning to checkout..." : "Account created. Redirecting...",
      );
      await new Promise((resolve) => setTimeout(resolve, 220));
      goToPostAuthDestination();
    }
  }

  const checkoutContextActive =
    typeof params.ticketTypeId === "string" && Boolean(params.ticketTypeId);
  const isStepOne = authStep === 1;
  const emailError = validationField === "email" ? validationError : null;
  const passwordError = validationField === "password" ? validationError : null;
  const generalError =
    errorMessage && !validationError
      ? errorMessage
      : validationField === "general"
        ? validationError
        : null;

  useEffect(() => {
    if (authStep !== 2) {
      return;
    }

    const focusTarget = mode === "register" ? registerPasswordInputRef.current : loginPasswordInputRef.current;
    const frame = requestAnimationFrame(() => {
      focusTarget?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [authStep, mode]);

  function handleContinueFromEmailStep() {
    const email =
      mode === "register"
        ? registerValues.email.trim().toLowerCase()
        : loginValues.email.trim().toLowerCase();

    if (!isValidEmail(email)) {
      setValidationField("email");
      setValidationError("Enter a valid email address.");
      return;
    }

    if (mode === "register") {
      setRegisterValues((current) => ({ ...current, email }));
    } else {
      setLoginValues((current) => ({ ...current, email }));
    }

    setValidationError(null);
    setValidationField(null);
    animateStepChange();
    setAuthStep(2);
  }

  return (
    <Screen
      title={
        checkoutContextActive
          ? mode === "register"
            ? "Create account to continue"
            : "Sign in to continue checkout"
          : mode === "register"
            ? "Create your account"
            : "Your ticket wallet"
      }
      subtitle={
        checkoutContextActive
          ? "Your event selection will be restored after auth."
          : mode === "register"
            ? "Create your account."
            : "Sign in to continue."
      }
      compactHeader
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.progressRow}>
            <View style={[styles.progressSegment, styles.progressSegmentActive]} />
            <View style={[styles.progressSegment, !isStepOne ? styles.progressSegmentActive : null]} />
          </View>

          {contextLabel ? (
            <Card tone="accent">
              <Text style={styles.contextLabel}>Continue with event context</Text>
              <Text style={styles.copy} numberOfLines={2}>{contextLabel}</Text>
              {checkoutIntentLabel ? <Text style={styles.intentMeta}>{checkoutIntentLabel}</Text> : null}
            </Card>
          ) : null}

          <View style={styles.modeSwitch}>
            <Pressable
              onPress={() => {
                if (isAuthenticating || isCompletingAuth) {
                  return;
                }
                animateStepChange();
                setMode("login");
                setAuthStep(1);
                setValidationError(null);
                setValidationField(null);
              }}
              disabled={isAuthenticating || isCompletingAuth}
              style={[styles.modeChip, mode === "login" ? styles.modeChipActive : null]}
            >
              <Text style={[styles.modeChipText, mode === "login" ? styles.modeChipTextActive : null]}>
                Sign in
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (isAuthenticating || isCompletingAuth) {
                  return;
                }
                animateStepChange();
                setMode("register");
                setAuthStep(1);
                setValidationError(null);
                setValidationField(null);
              }}
              disabled={isAuthenticating || isCompletingAuth}
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
            <Text style={styles.stepLabel}>
              {isStepOne ? "Step 1 of 2 · account email" : "Step 2 of 2 · secure access"}
            </Text>

            <Field
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              label="Email"
              onChangeText={(value) =>
                mode === "register"
                  ? setRegisterValues((current) => ({ ...current, email: value }))
                  : setLoginValues((current) => ({ ...current, email: value }))
              }
              editable={!isAuthenticating && !isCompletingAuth}
              autoFocus={isStepOne}
              placeholder="you@example.com"
              returnKeyType="next"
              onSubmitEditing={() => {
                if (isStepOne) {
                  handleContinueFromEmailStep();
                }
              }}
              ref={emailInputRef}
              textContentType="emailAddress"
              value={mode === "register" ? registerValues.email : loginValues.email}
            />
            {emailError ? <Text style={styles.errorInline}>{emailError}</Text> : null}

            {isStepOne ? (
              <ActionButton
                disabled={isAuthenticating || isCompletingAuth}
                onPress={handleContinueFromEmailStep}
                title="Continue"
              />
            ) : mode === "register" ? (
              <>
                <Field
                  autoComplete="password"
                  autoCorrect={false}
                  label="Password"
                  ref={registerPasswordInputRef}
                  onChangeText={(value) =>
                    setRegisterValues((current) => ({ ...current, password: value }))
                  }
                  editable={!isAuthenticating && !isCompletingAuth}
                  placeholder="Use a strong password"
                  returnKeyType="done"
                  onSubmitEditing={() => void submitRegister()}
                  secureTextEntry={!showRegisterPassword}
                  textContentType="newPassword"
                  rightAdornment={
                    <Pressable
                      hitSlop={8}
                      onPress={() => setShowRegisterPassword((current) => !current)}
                      style={styles.eyeButton}
                      disabled={isAuthenticating || isCompletingAuth}
                    >
                      <Text style={styles.eyeButtonText}>{showRegisterPassword ? "Hide" : "Show"}</Text>
                    </Pressable>
                  }
                  value={registerValues.password}
                />
                {passwordError ? <Text style={styles.errorInline}>{passwordError}</Text> : null}
                <Pressable
                  onPress={() => setShowOptionalRegisterDetails((current) => !current)}
                  disabled={isAuthenticating || isCompletingAuth}
                  style={styles.optionalToggle}
                >
                  <Text style={styles.optionalToggleText}>
                    {showOptionalRegisterDetails ? "Hide extra details" : "Add profile details (optional)"}
                  </Text>
                </Pressable>
                {showOptionalRegisterDetails ? (
                  <View style={styles.optionalFields}>
                    <Field
                      label="First name (optional)"
                      onChangeText={(value) =>
                        setRegisterValues((current) => ({ ...current, firstName: value }))
                      }
                      editable={!isAuthenticating && !isCompletingAuth}
                      placeholder="Ada"
                      value={registerValues.firstName}
                    />
                    <Field
                      label="Last name (optional)"
                      onChangeText={(value) =>
                        setRegisterValues((current) => ({ ...current, lastName: value }))
                      }
                      editable={!isAuthenticating && !isCompletingAuth}
                      placeholder="Lovelace"
                      value={registerValues.lastName}
                    />
                    <Field
                      autoComplete="tel"
                      keyboardType="phone-pad"
                      label="Phone number (optional)"
                      onChangeText={(value) =>
                        setRegisterValues((current) => ({ ...current, phoneNumber: value }))
                      }
                      editable={!isAuthenticating && !isCompletingAuth}
                      placeholder="+353 87 000 0010"
                      textContentType="telephoneNumber"
                      value={registerValues.phoneNumber}
                    />
                  </View>
                ) : null}
              </>
            ) : (
              <>
                <Field
                  autoComplete="password"
                  autoCorrect={false}
                  label="Password"
                  ref={loginPasswordInputRef}
                  onChangeText={(value) =>
                    setLoginValues((current) => ({ ...current, password: value }))
                  }
                  editable={!isAuthenticating && !isCompletingAuth}
                  placeholder="Enter password"
                  returnKeyType="done"
                  onSubmitEditing={() => void submitLogin()}
                  secureTextEntry={!showLoginPassword}
                  textContentType="password"
                  rightAdornment={
                    <Pressable
                      hitSlop={8}
                      onPress={() => setShowLoginPassword((current) => !current)}
                      style={styles.eyeButton}
                      disabled={isAuthenticating || isCompletingAuth}
                    >
                      <Text style={styles.eyeButtonText}>{showLoginPassword ? "Hide" : "Show"}</Text>
                    </Pressable>
                  }
                  value={loginValues.password}
                />
                {passwordError ? <Text style={styles.errorInline}>{passwordError}</Text> : null}
              </>
            )}

            {generalError ? <Text style={styles.error}>{generalError}</Text> : null}
            {successMessage ? <Text style={styles.successInline}>{successMessage}</Text> : null}

            {mode === "login" && !isStepOne ? (
              <Link href="/(auth)/forgot-password" style={styles.supportLink}>
                Reset password
              </Link>
            ) : null}

            {!isStepOne ? (
              <>
                <Pressable
                  onPress={() => {
                    if (isAuthenticating || isCompletingAuth) {
                      return;
                    }
                    animateStepChange();
                    setAuthStep(1);
                    setValidationError(null);
                    setValidationField(null);
                  }}
                  disabled={isAuthenticating || isCompletingAuth}
                  style={styles.editEmailButton}
                >
                  <Text style={styles.editEmailButtonText}>Use a different email</Text>
                </Pressable>

                <ActionButton
                  loading={isAuthenticating}
                  disabled={isCompletingAuth}
                  onPress={() => void (mode === "register" ? submitRegister() : submitLogin())}
                  title={
                    checkoutContextActive
                      ? mode === "register"
                        ? "Continue to checkout"
                        : "Sign in to continue"
                      : mode === "register"
                        ? "Create account"
                        : "Sign in"
                  }
                />
              </>
            ) : null}
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

const Field = forwardRef<TextInput, TextInputProps & { label: string; rightAdornment?: ReactNode }>(
  function Field({ label, rightAdornment, ...props }, ref) {
    return (
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.inputWrap}>
          <TextInput
            ref={ref}
            placeholderTextColor={palette.muted}
            style={[styles.input, rightAdornment ? styles.inputWithAdornment : null]}
            {...props}
          />
          {rightAdornment ? <View style={styles.inputAdornment}>{rightAdornment}</View> : null}
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  backLink: {
    color: palette.accentDeep,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  content: {
    gap: 18,
    padding: 20,
    paddingBottom: 56,
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
  editEmailButton: {
    paddingVertical: 2,
  },
  editEmailButtonText: {
    color: palette.mutedSoft,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  error: {
    color: palette.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  errorInline: {
    color: palette.danger,
    fontSize: 13,
    fontWeight: "600",
    marginTop: -2,
  },
  eyeButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    minWidth: 52,
  },
  eyeButtonText: {
    color: palette.accentDeep,
    fontSize: 13,
    fontWeight: "700",
  },
  fieldGroup: {
    gap: 6,
  },
  flex: {
    flex: 1,
  },
  inputAdornment: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    position: "absolute",
    right: 8,
    top: 0,
  },
  inputWrap: {
    position: "relative",
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
  inputWithAdornment: {
    paddingRight: 72,
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
  intentMeta: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: "700",
  },
  modeSwitch: {
    flexDirection: "row",
    gap: 10,
  },
  progressRow: {
    flexDirection: "row",
    gap: 8,
  },
  progressSegment: {
    backgroundColor: palette.divider,
    borderRadius: 999,
    flex: 1,
    height: 4,
  },
  progressSegmentActive: {
    backgroundColor: palette.accentDeep,
  },
  successInline: {
    color: "#2d7c58",
    fontSize: 13,
    fontWeight: "700",
  },
  stepLabel: {
    color: palette.mutedSoft,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  optionalFields: {
    gap: 10,
  },
  optionalToggle: {
    paddingVertical: 2,
  },
  optionalToggleText: {
    color: palette.mutedSoft,
    fontSize: 13,
    fontWeight: "700",
  },
  supportLink: {
    color: palette.accentDeep,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
  },
});
