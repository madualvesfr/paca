import { View, useWindowDimensions, type ViewProps } from "react-native";
import { type ReactNode } from "react";

// Phones top out around 430pt wide; iPads start at 768pt. 700 cleanly splits them.
const TABLET_BREAKPOINT = 700;
const CONTENT_MAX_WIDTH = 640;

/**
 * Centers and caps screen content on large screens (iPad). On phones it's a
 * transparent passthrough View, so phone layouts are unchanged. Needed because
 * ios.supportsTablet is true — without it, the single-column cards (all `mx-6`,
 * no max width) stretch edge-to-edge and look broken on a 12.9" iPad.
 *
 * Wrap a screen's content root. Pass `className="flex-1"` for screens whose
 * root must fill height (FlatList / conditional bodies); omit it for content
 * that lives inside a ScrollView (height should stay auto).
 */
export function ScreenContainer({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: ViewProps["style"];
}) {
  const { width } = useWindowDimensions();
  const isWide = width >= TABLET_BREAKPOINT;
  return (
    <View
      className={className}
      style={[
        isWide && { width: "100%", maxWidth: CONTENT_MAX_WIDTH, alignSelf: "center" },
        style,
      ]}
    >
      {children}
    </View>
  );
}
