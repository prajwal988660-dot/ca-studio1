import { GSTR1_CONFIG } from './config';
import type { GSTR1Filing } from './types';

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function generateGstr1Json(filing: GSTR1Filing): string {
  const envelope: Record<string, unknown> = {
    gstin: filing.gstin,
    fp: filing.period,
    version: GSTR1_CONFIG.SCHEMA_VERSION,
    hash: 'hash',
    b2b: filing.b2b.length > 0
      ? filing.b2b.map((inv) => ({
          ctin: inv.ctin,
          inv: [{
            inum: inv.inum,
            idt: inv.idt,
            val: r2(inv.val),
            pos: inv.pos,
            rchrg: inv.rchrg,
            inv_typ: inv.inv_typ,
            itms: inv.itms.map((i) => ({
              num: i.num,
              itm_det: {
                rt: i.itm_det.rt,
                txval: r2(i.itm_det.txval),
                ...(i.itm_det.iamt != null ? { iamt: r2(i.itm_det.iamt) } : {}),
                ...(i.itm_det.camt != null ? { camt: r2(i.itm_det.camt) } : {}),
                ...(i.itm_det.samt != null ? { samt: r2(i.itm_det.samt) } : {}),
                ...(i.itm_det.csamt != null ? { csamt: r2(i.itm_det.csamt) } : {}),
              },
            })),
          }],
        }))
      : undefined,
    b2cl: filing.b2cl.length > 0
      ? filing.b2cl.map((inv) => ({
          pos: inv.pos,
          inv: [{ inum: inv.inum, idt: inv.idt, val: r2(inv.val), itms: inv.itms }],
        }))
      : undefined,
    b2cs: filing.b2cs.length > 0 ? filing.b2cs.map((s) => ({
      sply_ty: s.sply_ty,
      pos: s.pos,
      rt: s.rt,
      txval: r2(s.txval),
      ...(s.iamt != null ? { iamt: r2(s.iamt) } : {}),
      ...(s.camt != null ? { camt: r2(s.camt) } : {}),
      ...(s.samt != null ? { samt: r2(s.samt) } : {}),
      ...(s.csamt != null ? { csamt: r2(s.csamt) } : {}),
    })) : undefined,
    exp: filing.exp.length > 0
      ? [{
          exp_typ: filing.exp[0].exp_typ,
          inv: filing.exp.map((e) => ({
            inum: e.inum,
            idt: e.idt,
            val: r2(e.val),
            ...(e.sbnum ? { sbnum: e.sbnum } : {}),
            ...(e.sbdt ? { sbdt: e.sbdt } : {}),
            ...(e.sbpcode ? { sbpcode: e.sbpcode } : {}),
            itms: e.itms.map((i) => ({
              txval: r2(i.txval),
              rt: i.rt,
              ...(i.iamt != null ? { iamt: r2(i.iamt) } : {}),
            })),
          })),
        }]
      : undefined,
    cdnr: filing.cdnr.length > 0 ? filing.cdnr : undefined,
    cdnur: filing.cdnur.length > 0 ? filing.cdnur : undefined,
    nil: { inv: filing.nil },
    at: filing.at.length > 0 ? filing.at : undefined,
    txpd: filing.txpd.length > 0 ? filing.txpd : undefined,
    hsn: filing.hsn.length > 0 ? { data: filing.hsn } : undefined,
    doc_issue: filing.doc_issue.length > 0 ? { doc_det: filing.doc_issue } : undefined,
    // Amendment sections
    b2ba: (filing.b2ba ?? []).length > 0
      ? (filing.b2ba ?? []).map((inv) => ({
          ctin: inv.ctin,
          inv: [{
            oinum: inv.origInvNum ?? '',
            oidt: inv.origInvDt ?? '',
            inum: inv.inum, idt: inv.idt, val: r2(inv.val),
            pos: inv.pos, rchrg: inv.rchrg, inv_typ: inv.inv_typ,
            itms: inv.itms.map((i) => ({ num: i.num, itm_det: { rt: i.itm_det.rt, txval: r2(i.itm_det.txval), ...(i.itm_det.iamt != null ? { iamt: r2(i.itm_det.iamt) } : {}), ...(i.itm_det.camt != null ? { camt: r2(i.itm_det.camt) } : {}), ...(i.itm_det.samt != null ? { samt: r2(i.itm_det.samt) } : {}) } })),
          }],
        }))
      : undefined,
    b2cla: (filing.b2cla ?? []).length > 0
      ? (filing.b2cla ?? []).map((inv) => ({
          pos: inv.pos,
          inv: [{ oinum: inv.origInvNum ?? '', oidt: inv.origInvDt ?? '', inum: inv.inum, idt: inv.idt, val: r2(inv.val), itms: inv.itms }],
        }))
      : undefined,
    b2csa: (filing.b2csa ?? []).length > 0 ? filing.b2csa : undefined,
    expa: (filing.expa ?? []).length > 0 ? filing.expa : undefined,
    cdnra: (filing.cdnra ?? []).length > 0 ? filing.cdnra : undefined,
    cdnura: (filing.cdnura ?? []).length > 0 ? filing.cdnura : undefined,
  };

  // Remove undefined keys (except nil which is always present)
  for (const k of Object.keys(envelope)) {
    if (envelope[k] === undefined) delete envelope[k];
  }

  return JSON.stringify(envelope, null, 2);
}
