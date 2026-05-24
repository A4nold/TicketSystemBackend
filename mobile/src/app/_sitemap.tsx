import { ScrollView, StyleSheet, Text } from "react-native";

import { Screen } from "@/components/ui";
import { palette } from "@/styles/theme";

export default function SitemapFallbackScreen() {
  return (
    <Screen title="Sitemap unavailable" subtitle="This route is only supported in web tooling.">
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.copy}>
          The native app does not expose the sitemap diagnostics screen. Return to the previous
          screen and continue your flow.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
  },
  copy: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
  },
});
