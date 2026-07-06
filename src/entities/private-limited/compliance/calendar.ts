/**
 * Private Limited — Compliance Calendar Engine
 *
 * Pure functions deriving due dates from FY-end + AGM date.
 * Never hardcode "30 Oct" — compute from event dates.
 */

import type { Classification } from '../classification/types';

export type FilingFrequency = 'one_time' | 'annual' | 'half_yearly' | 'quarterly' | 'monthly' | 'event_based';
export type FilingStatus = 'pending' | 'in_progress' | 'filed' | 'overdue' | 'not_applicable';

export interface ComplianceItem {
  id: string;
  code: string;            // e.g. 'AOC-4', 'MGT-7', 'GSTR-1'
  name: string;
  description: string;
  statute: string;          // e.g. 'Sec 137', 'GST Act'
  frequency: FilingFrequency;
  dueDate: string;          // computed ISO date
  category: ComplianceCategory;
  status: FilingStatus;
  /** Which classification flag enables this item */
  enabledBy?: string;
}

export type ComplianceCategory =
  | 'roc_filing'
  | 'income_tax'
  | 'gst'
  | 'tds_tcs'
  | 'board_governance'
  | 'audit'
  | 'other';

/* ═══════════════════════════════════════════════════════
   Date arithmetic helpers
   ═══════════════════════════════════════════════════════ */

