/**
 * Private Limited — IFC/ICFR Default Templates
 *
 * Pre-built RCM, process narratives, entity-level controls, and ITGC
 * that the AI agent can draft and the CA reviews/signs off.
 */

import type {
  RCMEntry,
  ProcessNarrative,
  EntityLevelControl,
  ITGCEntry,
  ProcessCycle,
} from './types';

/* ═══════════════════════════════════════════════════════
   Entity-Level Controls — baseline set
   ═══════════════════════════════════════════════════════ */

export const DEFAULT_ENTITY_CONTROLS: Omit<EntityLevelControl, 'status'>[] = [
  {
    id: 'ELC-001',
    category: 'tone_at_top',
    description: 'Board of Directors sets and communicates ethical values and standards of conduct',
    evidence: 'Board minutes, Code of Conduct document, director declarations',
  },
  {
    id: 'ELC-002',
    category: 'delegation_of_authority',
    description: 'Defined delegation of authority matrix with monetary limits for approvals',
    evidence: 'Delegation of Authority document, Board resolution',
  },
  {
    id: 'ELC-003',
    category: 'code_of_conduct',
    description: 'Code of conduct for directors and senior management; annual affirmation obtained',
    evidence: 'Signed annual affirmations, Code of Conduct policy',
  },
  {
    id: 'ELC-004',
    category: 'whistleblower',
    description: 'Vigil mechanism / whistleblower policy established and communicated to all employees',
    evidence: 'Whistleblower policy document, awareness records',
  },
  {
    id: 'ELC-005',
    category: 'risk_assessment',
    description: 'Annual risk assessment process identifying financial reporting risks',
    evidence: 'Risk register, Board/Audit committee minutes reviewing risk assessment',
  },
  {
    id: 'ELC-006',
    category: 'monitoring',
    description: 'Management reviews financial results monthly and investigates variances',
    evidence: 'MIS reports, variance analysis documents, review meeting minutes',
  },
];

/* ═══════════════════════════════════════════════════════
   RCM Templates — per process cycle
   ═══════════════════════════════════════════════════════ */

