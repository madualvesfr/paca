import { useMemo } from "react";
import { useProfile, useCouple, useTransactions, useBudget, useRealtimeTransactions, useI18n } from "@paca/api";
import {
  getCurrentMonth,
  type TransactionWithCategory,
} from "@paca/shared";
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Bell,
  CalendarDays,
} from "lucide-react";
import { Link } from "react-router-dom";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

// Greeting emoji based on time of day
function getGreetingEmoji(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "🌙";
  if (hour < 12) return "☀️";
  if (hour < 18) return "🌤️";
  return "🌙";
}

// Simple donut chart via SVG
function DonutChart({ data }: { data: { name: string; color: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const size = 140;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativePercent = 0;

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
        {data.map((segment) => {
          const percent = segment.value / total;
          const strokeDasharray = `${percent * circumference} ${circumference}`;
          const strokeDashoffset = -cumulativePercent * circumference;
          cumulativePercent += percent;

          return (
            <circle
              key={segment.name}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          );
        })}
      </svg>
      <div className="space-y-2 min-w-0">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{d.name}</span>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-auto">
              {Math.round((d.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Budget mini progress bar
function BudgetProgress({ spent, total }: { spent: number; total: number }) {
  const { t, formatCurrency } = useI18n();
  const percent = total > 0 ? Math.min(Math.round((spent / total) * 100), 100) : 0;
  const isOver = spent > total;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 card-hover">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t.dashboard.monthBudget}</span>
        <Link to="/budget" className="text-xs text-pink-primary font-semibold hover:underline">
          {t.dashboard.seeDetails}
        </Link>
      </div>
      <div className="flex items-end justify-between mb-2">
        <p className="text-lg font-display font-bold text-gray-800 dark:text-gray-100">
          {formatCurrency(spent)}
          <span className="text-sm font-normal text-gray-400"> / {formatCurrency(total)}</span>
        </p>
        <span className={`text-sm font-bold ${isOver ? "text-red-primary" : "text-emerald-500"}`}>
          {percent}%
        </span>
      </div>
      <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            isOver ? "bg-red-primary" : percent > 80 ? "bg-amber-400" : "bg-pink-primary"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

// Weekly comparison card
function WeeklySummary({ transactions }: { transactions: TransactionWithCategory[] }) {
  const { t, formatCurrency } = useI18n();
  const { thisWeek, lastWeek } = useMemo(() => {
    const now = new Date();
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - now.getDay());
    startOfThisWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    let thisW = 0;
    let lastW = 0;

    for (const t of transactions) {
      if (t.type !== "expense") continue;
      const d = new Date(t.date + "T12:00:00");
      if (d >= startOfThisWeek) thisW += t.amount;
      else if (d >= startOfLastWeek) lastW += t.amount;
    }

    return { thisWeek: thisW, lastWeek: lastW };
  }, [transactions]);

  const diff = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : 0;
  const isUp = diff > 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 card-hover">
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t.dashboard.weeklySummary}</span>
      </div>
      <p className="text-lg font-display font-bold text-gray-800 dark:text-gray-100 mb-1">
        {formatCurrency(thisWeek)}
      </p>
      <p className="text-xs text-gray-400">
        {lastWeek > 0 ? (
          <>
            <span className={isUp ? "text-red-primary font-semibold" : "text-emerald-500 font-semibold"}>
              {isUp ? "+" : ""}{diff}%
            </span>
            {" "}{t.dashboard.vsLastWeek} ({formatCurrency(lastWeek)})
          </>
        ) : (
          t.dashboard.firstWeekData
        )}
      </p>
    </div>
  );
}

export function DashboardPage() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: couple } = useCouple();
  const { t, greeting, formatCurrency, formatDate } = useI18n();
  const month = getCurrentMonth();
  const coupleId = profile?.couple_id ?? "";

  const { data: transactions, isLoading: txLoading } = useTransactions({ coupleId, month });
  const { data: budget } = useBudget({ coupleId, month });

  useRealtimeTransactions(coupleId || undefined);

  const income = (transactions ?? [])
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = (transactions ?? [])
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = income - expenses;
  const recentTransactions = (transactions ?? []).slice(0, 5);

  // Category breakdown for donut chart
  const categoryData = useMemo(() => {
    const map = new Map<string, { name: string; color: string; value: number }>();
    for (const t of transactions ?? []) {
      if (t.type !== "expense") continue;
      const name = t.category?.name ?? "Outros";
      const color = t.category?.color ?? "#AEB6BF";
      const existing = map.get(name);
      if (existing) {
        existing.value += t.amount;
      } else {
        map.set(name, { name, color, value: t.amount });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [transactions]);

  if (profileLoading || txLoading) return <DashboardSkeleton />;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-stagger">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-800 dark:text-gray-100">
            {getGreetingEmoji()} {greeting()}, {profile?.display_name ?? ""}!
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            {t.dashboard.coupleSummary}
          </p>
        </div>
        <button
          type="button"
          className="relative p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <Bell className="w-5 h-5 text-gray-500" />
          {/* Notification badge */}
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-pink-primary rounded-full border-2 border-white dark:border-gray-800" />
        </button>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-pink-primary via-pink-light to-pink-200 rounded-3xl p-8 mb-8 text-white shadow-xl shadow-pink-primary/20 animate-fadeIn">
        <p className="text-white/70 text-sm font-medium mb-1">
          {t.dashboard.coupleBalance}
        </p>
        <p className="text-4xl font-display font-bold mb-4">
          {formatCurrency(balance)}
        </p>
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <span className="text-sm">
                {profile?.display_name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-white/80 text-sm">{t.common.me}</span>
          </div>
          {couple?.partner && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <span className="text-sm">
                  {couple.partner.display_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-white/80 text-sm">
                {couple.partner.display_name}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Income / Expenses / Weekly Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-stagger">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 card-hover">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              {t.dashboard.income}
            </span>
          </div>
          <p className="text-2xl font-display font-bold text-emerald-500">
            {formatCurrency(income)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 card-hover">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-primary" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              {t.dashboard.expenses}
            </span>
          </div>
          <p className="text-2xl font-display font-bold text-red-primary">
            {formatCurrency(expenses)}
          </p>
        </div>

        <WeeklySummary transactions={transactions ?? []} />
      </div>

      {/* Budget Progress + Category Donut */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {budget ? (
          <BudgetProgress
            spent={expenses}
            total={budget.total_amount}
          />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.nav.budget}</p>
              <p className="text-xs text-gray-400">{t.dashboard.noBudget}</p>
            </div>
            <Link
              to="/budget"
              className="text-sm text-pink-primary font-semibold hover:underline"
            >
              {t.dashboard.create}
            </Link>
          </div>
        )}

        {categoryData.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 card-hover">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-4">{t.dashboard.spendingByCategory}</p>
            <DonutChart data={categoryData} />
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 flex items-center justify-center">
            <p className="text-xs text-gray-400">{t.dashboard.noExpensesMonth}</p>
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="text-lg font-display font-bold text-gray-800 dark:text-gray-100">
            {t.dashboard.recentTransactions}
          </h2>
          <Link
            to="/transactions"
            className="flex items-center gap-1 text-sm text-pink-primary font-medium hover:underline"
          >
            {t.dashboard.seeAll}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <EmptyState
            variant="money"
            title={t.dashboard.noTransactionsMonth}
            description={t.dashboard.startAddingFirst}
            action={
              <Link
                to="/transactions/new"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-primary to-pink-light text-white font-semibold text-sm shadow-lg shadow-pink-primary/25 hover:shadow-xl transition-all"
              >
                {t.dashboard.addTransaction}
              </Link>
            }
          />
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {recentTransactions.map((t) => (
              <TransactionRow key={t.id} transaction={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TransactionRow({ transaction: t }: { transaction: TransactionWithCategory }) {
  const { formatCurrency, formatDate } = useI18n();
  const isExpense = t.type === "expense";

  return (
    <Link
      to={`/transactions/${t.id}/edit`}
      className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
        style={{ backgroundColor: `${t.category?.color ?? "#AEB6BF"}15` }}
      >
        <span
          className="text-sm font-bold"
          style={{ color: t.category?.color ?? "#AEB6BF" }}
        >
          {t.category?.name?.charAt(0) ?? "?"}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
          {t.description}
        </p>
        <p className="text-xs text-gray-400">
          {t.category?.name} · {formatDate(t.date)}
        </p>
      </div>
      <p
        className={`text-sm font-semibold whitespace-nowrap ${
          isExpense ? "text-red-primary" : "text-emerald-500"
        }`}
      >
        {isExpense ? "- " : "+ "}
        {formatCurrency(t.amount)}
      </p>
    </Link>
  );
}
