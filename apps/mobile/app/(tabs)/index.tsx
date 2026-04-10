import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useProfile, useCouple, useTransactions, useRealtimeTransactions, useI18n } from "@paca/api";
import {
  getCurrentMonth,
  type TransactionWithCategory,
} from "@paca/shared";

export default function Dashboard() {
  const router = useRouter();
  const { t, formatCurrency, formatDate, greeting } = useI18n();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: couple } = useCouple();
  const coupleId = profile?.couple_id ?? "";
  const month = getCurrentMonth();

  const { data: transactions, isLoading: txLoading } = useTransactions({ coupleId, month });
  useRealtimeTransactions(coupleId || undefined);

  const income = (transactions ?? [])
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const expenses = (transactions ?? [])
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const balance = income - expenses;
  const recent = (transactions ?? []).slice(0, 5);

  if (profileLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900 items-center justify-center" edges={["top"]}>
        <ActivityIndicator size="large" color="#FF8FB1" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={["top"]}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 pt-4 pb-6">
          <View>
            <Text className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              {greeting()}, {profile?.display_name ?? ""}!
            </Text>
            <Text className="text-gray-400 text-sm mt-1">
              {t.dashboard.coupleSummary}
            </Text>
          </View>
          <TouchableOpacity className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl items-center justify-center border border-gray-100 dark:border-gray-700">
            <Ionicons name="notifications-outline" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View className="mx-6 bg-pink-primary rounded-3xl p-6 mb-6 shadow-lg">
          <Text className="text-white/70 text-sm mb-1">{t.dashboard.coupleBalance}</Text>
          <Text className="text-white text-3xl font-bold mb-4">
            {formatCurrency(balance)}
          </Text>
          <View className="flex-row gap-4">
            <View className="flex-row items-center gap-2">
              <View className="w-8 h-8 rounded-lg bg-white/20 items-center justify-center">
                <Text className="text-white text-sm font-bold">
                  {profile?.display_name?.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text className="text-white/80 text-sm">{t.common.me}</Text>
            </View>
            {couple?.partner && (
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-lg bg-white/20 items-center justify-center">
                  <Text className="text-white text-sm font-bold">
                    {couple.partner.display_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text className="text-white/80 text-sm">
                  {couple.partner.display_name}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Advisor CTA */}
        <TouchableOpacity
          onPress={() => router.push("/advisor")}
          className="mx-6 mb-6 rounded-2xl overflow-hidden border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/10"
          activeOpacity={0.85}
        >
          <View className="flex-row items-center gap-3 p-4">
            <View className="w-11 h-11 rounded-2xl bg-indigo-500 items-center justify-center">
              <Ionicons name="bulb" size={20} color="#fff" />
            </View>
            <View className="flex-1 min-w-0">
              <Text
                className="text-sm font-semibold text-gray-800 dark:text-gray-100"
                numberOfLines={1}
              >
                {t.advisor.cardCtaTitle}
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400" numberOfLines={1}>
                {t.advisor.cardCtaBody}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6366F1" />
          </View>
        </TouchableOpacity>

        {/* Income / Expenses */}
        <View className="flex-row gap-3 mx-6 mb-6">
          <View className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
            <View className="flex-row items-center gap-2 mb-2">
              <View className="w-8 h-8 rounded-lg bg-emerald-50 items-center justify-center">
                <Ionicons name="trending-up" size={16} color="#10B981" />
              </View>
              <Text className="text-xs text-gray-400">{t.dashboard.income}</Text>
            </View>
            <Text className="text-lg font-bold text-emerald-500">
              {formatCurrency(income)}
            </Text>
          </View>
          <View className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
            <View className="flex-row items-center gap-2 mb-2">
              <View className="w-8 h-8 rounded-lg bg-red-50 items-center justify-center">
                <Ionicons name="trending-down" size={16} color="#FF6B6B" />
              </View>
              <Text className="text-xs text-gray-400">{t.dashboard.expenses}</Text>
            </View>
            <Text className="text-lg font-bold text-red-500">
              {formatCurrency(expenses)}
            </Text>
          </View>
        </View>

        {/* Recent Transactions */}
        <View className="mx-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 mb-6">
          <View className="flex-row items-center justify-between p-4 pb-2">
            <Text className="text-base font-bold text-gray-800 dark:text-gray-100">
              {t.dashboard.recentTransactions}
            </Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/transactions")}>
              <Text className="text-sm text-pink-primary font-medium">
                {t.dashboard.seeAll}
              </Text>
            </TouchableOpacity>
          </View>

          {txLoading ? (
            <View className="p-8 items-center">
              <ActivityIndicator color="#FF8FB1" />
            </View>
          ) : recent.length === 0 ? (
            <View className="p-8 items-center">
              <View className="w-14 h-14 rounded-2xl bg-pink-50 dark:bg-pink-900/20 items-center justify-center mb-3">
                <Ionicons name="receipt-outline" size={24} color="#FF8FB1" />
              </View>
              <Text className="text-gray-500 dark:text-gray-400 text-sm text-center mb-1">
                {t.dashboard.noTransactionsYet}
              </Text>
              <Text className="text-gray-400 text-xs text-center">
                {t.dashboard.tapToAddFirst}
              </Text>
            </View>
          ) : (
            recent.map((t) => (
              <TransactionRow key={t.id} transaction={t} />
            ))
          )}
        </View>

        {/* FAB spacer */}
        <View className="h-20" />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push("/add-transaction")}
        className="absolute bottom-6 right-6 w-14 h-14 bg-pink-primary rounded-2xl items-center justify-center shadow-lg"
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function TransactionRow({ transaction: tx }: { transaction: TransactionWithCategory }) {
  const { formatCurrency, formatDate, translateCategory } = useI18n();
  const categoryLabel = translateCategory(tx.category?.name);
  return (
    <View className="flex-row items-center gap-3 px-4 py-3 border-t border-gray-50 dark:border-gray-700/50">
      <View
        className="w-10 h-10 rounded-xl items-center justify-center"
        style={{ backgroundColor: `${tx.category?.color ?? "#AEB6BF"}20` }}
      >
        <Text
          className="text-sm font-bold"
          style={{ color: tx.category?.color ?? "#AEB6BF" }}
        >
          {categoryLabel.charAt(0) || "?"}
        </Text>
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-sm font-medium text-gray-800 dark:text-gray-100 flex-shrink" numberOfLines={1}>
            {tx.description}
          </Text>
          {tx.notes && tx.notes.trim() !== "" && (
            <Ionicons name="document-text" size={12} color="#FF8FB1" />
          )}
        </View>
        <Text className="text-xs text-gray-400">
          {categoryLabel} · {formatDate(tx.date)}
        </Text>
      </View>
      <View className="items-end">
        <Text
          className={`text-sm font-semibold ${
            tx.type === "expense" ? "text-red-500" : "text-emerald-500"
          }`}
        >
          {tx.type === "expense" ? "- " : "+ "}
          {formatCurrency(tx.amount)}
        </Text>
        {tx.original_currency &&
          tx.original_currency !== tx.currency &&
          tx.original_amount != null && (
            <Text className="text-[10px] text-gray-400">
              {formatCurrency(tx.original_amount, tx.original_currency)}
            </Text>
          )}
      </View>
    </View>
  );
}
