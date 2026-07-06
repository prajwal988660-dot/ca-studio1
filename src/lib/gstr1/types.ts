export interface B2BItem {
  num: number;
  itm_det: {
    rt: number;
    txval: number;
    iamt?: number;
    camt?: number;
    samt?: number;
    csamt?: number;
  };
}

export interface B2BInvoice {
  id: string;
  ctin: string;
  inv_typ: 'R' | 'SEWP' | 'SEWOP' | 'DE';
  inum: string;
  idt: string; // DD-MM-YYYY
  val: number;
  pos: string;
  rchrg: 'Y' | 'N';
  itms: B2BItem[];
  isAmended?: boolean;
  origInvNum?: string;
  origInvDt?: string;
}

export interface B2CLInvoice {
  id: string;
  inum: string;
  idt: string; // DD-MM-YYYY
  val: number;
  pos: string;
  itms: B2BItem[];
  isAmended?: boolean;
  origInvNum?: string;
  origInvDt?: string;
}

export interface B2CSSummary {
  id: string;
  sply_ty: 'INTRA' | 'INTER';
  pos: string;
  rt: number;
  txval: number;
  iamt?: number;
  camt?: number;
  samt?: number;
  csamt?: number;
  isAmended?: boolean;
}

export interface EXPInvoice {
  id: string;
  exp_typ: 'WPAY' | 'WOPAY';
  inum: string;
  idt: string;
  val: number;
  sbnum?: string;
  sbdt?: string;
  sbpcode?: string;
  itms: Array<{ txval: number; rt: number; iamt?: number }>;
  isAmended?: boolean;
}

export interface CDNRNote {
  id: string;
  ctin: string;
  ntty: 'C' | 'D';
  nt: Array<{
    ntnum: string;
    ntdt: string; // DD-MM-YYYY
    val: number;
    itms: B2BItem[];
  }>;
  isAmended?: boolean;
}

export interface CDNURNote {
  id: string;
  ntty: 'C' | 'D';
  typ: 'B2CL' | 'EXPWP' | 'EXPWOP';
  ntnum: string;
  ntdt: string;
  val: number;
  pos: string;
  itms: B2BItem[];
  isAmended?: boolean;
}

export interface NilSummary {
  id: string;
  sply_ty: 'INTRB2B' | 'INTRB2C' | 'INTRAB2B' | 'INTRAB2C';
  nil_amt: number;
  expt_amt: number;
  ngsup_amt: number;
}

export interface ATAdvance {
  id: string;
  pos: string;
  sply_ty: 'INTRA' | 'INTER';
  itms: Array<{ rt: number; ad_amt: number; iamt?: number; camt?: number; samt?: number; csamt?: number }>;
}

export interface TXPDAdjustment {
  id: string;
  pos: string;
  sply_ty: 'INTRA' | 'INTER';
  itms: Array<{ rt: number; ad_amt: number; iamt?: number; camt?: number; samt?: number; csamt?: number }>;
}

export interface HSNSummary {
  id: string;
  num: number;
  hsn_sc: string;
  desc: string;
  uqc: string;
  qty: number;
  val: number;
  txval: number;
  iamt: number;
  camt: number;
  samt: number;
  csamt: number;
}

export interface DocIssueDoc {
  id: string;
  doc_num: number;
  docs: Array<{
    num: number;
    from: string;
    to: string;
    totnum: number;
    cancel: number;
    net_issue: number;
  }>;
}

export interface GSTR1Filing {
  id: string;
  company_id: string;
  period: string; // MMYYYY
  gstin: string;
  status: 'draft' | 'validated' | 'filed';
  created_at: string;
  updated_at: string;
  // Regular sections (b2b/b2cl/b2cs = manual only; auto rows computed live from books)
  b2b: B2BInvoice[];
  b2cl: B2CLInvoice[];
  b2cs: B2CSSummary[];
  exp: EXPInvoice[];
  cdnr: CDNRNote[];
  cdnur: CDNURNote[];
  nil: NilSummary[];
  at: ATAdvance[];
  txpd: TXPDAdjustment[];
  hsn: HSNSummary[];
  doc_issue: DocIssueDoc[];
  // Amendment sections
  b2ba: B2BInvoice[];
  b2cla: B2CLInvoice[];
  b2csa: B2CSSummary[];
  expa: EXPInvoice[];
  cdnra: CDNRNote[];
  cdnura: CDNURNote[];
  // RCM overrides: entry id → 'Y'|'N' (for toggling RCM on auto-populated rows)
  rcm_overrides: Record<string, 'Y' | 'N'>;
}

export type Gstr1Section = 'b2b' | 'b2cl' | 'b2cs' | 'exp' | 'cdnr' | 'cdnur' | 'nil' | 'at' | 'txpd' | 'hsn' | 'doc_issue';