export const RCM_TEMPLATES: Record<ProcessCycle, Omit<RCMEntry, 'id' | 'status'>[]> = {
  procure_to_pay: [
    {
      process: 'procure_to_pay',
      subProcess: 'Purchase Order',
      riskDescription: 'Unauthorized purchases or purchases at unfavorable terms',
      riskRating: 'high',
      controlObjective: 'All purchases are authorized and at competitive prices',
      controlDescription: 'Purchase orders above ₹50,000 require dual approval per delegation matrix; comparative quotations required above ₹1,00,000',
      controlType: 'preventive',
      controlNature: 'manual',
      frequency: 'per_transaction',
      assertion: ['existence', 'valuation'],
      owner: 'Purchase Manager',
      testOfDesign: 'Inspect delegation matrix; verify PO approval workflow',
      testOfOperatingEffectiveness: 'Select sample of POs; verify approvals and quotation comparisons',
    },
    {
      process: 'procure_to_pay',
      subProcess: 'Invoice Processing',
      riskDescription: 'Duplicate or fictitious vendor invoices processed for payment',
      riskRating: 'high',
      controlObjective: 'Only valid invoices with matching GRN/PO are processed',
      controlDescription: 'Three-way match (PO–GRN–Invoice) enforced before payment processing; system flags duplicates by invoice number',
      controlType: 'preventive',
      controlNature: 'automated',
      frequency: 'per_transaction',
      assertion: ['existence', 'completeness', 'valuation'],
      owner: 'Accounts Payable',
      testOfDesign: 'Review three-way match configuration; test duplicate detection',
      testOfOperatingEffectiveness: 'Select sample invoices; verify match documentation and no duplicates',
    },
    {
      process: 'procure_to_pay',
      subProcess: 'Vendor Payment',
      riskDescription: 'Payments made to wrong vendor or wrong amount',
      riskRating: 'medium',
      controlObjective: 'Payments are accurate and made only to authorized vendors',
      controlDescription: 'Payment batch requires finance head approval; bank details verified against master before release',
      controlType: 'preventive',
      controlNature: 'it_dependent_manual',
      frequency: 'per_transaction',
      assertion: ['existence', 'valuation', 'rights_and_obligations'],
      owner: 'Finance Manager',
      testOfDesign: 'Review payment approval workflow and vendor master controls',
      testOfOperatingEffectiveness: 'Select sample payments; trace to approved invoices and verify vendor details',
    },
  ],
  order_to_cash: [
    {
      process: 'order_to_cash',
      subProcess: 'Sales Invoice',
      riskDescription: 'Revenue recognized for fictitious sales or without delivery',
      riskRating: 'high',
      controlObjective: 'Revenue is recognized only when goods/services are delivered',
      controlDescription: 'Sales invoices require delivery confirmation (e-way bill/POD) before booking; system enforces dispatch-to-invoice sequence',
      controlType: 'preventive',
      controlNature: 'automated',
      frequency: 'per_transaction',
      assertion: ['existence', 'completeness'],
      owner: 'Sales Manager',
      testOfDesign: 'Review dispatch-invoice workflow configuration',
      testOfOperatingEffectiveness: 'Select sample invoices; verify delivery evidence exists prior to invoice date',
    },
    {
      process: 'order_to_cash',
      subProcess: 'Collections',
      riskDescription: 'Collections not applied to correct customer or lost',
      riskRating: 'medium',
      controlObjective: 'All collections are recorded and applied to correct accounts',
      controlDescription: 'Daily bank reconciliation performed; unidentified receipts investigated within 3 days',
      controlType: 'detective',
      controlNature: 'manual',
      frequency: 'daily',
      assertion: ['completeness', 'valuation'],
      owner: 'Accounts Receivable',
      testOfDesign: 'Review bank reconciliation process; verify follow-up procedure',
      testOfOperatingEffectiveness: 'Review sample bank reconciliations; verify timely investigation of unmatched items',
    },
  ],
  payroll: [
    {
      process: 'payroll',
      subProcess: 'Salary Processing',
      riskDescription: 'Ghost employees or incorrect salary amounts processed',
      riskRating: 'high',
      controlObjective: 'Payroll is accurate and only for active employees',
      controlDescription: 'HR confirms headcount and changes monthly before payroll run; Finance verifies payroll summary against approved budget',
      controlType: 'preventive',
      controlNature: 'manual',
      frequency: 'monthly',
      assertion: ['existence', 'completeness', 'valuation'],
      owner: 'HR Manager + Finance Manager',
      testOfDesign: 'Review payroll approval workflow; verify HR confirmation step',
      testOfOperatingEffectiveness: 'Select sample months; verify HR confirmation, payroll approval, and budget variance analysis',
    },
  ],
  fixed_assets: [
    {
      process: 'fixed_assets',
      subProcess: 'Capitalization',
      riskDescription: 'Revenue items capitalized or capital items expensed',
      riskRating: 'medium',
      controlObjective: 'Assets are correctly classified and capitalized per policy',
      controlDescription: 'Capitalization threshold defined in policy; items above threshold reviewed by finance head for proper classification',
      controlType: 'preventive',
      controlNature: 'manual',
      frequency: 'per_transaction',
      assertion: ['existence', 'valuation', 'presentation_and_disclosure'],
      owner: 'Finance Manager',
      testOfDesign: 'Review capitalization policy and approval workflow',
      testOfOperatingEffectiveness: 'Select sample capitalizations; verify classification rationale and approval',
    },
  ],
  treasury: [
    {
      process: 'treasury',
      subProcess: 'Bank Reconciliation',
      riskDescription: 'Unauthorized transactions or errors not detected timely',
      riskRating: 'medium',
      controlObjective: 'Bank balances are reconciled and differences investigated promptly',
      controlDescription: 'Monthly bank reconciliation prepared and reviewed by finance head; items outstanding >30 days escalated',
      controlType: 'detective',
      controlNature: 'manual',
      frequency: 'monthly',
      assertion: ['existence', 'completeness'],
      owner: 'Accounts Manager',
      testOfDesign: 'Review BRS process and escalation procedure',
      testOfOperatingEffectiveness: 'Select sample months; verify BRS preparation, review sign-off, and escalation of old items',
    },
  ],
  inventory: [
    {
      process: 'inventory',
      subProcess: 'Physical Verification',
      riskDescription: 'Book inventory differs from physical inventory',
      riskRating: 'medium',
      controlObjective: 'Physical inventory matches book records',
      controlDescription: 'Quarterly cycle count for fast-moving items; annual full physical verification; variances >2% investigated',
      controlType: 'detective',
      controlNature: 'manual',
      frequency: 'quarterly',
      assertion: ['existence', 'valuation'],
      owner: 'Store Manager',
      testOfDesign: 'Review physical verification policy and variance investigation process',
      testOfOperatingEffectiveness: 'Attend physical verification; verify count sheets, variance reports, and adjustments',
    },
  ],
  close_and_reporting: [
    {
      process: 'close_and_reporting',
      subProcess: 'Period-End Close',
      riskDescription: 'Financial statements contain errors due to incomplete close process',
      riskRating: 'high',
      controlObjective: 'All transactions are recorded and adjustments are made before close',
      controlDescription: 'Close checklist with 25+ items executed; reviewed by CFO; analytical review of P&L/BS performed monthly',
      controlType: 'detective',
      controlNature: 'manual',
      frequency: 'monthly',
      assertion: ['completeness', 'valuation', 'presentation_and_disclosure'],
      owner: 'CFO / Finance Head',
      testOfDesign: 'Review close checklist; verify analytical review templates',
      testOfOperatingEffectiveness: 'Select sample months; verify checklist completion, sign-offs, and variance explanations',
    },
  ],
  tax_compliance: [
    {
      process: 'tax_compliance',
      subProcess: 'TDS Deduction & Deposit',
      riskDescription: 'TDS not deducted or deposited on time; wrong section/rate applied',
      riskRating: 'high',
      controlObjective: 'TDS is correctly deducted and deposited within due dates',
      controlDescription: 'TDS computation reviewed monthly; section/rate validated against vendor PAN/category; deposit made by 7th of next month',
      controlType: 'preventive',
      controlNature: 'it_dependent_manual',
      frequency: 'monthly',
      assertion: ['completeness', 'valuation'],
      owner: 'Tax Manager',
      testOfDesign: 'Review TDS computation workflow and deposit tracking',
      testOfOperatingEffectiveness: 'Select sample TDS deductions; verify section, rate, computation, and timely deposit',
    },
  ],
  related_party: [
    {
      process: 'related_party',
      subProcess: 'RPT Identification & Approval',
      riskDescription: 'Related party transactions not identified or not at arm\'s length',
      riskRating: 'high',
      controlObjective: 'All RPTs are identified, approved, and at arm\'s length',
      controlDescription: 'Annual declaration from directors/KMP; RPT register maintained; all RPTs above threshold require Board/Audit Committee approval',
      controlType: 'preventive',
      controlNature: 'manual',
      frequency: 'per_transaction',
      assertion: ['completeness', 'presentation_and_disclosure'],
      owner: 'Company Secretary',
      testOfDesign: 'Review RPT policy, declaration process, and approval workflow',
      testOfOperatingEffectiveness: 'Verify declarations received; select sample RPTs and verify approval and pricing basis',
    },
  ],
};

