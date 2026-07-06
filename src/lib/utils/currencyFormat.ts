// Indian currency formatting: ₹12,34,567.00 (paise precision 2 decimal places)

export function formatIndianCurrency(num: number): string {
  if (num === 0) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatIndianNumber(num: number): string {
  if (num === 0) return '—';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function parseIndianCurrency(str: string): number {
  return parseFloat(str.replace(/[₹,\s]/g, '')) || 0;
}

export function formatAmount(num: number | null | undefined): string {
  if (num === null || num === undefined || num === 0) return '—';
  return formatIndianNumber(Math.abs(num));
}

export function formatAmountWithSign(num: number): string {
  if (num === 0) return '—';
  const formatted = formatIndianNumber(Math.abs(num));
  return num < 0 ? `(${formatted})` : formatted;
}
