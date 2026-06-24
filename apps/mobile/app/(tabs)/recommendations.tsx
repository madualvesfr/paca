import { View, Text, ScrollView, TouchableOpacity, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  usePartnerOffers,
  useLogOfferClick,
  useProfile,
  useTransactions,
  useI18n,
  useAppStore,
} from "@paca/api";
import { getCurrentMonth, CREDIT_OFFER_CATEGORIES, type PartnerOffer } from "@paca/shared";
import { ScreenContainer } from "../../components/ScreenContainer";

export default function Recommendations() {
  const { t, locale } = useI18n();
  const { data: profile } = useProfile();
  const mode = useAppStore((s) => s.mode);
  const coupleId = profile?.couple_id ?? "";
  const { data: offers } = usePartnerOffers();
  const { data: transactions } = useTransactions({ coupleId, mode, month: getCurrentMonth() });
  const logClick = useLogOfferClick();

  // Compliance (D9): never show credit offers to an indebted couple.
  const balance = (transactions ?? []).reduce(
    (sum, tx) => sum + (tx.type === "income" ? tx.amount : -tx.amount),
    0,
  );
  const indebted = balance < 0;
  const creditCats = CREDIT_OFFER_CATEGORIES as readonly string[];
  const visible = (offers ?? []).filter(
    (o) => !(indebted && o.category != null && creditCats.includes(o.category)),
  );

  const pick = (m: Record<string, string> | null | undefined) =>
    m?.[locale] ?? m?.en ?? Object.values(m ?? {})[0] ?? "";

  const openOffer = (offer: PartnerOffer) => {
    logClick.mutate(offer.id);
    Linking.openURL(offer.affiliate_url).catch(() => {});
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={["top"]}>
      <ScreenContainer className="flex-1">
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-6 pt-4 pb-2">
            <Text className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              {t.recommendations.title}
            </Text>
            <Text className="text-gray-400 text-sm mt-1">{t.recommendations.subtitle}</Text>
          </View>

          {visible.length === 0 ? (
            <View className="items-center py-20 px-8">
              <View className="w-14 h-14 rounded-2xl bg-pink-50 dark:bg-pink-900/20 items-center justify-center mb-3">
                <Ionicons name="gift-outline" size={24} color="#FF8FB1" />
              </View>
              <Text className="text-gray-500 dark:text-gray-400 text-sm text-center">
                {t.recommendations.empty}
              </Text>
            </View>
          ) : (
            <View className="px-6 gap-3 pb-8">
              {visible.map((offer) => (
                <View
                  key={offer.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4"
                >
                  <View className="flex-row items-start gap-3">
                    <View
                      className="w-11 h-11 rounded-2xl items-center justify-center"
                      style={{ backgroundColor: `${offer.icon_color ?? "#FF8FB1"}20` }}
                    >
                      <Ionicons
                        // offer.icon is a dynamic Ionicons glyph name from the DB
                        name={(offer.icon ?? "pricetag-outline") as never}
                        size={20}
                        color={offer.icon_color ?? "#FF8FB1"}
                      />
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                        {pick(offer.title_translations)}
                      </Text>
                      <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {pick(offer.description_translations)}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center justify-between mt-3">
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="megaphone-outline" size={12} color="#9CA3AF" />
                      <Text className="text-[10px] text-gray-400 uppercase tracking-wide">
                        {t.recommendations.paidPartnership}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => openOffer(offer)}
                      accessibilityRole="button"
                      accessibilityLabel={t.recommendations.cta}
                      className="bg-pink-primary rounded-xl px-4 py-2"
                      activeOpacity={0.85}
                    >
                      <Text className="text-white text-xs font-semibold">{t.recommendations.cta}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </ScreenContainer>
    </SafeAreaView>
  );
}
