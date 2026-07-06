import type { JournalEntry } from './computeEngine';

export interface TDSRegisterRow {
  date: string;
  deducteeName: string;
  pan: string;
  section: string;
  amount: number;
  tdsRate: number;
  tdsAmount: number;
  netPayment: number;
  status: 'deducted' | 'deposited' | 'pending';
}

export function computeTDSRegister(entries: JournalEntry[]): TDSRegisterRow[] {
  const rows: TDSRegisterRow[] = [];

  for (const entry of entries) {
    let tdsAmount = 0;
    let deducteeName = '';
    let grossAmount = 0;
    let section = '';

    for (const line of entry.lines) {
      const name = line.account_name.toLowerCase();
      const isTDS = line.account_group === 'Statutory Liabilities' && name.includes('tds');
      // Legacy fallback
      const isLegacyTDS = name.includes('tds') && line.account_group === 'Duties & Taxes';

      if (isTDS || isLegacyTDS) {
        tdsAmount += line.credit || 0;
        if (name.includes('192')) section = '192';
        else if (name.includes('194a')) section = '194A';
        else if (name.includes('194b')) section = '194B';
        else if (name.includes('194c')) section = '194C';
        else if (name.includes('194d')) section = '194D';
        else if (name.includes('194h')) section = '194H';
        else if (name.includes('194i')) section = '194I';
        else if (name.includes('194j')) section = '194J';
        else if (name.includes('194k')) section = '194K';
        else if (name.includes('194o')) section = '194O';
        else if (name.includes('194q')) section = '194Q';
        else if (name.includes('194r')) section = '194R';
        else if (name.includes('194s')) section = '194S';
      } else if (line.debit > 0 && line.account_group !== 'Statutory Liabilities' && line.account_group !== 'Duties & Taxes') {
        grossAmount += line.debit;
      } else if (line.credit > 0 && (line.account_group === 'Trade Payables' || line.account_group === 'Sundry Creditors')) {
        deducteeName = line.account_name;
      }
    }

    if (tdsAmount > 0) {
      const pan = entry.deductee_pan ?? '';
      const panValid = /^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/.test(pan.trim().toUpperCase());
      const rate = grossAmount > 0 ? (tdsAmount / grossAmount) * 100 : 0;
      const rate206AA = 20;
      const effectiveRate = !panValid ? Math.max(rate, rate206AA) : rate;
      const effectiveTds = !panValid && grossAmount > 0 ? Math.round((grossAmount * effectiveRate / 100) * 2) / 2 : tdsAmount;
      const status = entry.tds_deposit_status ?? 'deducted';
      rows.push({
        date: entry.entry_date,
        deducteeName,
        pan,
        section,
        amount: grossAmount,
        tdsRate: Math.round((panValid ? rate : effectiveRate) * 100) / 100,
        tdsAmount: panValid ? tdsAmount : effectiveTds,
        netPayment: grossAmount - (panValid ? tdsAmount : effectiveTds),
        status,
      });
    }
  }

  return rows;
}
