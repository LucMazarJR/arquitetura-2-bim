const LOCALE = "pt-BR";

export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString(LOCALE, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatCurrency(value: number): string {
  return value.toLocaleString(LOCALE, { style: "currency", currency: "BRL" });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(LOCALE);
}

export function formatMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleDateString(LOCALE, { month: "long", year: "numeric" });
}
