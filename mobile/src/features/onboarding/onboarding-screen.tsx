import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { ActionButton, Card, Screen } from "@/components/ui";
import { markOnboardingSeen } from "@/lib/onboarding/onboarding-storage";
import { palette } from "@/styles/theme";

const slides = [
  {
    body: "Keep every ticket beautifully organized and always ready at entry.",
    eyebrow: "Maya wallet",
    title: "Your premium event passbook",
  },
  {
    body: "Use offer-range tickets, secure checkout, and instant wallet delivery in one flow.",
    eyebrow: "Faster checkout",
    title: "Move from discovery to entry in minutes",
  },
];

export function OnboardingScreen() {
  const router = useRouter();
  const [slideIndex, setSlideIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const activeSlide = slides[slideIndex] ?? slides[0];
  const isLastSlide = slideIndex === slides.length - 1;

  async function completeOnboarding() {
    setIsSubmitting(true);

    try {
      await markOnboardingSeen();
      router.replace("/");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen title="Welcome to Maya" subtitle="A premium wallet for unforgettable events.">
      <ScrollView contentContainerStyle={styles.content}>
        <Card tone="accent" padded={false}>
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>{activeSlide.eyebrow}</Text>
            <Text style={styles.title}>{activeSlide.title}</Text>
            <Text style={styles.copy}>{activeSlide.body}</Text>

            <View style={styles.dots}>
              {slides.map((slide, index) => (
                <View
                  key={slide.title}
                  style={[styles.dot, index === slideIndex ? styles.dotActive : null]}
                />
              ))}
            </View>
          </View>
        </Card>

        {isLastSlide ? (
          <>
            <ActionButton
              loading={isSubmitting}
              onPress={() => void completeOnboarding()}
              title="Enter Maya"
            />
            <Link href="/(auth)/login" style={styles.secondaryLink}>
              I already have an account
            </Link>
          </>
        ) : (
          <>
            <ActionButton
              onPress={() => {
                setSlideIndex((current) => Math.min(current + 1, slides.length - 1));
              }}
              title="Continue"
            />
            <ActionButton
              onPress={() => void completeOnboarding()}
              title="Skip for now"
              variant="secondary"
            />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    padding: 20,
    paddingBottom: 32,
  },
  copy: {
    color: "#f5efe2",
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.92,
  },
  dot: {
    backgroundColor: "rgba(245, 239, 226, 0.3)",
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  dotActive: {
    backgroundColor: "#f5efe2",
    width: 24,
  },
  dots: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  eyebrow: {
    color: "#f0cfab",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  hero: {
    backgroundColor: palette.black,
    gap: 12,
    padding: 24,
  },
  secondaryLink: {
    color: palette.muted,
    fontSize: 14,
    textAlign: "center",
  },
  title: {
    color: palette.white,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
  },
});
