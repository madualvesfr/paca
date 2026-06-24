import { View, Text } from "react-native";
import { IS_PRODUCTION, APP_ENV } from "../lib/env";

/**
 * Small floating label shown ONLY on non-production builds so it's never
 * unclear whether you're looking at staging or live data. Renders nothing in
 * production. pointerEvents="none" so it never blocks taps.
 */
export function EnvBadge() {
  if (IS_PRODUCTION) return null;
  return (
    <View
      pointerEvents="none"
      className="absolute left-0 right-0 items-center z-50"
      style={{ top: 50 }}
    >
      <View className="bg-amber-500 rounded-full px-2.5 py-0.5">
        <Text className="text-white text-[10px] font-bold uppercase tracking-wide">
          {APP_ENV}
        </Text>
      </View>
    </View>
  );
}
