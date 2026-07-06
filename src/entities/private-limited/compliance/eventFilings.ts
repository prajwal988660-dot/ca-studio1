/**
 * Private Limited — Event-Based Filings (Section 5.C)
 *
 * Triggered by corporate actions. Clock starts at the event date.
 */

export interface EventFiling {
  code: string;
  name: string;
  description: string;
  statute: string;
  daysFromEvent: number;
  eventType: EventType;
}

export type EventType =
  | 'board_resolution'
  | 'special_resolution'
  | 'share_allotment'
  | 'capital_increase'
  | 'director_change'
  | 'registered_office_change'
  | 'charge_creation'
  | 'charge_satisfaction'
  | 'sbo_declaration'
  | 'new_director_din'
  | 'share_reconciliation';

/** Master list of event-based filings */
export const EVENT_FILINGS: EventFiling[] = [
  {
    code: 'MGT-14',
    name: 'Filing of Resolutions',
    description: 'File special/board resolutions with ROC',
    statute: 'Sec 117',
    daysFromEvent: 30,
    eventType: 'special_resolution',
  },
  {
    code: 'PAS-3',
    name: 'Return of Allotment',
    description: 'File return of allotment after share issuance',
    statute: 'Sec 39',
    daysFromEvent: 30,
    eventType: 'share_allotment',
  },
  {
    code: 'SH-7',
    name: 'Increase in Authorised Share Capital',
    description: 'Notice of increase in authorised capital',
    statute: 'Sec 64',
    daysFromEvent: 30,
    eventType: 'capital_increase',
  },
  {
    code: 'DIR-12',
    name: 'Director Appointment / Cessation',
    description: 'Particulars of appointment/change in directors or KMP',
    statute: 'Sec 170',
    daysFromEvent: 30,
    eventType: 'director_change',
  },
  {
    code: 'INC-22',
    name: 'Registered Office Change',
    description: 'Notice of situation or change of registered office',
    statute: 'Sec 12',
    daysFromEvent: 30,
    eventType: 'registered_office_change',
  },
  {
    code: 'CHG-1',
    name: 'Creation of Charge',
    description: 'Particulars of charge created on company assets',
    statute: 'Sec 77',
    daysFromEvent: 30,
    eventType: 'charge_creation',
  },
  {
    code: 'CHG-4',
    name: 'Satisfaction of Charge',
    description: 'Intimation of satisfaction/modification of charge',
    statute: 'Sec 82',
    daysFromEvent: 30,
    eventType: 'charge_satisfaction',
  },
  {
    code: 'BEN-2',
    name: 'Significant Beneficial Owner',
    description: 'Return of significant beneficial owners in shares',
    statute: 'Sec 90',
    daysFromEvent: 30,
    eventType: 'sbo_declaration',
  },
  {
    code: 'DIR-3',
    name: 'Application for DIN',
    description: 'Application for Director Identification Number',
    statute: 'Sec 153',
    daysFromEvent: 0, // before appointment
    eventType: 'new_director_din',
  },
  {
    code: 'PAS-6',
    name: 'Share Capital Reconciliation',
    description: 'Half-yearly reconciliation of share capital (where demat applies)',
    statute: 'Rule 9A',
    daysFromEvent: 30,
    eventType: 'share_reconciliation',
  },
];

/**
 * Compute the due date for an event-based filing.
 */
export function computeEventFilingDueDate(filing: EventFiling, eventDate: string): string {
  const d = new Date(eventDate + 'T00:00:00');
  d.setDate(d.getDate() + filing.daysFromEvent);
  return d.toISOString().slice(0, 10);
}

/**
 * Get all filings triggered by a given event type.
 */
export function getFilingsForEvent(eventType: EventType): EventFiling[] {
  return EVENT_FILINGS.filter((f) => f.eventType === eventType);
}
