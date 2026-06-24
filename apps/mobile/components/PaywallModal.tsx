import { useState } from "react";
import { Modal, View, Text, TouchableOpacity, Pressable, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "@paca/api";
import { SUBSCRIPTION_PRICING } from "@paca/shared";
import { purchaseSubscription, type PlanId } from "../lib/billing";

export type PaywallReason = "scan_limit" | "advisor_limit" | "multi_currency";

function FeatureRow({ label }: { label: string }) {
  return (
    <View className="flex-row items-center gap-2.5 py-1.5">
      <Ionicons name="checkmark-circle" size={18} color="#FF8FB1" />
      <Text className="text-sm text-gray-700 dark:text-gray-200 flex-1">{label}</Text>
    </View>
  );
}

export function PaywallModal({
  visible,
  reason,
  onClose,
}: {
  visible: boolean;
  reason: PaywallReason;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [plan, setPlan] = useState<PlanId>("annual");
  const [loading, setLoading] = useState(false);

  const subtitle =
    reason === "scan_limit"
      ? t.premium.subtitleScan
      : reason === "advisor_limit"
        ? t.premium.subtitleAdvisor
        : t.premium.subtitleMultiCurrency;

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      await purchaseSubscription(plan);
      onClose();
    } catch {
      // RevenueCat not wired yet (or purchase cancelled/failed).
      Alert.alert(t.premium.comingSoonTitle, t.premium.comingSoon);
    } finally {
      setLoading(false);
    }
  };

  const PlanCard = ({
    id,
    label,
    price,
    suffix,
    badge,
  }: {
    id: PlanId;
    label: string;
    price: string;
    suffix: string;
    badge?: string;
  }) => {
    const active = plan === id;
    return (
      <Pressable
        onPress={() => setPlan(id)}
        accessibilityRole="button"
        accessibilityLabel={`${label} ${price}`}
        className={`flex-1 rounded-2xl border-2 p-4 ${
          active
            ? "border-pink-primary bg-pink-50 dark:bg-pink-900/20"
            : "border-gray-200 dark:border-gray-700"
        }`}
      >
        {badge ? (
          <View className="self-start bg-pink-primary rounded-full px-2 py-0.5 mb-2">
            <Text className="text-[10px] font-bold text-white uppercase">{badge}</Text>
          </View>
        ) : null}
        <Text className="text-sm font-semibold text-gray-800 dark:text-gray-100">{label}</Text>
        <Text className="text-lg font-bold text-gray-900 dark:text-white mt-1">
          {price}
          <Text className="text-xs font-normal text-gray-400"> {suffix}</Text>
        </Text>
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white dark:bg-gray-900 rounded-t-3xl px-6 pt-5 pb-8">
          <View className="items-center mb-1">
            <View className="w-12 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 mb-4" />
            <View className="flex-row items-center gap-2">
              <Ionicons name="sparkles" size={20} color="#FF8FB1" />
              <Text className="text-2xl font-bold text-gray-900 dark:text-white">
                {t.premium.title}
              </Text>
            </View>
            <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2">
              {subtitle}
            </Text>
          </View>

          <View className="mt-5 mb-4">
            <FeatureRow label={t.premium.featureAi} />
            <FeatureRow label={t.premium.featureMultiCurrency} />
            <FeatureRow label={t.premium.forCouple} />
          </View>

          <View className="flex-row gap-3 mb-4">
            <PlanCard
              id="annual"
              label={t.premium.annual}
              price={SUBSCRIPTION_PRICING.annual.price}
              suffix={t.premium.perYear}
              badge={t.premium.bestValue}
            />
            <PlanCard
              id="monthly"
              label={t.premium.monthly}
              price={SUBSCRIPTION_PRICING.monthly.price}
              suffix={t.premium.perMonth}
            />
          </View>

          <Text className="text-xs text-gray-400 text-center mb-4">{t.premium.trialNote}</Text>

          <TouchableOpacity
            onPress={handleSubscribe}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={t.premium.subscribe}
            className="bg-pink-primary rounded-2xl py-4 items-center"
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-base">{t.premium.subscribe}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} className="items-center mt-3" activeOpacity={0.7}>
            <Text className="text-gray-400 text-sm">{t.premium.notNow}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
