import { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import type { WebViewNavigation } from "react-native-webview/lib/WebViewTypes";

import { ActionButton, Screen } from "@/components/ui";
import { palette } from "@/styles/theme";
import {
  extractCheckoutReturnParams,
  matchesCheckoutPath,
} from "./paystack-inline-return";

export function PaystackInlineCheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    cancelReturnUrl?: string;
    checkoutUrl?: string;
    orderId?: string;
    successReturnUrl?: string;
  }>();

  const checkoutUrl = typeof params.checkoutUrl === "string" ? params.checkoutUrl : "";
  const orderId = typeof params.orderId === "string" ? params.orderId : undefined;
  const successReturnUrl =
    typeof params.successReturnUrl === "string" ? params.successReturnUrl : undefined;
  const cancelReturnUrl =
    typeof params.cancelReturnUrl === "string" ? params.cancelReturnUrl : undefined;

  const canRenderCheckout = useMemo(() => Boolean(checkoutUrl), [checkoutUrl]);

  function navigateToCheckoutResult(
    mode: "success" | "cancel",
    params?: {
      orderId?: string;
      reference?: string;
      session_id?: string;
    },
  ) {
    router.replace({
      pathname: mode === "success" ? "/checkout/success" : "/checkout/cancel",
      params:
        params?.orderId || params?.reference || params?.session_id
          ? {
              ...(params.orderId ? { orderId: params.orderId } : {}),
              ...(params.reference ? { reference: params.reference } : {}),
              ...(params.session_id ? { session_id: params.session_id } : {}),
            }
          : orderId
            ? { orderId }
            : undefined,
    });
  }

  function handleNavigationChange(navigation: WebViewNavigation) {
    const nextUrl = navigation.url;

    if (!nextUrl) {
      return;
    }

    if (successReturnUrl && nextUrl.startsWith(successReturnUrl)) {
      navigateToCheckoutResult("success", extractCheckoutReturnParams(nextUrl));
      return;
    }

    if (cancelReturnUrl && nextUrl.startsWith(cancelReturnUrl)) {
      navigateToCheckoutResult("cancel", extractCheckoutReturnParams(nextUrl));
      return;
    }

    if (matchesCheckoutPath(nextUrl, "/checkout/success")) {
      navigateToCheckoutResult("success", extractCheckoutReturnParams(nextUrl));
      return;
    }

    if (matchesCheckoutPath(nextUrl, "/checkout/cancel")) {
      navigateToCheckoutResult("cancel", extractCheckoutReturnParams(nextUrl));
    }
  }

  if (!canRenderCheckout) {
    return (
      <Screen
        title="Checkout unavailable"
        subtitle="The inline payment page could not be opened."
      >
        <View style={styles.content}>
          <Text style={styles.copy}>
            Return to checkout and try again. If this keeps happening, use the browser checkout fallback.
          </Text>
          <ActionButton
            onPress={() => navigateToCheckoutResult("cancel")}
            title="Back to checkout status"
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      title="Complete payment"
      subtitle="Finish your Paystack checkout and we will bring you back into the app."
    >
      <View style={styles.content}>
        <View style={styles.webViewShell}>
          <WebView
            source={{ uri: checkoutUrl }}
            onNavigationStateChange={handleNavigationChange}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loadingState}>
                <ActivityIndicator color={palette.ink} />
              </View>
            )}
          />
        </View>
        <ActionButton
          onPress={() => navigateToCheckoutResult("cancel")}
          title="Close checkout"
          variant="secondary"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    gap: 12,
    padding: 20,
  },
  copy: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  loadingState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  webViewShell: {
    borderColor: palette.divider,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    overflow: "hidden",
  },
});
