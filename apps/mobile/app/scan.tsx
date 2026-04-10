import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  useProfile,
  useAddTransaction,
  useScanReceipt,
  useScanStatement,
  supabase,
  useI18n,
} from "@paca/api";
import type { Category } from "@paca/shared";

type Mode = "choose" | "single" | "batch";
type ScanStep = "upload" | "scanning" | "review";

interface ScannedTransaction {
  amount: number;
  currency?: string;
  original_amount?: number;
  original_currency?: string;
  exchange_rate?: number;
  description: string;
  category: string;
  date: string;
  type: "income" | "expense";
  confidence: number;
  selected?: boolean;
}

export default function ScanScreen() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const addTransaction = useAddTransaction();
  const scanReceipt = useScanReceipt();
  const scanStatement = useScanStatement();
  const { t, translateCategory } = useI18n();

  const [mode, setMode] = useState<Mode>("choose");
  const [step, setStep] = useState<ScanStep>("upload");
  const [preview, setPreview] = useState<string | null>(null);
  const [scannedItems, setScannedItems] = useState<ScannedTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .or(`is_default.eq.true,couple_id.eq.${profile?.couple_id}`)
        .order("name");
      if (data) setCategories(data);
    };
    if (profile?.couple_id) fetch();
  }, [profile?.couple_id]);

  const pickImage = async (useCamera: boolean) => {
    const method = useCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;

    const result = await method({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0].base64) return;

    setPreview(result.assets[0].uri);
    setStep("scanning");
    setError("");

    try {
      if (mode === "single") {
        const data = await scanReceipt.mutateAsync(result.assets[0].base64);
        const valid = Number.isFinite(data.amount) && Math.abs(data.amount) > 0;
        setScannedItems([{ ...data, selected: valid }]);
      } else {
        const data = await scanStatement.mutateAsync(result.assets[0].base64);
        setScannedItems(
          data.transactions.map((tx) => ({
            ...tx,
            selected: Number.isFinite(tx.amount) && Math.abs(tx.amount) > 0,
          }))
        );
      }
      setStep("review");
    } catch {
      setError(t.scan.imageError);
      setStep("upload");
    }
  };

  const getCategoryId = (name: string) => {
    const found = categories.find(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    );
    return found?.id ?? categories[0]?.id ?? "";
  };

  const handleSave = async () => {
    setSaving(true);
    // Filter out rows with invalid/zero amounts — DB has CHECK (amount > 0)
    const selected = scannedItems.filter(
      (it) => it.selected && Number.isFinite(it.amount) && Math.abs(it.amount) > 0
    );
    if (selected.length === 0) {
      setError(t.scan.saveError);
      setSaving(false);
      return;
    }
    try {
      for (const it of selected) {
        await addTransaction.mutateAsync({
          couple_id: profile!.couple_id!,
          paid_by: profile!.id,
          type: it.type,
          amount: Math.abs(it.amount),
          currency: it.currency,
          original_amount: it.original_amount != null ? Math.abs(it.original_amount) : null,
          original_currency: it.original_currency,
          exchange_rate: it.exchange_rate,
          description: it.description,
          category_id: getCategoryId(it.category),
          date: it.date ?? new Date().toISOString().split("T")[0],
          ai_scanned: true,
        });
      }
      router.back();
    } catch {
      setError(t.scan.saveError);
    } finally {
      setSaving(false);
    }
  };

  const toggleItem = (i: number) => {
    setScannedItems((prev) =>
      prev.map((item, idx) =>
        idx === i ? { ...item, selected: !item.selected } : item
      )
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      {/* Header */}
      <View className="flex-row items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-800">
        <TouchableOpacity
          onPress={() => {
            if (step !== "upload" || mode !== "choose") {
              setStep("upload");
              setMode("choose");
              setPreview(null);
              setScannedItems([]);
            } else {
              router.back();
            }
          }}
          className="p-1"
        >
          <Ionicons name="arrow-back" size={24} color="#9CA3AF" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-800 dark:text-gray-100">
            {t.scan.title}
          </Text>
          <Text className="text-xs text-gray-400">
            {t.scan.subtitle}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-6" keyboardShouldPersistTaps="handled">
        {error ? (
          <View className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 mt-4">
            <Text className="text-red-500 text-sm text-center">{error}</Text>
          </View>
        ) : null}

        {/* Mode choice */}
        {mode === "choose" && (
          <View className="gap-4 mt-6">
            <TouchableOpacity
              onPress={() => setMode("single")}
              className="border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-6"
              activeOpacity={0.7}
            >
              <View className="w-14 h-14 rounded-2xl bg-pink-50 dark:bg-pink-900/20 items-center justify-center mb-3">
                <Ionicons name="camera-outline" size={28} color="#FF8FB1" />
              </View>
              <Text className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">
                {t.scan.receiptTitle}
              </Text>
              <Text className="text-sm text-gray-400">
                {t.scan.receiptDesc}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMode("batch")}
              className="border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-6"
              activeOpacity={0.7}
            >
              <View className="w-14 h-14 rounded-2xl bg-pink-50 dark:bg-pink-900/20 items-center justify-center mb-3">
                <Ionicons name="document-text-outline" size={28} color="#FF8FB1" />
              </View>
              <Text className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">
                {t.scan.statementTitle}
              </Text>
              <Text className="text-sm text-gray-400">
                {t.scan.statementDesc}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Upload options */}
        {mode !== "choose" && step === "upload" && (
          <View className="gap-4 mt-6">
            <TouchableOpacity
              onPress={() => pickImage(true)}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-8 items-center"
              activeOpacity={0.7}
            >
              <Ionicons name="camera" size={36} color="#FF8FB1" />
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-3">
                {t.scan.takePhoto}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => pickImage(false)}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-8 items-center"
              activeOpacity={0.7}
            >
              <Ionicons name="images" size={36} color="#FF8FB1" />
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-3">
                {t.scan.chooseGallery}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Scanning */}
        {step === "scanning" && (
          <View className="items-center py-16">
            <View className="w-16 h-16 rounded-2xl bg-pink-50 dark:bg-pink-900/20 items-center justify-center mb-6">
              <Ionicons name="sparkles" size={32} color="#FF8FB1" />
            </View>
            <Text className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
              {t.scan.analyzing}
            </Text>
            <ActivityIndicator color="#FF8FB1" className="mt-4" />
            {preview && (
              <Image
                source={{ uri: preview }}
                className="w-48 h-64 rounded-2xl mt-8"
                resizeMode="cover"
              />
            )}
          </View>
        )}

        {/* Review */}
        {step === "review" && (
          <View className="mt-4">
            <View className="flex-row items-center gap-2 mb-4">
              <Ionicons name="sparkles" size={20} color="#FF8FB1" />
              <Text className="text-base font-bold text-gray-800 dark:text-gray-100">
                {scannedItems.length} {scannedItems.length === 1 ? t.scan.transaction : t.scan.transactions}
              </Text>
            </View>

            {scannedItems.map((item, i) => (
              <View
                key={i}
                className={`bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 mb-3 border-2 ${
                  item.selected
                    ? "border-pink-primary/30"
                    : "border-gray-100 dark:border-gray-700 opacity-50"
                }`}
              >
                <View className="flex-row items-start justify-between mb-2">
                  <TouchableOpacity
                    onPress={() => toggleItem(i)}
                    className="flex-row items-center gap-3 flex-1"
                  >
                    <View
                      className={`w-6 h-6 rounded-lg border-2 items-center justify-center ${
                        item.selected
                          ? "bg-pink-primary border-pink-primary"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {item.selected && (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                        {item.description}
                      </Text>
                      <Text className="text-xs text-gray-400">
                        {translateCategory(item.category)} · {item.date} ·{" "}
                        <Text className="text-pink-primary">
                          {Math.round(item.confidence * 100)}%
                        </Text>
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <Text
                    className={`text-sm font-bold ${
                      item.type === "expense"
                        ? "text-red-500"
                        : "text-emerald-500"
                    }`}
                  >
                    R$ {(item.amount / 100).toFixed(2)}
                  </Text>
                </View>

                {/* Confidence bar */}
                <View className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${item.confidence * 100}%`,
                      backgroundColor:
                        item.confidence >= 0.9
                          ? "#34D399"
                          : item.confidence >= 0.7
                            ? "#FBBF24"
                            : "#F87171",
                    }}
                  />
                </View>
              </View>
            ))}

            <View className="flex-row gap-3 mt-4 mb-8">
              <TouchableOpacity
                onPress={() => {
                  setStep("upload");
                  setPreview(null);
                  setScannedItems([]);
                }}
                className="px-6 py-4 rounded-2xl"
              >
                <Text className="text-gray-500 font-semibold">{t.scan.another}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving || !scannedItems.some((t) => t.selected)}
                className="flex-1 bg-pink-primary rounded-2xl py-4 items-center"
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-semibold">
                    {t.scan.saveCount} {scannedItems.filter((s) => s.selected).length} {scannedItems.filter((s) => s.selected).length === 1 ? t.scan.transaction : t.scan.transactions}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