function addDays(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return iso(d);
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fyStartDate(fyEnd: string): string {
  const d = new Date(fyEnd + 'T00:00:00');
  return `${d.getFullYear() - 1}-04-01`;
}

/** Next occurrence of a month-day after a reference date */
function nextDate(month: number, day: number, afterYear: number): string {
  return `${afterYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/* ═══════════════════════════════════════════════════════
   Main: generateComplianceCalendar()
   ═══════════════════════════════════════════════════════ */

/**
 * Generate full compliance calendar for a Private Limited company.
 *
 * @param fyEnd — FY end date, e.g. '2026-03-31'
 * @param agmDate — actual/expected AGM date, e.g. '2026-09-30'
 * @param classification — output of classify()
 * @param incorporationDate — for one-time items
 */
export function generateComplianceCalendar(
  fyEnd: string,
  agmDate: string,
  classification: Classification,
  incorporationDate?: string,
): ComplianceItem[] {
  const items: ComplianceItem[] = [];
  const fyEndD = new Date(fyEnd + 'T00:00:00');
  const calYear = fyEndD.getFullYear(); // year the FY ends (e.g. 2026)
  let id = 0;
  const nextId = () => `CL-${String(++id).padStart(3, '0')}`;

  const { auditFlags, filingObligations } = classification;

  // ── Board governance ──
  items.push({
    id: nextId(), code: 'BOARD-MTG', name: 'Board Meetings (min 4/year)',
    description: 'Minimum 4 meetings per year, gap ≤ 120 days between consecutive meetings',
    statute: 'Sec 173', frequency: 'quarterly',
    dueDate: fyEnd, // reminder at FY-end; actual tracking is per-meeting
    category: 'board_governance', status: 'pending',
  });

  items.push({
    id: nextId(), code: 'AGM', name: 'Annual General Meeting',
    description: 'Adopt accounts, appoint/reappoint auditor, declare dividend',
    statute: 'Sec 96', frequency: 'annual',
    dueDate: `${calYear}-09-30`, // by 30 Sep
    category: 'board_governance', status: 'pending',
  });

  // ── ROC filings (annual) ──
  items.push({
    id: nextId(), code: 'AOC-4', name: classification.auditFlags.xbrlFiling ? 'AOC-4 XBRL' : 'AOC-4',
    description: 'File financial statements with ROC',
    statute: 'Sec 137', frequency: 'annual',
    dueDate: addDays(agmDate, 30), // within 30 days of AGM
    category: 'roc_filing', status: 'pending',
    enabledBy: auditFlags.xbrlFiling ? 'xbrlFiling' : undefined,
  });

  items.push({
    id: nextId(), code: filingObligations.annualReturnForm,
    name: `Annual Return (${filingObligations.annualReturnForm})`,
    description: filingObligations.annualReturnForm === 'MGT-7A'
      ? 'Abridged annual return for small company'
      : 'Full annual return',
    statute: 'Sec 92', frequency: 'annual',
    dueDate: addDays(agmDate, 60), // within 60 days of AGM
    category: 'roc_filing', status: 'pending',
  });

  items.push({
    id: nextId(), code: 'ADT-1', name: 'Auditor Appointment Intimation',
    description: 'Intimate ROC about auditor appointment/reappointment',
    statute: 'Sec 139', frequency: 'annual',
    dueDate: addDays(agmDate, 15),
    category: 'roc_filing', status: 'pending',
  });

  items.push({
    id: nextId(), code: 'DPT-3', name: 'Return of Deposits / Outstanding Loans',
    description: 'Return of deposits and outstanding loans (including NIL)',
    statute: 'Rule 16', frequency: 'annual',
    dueDate: `${calYear}-06-30`,
    category: 'roc_filing', status: 'pending',
  });

  // MSME-1 — half-yearly
  items.push({
    id: nextId(), code: 'MSME-1-H1', name: 'MSME-1 (Oct–Mar)',
    description: 'Dues to micro/small vendors overdue >45 days — half year 1',
    statute: 'Sec 405', frequency: 'half_yearly',
    dueDate: `${calYear}-04-30`,
    category: 'roc_filing', status: 'pending',
  });
  items.push({
    id: nextId(), code: 'MSME-1-H2', name: 'MSME-1 (Apr–Sep)',
    description: 'Dues to micro/small vendors overdue >45 days — half year 2',
    statute: 'Sec 405', frequency: 'half_yearly',
    dueDate: `${calYear}-10-31`,
    category: 'roc_filing', status: 'pending',
  });

  // DIR-3 KYC
  items.push({
    id: nextId(), code: 'DIR-3-KYC', name: 'Director KYC',
    description: 'Annual KYC for each director (per DIN)',
    statute: 'Rule 12A', frequency: 'annual',
    dueDate: `${calYear}-09-30`,
    category: 'roc_filing', status: 'pending',
  });

  // ── Income Tax ──
  items.push({
    id: nextId(), code: 'ITR-6', name: 'Income Tax Return (ITR-6)',
    description: 'Company income tax return',
    statute: 'IT Act', frequency: 'annual',
    dueDate: `${calYear}-10-31`, // audit cases
    category: 'income_tax', status: 'pending',
  });

  if (auditFlags.taxAudit) {
    items.push({
      id: nextId(), code: 'TAR', name: 'Tax Audit Report (3CA + 3CD)',
      description: 'Tax audit report under Sec 44AB / §63',
      statute: 'IT Act', frequency: 'annual',
      dueDate: `${calYear}-09-30`,
      category: 'audit', status: 'pending',
      enabledBy: 'taxAudit',
    });
  }

  // Advance tax — quarterly
  const advanceTaxDates = [
    { label: 'Q1 (15 Jun)', date: `${calYear - 1}-06-15` },
    { label: 'Q2 (15 Sep)', date: `${calYear - 1}-09-15` },
    { label: 'Q3 (15 Dec)', date: `${calYear - 1}-12-15` },
    { label: 'Q4 (15 Mar)', date: `${calYear}-03-15` },
  ];
  for (const at of advanceTaxDates) {
    items.push({
      id: nextId(), code: `ADV-TAX-${at.label.slice(0, 2)}`,
      name: `Advance Tax ${at.label}`,
      description: `Advance tax instalment — ${at.label}`,
      statute: 'IT Act', frequency: 'quarterly',
      dueDate: at.date,
      category: 'income_tax', status: 'pending',
    });
  }

  // ── TDS quarterly returns ──
  const tdsQuarters = [
    { q: 'Q1', due: `${calYear - 1}-07-31` },
    { q: 'Q2', due: `${calYear - 1}-10-31` },
    { q: 'Q3', due: `${calYear}-01-31` },
    { q: 'Q4', due: `${calYear}-05-31` },
  ];
  for (const tds of tdsQuarters) {
    items.push({
      id: nextId(), code: `TDS-${tds.q}`, name: `TDS Return (24Q/26Q/27Q) — ${tds.q}`,
      description: `Quarterly TDS return — ${tds.q}`,
      statute: 'IT Act', frequency: 'quarterly',
      dueDate: tds.due,
      category: 'tds_tcs', status: 'pending',
    });
  }

  // ── GST ──
  // Monthly GSTR-1 (11th), GSTR-3B (20th) — generate for each month of FY
  const fyStart = new Date(fyStartDate(fyEnd) + 'T00:00:00');
  for (let m = 0; m < 12; m++) {
    const monthDate = new Date(fyStart);
    monthDate.setMonth(monthDate.getMonth() + m);
    const yr = monthDate.getFullYear();
    const mn = monthDate.getMonth() + 1;
    const monthLabel = monthDate.toLocaleString('en-IN', { month: 'short', year: 'numeric' });

    // GSTR-1 due 11th of next month
    const gstr1Next = new Date(yr, mn, 11);
    items.push({
      id: nextId(), code: `GSTR1-${monthLabel}`, name: `GSTR-1 (${monthLabel})`,
      description: `Outward supplies return — ${monthLabel}`,
      statute: 'GST Act', frequency: 'monthly',
      dueDate: iso(gstr1Next),
      category: 'gst', status: 'pending',
    });

    // GSTR-3B due 20th of next month
    const gstr3bNext = new Date(yr, mn, 20);
    items.push({
      id: nextId(), code: `GSTR3B-${monthLabel}`, name: `GSTR-3B (${monthLabel})`,
      description: `Summary return + payment — ${monthLabel}`,
      statute: 'GST Act', frequency: 'monthly',
      dueDate: iso(gstr3bNext),
      category: 'gst', status: 'pending',
    });
  }

  // GSTR-9 annual return — 31 Dec next year
  items.push({
    id: nextId(), code: 'GSTR-9', name: 'GSTR-9 (Annual Return)',
    description: 'GST annual return',
    statute: 'GST Act', frequency: 'annual',
    dueDate: `${calYear}-12-31`,
    category: 'gst', status: 'pending',
  });

  // ── Conditional audit items ──
  if (auditFlags.secretarialAudit) {
    items.push({
      id: nextId(), code: 'MR-3', name: 'Secretarial Audit Report (MR-3)',
      description: 'Secretarial audit under Sec 204',
      statute: 'Sec 204', frequency: 'annual',
      dueDate: agmDate, // attached to board report → AGM
      category: 'audit', status: 'pending',
      enabledBy: 'secretarialAudit',
    });
  }

  if (auditFlags.csrApplicable) {
    items.push({
      id: nextId(), code: 'CSR-2', name: 'CSR Annual Report',
      description: 'CSR spending report annexed to Board Report',
      statute: 'Sec 135', frequency: 'annual',
      dueDate: agmDate,
      category: 'roc_filing', status: 'pending',
      enabledBy: 'csrApplicable',
    });
  }

  if (auditFlags.costAudit) {
    items.push({
      id: nextId(), code: 'CRA-4', name: 'Cost Audit Report Filing',
      description: 'Cost audit report filing with MCA',
      statute: 'Sec 148', frequency: 'annual',
      dueDate: addDays(agmDate, 30),
      category: 'audit', status: 'pending',
      enabledBy: 'costAudit',
    });
  }

  // ── One-time items (if incorporation date provided) ──
  if (incorporationDate) {
    items.push({
      id: nextId(), code: 'INC-20A', name: 'Declaration of Commencement of Business',
      description: 'Must be filed within 180 days of incorporation',
      statute: 'Sec 10A', frequency: 'one_time',
      dueDate: addDays(incorporationDate, 180),
      category: 'roc_filing', status: 'pending',
    });
  }

  return items;
}

/**
 * Filter calendar items to only those due within a date range.
 */
export function filterByDateRange(
  items: ComplianceItem[],
  from: string,
  to: string,
): ComplianceItem[] {
  return items.filter((item) => item.dueDate >= from && item.dueDate <= to);
}

/**
 * Get overdue items as of a given date.
 */
export function getOverdueItems(
  items: ComplianceItem[],
  asOfDate: string,
): ComplianceItem[] {
  return items.filter(
    (item) => item.dueDate < asOfDate && item.status !== 'filed' && item.status !== 'not_applicable',
  );
}
