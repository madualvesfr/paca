import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@paca/api";
import {
  LayoutDashboard,
  PlusCircle,
  ScanLine,
  PieChart,
  Coins,
  Heart,
  ArrowLeft,
  ArrowRight,
  X,
} from "lucide-react";

type SlideKey =
  | "dashboard"
  | "addTransaction"
  | "scan"
  | "budget"
  | "multiCurrency"
  | "couple";

const SLIDES: ReadonlyArray<{
  key: SlideKey;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
}> = [
  { key: "dashboard", icon: LayoutDashboard, gradient: "from-pink-primary to-pink-light" },
  { key: "addTransaction", icon: PlusCircle, gradient: "from-emerald-400 to-teal-500" },
  { key: "scan", icon: ScanLine, gradient: "from-purple-500 to-indigo-500" },
  { key: "budget", icon: PieChart, gradient: "from-amber-400 to-orange-500" },
  { key: "multiCurrency", icon: Coins, gradient: "from-sky-400 to-cyan-500" },
  { key: "couple", icon: Heart, gradient: "from-rose-400 to-pink-500" },
];

interface TutorialModalProps {
  open: boolean;
  onClose: () => void;
}

export function TutorialModal({ open, onClose }: TutorialModalProps) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, SLIDES.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    },
    [open, onClose]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  if (!open) return null;

  const slide = SLIDES[index];
  const SlideIcon = slide.icon;
  const slideCopy = (t.tutorial.slides as Record<SlideKey, { title: string; body: string }>)[slide.key];
  const isFirst = index === 0;
  const isLast = index === SLIDES.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
    >
      <div
        className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-gray-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Skip button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
          aria-label={t.tutorial.skip}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Hero with icon */}
        <div className={`bg-gradient-to-br ${slide.gradient} p-8 pb-10 text-white text-center`}>
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <SlideIcon className="w-10 h-10 text-white" />
          </div>
          <p className="text-xs text-white/80 font-medium uppercase tracking-wider mb-1">
            {t.tutorial.step} {index + 1} {t.tutorial.of} {SLIDES.length}
          </p>
        </div>

        {/* Body */}
        <div className="px-8 pt-6 pb-8">
          <h2
            id="tutorial-title"
            className="text-xl sm:text-2xl font-display font-bold text-gray-800 dark:text-gray-100 mb-3 text-center"
          >
            {slideCopy.title}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed text-center max-w-md mx-auto">
            {slideCopy.body}
          </p>

          {/* Dots */}
          <div className="flex items-center justify-center gap-2 mt-8">
            {SLIDES.map((s, i) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index
                    ? "w-8 bg-pink-primary"
                    : "w-1.5 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400"
                }`}
                aria-label={`${t.tutorial.step} ${i + 1}`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 mt-8">
            {isFirst ? (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {t.tutorial.skip}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIndex((i) => Math.max(i - 1, 0))}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {t.tutorial.back}
              </button>
            )}

            {isLast ? (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-primary to-pink-light text-white font-semibold text-sm shadow-lg shadow-pink-primary/25 hover:shadow-xl active:scale-95 transition-all"
              >
                {t.tutorial.finish}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIndex((i) => Math.min(i + 1, SLIDES.length - 1))}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-primary to-pink-light text-white font-semibold text-sm shadow-lg shadow-pink-primary/25 hover:shadow-xl active:scale-95 transition-all"
              >
                {t.tutorial.next}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
