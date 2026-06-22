import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "@paca/api";

function ErrorFallback({ onReset }: { onReset: () => void }) {
  const { t } = useI18n();
  return (
    <View className="flex-1 bg-white dark:bg-gray-900 items-center justify-center px-8">
      <Ionicons name="alert-circle-outline" size={56} color="#FF6B6B" />
      <Text className="mt-4 text-xl font-semibold text-gray-900 dark:text-white text-center">
        {t.common.error}
      </Text>
      <Text className="mt-2 text-base text-gray-500 dark:text-gray-400 text-center">
        {t.common.errorBoundaryMessage}
      </Text>
      <TouchableOpacity
        onPress={onReset}
        accessibilityRole="button"
        accessibilityLabel={t.common.tryAgain}
        className="mt-8 bg-pink-primary rounded-2xl px-8 py-4"
      >
        <Text className="text-white font-semibold text-base">{t.common.tryAgain}</Text>
      </TouchableOpacity>
    </View>
  );
}

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Top-level error boundary. Without it, any thrown render error white-screens
 * the whole app with no recovery path. Catches the error, logs it, and shows a
 * localized fallback with a retry that re-mounts the tree.
 */
export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // No crash reporter is wired yet (see audit) — at least surface it in logs.
    console.error("Uncaught render error:", error, info);
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onReset={this.reset} />;
    }
    return this.props.children;
  }
}
