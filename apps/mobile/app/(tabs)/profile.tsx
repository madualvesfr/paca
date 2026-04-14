import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Share,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  useProfile,
  useUpdateProfile,
  useCouple,
  useUpdateCouple,
  supabase,
  useI18n,
} from "@paca/api";
import { LOCALE_LABELS, SUPPORTED_CURRENCIES, type Locale } from "@paca/shared";

export default function Profile() {
  const router = useRouter();
  const { t, dateLocale, locale, setLocale, currency, setCurrency, translateCategory } = useI18n();

  const { data: profile } = useProfile();
  const { data: couple } = useCouple();
  const updateProfile = useUpdateProfile();
  const updateCouple = useUpdateCouple();

  const handleLanguageChange = async (newLocale: Locale) => {
    setLocale(newLocale);
    await updateProfile.mutateAsync({ language: newLocale });
  };

  const handleCurrencyChange = async (newCurrency: string) => {
    setCurrency(newCurrency);
    try {
      await updateCouple.mutateAsync({ primary_currency: newCurrency });
    } catch {
      if (couple?.primary_currency) setCurrency(couple.primary_currency);
    }
  };

  const handleReplayTutorial = async () => {
    // Reset the flag — the tabs layout re-opens the modal on next profile fetch
    await updateProfile.mutateAsync({ tutorial_completed: false });
  };

  const handleToggleAutoConvert = async () => {
    if (!couple) return;
    try {
      await updateCouple.mutateAsync({
        auto_convert_currency: !couple.auto_convert_currency,
      });
    } catch {
      // ignore — UI reflects server state on next fetch
    }
  };

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(profile?.display_name ?? "");

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    await updateProfile.mutateAsync({ display_name: newName.trim() });
    setEditingName(false);
  };

  const handleShareCode = async () => {
    if (!couple?.invite_code) return;
    try {
      await Share.share({
        message: `${t.profile.shareInvite} ${couple.invite_code}`,
      });
    } catch {}
  };

  const handleSignOut = () => {
    Alert.alert(t.profile.signOutConfirm, t.profile.signOutMessage, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.profile.signOut,
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const handleExportCSV = async () => {
    if (!profile?.couple_id) return;

    const { data } = await supabase
      .from("transactions")
      .select("date, description, type, amount, category:categories(name)")
      .eq("couple_id", profile.couple_id)
      .order("date", { ascending: false });

    if (!data || data.length === 0) {
      Alert.alert(t.profile.noTransactionsExport);
      return;
    }

    const header = `${t.profile.csvHeader}\n`;
    const rows = data
      .map((row: any) => {
        const val = (row.amount / 100).toFixed(2);
        return `${row.date},"${row.description}",${row.type === "income" ? t.profile.csvIncome : t.profile.csvExpense},${val},"${translateCategory(row.category?.name)}"`;
      })
      .join("\n");

    try {
      await Share.share({ message: header + rows, title: "Transações Paca Finance" });
    } catch {}
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={["top"]}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-6 pt-4 pb-2">
          <Text className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {t.profile.titleMobile}
          </Text>
        </View>

        {/* Couple Card */}
        {couple && (
          <View className="mx-6 bg-pink-primary rounded-3xl p-6 mb-6 items-center">
            <View className="flex-row items-center gap-4 mb-3">
              <View className="w-14 h-14 rounded-2xl bg-white/20 items-center justify-center">
                <Text className="text-white text-xl font-bold">
                  {profile?.display_name?.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Ionicons name="heart" size={24} color="#fff" />
              <View className="w-14 h-14 rounded-2xl bg-white/20 items-center justify-center">
                <Text className="text-white text-xl font-bold">
                  {couple.partner?.display_name?.charAt(0).toUpperCase() ?? "?"}
                </Text>
              </View>
            </View>
            <Text className="text-white font-semibold text-lg">
              {profile?.display_name} &{" "}
              {couple.partner?.display_name ?? `${t.profile.waiting}`}
            </Text>
            <Text className="text-white/60 text-sm mt-1">
              {t.profile.togetherSince}{" "}
              {new Date(couple.partner_since + "T00:00:00").toLocaleDateString(
                dateLocale,
                { month: "long", year: "numeric" }
              )}
            </Text>
          </View>
        )}

        {/* Account */}
        <SectionTitle title={t.profile.account} />
        <View className="mx-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 mb-4">
          {/* Name */}
          <TouchableOpacity
            onPress={() => {
              setNewName(profile?.display_name ?? "");
              setEditingName(true);
            }}
            className="flex-row items-center justify-between px-5 py-4 border-b border-gray-50 dark:border-gray-700/50"
          >
            <View className="flex-row items-center gap-3">
              <Ionicons name="person-outline" size={20} color="#9CA3AF" />
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.profile.name}
              </Text>
            </View>
            {editingName ? (
              <View className="flex-row items-center gap-2">
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-800 dark:text-gray-100 w-32"
                  autoFocus
                  onSubmitEditing={handleSaveName}
                />
                <TouchableOpacity onPress={handleSaveName}>
                  {updateProfile.isPending ? (
                    <ActivityIndicator size="small" color="#FF8FB1" />
                  ) : (
                    <Text className="text-pink-primary font-semibold text-sm">
                      OK
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <Text className="text-sm text-pink-primary font-medium">
                {profile?.display_name}
              </Text>
            )}
          </TouchableOpacity>

          {/* Email */}
          <View className="flex-row items-center justify-between px-5 py-4">
            <View className="flex-row items-center gap-3">
              <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.profile.email}
              </Text>
            </View>
            <Text className="text-sm text-gray-400">{profile?.user_id ? "..." : ""}</Text>
          </View>
        </View>

        {/* Couple */}
        {couple && (
          <>
            <SectionTitle title={t.profile.couple} />
            <View className="mx-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 mb-4">
              <TouchableOpacity
                onPress={handleShareCode}
                className="flex-row items-center justify-between px-5 py-4"
              >
                <View className="flex-row items-center gap-3">
                  <Ionicons name="code-outline" size={20} color="#9CA3AF" />
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t.profile.inviteCode}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm font-mono text-pink-primary font-semibold">
                    {couple.invite_code}
                  </Text>
                  <Ionicons name="share-outline" size={16} color="#FF8FB1" />
                </View>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Preferences */}
        <SectionTitle title={t.profile.preferences} />
        <View className="mx-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 mb-4">
          {/* Language */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-50 dark:border-gray-700/50">
            <View className="flex-row items-center gap-3">
              <Ionicons name="globe-outline" size={20} color="#9CA3AF" />
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.profile.language}
              </Text>
            </View>
            <View className="flex-row gap-1">
              {(Object.entries(LOCALE_LABELS) as [Locale, string][]).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => handleLanguageChange(key)}
                  className={`px-2.5 py-1.5 rounded-lg ${
                    locale === key
                      ? "bg-pink-primary"
                      : "bg-gray-100 dark:bg-gray-700"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      locale === key
                        ? "text-white"
                        : "text-gray-500"
                    }`}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Primary currency */}
          <View className="px-5 py-4 border-b border-gray-50 dark:border-gray-700/50">
            <View className="flex-row items-center gap-3 mb-3">
              <Ionicons name="cash-outline" size={20} color="#9CA3AF" />
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.profile.primaryCurrency}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <TouchableOpacity
                  key={c.code}
                  onPress={() => handleCurrencyChange(c.code)}
                  className={`px-3 py-1.5 rounded-lg ${
                    currency === c.code
                      ? "bg-pink-primary"
                      : "bg-gray-100 dark:bg-gray-700"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      currency === c.code ? "text-white" : "text-gray-500"
                    }`}
                  >
                    {c.code} · {c.symbol}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Auto convert currency */}
          <View className="px-5 py-4 border-b border-gray-50 dark:border-gray-700/50">
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-row items-start gap-3 flex-1">
                <Ionicons name="swap-horizontal-outline" size={20} color="#9CA3AF" />
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t.profile.autoConvertCurrency}
                  </Text>
                  <Text className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {t.profile.autoConvertCurrencyHint}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={handleToggleAutoConvert}
                accessibilityLabel={t.profile.autoConvertCurrency}
                className={`relative w-12 h-7 rounded-full ${
                  couple?.auto_convert_currency
                    ? "bg-pink-primary"
                    : "bg-gray-200 dark:bg-gray-700"
                }`}
              >
                <View
                  style={{
                    position: "absolute",
                    top: 2,
                    left: couple?.auto_convert_currency ? 22 : 2,
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: "white",
                  }}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Categories management */}
          <TouchableOpacity
            onPress={() => router.push("/categories")}
            className="flex-row items-center justify-between px-5 py-4 border-b border-gray-50 dark:border-gray-700/50"
          >
            <View className="flex-row items-center gap-3">
              <Ionicons name="pricetags-outline" size={20} color="#9CA3AF" />
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.categoryManager.title}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
          </TouchableOpacity>

          {/* Replay tutorial */}
          <TouchableOpacity
            onPress={handleReplayTutorial}
            className="flex-row items-center justify-between px-5 py-4 border-b border-gray-50 dark:border-gray-700/50"
          >
            <View className="flex-row items-center gap-3">
              <Ionicons name="school-outline" size={20} color="#9CA3AF" />
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.tutorial.replay}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
          </TouchableOpacity>

          {/* Export */}
          <TouchableOpacity
            onPress={handleExportCSV}
            className="flex-row items-center justify-between px-5 py-4"
          >
            <View className="flex-row items-center gap-3">
              <Ionicons name="download-outline" size={20} color="#9CA3AF" />
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.profile.exportTransactionsMobile}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
          </TouchableOpacity>
        </View>

        {/* Support */}
        <SectionTitle title={t.profile.support} />
        <View className="mx-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 mb-4">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-50 dark:border-gray-700/50">
            <View className="flex-row items-center gap-3">
              <Ionicons name="shield-outline" size={20} color="#9CA3AF" />
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.profile.termsOfUse}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
          </View>
          <View className="flex-row items-center justify-between px-5 py-4">
            <View className="flex-row items-center gap-3">
              <Ionicons name="shield-outline" size={20} color="#9CA3AF" />
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.profile.privacyPolicy}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
          </View>
        </View>

        {/* Logout */}
        <View className="mx-6 mb-12">
          <TouchableOpacity
            onPress={handleSignOut}
            className="border-2 border-red-200 dark:border-red-800 rounded-2xl py-4 items-center flex-row justify-center gap-2"
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
            <Text className="text-red-500 font-semibold">{t.profile.signOut}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mx-6 mb-2 mt-2">
      {title}
    </Text>
  );
}
