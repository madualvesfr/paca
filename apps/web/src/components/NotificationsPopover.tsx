import { useEffect, useRef, useState } from "react";
import {
  useProfile,
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  useI18n,
} from "@paca/api";
import type { Notification as AppNotification, NotificationType } from "@paca/shared";
import {
  Bell,
  AlertTriangle,
  TrendingUp,
  Trophy,
  X,
  CheckCheck,
  Trash2,
} from "lucide-react";

const TYPE_VISUAL: Record<
  NotificationType,
  { icon: typeof Bell; className: string }
> = {
  transaction_added: {
    icon: TrendingUp,
    className: "bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10",
  },
  budget_alert: {
    icon: AlertTriangle,
    className: "bg-amber-50 text-amber-500 dark:bg-amber-500/10",
  },
  goal_reached: {
    icon: Trophy,
    className: "bg-purple-50 text-purple-500 dark:bg-purple-500/10",
  },
};

function formatRelative(iso: string, t: ReturnType<typeof useI18n>["t"]): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return t.notifications.justNow;
  if (minutes < 60) return t.notifications.minutesAgo.replace("{count}", String(minutes));
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t.notifications.hoursAgo.replace("{count}", String(hours));
  const days = Math.floor(hours / 24);
  return t.notifications.daysAgo.replace("{count}", String(days));
}

export function NotificationsPopover() {
  const { t } = useI18n();
  const { data: profile } = useProfile();
  const { data: notifications } = useNotifications(profile?.id);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const remove = useDeleteNotification();

  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const items = notifications ?? [];
  const unreadCount = items.filter((n) => !n.read).length;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const handleItemClick = (n: AppNotification) => {
    if (!n.read) markRead.mutate(n.id);
  };

  const handleMarkAll = () => {
    if (!profile?.id || unreadCount === 0) return;
    markAllRead.mutate(profile.id);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shrink-0"
        aria-label={t.notifications.title}
        aria-expanded={open}
      >
        <Bell className="w-5 h-5 text-gray-500" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-pink-primary border-2 border-white dark:border-gray-800 flex items-center justify-center">
            <span className="text-[9px] font-bold text-white leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </span>
        )}
      </button>

      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={t.notifications.title}
          className="absolute top-full right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-2xl z-50 overflow-hidden animate-fadeIn"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-sm font-display font-bold text-gray-800 dark:text-gray-100">
                {t.notifications.title}
              </h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-pink-50 dark:bg-pink-primary/10 text-pink-primary">
                  {unreadCount} {t.notifications.unread}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"
              aria-label={t.common.close}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Body */}
          {items.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <Bell className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t.notifications.empty}
              </p>
              <p className="text-xs text-gray-400 max-w-[240px] mx-auto">
                {t.notifications.emptyBody}
              </p>
            </div>
          ) : (
            <>
              <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700/60">
                {items.map((n) => {
                  const visual = TYPE_VISUAL[n.type];
                  const Icon = visual.icon;
                  return (
                    <div
                      key={n.id}
                      className={`group relative flex items-start gap-3 px-4 py-3 transition-colors ${
                        n.read
                          ? "hover:bg-gray-50 dark:hover:bg-gray-700/30"
                          : "bg-pink-50/50 dark:bg-pink-primary/5 hover:bg-pink-50 dark:hover:bg-pink-primary/10"
                      }`}
                      onClick={() => handleItemClick(n)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") handleItemClick(n);
                      }}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${visual.className}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-sm leading-tight ${
                              n.read
                                ? "font-medium text-gray-700 dark:text-gray-300"
                                : "font-semibold text-gray-800 dark:text-gray-100"
                            }`}
                          >
                            {n.title}
                          </p>
                          {!n.read && (
                            <span
                              className="w-2 h-2 rounded-full bg-pink-primary shrink-0 mt-1.5"
                              aria-hidden
                            />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                          {n.body}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {formatRelative(n.created_at, t)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          remove.mutate(n.id);
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-primary hover:bg-red-50 dark:hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                        aria-label={t.common.delete}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
              {unreadCount > 0 && (
                <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
                  <button
                    type="button"
                    onClick={handleMarkAll}
                    disabled={markAllRead.isPending}
                    className="flex items-center gap-1.5 text-xs font-semibold text-pink-primary hover:underline disabled:opacity-50"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    {t.notifications.markAllRead}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
