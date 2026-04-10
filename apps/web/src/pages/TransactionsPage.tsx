import { useState, useMemo } from "react";
import { useProfile, useCouple, useTransactions, useDeleteTransaction, useRealtimeTransactions, useI18n } from "@paca/api";
import {
  getCurrentMonth,
  DEFAULT_CATEGORIES,
  type TransactionWithCategory,
} from "@paca/shared";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Pencil,
  FileDown,
} from "lucide-react";
import { TransactionsSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { EmptyState } from "@/components/ui/EmptyState";
import { exportMonthlyReport } from "@/utils/exportPdf";

type TypeFilter = "all" | "income" | "expense";
type PaidByFilter = "all" | "me" | "partner";

export function TransactionsPage() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: couple } = useCouple();
  const { t, formatCurrency, formatCurrencyCompact, formatDate, formatMonthYear } = useI18n();
  const coupleId = profile?.couple_id ?? "";

  const [month, setMonth] = useState(getCurrentMonth());
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [paidByFilter, setPaidByFilter] = useState<PaidByFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const deleteTransaction = useDeleteTransaction();
  const { toast } = useToast();

  const { data: transactions, isLoading } = useTransactions({
    coupleId,
    month,
    type: typeFilter === "all" ? undefined : typeFilter,
  });

  useRealtimeTransactions(coupleId || undefined);

  const filtered = useMemo(() => {
    if (!transactions) return [];
    let result = transactions;

    // Filter by who paid
    if (paidByFilter === "me" && profile) {
      result = result.filter((t) => t.paid_by === profile.id);
    } else if (paidByFilter === "partner" && profile) {
      result = result.filter((t) => t.paid_by !== profile.id);
    }

    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.category?.name?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [transactions, searchQuery, paidByFilter, profile]);

  // Month navigation
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

  const income = (filtered ?? [])
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const expenses = (filtered ?? [])
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const handleDelete = async (id: string) => {
    if (!confirm(t.transactions.deleteConfirm)) return;
    await deleteTransaction.mutateAsync(id);
    toast(t.transactions.deleted);
  };

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, TransactionWithCategory[]> = {};
    for (const t of filtered) {
      const key = t.date;
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  if (profileLoading) return <TransactionsSkeleton />;

  return (
    <div className="max-w-6xl mx-auto page-enter min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6 sm:mb-8 min-w-0">
        <h1 className="text-xl sm:text-2xl font-display font-bold text-gray-800 dark:text-gray-100 truncate">
          {t.transactions.title}
        </h1>
        <div className="flex items-center gap-2 shrink-0">
          {(transactions?.length ?? 0) > 0 && (
            <button
              type="button"
              onClick={async () => {
                await exportMonthlyReport(
                  transactions!,
                  month,
                  profile?.display_name ?? "Paca"
                );
                toast(t.transactions.pdfExported);
              }}
              className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <FileDown className="w-4 h-4" />
              <span className="hidden sm:inline">{t.transactions.exportPdf}</span>
            </button>
          )}
          <Link
            to="/transactions/new"
            className="flex items-center gap-2 px-3 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-primary to-pink-light text-white font-semibold text-sm shadow-lg shadow-pink-primary/25 hover:shadow-xl transition-all duration-200 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t.transactions.newTransaction}</span>
          </Link>
        </div>
      </div>

      {/* Month selector + Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {/* Month nav */}
        <div className="col-span-2 lg:col-span-1 bg-white dark:bg-gray-800 rounded-2xl p-3 sm:p-4 border border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0"
          >
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </button>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize truncate">
            {formatMonthYear(month)}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0"
          >
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Income summary */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 sm:p-4 border border-gray-100 dark:border-gray-700 card-hover min-w-0">
          <p className="text-xs text-gray-400 mb-1 truncate">{t.transactions.incomes}</p>
          <p
            className="text-base sm:text-lg font-bold text-emerald-500 tabular-nums truncate"
            title={formatCurrency(income)}
          >
            {formatCurrencyCompact(income)}
          </p>
        </div>

        {/* Expenses summary */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 sm:p-4 border border-gray-100 dark:border-gray-700 card-hover min-w-0">
          <p className="text-xs text-gray-400 mb-1 truncate">{t.transactions.expenses}</p>
          <p
            className="text-base sm:text-lg font-bold text-red-primary tabular-nums truncate"
            title={formatCurrency(expenses)}
          >
            {formatCurrencyCompact(expenses)}
          </p>
        </div>

        {/* Balance */}
        <div className={`col-span-2 lg:col-span-1 rounded-2xl p-3 sm:p-4 border card-hover min-w-0 ${
          income - expenses >= 0
            ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20"
            : "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20"
        }`}>
          <p className="text-xs text-gray-400 mb-1 truncate">{t.transactions.balance}</p>
          <p
            className={`text-base sm:text-lg font-bold tabular-nums truncate ${
              income - expenses >= 0 ? "text-emerald-500" : "text-red-primary"
            }`}
            title={formatCurrency(income - expenses)}
          >
            {formatCurrencyCompact(income - expenses)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t.transactions.searchTransaction}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-primary/50 focus:border-pink-primary transition-all"
          />
        </div>

        {/* Type filter pills */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {(["all", "expense", "income"] as TypeFilter[]).map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                typeFilter === type
                  ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {type === "all" ? t.transactions.allTypes : type === "income" ? t.transactions.incomes : t.transactions.expenses}
            </button>
          ))}
        </div>

        {/* Paid by filter */}
        {couple?.partner && (
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            {(["all", "me", "partner"] as PaidByFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setPaidByFilter(filter)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  paidByFilter === filter
                    ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {filter === "all" ? t.common.everyone : filter === "me" ? t.common.me : couple.partner!.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Transaction list */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 mx-auto rounded-full border-4 border-pink-primary/30 border-t-pink-primary animate-spin" />
          </div>
        ) : grouped.length === 0 ? (
          <EmptyState
            variant={searchQuery ? "search" : "money"}
            title={searchQuery ? t.transactions.noResults : t.transactions.noTransactionsPeriod}
            description={searchQuery ? t.transactions.tryOtherSearch : t.transactions.addFirstMonth}
          />
        ) : (
          grouped.map(([date, items]) => (
            <div key={date}>
              <div className="px-4 sm:px-6 py-3 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {formatDate(date)}
                </span>
              </div>
              {items.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors group min-w-0"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `${tx.category?.color ?? "#AEB6BF"}15`,
                    }}
                  >
                    <span
                      className="text-sm font-bold"
                      style={{ color: tx.category?.color ?? "#AEB6BF" }}
                    >
                      {tx.category?.name?.charAt(0) ?? "?"}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                      {tx.description}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {tx.category?.name} ·{" "}
                      {tx.paid_by_profile?.display_name ?? ""}
                    </p>
                  </div>

                  <p
                    className={`text-sm font-semibold whitespace-nowrap tabular-nums shrink-0 ${
                      tx.type === "expense"
                        ? "text-red-primary"
                        : "text-emerald-500"
                    }`}
                    title={formatCurrency(tx.amount)}
                  >
                    {tx.type === "expense" ? "- " : "+ "}
                    {formatCurrencyCompact(tx.amount)}
                  </p>

                  {/* Actions (always visible on mobile, hover on desktop) */}
                  <div className="flex gap-1 shrink-0 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    <Link
                      to={`/transactions/${tx.id}/edit`}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label={t.transactions.editTransaction}
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(tx.id)}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-primary transition-colors"
                      aria-label={t.common.delete}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
