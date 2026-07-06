/**
 * Private Limited — Statutory Registers (Section 7)
 *
 * Companies Act 2013 mandates maintenance of various registers.
 * These types model the register entries for digital maintenance.
 */

/* ═══════════════════════════════════════════════════════
   Register of Members — MGT-1 (Sec 88)
   ═══════════════════════════════════════════════════════ */

export interface MemberEntry {
  id: string;
  folioNumber: string;
  name: string;
  fatherOrSpouseName: string;
  address: string;
  occupation: string;
  nationality: string;
  pan: string;
  email?: string;
  phone?: string;
  /** Share class: equity / preference */
  shareClass: 'equity' | 'preference';
  /** Distinctive numbers of shares held */
  distinctiveFrom?: number;
  distinctiveTo?: number;
  /** Number of shares */
  sharesHeld: number;
  /** Face value per share */
  faceValue: number;
  /** Amount paid up per share */
  paidUp: number;
  /** Date of becoming member */
  dateOfEntry: string;
  /** How shares were acquired: allotment / transfer / transmission */
  modeOfAcquisition: 'allotment' | 'transfer' | 'transmission';
  /** Transfer details if applicable */
  transferFrom?: string;
  transferDate?: string;
  /** Date of ceasing to be member */
  dateOfCessation?: string;
  /** Nominee details */
  nomineeDetails?: string;
  /** Pledge/lien details */
  pledgeOrLien?: string;
}

/* ═══════════════════════════════════════════════════════
   Register of Directors & KMP — (Sec 170)
   ═══════════════════════════════════════════════════════ */

export type DirectorCategory =
  | 'managing_director'
  | 'whole_time_director'
  | 'independent_director'
  | 'nominee_director'
  | 'additional_director'
  | 'alternate_director'
  | 'woman_director';

export type KMPDesignation =
  | 'ceo'
  | 'cfo'
  | 'company_secretary'
  | 'managing_director'
  | 'whole_time_director'
  | 'manager';

export interface DirectorEntry {
  id: string;
  din: string;
  name: string;
  fatherOrSpouseName: string;
  dateOfBirth: string;
  nationality: string;
  address: string;
  pan: string;
  email: string;
  phone?: string;
  occupation: string;
  category: DirectorCategory;
  isKMP: boolean;
  kmpDesignation?: KMPDesignation;
  /** Date of appointment */
  dateOfAppointment: string;
  /** Board resolution / SR reference */
  resolutionReference: string;
  /** Date of cessation (if resigned/removed) */
  dateOfCessation?: string;
  reasonForCessation?: 'resignation' | 'removal' | 'retirement' | 'disqualification' | 'death';
  /** Directorships in other companies */
  otherDirectorships?: Array<{
    companyName: string;
    cin: string;
    dateOfAppointment: string;
  }>;
  /** Committee memberships */
  committeeMemberships?: Array<{
    committeeName: string;
    role: 'chairman' | 'member';
  }>;
}

/* ═══════════════════════════════════════════════════════
   Register of Charges — CHG-7 (Sec 85)
   ═══════════════════════════════════════════════════════ */

export type ChargeType =
  | 'hypothecation'
  | 'mortgage'
  | 'pledge'
  | 'floating_charge'
  | 'fixed_charge';

export interface ChargeEntry {
  id: string;
  chargeId: string;
  /** SRN of CHG-1 filed with ROC */
  srnReference?: string;
  chargeHolder: string;
  chargeHolderAddress: string;
  chargeType: ChargeType;
  /** Amount secured */
  amountSecured: number;
  /** Description of property/assets charged */
  propertyCharged: string;
  /** Terms and conditions */
  termsAndConditions: string;
  /** Date of creation */
  dateOfCreation: string;
  /** Date of modification (if modified) */
  dateOfModification?: string;
  /** Date of satisfaction */
  dateOfSatisfaction?: string;
  /** Whether charge is open or satisfied */
  status: 'open' | 'modified' | 'satisfied';
}

/* ═══════════════════════════════════════════════════════
   Register of Contracts — MBP-4 (Sec 189)
   Contracts with related parties / directors
   ═══════════════════════════════════════════════════════ */

export interface ContractEntry {
  id: string;
  /** Date of contract */
  contractDate: string;
  /** Parties to contract */
  partyName: string;
  /** Relationship */
  relationship: 'director' | 'relative_of_director' | 'kmp' | 'related_party';
  /** Name of interested director */
  interestedDirector: string;
  /** Nature of contract */
  natureOfContract: string;
  /** Date of Board resolution approving */
  boardResolutionDate: string;
  /** Whether arm's length pricing used */
  isArmsLength: boolean;
  /** Contract value */
  contractValue: number;
  /** Duration */
  startDate: string;
  endDate?: string;
  /** Whether Audit Committee approved (if required) */
  auditCommitteeApproval?: boolean;
  /** Whether shareholder approval obtained (if required) */
  shareholderApproval?: boolean;
}

