/**
 * Private Limited — Statutory Register Metadata
 *
 * Reference information for each mandatory register.
 */

import type { RegisterMetadata } from './types';

export const REGISTER_METADATA: RegisterMetadata[] = [
  {
    type: 'members',
    statuteReference: 'Sec 88 read with Rule 3 of Companies (Management and Administration) Rules',
    formReference: 'MGT-1',
    description: 'Register of Members containing details of shareholders, shares held, transfers, and transmission',
  },
  {
    type: 'directors',
    statuteReference: 'Sec 170 read with Sec 2(51) for KMP',
    formReference: 'DIR-12 (for changes)',
    description: 'Register of Directors and Key Managerial Personnel with DIN, appointment details, and other directorships',
  },
  {
    type: 'charges',
    statuteReference: 'Sec 85 read with Sec 77-87',
    formReference: 'CHG-7',
    description: 'Register of Charges recording all charges created, modified, or satisfied on company assets',
  },
  {
    type: 'contracts',
    statuteReference: 'Sec 189 read with Rule 16 of Companies (Meetings of Board and its Powers) Rules',
    formReference: 'MBP-4',
    description: 'Register of Contracts with related parties and contracts/arrangements in which directors are interested',
  },
  {
    type: 'loans_investments',
    statuteReference: 'Sec 186 read with Rule 11 of Companies (Meetings of Board and its Powers) Rules',
    formReference: 'MBP-2',
    description: 'Register of Loans, Guarantees, Securities, and Investments made by the company',
  },
  {
    type: 'sbo',
    statuteReference: 'Sec 90 read with Companies (Significant Beneficial Owners) Rules 2018',
    formReference: 'BEN-3',
    description: 'Register of Significant Beneficial Owners who hold beneficial interest of 10% or more',
  },
  {
    type: 'minutes',
    statuteReference: 'Sec 118 read with SS-1 (Board Meetings) and SS-2 (General Meetings)',
    formReference: 'N/A',
    description: 'Minutes of Board meetings, General meetings, and Committee meetings — to be entered within 30 days',
  },
];
