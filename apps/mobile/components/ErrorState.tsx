import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "@paca/api";

/**
 * Inline error state for data screens. Without it, a failed fetch leaves
 * `data` undefined and the screen renders its empty state — telling the user
 * they have no data when the load actually failed. Shows a clear error plus a
 * retry that refetches.
 */
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <View className="items-center justify-center py-16 px-8">
      <View className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-900/20 items-center justify-center mb-3">
        <Ionicons name="cloud-offline-outline" size={24} color="#FF6B6B" />
      </View>
      <Text className="text-gray-600 dark:text-gray-300 text-sm text-center mb-4">
        {t.common.loadError}
      </Text>
      <TouchableOpacity
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel={t.common.tryAgain}
        className="bg-pink-primary rounded-2xl px-6 py-3"
        activeOpacity={0.8}
      >
        <Text className="text-white font-semibold text-sm">{t.common.tryAgain}</Text>
      </TouchableOpacity>
    </View>
  );
}
