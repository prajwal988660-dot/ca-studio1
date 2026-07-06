import type { JournalEntry } from './computeEngine';
import { computeAllBalances } from './computeEngine';

export interface PartnerCapitalRow {
  partnerName: string;
  openingBalance: number;
  salary: number;
  commission: number;
  interestOnCapital: number;
  profitShare: number;
  drawings: number;
  interestOnDrawings: number;
  closingBalance: number;
  method: 'fixed' | 'fluctuating';
}

export interface PartnerCurrentAccountRow {
  partnerName: string;
  debitItems: { label: string; amount: number }[];
  creditItems: { label: string; amount: number }[];
  closingBalance: number;
  balanceType: 'Dr' | 'Cr';
}

export function computePartnersCapital(
  entries: JournalEntry[],
  partners: { name: string; capitalAmount: number; profitSharingRatio: number; salary: number; commission: number; interestOnCapitalRate: number; interestOnDrawingsRate: number }[],
  method: 'fixed' | 'fluctuating',
  netProfit: number
): PartnerCapitalRow[] {
  const balances = computeAllBalances(entries);
  const totalPSR = partners.reduce((s, p) => s + p.profitSharingRatio, 0);

  // Deduct salary and commission from profit first
  let distributableProfit = netProfit;

  const rows: PartnerCapitalRow[] = partners.map(partner => {
    const capitalBal = balances.find(b => b.account_name.includes(partner.name) && b.account_name.toLowerCase().includes('capital'));
    const openingBalance = capitalBal ? capitalBal.balance : partner.capitalAmount;

    const salary = partner.salary || 0;
    const commission = partner.commission || 0;
    const interestOnCapital = (openingBalance * (partner.interestOnCapitalRate || 0)) / 100;

    // Calculate drawings
    const drawingsBal = balances.find(b => b.account_name.includes(partner.name) && b.account_name.toLowerCase().includes('drawing'));
    const drawings = drawingsBal ? drawingsBal.balance : 0;
    const interestOnDrawings = (drawings * (partner.interestOnDrawingsRate || 0)) / 100;

    return {
      partnerName: partner.name,
      openingBalance,
      salary,
      commission,
      interestOnCapital,
      profitShare: 0, // calculated below
      drawings,
      interestOnDrawings,
      closingBalance: 0, // calculated below
      method,
    };
  });

  // Calculate distributable profit after salary, commission, interest
  const totalSalary = rows.reduce((s, r) => s + r.salary, 0);
  const totalCommission = rows.reduce((s, r) => s + r.commission, 0);
  const totalInterestOnCapital = rows.reduce((s, r) => s + r.interestOnCapital, 0);
  const totalInterestOnDrawings = rows.reduce((s, r) => s + r.interestOnDrawings, 0);

  distributableProfit = netProfit - totalSalary - totalCommission - totalInterestOnCapital + totalInterestOnDrawings;

  // Distribute remaining profit by PSR
  for (const row of rows) {
    const partner = partners.find(p => p.name === row.partnerName)!;
    row.profitShare = totalPSR > 0 ? (distributableProfit * partner.profitSharingRatio) / totalPSR : 0;

    if (method === 'fluctuating') {
      row.closingBalance = row.openingBalance + row.salary + row.commission + row.interestOnCapital + row.profitShare - row.drawings - row.interestOnDrawings;
    } else {
      row.closingBalance = row.openingBalance; // Fixed capital doesn't change
    }
  }

  return rows;
}
