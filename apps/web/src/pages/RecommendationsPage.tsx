import { Gift, Megaphone, ExternalLink } from "lucide-react";
import {
  usePartnerOffers,
  useLogOfferClick,
  useProfile,
  useTransactions,
  useI18n,
  useAppStore,
} from "@paca/api";
import { getCurrentMonth, CREDIT_OFFER_CATEGORIES, type PartnerOffer } from "@paca/shared";

export function RecommendationsPage() {
  const { t, locale } = useI18n();
  const { data: profile } = useProfile();
  const mode = useAppStore((s) => s.mode);
  const coupleId = profile?.couple_id ?? "";
  const { data: offers } = usePartnerOffers();
  const { data: transactions } = useTransactions({ coupleId, mode, month: getCurrentMonth() });
  const logClick = useLogOfferClick();

  // Compliance (D9): never show credit offers to an indebted couple.
  const balance = (transactions ?? []).reduce(
    (sum, tx) => sum + (tx.type === "income" ? tx.amount : -tx.amount),
    0,
  );
  const indebted = balance < 0;
  const creditCats = CREDIT_OFFER_CATEGORIES as readonly string[];
  const visible = (offers ?? []).filter(
    (o) => !(indebted && o.category != null && creditCats.includes(o.category)),
  );

  const pick = (m: Record<string, string> | null | undefined) =>
    m?.[locale] ?? m?.en ?? Object.values(m ?? {})[0] ?? "";

  const openOffer = (offer: PartnerOffer) => {
    logClick.mutate(offer.id);
    window.open(offer.affiliate_url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
        {t.recommendations.title}
      </h1>
      <p className="text-gray-400 text-sm mt-1 mb-6">{t.recommendations.subtitle}</p>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center py-20">
          <div className="w-14 h-14 rounded-2xl bg-pink-50 dark:bg-pink-primary/10 flex items-center justify-center mb-3">
            <Gift className="w-6 h-6 text-pink-primary" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{t.recommendations.empty}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visible.map((offer) => (
            <div
              key={offer.id}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex flex-col"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${offer.icon_color ?? "#FF8FB1"}20` }}
                >
                  <Gift className="w-5 h-5" style={{ color: offer.icon_color ?? "#FF8FB1" }} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {pick(offer.title_translations)}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {pick(offer.description_translations)}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="flex items-center gap-1 text-[10px] text-gray-400 uppercase tracking-wide">
                  <Megaphone className="w-3 h-3" /> {t.recommendations.paidPartnership}
                </span>
                <button
                  onClick={() => openOffer(offer)}
                  className="flex items-center gap-1 bg-pink-primary text-white text-xs font-semibold rounded-xl px-4 py-2"
                >
                  {t.recommendations.cta} <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