/* ═══════════════════════════════════════════════════════
   Process Narratives — baseline set
   ═══════════════════════════════════════════════════════ */

export const PROCESS_NARRATIVES: Omit<ProcessNarrative, 'keyControls'>[] = [
  {
    process: 'procure_to_pay',
    title: 'Procure to Pay (P2P)',
    description: 'End-to-end process from purchase requisition to vendor payment',
    keySteps: [
      'Purchase requisition raised by department',
      'Purchase order created with quotation comparison',
      'Goods receipt note (GRN) recorded on delivery',
      'Vendor invoice matched against PO and GRN (three-way match)',
      'Invoice approved for payment per delegation matrix',
      'Payment processed and recorded in books',
    ],
    systemsUsed: ['Accounting software', 'Bank portal'],
    flowchartNotes: 'Requisition → PO (approval) → GRN → Invoice match → Payment approval → Bank transfer',
  },
  {
    process: 'order_to_cash',
    title: 'Order to Cash (O2C)',
    description: 'End-to-end process from customer order to revenue recognition and collection',
    keySteps: [
      'Customer order received and validated',
      'Goods dispatched with e-way bill / delivery note',
      'Sales invoice generated after dispatch confirmation',
      'Revenue recognized on delivery/performance',
      'Collection received and applied to customer account',
      'Periodic debtor ageing review and follow-up',
    ],
    systemsUsed: ['Accounting software', 'GST portal', 'E-way bill portal'],
    flowchartNotes: 'Order → Dispatch (e-way bill) → Invoice → Revenue recognition → Collection → Bank reconciliation',
  },
  {
    process: 'close_and_reporting',
    title: 'Close and Financial Reporting',
    description: 'Month-end and year-end close process leading to financial statement preparation',
    keySteps: [
      'Cut-off procedures applied (revenue, expenses)',
      'Accruals and provisions computed and recorded',
      'Depreciation run executed',
      'Inter-company / related party reconciliation',
      'Trial balance extracted and reviewed',
      'Analytical review of P&L and Balance Sheet',
      'Financial statements prepared per Schedule III',
      'Notes to accounts and disclosures prepared',
    ],
    systemsUsed: ['Accounting software', 'Excel working papers'],
    flowchartNotes: 'Cut-off → Accruals → Depreciation → Reconciliation → TB → Analytical review → FS preparation',
  },
];

