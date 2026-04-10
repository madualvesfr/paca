import { useState } from "react";
import { Modal, View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "@paca/api";

type SlideKey =
  | "dashboard"
  | "addTransaction"
  | "scan"
  | "budget"
  | "multiCurrency"
  | "couple";

const SLIDES: ReadonlyArray<{
  key: SlideKey;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
}> = [
  { key: "dashboard", icon: "grid-outline", gradient: ["#FF8FB1", "#FFC0D9"] },
  { key: "addTransaction", icon: "add-circle-outline", gradient: ["#34D399", "#14B8A6"] },
  { key: "scan", icon: "scan-outline", gradient: ["#A78BFA", "#6366F1"] },
  { key: "budget", icon: "pie-chart-outline", gradient: ["#FBBF24", "#F97316"] },
  { key: "multiCurrency", icon: "cash-outline", gradient: ["#38BDF8", "#06B6D4"] },
  { key: "couple", icon: "heart-outline", gradient: ["#FB7185", "#EC4899"] },
];

interface TutorialModalProps {
  visible: boolean;
  onClose: () => void;
}

export function TutorialModal({ visible, onClose }: TutorialModalProps) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);

  const slide = SLIDES[index];
  const slideCopy = (t.tutorial.slides as Record<SlideKey, { title: string; body: string }>)[slide.key];
  const isFirst = index === 0;
  const isLast = index === SLIDES.length - 1;

  const handleClose = () => {
    setIndex(0);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black/60 items-center justify-center px-6">
        <View className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl">
          {/* Skip button */}
          <TouchableOpacity
            onPress={handleClose}
            className="absolute top-4 right-4 z-10 w-9 h-9 rounded-xl bg-white/80 dark:bg-gray-800/80 items-center justify-center"
            accessibilityLabel={t.tutorial.skip}
          >
            <Ionicons name="close" size={18} color="#6B7280" />
          </TouchableOpacity>

          {/* Hero */}
          <View
            className="items-center pt-10 pb-8"
            style={{ backgroundColor: slide.gradient[0] }}
          >
            <View className="w-20 h-20 rounded-3xl bg-white/20 items-center justify-center mb-4">
              <Ionicons name={slide.icon} size={40} color="#ffffff" />
            </View>
            <Text className="text-white/80 text-[10px] uppercase tracking-widest font-semibold">
              {t.tutorial.step} {index + 1} {t.tutorial.of} {SLIDES.length}
            </Text>
          </View>

          {/* Body */}
          <ScrollView
            className="max-h-60"
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8 }}
          >
            <Text className="text-xl font-bold text-gray-800 dark:text-gray-100 text-center mb-3">
              {slideCopy.title}
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400 text-center leading-5">
              {slideCopy.body}
            </Text>
          </ScrollView>

          {/* Dots */}
          <View className="flex-row items-center justify-center gap-2 mt-4">
            {SLIDES.map((s, i) => (
              <TouchableOpacity
                key={s.key}
                onPress={() => setIndex(i)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <View
                  className={`h-1.5 rounded-full ${
                    i === index ? "bg-pink-primary" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                  style={{ width: i === index ? 32 : 6 }}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Actions */}
          <View className="flex-row items-center justify-between px-6 py-6 gap-3">
            {isFirst ? (
              <TouchableOpacity onPress={handleClose} className="px-4 py-2.5">
                <Text className="text-sm font-semibold text-gray-500">
                  {t.tutorial.skip}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setIndex((i) => Math.max(i - 1, 0))}
                className="flex-row items-center gap-1 px-4 py-2.5"
              >
                <Ionicons name="chevron-back" size={16} color="#6B7280" />
                <Text className="text-sm font-semibold text-gray-500">
                  {t.tutorial.back}
                </Text>
              </TouchableOpacity>
            )}

            {isLast ? (
              <TouchableOpacity
                onPress={handleClose}
                className="bg-pink-primary rounded-xl px-6 py-3"
                activeOpacity={0.8}
              >
                <Text className="text-white font-semibold text-sm">
                  {t.tutorial.finish}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setIndex((i) => Math.min(i + 1, SLIDES.length - 1))}
                className="bg-pink-primary rounded-xl px-6 py-3 flex-row items-center gap-1"
                activeOpacity={0.8}
              >
                <Text className="text-white font-semibold text-sm">
                  {t.tutorial.next}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#ffffff" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
