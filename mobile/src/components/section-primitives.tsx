import { Pressable, StyleSheet, Text, View } from "react-native";

import { commonStyles } from "@/styles/common";
import { palette } from "@/styles/theme";

import { Card } from "./ui";

type SectionStatus = "attention" | "default" | "saving" | "saved";

function getStatusLabel(status: SectionStatus) {
  if (status === "attention") {
    return "Needs review";
  }
  if (status === "saving") {
    return "Saving";
  }
  if (status === "saved") {
    return "Saved";
  }
  return "Ready";
}

export function CollapsibleSection({
  title,
  subtitle,
  expanded,
  onToggle,
  children,
  status,
  statusLabel,
}: {
  children: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  status?: SectionStatus;
  statusLabel?: string;
  subtitle: string;
  title: string;
}) {
  return (
    <Card padded={false}>
      <View style={styles.sectionShell}>
        <Pressable onPress={onToggle} style={styles.sectionHeaderButton}>
          <View style={styles.sectionHeaderCopy}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text numberOfLines={2} style={styles.copy}>{subtitle}</Text>
          </View>
          <View style={styles.sectionHeaderMeta}>
            {statusLabel || status ? (
              <View
                style={[
                  styles.sectionStatePill,
                  status === "attention" ? styles.sectionStateAttention : null,
                  status === "saving" ? styles.sectionStateSaving : null,
                  status === "saved" ? styles.sectionStateSaved : null,
                ]}
              >
                <Text
                  style={[
                    styles.sectionStatePillText,
                    status === "attention" ? styles.sectionStateAttentionText : null,
                    status === "saving" ? styles.sectionStateSavingText : null,
                    status === "saved" ? styles.sectionStateSavedText : null,
                  ]}
                >
                  {statusLabel ?? getStatusLabel(status ?? "default")}
                </Text>
              </View>
            ) : null}
            <Text style={styles.sectionChevron}>{expanded ? "Hide ▲" : "Open ▼"}</Text>
          </View>
        </Pressable>
        {expanded ? children : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  copy: {
    ...commonStyles.bodyCopy,
  },
  sectionChevron: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  sectionHeaderButton: {
    ...commonStyles.sectionHeaderRow,
  },
  sectionHeaderCopy: {
    flex: 1,
    gap: 6,
  },
  sectionHeaderMeta: {
    ...commonStyles.sectionHeaderMeta,
  },
  sectionShell: {
    ...commonStyles.sectionShell,
  },
  sectionStateAttention: {
    backgroundColor: palette.warningSoft,
    borderColor: "#ead39a",
  },
  sectionStateAttentionText: {
    color: palette.warning,
  },
  sectionStatePill: {
    ...commonStyles.sectionStatusPill,
  },
  sectionStatePillText: {
    ...commonStyles.sectionStatusPillText,
  },
  sectionStateSaved: {
    backgroundColor: palette.successSoft,
    borderColor: "#b8d9ca",
  },
  sectionStateSavedText: {
    color: palette.successDeep,
  },
  sectionStateSaving: {
    backgroundColor: palette.accentSoft,
    borderColor: "#e7b98f",
  },
  sectionStateSavingText: {
    color: palette.accentDeep,
  },
  sectionTitle: {
    ...commonStyles.headingLg,
  },
});