/* ═══════════════════════════════════════════════════════
   ITGC Templates
   ═══════════════════════════════════════════════════════ */

export const DEFAULT_ITGC: Omit<ITGCEntry, 'id' | 'status'>[] = [
  {
    domain: 'access_management',
    controlDescription: 'User access to accounting system requires approval from finance head; access reviewed quarterly',
    system: 'Accounting Software',
    frequency: 'quarterly',
    owner: 'IT / Finance',
    testProcedure: 'Review user access list; verify approval for each user; check quarterly access review evidence',
  },
  {
    domain: 'access_management',
    controlDescription: 'Segregation of duties enforced — no single user can create and approve transactions',
    system: 'Accounting Software',
    frequency: 'per_transaction',
    owner: 'IT',
    testProcedure: 'Review role matrix; attempt to create and approve same transaction with single user',
  },
  {
    domain: 'change_management',
    controlDescription: 'Changes to accounting software (updates, customizations) require testing and approval before deployment',
    system: 'All systems',
    frequency: 'per_transaction',
    owner: 'IT Manager',
    testProcedure: 'Review change log; verify testing evidence and approval for recent changes',
  },
  {
    domain: 'operations',
    controlDescription: 'Audit trail enabled in accounting software; edit log records all create/modify with timestamps; cannot be disabled',
    system: 'Accounting Software',
    frequency: 'per_transaction',
    owner: 'IT / Finance',
    testProcedure: 'Verify audit trail setting; attempt to disable; review sample edit logs',
  },
  {
    domain: 'backup_recovery',
    controlDescription: 'Daily automated backup of accounting data; monthly restoration test; backup stored off-site',
    system: 'All systems',
    frequency: 'daily',
    owner: 'IT',
    testProcedure: 'Review backup schedule; verify last restoration test; confirm off-site storage',
  },
];
