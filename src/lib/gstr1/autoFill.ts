import { GSTR1_CONFIG } from './config';
import type { JournalEntry } from '@/lib/accounting/computeEngine';
import type { B2BInvoice, B2CLInvoice, B2CSSummary, GSTR1Filing } from './types';

export function autoFillFromEntries(
  entries: JournalEntry[],
  filing: GSTR1Filing,
  companyStateCode: string,
): GSTR1Filing {
  const [mm, yyyy] = [filing.period.slice(0, 2), filing.period.slice(2)];
  const monthStr = `${yyyy}-${mm}`;

  const salesEntries = entries.filter((e) => {
    const isInMonth = e.entry_date.startsWith(monthStr);
    const hasTax = e.lines.some((l) => {
      const n = l.account_name?.toLowerCase() ?? '';
      return n.includes('output') || n.includes('cgst') || n.includes('sgst') || n.includes('igst');
    });
    return isInMonth && hasTax && (e.voucher_type === 'SLS' || e.lines.some((l) => l.account_name?.toLowerCase().includes('sales')));
  });

  const b2b: B2BInvoice[] = [];
  const b2cl: B2CLInvoice[] = [];
  const b2csMap = new Map<string, B2CSSummary>();

  for (const entry of salesEntries) {
    const taxLines = entry.lines.filter((l) => {
      const n = l.account_name?.toLowerCase() ?? '';
      return n.includes('cgst') || n.includes('sgst') || n.includes('igst');
    });
    const salesLine = entry.lines.find((l) => {
      const n = l.account_name?.toLowerCase() ?? '';
      return n.includes('sales') || n.includes('revenue') || n.includes('turnover');
    });
    if (!salesLine) continue;

    const txval = salesLine.credit;
    if (txval <= 0) continue;

    const cgst = taxLines
      .filter((l) => l.account_name?.toLowerCase().includes('cgst'))
      .reduce((s, l) => s + (l.credit || 0), 0);
    const sgst = taxLines
      .filter((l) => l.account_name?.toLowerCase().includes('sgst'))
      .reduce((s, l) => s + (l.credit || 0), 0);
    const igst = taxLines
      .filter((l) => l.account_name?.toLowerCase().includes('igst'))
      .reduce((s, l) => s + (l.credit || 0), 0);

    const rt = cgst > 0 ? Math.round((cgst / txval) * 200) : igst > 0 ? Math.round((igst / txval) * 100) : 0;
    const isInterState = igst > 0;

    const partyGstin = entry.party_gstin ?? '';
    const pos = partyGstin ? partyGstin.slice(0, 2) : (isInterState ? '27' : companyStateCode);

    const idt = entry.entry_date.split('-').reverse().join('-');
    const inum = entry.voucher_number || entry.entry_code;

    if (partyGstin) {
      b2b.push({
        id: entry.id,
        ctin: partyGstin,
        inv_typ: 'R',
        inum,
        idt,
        val: txval + cgst + sgst + igst,
        pos,
        rchrg: 'N',
        itms: [{
          num: 1,
          itm_det: {
            rt,
            txval,
            iamt: igst || undefined,
            camt: cgst || undefined,
            samt: sgst || undefined,
          },
        }],
      });
    } else if (isInterState && txval > GSTR1_CONFIG.B2CL_THRESHOLD) {
      b2cl.push({
        id: entry.id,
        inum,
        idt,
        val: txval + igst,
        pos,
        itms: [{ num: 1, itm_det: { rt, txval, iamt: igst } }],
      });
    } else {
      const sply_ty: 'INTRA' | 'INTER' = isInterState ? 'INTER' : 'INTRA';
      const key = `${pos}_${rt}_${sply_ty}`;
      const existing = b2csMap.get(key);
      if (existing) {
        existing.txval += txval;
        if (igst && existing.iamt != null) existing.iamt = (existing.iamt ?? 0) + igst;
        if (cgst && existing.camt != null) existing.camt = (existing.camt ?? 0) + cgst;
        if (sgst && existing.samt != null) existing.samt = (existing.samt ?? 0) + sgst;
      } else {
        b2csMap.set(key, {
          id: `b2cs_${key}`,
          sply_ty,
          pos,
          rt,
          txval,
          iamt: igst || undefined,
          camt: cgst || undefined,
          samt: sgst || undefined,
        });
      }
    }
  }

  return {
    ...filing,
    b2b,
    b2cl,
    b2cs: Array.from(b2csMap.values()),
  };
}
