import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useAuth,
  useProfile,
  useUpdateProfile,
  useCouple,
  useUpdateCouple,
  supabase,
  useI18n,
} from "@paca/api";
import {
  LOCALE_LABELS,
  SUPPORTED_CURRENCIES,
  type Locale,
} from "@paca/shared";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Heart,
  User,
  Mail,
  Copy,
  Check,
  LogOut,
  Moon,
  Sun,
  Bell,
  Download,
  UserMinus,
  ChevronRight,
  Shield,
  Globe,
  Coins,
  GraduationCap,
  Repeat,
} from "lucide-react";

export function ProfilePage() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { data: profile } = useProfile();
  const { data: couple } = useCouple();
  const updateProfile = useUpdateProfile();
  const updateCouple = useUpdateCouple();
  const { t, dateLocale, locale, setLocale, currency, setCurrency, translateCategory } = useI18n();

  const handleLanguageChange = async (newLocale: Locale) => {
    setLocale(newLocale);
    await updateProfile.mutateAsync({ language: newLocale });
  };

  const handleCurrencyChange = async (newCurrency: string) => {
    setCurrency(newCurrency);
    try {
      await updateCouple.mutateAsync({ primary_currency: newCurrency });
    } catch {
      // Revert on failure
      if (couple?.primary_currency) setCurrency(couple.primary_currency);
    }
  };

  const handleToggleAutoConvert = async () => {
    if (!couple) return;
    const next = !couple.auto_convert_currency;
    try {
      await updateCouple.mutateAsync({ auto_convert_currency: next });
    } catch {
      // swallow — UI will reflect server state on next fetch
    }
  };

  const handleReplayTutorial = async () => {
    // Reset the flag — AppLayout's effect re-opens the modal on next profile fetch
    await updateProfile.mutateAsync({ tutorial_completed: false });
  };

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(profile?.display_name ?? "");
  const [copied, setCopied] = useState(false);
  const [darkMode, setDarkMode] = useState(
    document.documentElement.classList.contains("dark")
  );

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    await updateProfile.mutateAsync({ display_name: newName.trim() });
    setEditingName(false);
  };

  const handleCopyCode = async () => {
    if (!couple?.invite_code) return;
    await navigator.clipboard.writeText(couple.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle("dark");
    setDarkMode(!darkMode);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const handleExportCSV = async () => {
    if (!profile?.couple_id) return;

    const { data } = await supabase
      .from("transactions")
      .select("date, description, type, amount, category:categories(name)")
      .eq("couple_id", profile.couple_id)
      .order("date", { ascending: false });

    if (!data || data.length === 0) return;

    const header = t.profile.csvHeader + "\n";
    const rows = data
      .map((row: any) => {
        const val = (row.amount / 100).toFixed(2);
        const cat = translateCategory(row.category?.name);
        return `${row.date},"${row.description}",${row.type === "income" ? t.profile.csvIncome : t.profile.csvExpense},${val},"${cat}"`;
      })
      .join("\n");

    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `paca-transacoes-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl mx-auto page-enter">
      <h1 className="text-2xl font-display font-bold text-gray-800 dark:text-gray-100 mb-8">
        {t.profile.title}
      </h1>

      {/* Couple Card */}
      {couple && (
        <div className="bg-gradient-to-br from-pink-primary via-pink-light to-pink-200 rounded-3xl p-8 mb-8 text-white shadow-xl shadow-pink-primary/20">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold">
              {profile?.display_name?.charAt(0).toUpperCase()}
            </div>
            <Heart className="w-8 h-8 text-white" />
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold">
              {couple.partner?.display_name?.charAt(0).toUpperCase() ?? "?"}
            </div>
          </div>
          <p className="text-center text-white/90 font-semibold text-lg">
            {profile?.display_name} & {couple.partner?.display_name ?? t.profile.waiting}
          </p>
          <p className="text-center text-white/60 text-sm mt-1">
            {t.profile.togetherSince}{" "}
            {new Date(couple.partner_since + "T00:00:00").toLocaleDateString(dateLocale, {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      )}

      {/* Profile section */}
      <Section title={t.profile.account}>
        {/* Name */}
        <SettingRow
          icon={<User className="w-5 h-5" />}
          label={t.profile.name}
          action={
            editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-100 w-40 focus:outline-none focus:ring-2 focus:ring-pink-primary/50"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                />
                <Button size="sm" onClick={handleSaveName} loading={updateProfile.isPending}>
                  {t.common.save}
                </Button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setNewName(profile?.display_name ?? "");
                  setEditingName(true);
                }}
                className="text-sm text-pink-primary font-medium hover:underline"
              >
                {profile?.display_name}
              </button>
            )
          }
        />

        {/* Email */}
        <SettingRow
          icon={<Mail className="w-5 h-5" />}
          label={t.profile.email}
          action={
            <span className="text-sm text-gray-500">{user?.email}</span>
          }
        />
      </Section>

      {/* Couple management */}
      {couple && (
        <Section title={t.profile.couple}>
          <SettingRow
            icon={<Copy className="w-5 h-5" />}
            label={t.profile.inviteCode}
            action={
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-2 text-sm font-mono text-pink-primary font-semibold hover:underline"
              >
                {couple.invite_code}
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            }
          />
        </Section>
      )}

      {/* Preferences */}
      <Section title={t.profile.preferences}>
        <SettingRow
          icon={darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          label={t.profile.darkMode}
          action={
            <button
              onClick={toggleDarkMode}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                darkMode ? "bg-pink-primary" : "bg-gray-200 dark:bg-gray-700"
              }`}
            >
              <div
                className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  darkMode ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          }
        />

        <SettingRow
          icon={<Globe className="w-5 h-5" />}
          label={t.profile.language}
          action={
            <div className="flex gap-1">
              {(Object.entries(LOCALE_LABELS) as [Locale, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => handleLanguageChange(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    locale === key
                      ? "bg-pink-primary text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          }
        />

        <SettingRow
          icon={<Coins className="w-5 h-5" />}
          label={t.profile.primaryCurrency}
          action={
            <select
              value={currency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-0 focus:outline-none focus:ring-2 focus:ring-pink-primary/50 cursor-pointer"
              aria-label={t.profile.primaryCurrency}
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} · {c.symbol}
                </option>
              ))}
            </select>
          }
        />

        <SettingRow
          icon={<Repeat className="w-5 h-5" />}
          label={t.profile.autoConvertCurrency}
          hint={t.profile.autoConvertCurrencyHint}
          action={
            <button
              onClick={handleToggleAutoConvert}
              aria-label={t.profile.autoConvertCurrency}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                couple?.auto_convert_currency ? "bg-pink-primary" : "bg-gray-200 dark:bg-gray-700"
              }`}
            >
              <div
                className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  couple?.auto_convert_currency ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          }
        />

        <SettingRow
          icon={<GraduationCap className="w-5 h-5" />}
          label={t.tutorial.replay}
          action={
            <button
              type="button"
              onClick={handleReplayTutorial}
              className="text-sm text-pink-primary font-medium hover:underline"
            >
              {t.common.ok}
            </button>
          }
        />

        <SettingRow
          icon={<Shield className="w-5 h-5" />}
          label={t.categoryManager.title}
          action={
            <button
              type="button"
              onClick={() => navigate("/categories")}
              aria-label={t.categoryManager.title}
              className="text-sm text-pink-primary font-medium hover:underline"
            >
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          }
        />

        <SettingRow
          icon={<Download className="w-5 h-5" />}
          label={t.profile.exportTransactions}
          action={
            <button
              onClick={handleExportCSV}
              className="text-sm text-pink-primary font-medium hover:underline"
            >
              {t.common.download}
            </button>
          }
        />
      </Section>

      {/* Support */}
      <Section title={t.profile.support}>
        <SettingRow
          icon={<Shield className="w-5 h-5" />}
          label={t.profile.termsOfUse}
          action={<ChevronRight className="w-4 h-4 text-gray-400" />}
        />
        <SettingRow
          icon={<Shield className="w-5 h-5" />}
          label={t.profile.privacyPolicy}
          action={<ChevronRight className="w-4 h-4 text-gray-400" />}
        />
      </Section>

      {/* Logout */}
      <div className="mt-6 mb-12">
        <Button
          variant="outline"
          fullWidth
          onClick={handleSignOut}
          className="!border-red-200 !text-red-primary hover:!bg-red-50 dark:!border-red-800 dark:hover:!bg-red-900/20"
        >
          <LogOut className="w-4 h-4" />
          {t.profile.signOut}
        </Button>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
        {title}
      </p>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700/50">
        {children}
      </div>
    </div>
  );
}

function SettingRow({
  icon,
  label,
  hint,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="flex items-start gap-3 text-gray-500 dark:text-gray-400 min-w-0">
        <div className="shrink-0 mt-0.5">{icon}</div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </div>
          {hint && (
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {hint}
            </div>
          )}
        </div>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}
