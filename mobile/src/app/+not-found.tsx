import { Link, useLocalSearchParams, usePathname, useSegments } from "expo-router";
import * as ExpoLinking from "expo-linking";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/ui";
import { palette } from "@/styles/theme";

function decodeMaybe(value?: string) {
  if (!value) {
    return null;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default function NotFoundScreen() {
  const params = useLocalSearchParams<{
    dl_debug?: string;
    dl_target?: string;
    path?: string;
  }>();
  const liveUrl = ExpoLinking.useURL();
  const pathname = usePathname();
  const segments = useSegments();
  const [initialUrl, setInitialUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    void ExpoLinking.getInitialURL().then((url) => {
      if (mounted) {
        setInitialUrl(url);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const rawDebug =
    typeof params.dl_debug === "string"
      ? decodeMaybe(params.dl_debug)
      : typeof params.path === "string"
        ? decodeMaybe(params.path)
        : null;
  const targetDebug =
    typeof params.dl_target === "string" ? decodeMaybe(params.dl_target) : null;

  return (
    <Screen title="Route not found" subtitle="This link could not be resolved automatically.">
      <View style={styles.content}>
        <Text style={styles.copy}>
          The app received a link it could not map to a valid route. You can return to the
          discovery home and continue safely.
        </Text>
        <View style={styles.debugCard}>
          <Text style={styles.debugTitle}>Deep link debug</Text>
          <Text style={styles.debugLine}>Raw: {rawDebug ?? "n/a"}</Text>
          <Text style={styles.debugLine}>Target: {targetDebug ?? "n/a"}</Text>
          <Text style={styles.debugLine}>Pathname: {pathname ?? "n/a"}</Text>
          <Text style={styles.debugLine}>Segments: {segments.join("/") || "n/a"}</Text>
          <Text style={styles.debugLine}>Live URL: {liveUrl ?? "n/a"}</Text>
          <Text style={styles.debugLine}>Initial URL: {initialUrl ?? "n/a"}</Text>
        </View>
        <Link href="/" style={styles.primaryLink}>
          Go to home
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    padding: 20,
  },
  copy: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  debugCard: {
    backgroundColor: "#fff5e8",
    borderColor: "#ead3b4",
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    padding: 10,
  },
  debugLine: {
    color: palette.ink,
    fontSize: 12,
    lineHeight: 18,
  },
  debugTitle: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  primaryLink: {
    backgroundColor: palette.ink,
    borderRadius: 999,
    color: palette.white,
    fontSize: 15,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlign: "center",
  },
});
