import { Linking, StyleSheet, Text, View } from "react-native";

import { ActionButton, Card } from "@/components/ui";
import { getSupportLabel, getSupportMailtoHref } from "@/lib/config/support";
import { palette } from "@/styles/theme";

export function SupportCard({
  body,
  ctaLabel = "Email support",
  subject,
  title,
}: {
  body: string;
  ctaLabel?: string;
  subject?: string;
  title: string;
}) {
  return (
    <Card>
      <Text style={styles.eyebrow}>Need a hand?</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.copy}>{body}</Text>
      <View style={styles.noteShell}>
        <Text style={styles.noteText}>
          Share the email on your account and, if you have it, the order id, ticket serial, or
          event name so the team can pick things up quickly.
        </Text>
      </View>
      <ActionButton
        onPress={() => {
          void Linking.openURL(getSupportMailtoHref(subject));
        }}
        title={ctaLabel}
        variant="secondary"
      />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{getSupportLabel()}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    backgroundColor: palette.ink,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  badgeText: {
    color: palette.white,
    fontSize: 12,
    fontWeight: "700",
  },
  copy: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  eyebrow: {
    color: palette.accentDeep,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  noteShell: {
    backgroundColor: palette.backgroundMuted,
    borderColor: palette.divider,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  noteText: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  title: {
    color: palette.ink,
    fontSize: 20,
    fontWeight: "800",
  },
});
