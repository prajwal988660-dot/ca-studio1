import type { JournalEntry } from './computeEngine';

export interface PLAppropriationData {
  netProfit: number;
  interestOnCapital: { partnerName: string; amount: number }[];
  salary: { partnerName: string; amount: number }[];
  commission: { partnerName: string; amount: number }[];
  interestOnDrawings: { partnerName: string; amount: number }[];
  transferToReserve: number;
  distributableProfit: number;
  profitDistribution: { partnerName: string; ratio: number; amount: number }[];
}

export function computePLAppropriation(
  netProfit: number,
  partners: {
    name: string;
    capitalAmount: number;
    profitSharingRatio: number;
    salary: number;
    commission: number;
    interestOnCapitalRate: number;
    interestOnDrawingsRate: number;
  }[],
  reservePercentage: number = 0,
  drawingsMap: Record<string, number> = {}
): PLAppropriationData {
  const totalPSR = partners.reduce((s, p) => s + p.profitSharingRatio, 0);

  const interestOnCapital = partners.map(p => ({
    partnerName: p.name,
    amount: (p.capitalAmount * (p.interestOnCapitalRate || 0)) / 100,
  }));

  const salary = partners.map(p => ({
    partnerName: p.name,
    amount: p.salary || 0,
  }));

  const commission = partners.map(p => ({
    partnerName: p.name,
    amount: p.commission || 0,
  }));

  const interestOnDrawings = partners.map(p => ({
    partnerName: p.name,
    amount: ((drawingsMap[p.name] || 0) * (p.interestOnDrawingsRate || 0)) / 100,
  }));

  const totalInterestOnCapital = interestOnCapital.reduce((s, i) => s + i.amount, 0);
  const totalSalary = salary.reduce((s, i) => s + i.amount, 0);
  const totalCommission = commission.reduce((s, i) => s + i.amount, 0);
  const totalInterestOnDrawings = interestOnDrawings.reduce((s, i) => s + i.amount, 0);

  const transferToReserve = (netProfit * reservePercentage) / 100;
  const distributableProfit = netProfit - totalInterestOnCapital - totalSalary - totalCommission + totalInterestOnDrawings - transferToReserve;

  const profitDistribution = partners.map(p => ({
    partnerName: p.name,
    ratio: p.profitSharingRatio,
    amount: totalPSR > 0 ? (distributableProfit * p.profitSharingRatio) / totalPSR : 0,
  }));

  return {
    netProfit,
    interestOnCapital,
    salary,
    commission,
    interestOnDrawings,
    transferToReserve,
    distributableProfit,
    profitDistribution,
  };
}
