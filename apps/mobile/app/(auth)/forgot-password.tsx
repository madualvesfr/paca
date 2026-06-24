import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase, useI18n } from "@paca/api";

export default function ForgotPassword() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email) {
      setError(t.auth.fillAllFields);
      return;
    }

    setLoading(true);
    setError("");

    // No redirectTo: Supabase sends the recovery link to its configured Site URL.
    // For an in-app deep-link reset, allowlist `pacafinance://` in Supabase Auth
    // and handle the PASSWORD_RECOVERY event with a set-new-password screen.
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);

    setLoading(false);

    if (resetError) {
      setError(t.auth.resetError);
    } else {
      setSent(true);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          className="px-8"
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center mb-10">
            <Text className="text-3xl font-bold text-pink-primary">
              {t.auth.resetPasswordTitle}
            </Text>
            <Text className="text-gray-400 mt-2 text-base text-center">
              {t.auth.resetPasswordSubtitle}
            </Text>
          </View>

          {sent ? (
            <View className="items-center">
              <View className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 items-center justify-center mb-4">
                <Ionicons name="mail-outline" size={28} color="#10B981" />
              </View>
              <Text className="text-gray-600 dark:text-gray-300 text-sm text-center mb-8">
                {t.auth.resetLinkSent}
              </Text>
              <TouchableOpacity
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel={t.auth.backToLogin}
                className="bg-pink-primary rounded-2xl py-4 px-8 items-center"
                activeOpacity={0.8}
              >
                <Text className="text-white font-semibold text-base">
                  {t.auth.backToLogin}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {error ? (
                <View className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 mb-6">
                  <Text className="text-red-500 text-sm text-center">{error}</Text>
                </View>
              ) : null}

              <View className="gap-4">
                <View>
                  <Text className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">
                    {t.auth.email}
                  </Text>
                  <TextInput
                    className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3.5 text-gray-800 dark:text-gray-100"
                    placeholder={t.auth.emailPlaceholder}
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>

                <TouchableOpacity
                  onPress={handleReset}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel={t.auth.sendResetLink}
                  className="bg-pink-primary rounded-2xl py-4 items-center mt-2"
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white font-semibold text-base">
                      {t.auth.sendResetLink}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => router.back()}
                className="flex-row justify-center mt-8"
                activeOpacity={0.7}
              >
                <Text className="text-pink-primary font-semibold text-sm">
                  {t.auth.backToLogin}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
