import { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useProfile, useTransactions, useRealtimeTransactions, useI18n } from "@paca/api";
import {
  getCurrentMonth,
  type TransactionWithCategory,
} from "@paca/shared";

type TypeFilter = "all" | "income" | "expense";

export default function Transactions() {
  const router = useRouter();
  const { t, formatCurrency, formatDate, formatMonthYear, translateCategory } = useI18n();
  const { data: profile } = useProfile();
  const coupleId = profile?.couple_id ?? "";

  const [month, setMonth] = useState(getCurrentMonth());
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: transactions, isLoading } = useTransactions({
    coupleId,
    month,
    type: typeFilter === "all" ? undefined : typeFilter,
  });

  useRealtimeTransactions(coupleId || undefined);

  const filtered = useMemo(() => {
    if (!transactions) return [];
    if (!searchQuery) return transactions;
    const q = searchQuery.toLowerCase();
    return transactions.filter(
      (tx) =>
        tx.description.toLowerCase().includes(q) ||
        tx.category?.name?.toLowerCase().includes(q) ||
        translateCategory(tx.category?.name).toLowerCase().includes(q)
    );
  }, [transactions, searchQuery, translateCategory]);

  const prevMonth = () => {
    const d = new Date(month + "T00:00:00");
    d.setMonth(d.getMonth() - 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`);
  };
  const nextMonth = () => {
    const d = new Date(month + "T00:00:00");
    d.setMonth(d.getMonth() + 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`);
  };

  const income = filtered.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={["top"]}>
      {/* Header */}
      <View className="px-6 pt-4 pb-2">
        <Text className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          {t.transactions.title}
        </Text>
      </View>

      {/* Month nav */}
      <View className="flex-row items-center justify-between mx-6 mb-3 bg-white dark:bg-gray-800 rounded-2xl p-3 border border-gray-100 dark:border-gray-700">
        <TouchableOpacity onPress={prevMonth} className="p-2">
          <Ionicons name="chevron-back" size={20} color="#9CA3AF" />
        </TouchableOpacity>
        <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize">
          {formatMonthYear(month)}
        </Text>
        <TouchableOpacity onPress={nextMonth} className="p-2">
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View className="flex-row gap-3 mx-6 mb-3">
        <View className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-3 border border-gray-100 dark:border-gray-700">
          <Text className="text-xs text-gray-400 mb-1">{t.transactions.incomes}</Text>
          <Text className="text-base font-bold text-emerald-500">
            {formatCurrency(income)}
          </Text>
        </View>
        <View className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-3 border border-gray-100 dark:border-gray-700">
          <Text className="text-xs text-gray-400 mb-1">{t.transactions.expenses}</Text>
          <Text className="text-base font-bold text-red-500">
            {formatCurrency(expenses)}
          </Text>
        </View>
      </View>

      {/* Search */}
      <View className="mx-6 mb-3">
        <View className="flex-row items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3">
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            className="flex-1 py-3 px-2 text-sm text-gray-800 dark:text-gray-100"
            placeholder={`${t.common.search}...`}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Type filter */}
      <View className="flex-row gap-1 mx-6 mb-4 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
        {(["all", "expense", "income"] as TypeFilter[]).map((type) => (
          <TouchableOpacity
            key={type}
            onPress={() => setTypeFilter(type)}
            className={`flex-1 py-2.5 rounded-lg items-center ${
              typeFilter === type
                ? "bg-white dark:bg-gray-700 shadow-sm"
                : ""
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                typeFilter === type
                  ? "text-gray-800 dark:text-gray-100"
                  : "text-gray-400"
              }`}
            >
              {type === "all" ? t.transactions.allTypes : type === "income" ? t.transactions.incomes : t.transactions.expenses}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
        ListEmptyComponent={
          isLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator color="#FF8FB1" />
            </View>
          ) : (
            <View className="items-center py-12">
              <View className="w-14 h-14 rounded-2xl bg-pink-50 dark:bg-pink-900/20 items-center justify-center mb-3">
                <Ionicons name="receipt-outline" size={24} color="#FF8FB1" />
              </View>
              <Text className="text-gray-500 dark:text-gray-400 text-sm">
                {searchQuery ? t.transactions.noResults : t.transactions.noTransactionsPeriod}
              </Text>
            </View>
          )
        }
        renderItem={({ item: tx }) => {
          const categoryLabel = translateCategory(tx.category?.name);
          return (
          <View className="flex-row items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-700/50">
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
            <Text
              className={`text-sm font-semibold ${
                tx.type === "expense" ? "text-red-500" : "text-emerald-500"
              }`}
            >
              {tx.type === "expense" ? "- " : "+ "}
              {formatCurrency(tx.amount)}
            </Text>
          </View>
          );
        }}
      />

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
