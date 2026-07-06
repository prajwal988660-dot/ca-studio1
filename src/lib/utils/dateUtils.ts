// Date formatting utilities for Indian accounting software

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateLong(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function toISODate(date: Date | string): string {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

/** Indian financial year (April–March). Month 3 = April. */
export function getCurrentFY(): { start: string; end: string; label: string } {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    start: `${year}-04-01`,
    end: `${year + 1}-03-31`,
    label: `FY ${year}-${(year + 1).toString().slice(2)}`,
  };
}

export function getFYForDate(date: Date | string): { start: string; end: string; label: string } {
  const d = new Date(date);
  const year = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return {
    start: `${year}-04-01`,
    end: `${year + 1}-03-31`,
    label: `FY ${year}-${(year + 1).toString().slice(2)}`,
  };
}

export function getQuarterDates(quarter: 1 | 2 | 3 | 4, fyStartYear: number): { start: string; end: string } {
  const quarters = {
    1: { start: `${fyStartYear}-04-01`, end: `${fyStartYear}-06-30` },
    2: { start: `${fyStartYear}-07-01`, end: `${fyStartYear}-09-30` },
    3: { start: `${fyStartYear}-10-01`, end: `${fyStartYear}-12-31` },
    4: { start: `${fyStartYear + 1}-01-01`, end: `${fyStartYear + 1}-03-31` },
  };
  return quarters[quarter];
}

export function getMonthDates(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { start: toISODate(start), end: toISODate(end) };
}

export function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

export function getBookPeriod(date: string): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
