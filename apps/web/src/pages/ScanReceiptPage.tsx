import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useProfile,
  useCouple,
  useAddTransaction,
  useScanReceipt,
  useScanStatement,
  supabase,
  useI18n,
} from "@paca/api";
import { DEFAULT_CATEGORIES, type Category } from "@paca/shared";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  ArrowLeft,
  Upload,
  Camera,
  FileText,
  Check,
  X,
  Sparkles,
  AlertTriangle,
} from "lucide-react";

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

export function ScanReceiptPage() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data: couple } = useCouple();
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
  const [scanProgress, setScanProgress] = useState({ done: 0, total: 0 });
  const fileRef = useRef<HTMLInputElement>(null);

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

  const readFileAsBase64 = (file: File) =>
    new Promise<{ dataUrl: string; base64: string }>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve({ dataUrl, base64: dataUrl.split(",")[1] });
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    // Reset the input so selecting the same files again re-fires change
    e.target.value = "";
    if (files.length === 0) return;

    setStep("scanning");
    setError("");
    setScannedItems([]);
    setScanProgress({ done: 0, total: files.length });

    // Show the first image as a preview while scanning
    try {
      const firstPreview = await readFileAsBase64(files[0]);
      setPreview(firstPreview.dataUrl);
    } catch {
      // Preview is cosmetic — ignore read errors here
    }

    const allItems: ScannedTransaction[] = [];
    let failures = 0;

    // Process images sequentially so we can stream progress and keep the
    // AI backend from hitting its rate limit on a big batch.
    for (const file of files) {
      try {
        const { base64 } = await readFileAsBase64(file);
        if (mode === "single") {
          const result = await scanReceipt.mutateAsync(base64);
          const valid = Number.isFinite(result.amount) && Math.abs(result.amount) > 0;
          if (result && result.amount != null) {
            allItems.push({ ...result, selected: valid });
          }
        } else {
          const result = await scanStatement.mutateAsync(base64);
          for (const tx of result.transactions) {
            allItems.push({
              ...tx,
              selected: Number.isFinite(tx.amount) && Math.abs(tx.amount) > 0,
            });
          }
        }
      } catch {
        failures++;
      } finally {
        setScanProgress((prev) => ({ ...prev, done: prev.done + 1 }));
      }
    }

    if (allItems.length === 0) {
      setError(t.scan.imageError);
      setStep("upload");
      return;
    }

    setScannedItems(allItems);
    if (failures > 0) {
      setError(t.scan.imageError);
    }
    setStep("review");
  };

  const getCategoryId = (categoryName: string): string => {
    const target = categoryName.toLowerCase().trim();
    const found = categories.find((c) => {
      if (c.name.toLowerCase() === target) return true;
      const translations = c.name_translations ?? {};
      return Object.values(translations).some(
        (v) => typeof v === "string" && v.toLowerCase() === target
      );
    });
    return found?.id ?? categories[0]?.id ?? "";
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");

    // Filter out any scanned row with an invalid amount — the DB has
    // CHECK (amount > 0), so zero/NaN would fail the whole batch.
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
      navigate("/transactions");
    } catch {
      setError(t.scan.saveError);
    } finally {
      setSaving(false);
    }
  };

  const toggleItem = (index: number) => {
    setScannedItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const updateItem = (index: number, field: string, value: any) => {
    setScannedItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  return (
    <div className="max-w-3xl mx-auto page-enter">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => {
            if (step !== "upload" || mode !== "choose") {
              setStep("upload");
              setMode("choose");
              setPreview(null);
              setScannedItems([]);
              setError("");
            } else {
              navigate(-1);
            }
          }}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-800 dark:text-gray-100">
            {t.scan.title}
          </h1>
          <p className="text-sm text-gray-400">
            {t.scan.subtitle}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-primary/10 border border-red-200 dark:border-red-primary/20 text-red-primary text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Mode selection */}
      {mode === "choose" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setMode("single")}
            className="p-8 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-pink-primary dark:hover:border-pink-primary transition-all text-left group"
          >
            <div className="w-14 h-14 rounded-2xl bg-pink-50 dark:bg-pink-primary/10 flex items-center justify-center mb-4 group-hover:bg-pink-100 dark:group-hover:bg-pink-primary/20 transition-colors">
              <Camera className="w-7 h-7 text-pink-primary" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
              {t.scan.receiptTitle}
            </h3>
            <p className="text-sm text-gray-400">
              {t.scan.receiptDesc}
            </p>
          </button>

          <button
            onClick={() => setMode("batch")}
            className="p-8 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-pink-primary dark:hover:border-pink-primary transition-all text-left group"
          >
            <div className="w-14 h-14 rounded-2xl bg-pink-50 dark:bg-pink-primary/10 flex items-center justify-center mb-4 group-hover:bg-pink-100 dark:group-hover:bg-pink-primary/20 transition-colors">
              <FileText className="w-7 h-7 text-pink-primary" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
              {t.scan.statementTitle}
            </h3>
            <p className="text-sm text-gray-400">
              {t.scan.statementDesc}
            </p>
          </button>
        </div>
      )}

      {/* Upload */}
      {mode !== "choose" && step === "upload" && (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFile}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full p-12 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-pink-primary dark:hover:border-pink-primary transition-colors flex flex-col items-center gap-4 group"
          >
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-pink-50 dark:group-hover:bg-pink-primary/10 transition-colors">
              <Upload className="w-8 h-8 text-gray-400 group-hover:text-pink-primary transition-colors" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t.scan.clickToUpload}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {t.scan.fileTypes} · {t.scan.multipleHint}
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Scanning */}
      {step === "scanning" && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-pink-50 dark:bg-pink-primary/10 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-pink-primary animate-pulse" />
          </div>
          <h3 className="text-lg font-display font-bold text-gray-800 dark:text-gray-100 mb-2">
            {t.scan.analyzing}
          </h3>
          <p className="text-sm text-gray-400">
            {t.scan.aiExtracting}{" "}
            {mode === "single" ? t.scan.aiExtractingSingle : t.scan.aiExtractingMulti}
          </p>
          {scanProgress.total > 1 && (
            <p className="text-xs text-gray-400 mt-2 tabular-nums">
              {scanProgress.done} / {scanProgress.total}
            </p>
          )}
          <div className="w-48 h-1.5 mx-auto mt-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full bg-pink-primary rounded-full ${
                scanProgress.total > 1 ? "transition-all duration-300" : "animate-scan"
              }`}
              style={
                scanProgress.total > 1
                  ? { width: `${(scanProgress.done / scanProgress.total) * 100}%` }
                  : undefined
              }
            />
          </div>

          {preview && (
            <div className="mt-8 max-w-xs mx-auto">
              <img
                src={preview}
                alt="Preview"
                className="rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg"
              />
            </div>
          )}
        </div>
      )}

      {/* Review */}
      {step === "review" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-pink-primary" />
              <h3 className="text-lg font-display font-bold text-gray-800 dark:text-gray-100">
                {scannedItems.length} {t.scan.transactionsFound}
              </h3>
            </div>
            <span className="text-xs text-gray-400">
              {t.scan.reviewBeforeSave}
            </span>
          </div>

          <div className="space-y-3 mb-6">
            {scannedItems.map((item, i) => (
              <div
                key={i}
                className={`bg-white dark:bg-gray-800 rounded-2xl border-2 p-5 transition-all ${
                  item.selected
                    ? "border-pink-primary/30"
                    : "border-gray-100 dark:border-gray-700 opacity-50"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleItem(i)}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                        item.selected
                          ? "bg-pink-primary border-pink-primary"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {item.selected && <Check className="w-4 h-4 text-white" />}
                    </button>
                    <div>
                      <input
                        value={item.description}
                        onChange={(e) => updateItem(i, "description", e.target.value)}
                        className="text-sm font-semibold text-gray-800 dark:text-gray-100 bg-transparent border-none outline-none w-full"
                      />
                      <p className="text-xs text-gray-400">
                        {translateCategory(item.category)} · {item.date} ·{" "}
                        <span className="text-pink-primary">
                          {Math.round(item.confidence * 100)}% {t.scan.confidence}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <input
                      value={(Math.abs(item.amount) / 100).toFixed(2)}
                      onChange={(e) =>
                        updateItem(
                          i,
                          "amount",
                          Math.round(parseFloat(e.target.value || "0") * 100)
                        )
                      }
                      className={`text-sm font-bold text-right bg-transparent border-none outline-none w-24 ${
                        item.type === "expense"
                          ? "text-red-primary"
                          : "text-emerald-500"
                      }`}
                    />
                    <p className="text-xs text-gray-400">
                      {item.type === "expense" ? t.transactions.expense : t.transactions.income}
                    </p>
                    {item.original_currency &&
                      item.currency &&
                      item.original_currency !== item.currency &&
                      item.original_amount != null && (
                        <p className="text-[10px] text-gray-400 mt-1">
                          {item.original_currency}{" "}
                          {(Math.abs(item.original_amount) / 100).toFixed(2)}
                        </p>
                      )}
                  </div>
                </div>

                {/* Confidence bar */}
                <div className="w-full h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      item.confidence >= 0.9
                        ? "bg-emerald-400"
                        : item.confidence >= 0.7
                          ? "bg-amber-400"
                          : "bg-red-400"
                    }`}
                    style={{ width: `${item.confidence * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setStep("upload");
                setPreview(null);
                setScannedItems([]);
              }}
            >
              {t.scan.scanAnother}
            </Button>
            <Button
              fullWidth
              loading={saving}
              onClick={handleSave}
              disabled={!scannedItems.some((item) => item.selected)}
            >
              {t.scan.saveCount} {scannedItems.filter((item) => item.selected).length} {scannedItems.filter((item) => item.selected).length === 1 ? t.scan.transaction : t.scan.transactions}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
