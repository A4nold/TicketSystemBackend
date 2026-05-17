import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Card, Screen } from "@/components/ui";
import { palette } from "@/styles/theme";

const EFFECTIVE_DATE = "May 16, 2026";
const SUPPORT_EMAIL = "notifications@notification.notifyus.uk";

export function PrivacyPolicyScreen() {
  return (
    <Screen title="Privacy Policy" subtitle={`Effective date: ${EFFECTIVE_DATE}`}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Text style={styles.heading}>1. Who we are</Text>
          <Text style={styles.copy}>
            Maya is a mobile ticketing experience for event discovery, checkout, wallet access, and
            event entry support.
          </Text>
        </Card>

        <Card>
          <Text style={styles.heading}>2. Data we collect</Text>
          <Text style={styles.copy}>
            We may collect account profile data (such as email, phone number, and name), authentication and session
            data, ticket and order history, transfer and resale activity, device and app diagnostics,
            and push notification tokens when you enable notifications.
          </Text>
        </Card>

        <Card>
          <Text style={styles.heading}>3. How we use data</Text>
          <Text style={styles.copy}>
            We use data to create and secure your account, process ticket purchases, issue and
            validate tickets, support transfer and resale workflows, send service and event updates,
            and improve reliability and fraud prevention.
          </Text>
        </Card>

        <Card>
          <Text style={styles.heading}>4. Payments</Text>
          <Text style={styles.copy}>
            Payments are processed by third-party providers such as Stripe and Paystack. We do not
            store full payment card numbers on our servers.
          </Text>
        </Card>

        <Card>
          <Text style={styles.heading}>5. Sharing</Text>
          <Text style={styles.copy}>
            We share data only with service providers needed to operate the product (for example
            payments, notifications, hosting, and analytics) and where required by law.
          </Text>
        </Card>

        <Card>
          <Text style={styles.heading}>6. Retention</Text>
          <Text style={styles.copy}>
            We retain account and transaction records for operational, security, and legal reasons.
            When you delete your account, we deactivate access and process account data according to
            platform obligations and legal requirements.
          </Text>
        </Card>

        <Card>
          <Text style={styles.heading}>7. Your choices</Text>
          <Text style={styles.copy}>
            You can access, correct, or delete your account data through app features where available
            and by contacting support. You can also disable push notifications from device settings.
          </Text>
        </Card>

        <Card>
          <Text style={styles.heading}>8. Security</Text>
          <Text style={styles.copy}>
            We use reasonable technical and organizational safeguards to protect personal data.
            However, no method of transmission or storage is completely secure.
          </Text>
        </Card>

        <Card>
          <Text style={styles.heading}>9. Contact</Text>
          <Text style={styles.copy}>
            For privacy questions or requests, contact: {SUPPORT_EMAIL}
          </Text>
        </Card>

        <Card>
          <Text style={styles.heading}>10. Changes</Text>
          <Text style={styles.copy}>
            We may update this policy from time to time. Material updates will be reflected in the
            effective date above.
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    padding: 20,
    paddingBottom: 48,
  },
  copy: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  heading: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },
});
