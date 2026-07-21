export function formatMoney(
  amountMinor: number,
  currency = "KES",
  locale = "en-KE"
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amountMinor / 100);
}
