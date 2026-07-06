import type { GSTR3BSummary } from './gstCompute';

export function round2(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

/** One GSTR-3B supply / tax row (portal-style amounts). */
export interface Gstr3bTaxRow {
  txval: number;
  iamt: number;
  camt: number;
  samt: number;
  csamt: number;
}

export interface Gstr3bFormState {
  sup_details: {
    osup_det: Gstr3bTaxRow;
    osup_zero: Gstr3bTaxRow;
    osup_nil_exmp: { txval: number };
    isup_rev: Gstr3bTaxRow;
    osup_nongst: { txval: number };
  };
  /** Eligible ITC — mapped to `ty: OTH` in JSON (typical domestic books). */
  itc_avl_oth: Pick<Gstr3bTaxRow, 'iamt' | 'camt' | 'samt' | 'csamt'>;
  itc_rev_rul: Pick<Gstr3bTaxRow, 'iamt' | 'camt' | 'samt' | 'csamt'>;
  itc_rev_oth: Pick<Gstr3bTaxRow, 'iamt' | 'camt' | 'samt' | 'csamt'>;
  itc_inelg_rul: Pick<Gstr3bTaxRow, 'iamt' | 'camt' | 'samt' | 'csamt'>;
  itc_inelg_oth: Pick<Gstr3bTaxRow, 'iamt' | 'camt' | 'samt' | 'csamt'>;
}

export function emptyGstr3bForm(): Gstr3bFormState {
  const z = (): Gstr3bTaxRow => ({ txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 });
  const z4 = (): Pick<Gstr3bTaxRow, 'iamt' | 'camt' | 'samt' | 'csamt'> => ({
    iamt: 0,
    camt: 0,
    samt: 0,
    csamt: 0,
  });
  return {
    sup_details: {
      osup_det: z(),
      osup_zero: z(),
      osup_nil_exmp: { txval: 0 },
      isup_rev: z(),
      osup_nongst: { txval: 0 },
    },
    itc_avl_oth: z4(),
    itc_rev_rul: z4(),
    itc_rev_oth: z4(),
    itc_inelg_rul: z4(),
    itc_inelg_oth: z4(),
  };
}

export function prefillGstr3bFormFromBooks(summary: GSTR3BSummary): Gstr3bFormState {
  const base = emptyGstr3bForm();
  const o = summary.outwardSupplies;
  const i = summary.itcAvailed;
  const r = summary.itcReversed;

  // Section 3.1 — outward taxable supplies
  base.sup_details.osup_det = {
    txval: round2(o.taxableValue),
    iamt: round2(o.igst),
    camt: round2(o.cgst),
    samt: round2(o.sgst),
    csamt: 0,
  };

  // Section 4(A) — ITC availed (domestic purchases)
  base.itc_avl_oth = {
    iamt: round2(i.igst),
    camt: round2(i.cgst),
    samt: round2(i.sgst),
    csamt: 0,
  };

  // Section 4(B)(2) — ITC reversed: purchase returns / debit notes
  base.itc_rev_oth = {
    iamt: round2(r.igst),
    camt: round2(r.cgst),
    samt: round2(r.sgst),
    csamt: 0,
  };

  return base;
}

function sub4(
  a: Pick<Gstr3bTaxRow, 'iamt' | 'camt' | 'samt' | 'csamt'>,
  b: Pick<Gstr3bTaxRow, 'iamt' | 'camt' | 'samt' | 'csamt'>
): Pick<Gstr3bTaxRow, 'iamt' | 'camt' | 'samt' | 'csamt'> {
  return {
    iamt: round2(a.iamt - b.iamt),
    camt: round2(a.camt - b.camt),
    samt: round2(a.samt - b.samt),
    csamt: round2(a.csamt - b.csamt),
  };
}

function add4(
  a: Pick<Gstr3bTaxRow, 'iamt' | 'camt' | 'samt' | 'csamt'>,
  b: Pick<Gstr3bTaxRow, 'iamt' | 'camt' | 'samt' | 'csamt'>
): Pick<Gstr3bTaxRow, 'iamt' | 'camt' | 'samt' | 'csamt'> {
  return {
    iamt: round2(a.iamt + b.iamt),
    camt: round2(a.camt + b.camt),
    samt: round2(a.samt + b.samt),
    csamt: round2(a.csamt + b.csamt),
  };
}

/**
 * Builds GSTR-3B JSON aligned with the common GST portal / offline-tool shape
 * (sup_details, inter_sup, eco_dtls, itc_elg, inward_sup, intr_ltfee).
 * Validate against the GST portal before filing — schemas can change.
 */
export function buildGstr3bPortalJson(
  gstin: string,
  retPeriodMmYyyy: string,
  form: Gstr3bFormState
): Record<string, unknown> {
  const s = form.sup_details;
  const row = (r: Gstr3bTaxRow) => ({
    txval: round2(r.txval),
    iamt: round2(r.iamt),
    camt: round2(r.camt),
    samt: round2(r.samt),
    csamt: round2(r.csamt),
  });
  const rowZero = (r: Gstr3bTaxRow) => ({
    txval: round2(r.txval),
    iamt: round2(r.iamt),
    csamt: round2(r.csamt),
  });
  const itcAvlOth = {
    ty: 'OTH',
    iamt: round2(form.itc_avl_oth.iamt),
    camt: round2(form.itc_avl_oth.camt),
    samt: round2(form.itc_avl_oth.samt),
    csamt: round2(form.itc_avl_oth.csamt),
  };
  const revRul = {
    ty: 'RUL',
    iamt: round2(form.itc_rev_rul.iamt),
    camt: round2(form.itc_rev_rul.camt),
    samt: round2(form.itc_rev_rul.samt),
    csamt: round2(form.itc_rev_rul.csamt),
  };
  const revOth = {
    ty: 'OTH',
    iamt: round2(form.itc_rev_oth.iamt),
    camt: round2(form.itc_rev_oth.camt),
    samt: round2(form.itc_rev_oth.samt),
    csamt: round2(form.itc_rev_oth.csamt),
  };
  const inelRul = {
    ty: 'RUL',
    iamt: round2(form.itc_inelg_rul.iamt),
    camt: round2(form.itc_inelg_rul.camt),
    samt: round2(form.itc_inelg_rul.samt),
    csamt: round2(form.itc_inelg_rul.csamt),
  };
  const inelOth = {
    ty: 'OTH',
    iamt: round2(form.itc_inelg_oth.iamt),
    camt: round2(form.itc_inelg_oth.camt),
    samt: round2(form.itc_inelg_oth.samt),
    csamt: round2(form.itc_inelg_oth.csamt),
  };

  const avl4 = { iamt: itcAvlOth.iamt, camt: itcAvlOth.camt, samt: itcAvlOth.samt, csamt: itcAvlOth.csamt };
  const itcRevTotal = add4(
    { iamt: revRul.iamt, camt: revRul.camt, samt: revRul.samt, csamt: revRul.csamt },
    { iamt: revOth.iamt, camt: revOth.camt, samt: revOth.samt, csamt: revOth.csamt }
  );
  const itcNetFromAvlRev = sub4(avl4, itcRevTotal);
  const itcInelTotal = add4(
    { iamt: inelRul.iamt, camt: inelRul.camt, samt: inelRul.samt, csamt: inelRul.csamt },
    { iamt: inelOth.iamt, camt: inelOth.camt, samt: inelOth.samt, csamt: inelOth.csamt }
  );
  const itc_net = sub4(itcNetFromAvlRev, itcInelTotal);

  return {
    gstin,
    ret_period: retPeriodMmYyyy,
    sup_details: {
      osup_det: row(s.osup_det),
      osup_zero: rowZero(s.osup_zero),
      osup_nil_exmp: { txval: round2(s.osup_nil_exmp.txval) },
      isup_rev: row(s.isup_rev),
      osup_nongst: { txval: round2(s.osup_nongst.txval) },
    },
    inter_sup: {
      unreg_details: [] as unknown[],
      comp_details: [] as unknown[],
      uin_details: [] as unknown[],
    },
    eco_dtls: {
      eco_sup: { txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 },
      eco_reg_sup: { txval: 0 },
    },
    itc_elg: {
      itc_avl: [itcAvlOth],
      itc_rev: [revRul, revOth],
      itc_net: {
        iamt: round2(itc_net.iamt),
        camt: round2(itc_net.camt),
        samt: round2(itc_net.samt),
        csamt: round2(itc_net.csamt),
      },
      itc_inelg: [inelRul, inelOth],
    },
    inward_sup: {
      isup_details: [
        { ty: 'GST', inter: 0, intra: 0 },
        { ty: 'NONGST', inter: 0, intra: 0 },
      ],
    },
    intr_ltfee: {
      intr_details: { iamt: 0, camt: 0, samt: 0, csamt: 0 },
    },
  };
}

export function downloadGstr3bJsonFile(gstin: string, retPeriodMmYyyy: string, form: Gstr3bFormState): void {
  const data = buildGstr3bPortalJson(gstin, retPeriodMmYyyy, form);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `GSTR3B_${retPeriodMmYyyy}_${gstin}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** First and last calendar dates (YYYY-MM-DD) for a month. */
export function calendarMonthRangeIso(year: number, month1to12: number): { from: string; to: string } {
  const from = new Date(year, month1to12 - 1, 1);
  const to = new Date(year, month1to12, 0);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from: iso(from), to: iso(to) };
}

/** GST return period MMYYYY e.g. April 2025 → 042025 */
export function toRetPeriodMmYyyy(year: number, month1to12: number): string {
  const mm = String(month1to12).padStart(2, '0');
  const yyyy = String(year);
  return `${mm}${yyyy}`;
}