/* ═══════════════════════════════════════════════════════
   Register of Loans, Guarantees & Investments — MBP-2 (Sec 186)
   ═══════════════════════════════════════════════════════ */

export type TransactionType = 'loan_given' | 'guarantee_given' | 'security_provided' | 'investment_made';

export interface LoanInvestmentEntry {
  id: string;
  transactionType: TransactionType;
  /** Name of entity to whom loan/guarantee/investment */
  partyName: string;
  /** Whether it's a body corporate, person, etc. */
  partyType: 'body_corporate' | 'individual' | 'firm' | 'other';
  /** Amount */
  amount: number;
  /** Purpose */
  purpose: string;
  /** Date of transaction */
  transactionDate: string;
  /** Rate of interest (for loans) */
  rateOfInterest?: number;
  /** Terms of repayment */
  termsOfRepayment?: string;
  /** Security provided (for guarantees) */
  securityDetails?: string;
  /** Board resolution date */
  boardResolutionDate: string;
  /** Whether special resolution required and obtained */
  specialResolutionRequired: boolean;
  specialResolutionDate?: string;
  /** Whether limits under Sec 186 are complied with */
  withinStatutoryLimit: boolean;
  /** Status */
  status: 'active' | 'repaid' | 'invoked' | 'written_off';
}

/* ═══════════════════════════════════════════════════════
   Register of Significant Beneficial Owners — BEN-3 (Sec 90)
   ═══════════════════════════════════════════════════════ */

export interface SBOEntry {
  id: string;
  /** Name of registered holder */
  registeredHolder: string;
  /** Name of SBO */
  sboName: string;
  /** SBO identification (PAN/passport) */
  sboIdentification: string;
  nationality: string;
  address: string;
  /** Nature of beneficial interest */
  natureOfInterest: 'shares' | 'voting_rights' | 'right_to_distributions' | 'significant_influence';
  /** Percentage of interest */
  percentageOfInterest: number;
  /** Date of declaration (BEN-1 received) */
  dateOfDeclaration: string;
  /** Date of entry in register */
  dateOfRegistration: string;
  /** Whether BEN-2 filed with ROC */
  ben2Filed: boolean;
  ben2FilingDate?: string;
}

/* ═══════════════════════════════════════════════════════
   Minutes Register — (Sec 118)
   ═══════════════════════════════════════════════════════ */

export type MeetingType =
  | 'board_meeting'
  | 'agm'
  | 'egm'
  | 'audit_committee'
  | 'nomination_committee'
  | 'csr_committee'
  | 'other_committee';

export interface MinutesEntry {
  id: string;
  meetingType: MeetingType;
  committeeName?: string;
  /** Serial number of meeting */
  meetingNumber: number;
  /** Date and time of meeting */
  meetingDate: string;
  meetingTime?: string;
  /** Venue */
  venue: string;
  /** Mode: physical / VC / hybrid */
  mode: 'physical' | 'video_conference' | 'hybrid';
  /** Directors/members present */
  present: string[];
  /** Leave of absence granted */
  leaveOfAbsence?: string[];
  /** Quorum met */
  quorumMet: boolean;
  /** Chairman of meeting */
  chairman: string;
  /** Invitees (CS, auditor, etc.) */
  invitees?: string[];
  /** Agenda items with resolutions */
  agendaItems: AgendaItem[];
  /** Date minutes were entered in book (must be within 30 days) */
  dateOfEntry: string;
  /** Page numbers in physical register */
  pageFrom?: number;
  pageTo?: number;
}

export interface AgendaItem {
  itemNumber: number;
  subject: string;
  /** Type of resolution */
  resolutionType?: 'ordinary' | 'special' | 'board';
  /** Full text of resolution */
  resolutionText: string;
  /** Whether passed or not */
  outcome: 'passed' | 'not_passed' | 'deferred' | 'noted';
  /** Votes for / against (for general meetings) */
  votesFor?: number;
  votesAgainst?: number;
  /** Interested directors who abstained */
  abstained?: string[];
}

/* ═══════════════════════════════════════════════════════
   Union type for all register entries
   ═══════════════════════════════════════════════════════ */

export type RegisterType =
  | 'members'
  | 'directors'
  | 'charges'
  | 'contracts'
  | 'loans_investments'
  | 'sbo'
  | 'minutes';

export interface RegisterMetadata {
  type: RegisterType;
  statuteReference: string;
  formReference: string;
  description: string;
}
