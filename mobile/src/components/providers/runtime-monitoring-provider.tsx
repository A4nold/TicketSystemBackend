import React, { type PropsWithChildren, useEffect } from "react";
import { View, Text } from "react-native";

import { reportMobileRuntimeIssue } from "@/lib/monitoring/runtime-monitoring";
import { palette } from "@/styles/theme";

type ErrorBoundaryState = {
  error: Error | null;
};

class RuntimeErrorBoundary extends React.Component<PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    void reportMobileRuntimeIssue({
      component: "root-error-boundary",
      message: error.message,
      stack: error.stack,
      type: "mobile-error-boundary",
    });
  }

  render() {
    if (this.state.error) {
      return (
        <View
          style={{
            alignItems: "flex-start",
            backgroundColor: palette.background,
            flex: 1,
            gap: 12,
            justifyContent: "center",
            padding: 24,
          }}
        >
          <Text
            style={{
              color: palette.accentDeep,
              fontSize: 12,
              fontWeight: "800",
              letterSpacing: 1.1,
              textTransform: "uppercase",
            }}
          >
            TicketSystem Mobile
          </Text>
          <Text style={{ color: palette.ink, fontSize: 30, fontWeight: "800" }}>
            The app hit an unexpected problem.
          </Text>
          <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 22 }}>
            The incident has been recorded for follow-up. Reopen the app and return to the last task when you are
            ready.
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export function RuntimeMonitoringProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    const errorUtils = (global as typeof global & {
      ErrorUtils?: {
        getGlobalHandler?: () => (error: Error, isFatal?: boolean) => void;
        setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
      };
    }).ErrorUtils;

    const previousHandler = errorUtils?.getGlobalHandler?.();

    errorUtils?.setGlobalHandler?.((error, isFatal) => {
      void reportMobileRuntimeIssue({
        component: "global-error-handler",
        message: error.message,
        metadata: {
          isFatal: Boolean(isFatal),
        },
        stack: error.stack,
        type: "mobile-global-error",
      });

      previousHandler?.(error, isFatal);
    });

    return () => {
      if (previousHandler) {
        errorUtils?.setGlobalHandler?.(previousHandler);
      }
    };
  }, []);

  return <RuntimeErrorBoundary>{children}</RuntimeErrorBoundary>;
}
