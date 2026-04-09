const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatCurrency(value: number): string {
  return BRL_FORMATTER.format(value / 100);
}

export function parseCurrencyInput(input: string): number {
  const cleaned = input.replace(/[^\d,.-]/g, "").replace(",", ".");
  const parsed = Math.round(parseFloat(cleaned) * 100);
  return isNaN(parsed) ? 0 : parsed;
}

export function centsToDecimal(cents: number): number {
  return cents / 100;
}

export function decimalToCents(decimal: number): number {
  return Math.round(decimal * 100);
}
