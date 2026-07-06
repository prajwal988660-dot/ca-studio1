export type NarrativeModuleId =
  | 'audit_notes'
  | 'related_party'
  | 'policies'
  | 'as_checklist'
  | 'contingent_liabilities'
  | 'directors_report'
  | 'caro'
  | 'cost_records';

export type NarrativeSectionState = 'draft' | 'under_review' | 'final';

export interface NarrativeSectionVersion {
  id: string;
  createdAt: string;
  createdBy: string;
  text: string;
}

export interface NarrativeSection {
  id: string;
  moduleId: NarrativeModuleId;
  title: string;
  state: NarrativeSectionState;
  currentVersionId: string;
  versions: NarrativeSectionVersion[];
}

export interface NarrativeEngineContext {
  balanceSheetSnapshot?: unknown;
  profitAndLossSnapshot?: unknown;
  ratiosSnapshot?: unknown;
  msmeSnapshot?: unknown;
  borrowingsSnapshot?: unknown;
  relatedPartySnapshot?: unknown;
}

export interface NarrativeScaffoldInput {
  moduleId: NarrativeModuleId;
  context: NarrativeEngineContext;
}

export interface NarrativeScaffold {
  moduleId: NarrativeModuleId;
  sections: NarrativeSection[];
}

function createInitialVersion(
  moduleId: NarrativeModuleId,
  title: string,
  text: string,
  userId: string
): NarrativeSection {
  const now = new Date().toISOString();
  const versionId = `${moduleId}-${Date.now()}`;
  const version: NarrativeSectionVersion = {
    id: versionId,
    createdAt: now,
    createdBy: userId,
    text,
  };
  return {
    id: `${moduleId}-${title.toLowerCase().replace(/\s+/g, '_')}`,
    moduleId,
    title,
    state: 'draft',
    currentVersionId: versionId,
    versions: [version],
  };
}

export function buildNarrativeScaffold(
  input: NarrativeScaffoldInput,
  userId: string
): NarrativeScaffold {
  const { moduleId } = input;

  const sections: NarrativeSection[] = [];

  if (moduleId === 'audit_notes') {
    sections.push(
      createInitialVersion(
        moduleId,
        'Summary of Key Audit Observations',
        'This section will summarize key audit observations based on the financial statements and supporting records.',
        userId
      )
    );
  } else if (moduleId === 'related_party') {
    sections.push(
      createInitialVersion(
        moduleId,
        'List of Related Parties',
        'This section will list related parties and nature of relationships, based on ledgers and disclosures.',
        userId
      )
    );
  } else if (moduleId === 'policies') {
    sections.push(
      createInitialVersion(
        moduleId,
        'Significant Accounting Policies',
        'This section will capture significant accounting policies applied in preparation of the financial statements.',
        userId
      )
    );
  } else if (moduleId === 'as_checklist') {
    sections.push(
      createInitialVersion(
        moduleId,
        'Accounting Standards Compliance Checklist',
        'This section will record compliance status with applicable Accounting Standards/Ind AS.',
        userId
      )
    );
  } else if (moduleId === 'contingent_liabilities') {
    sections.push(
      createInitialVersion(
        moduleId,
        'Contingent Liabilities and Commitments',
        'This section will describe contingent liabilities and commitments identified during the audit.',
        userId
      )
    );
  } else if (moduleId === 'directors_report') {
    sections.push(
      createInitialVersion(
        moduleId,
        'Directors’ Report Overview',
        'This section will summarize the financial and operational highlights for inclusion in the directors’ report.',
        userId
      )
    );
  } else if (moduleId === 'caro') {
    sections.push(
      createInitialVersion(
        moduleId,
        'CARO Reporting Summary',
        'This section will capture key matters for CARO reporting based on books and records.',
        userId
      )
    );
  } else if (moduleId === 'cost_records') {
    sections.push(
      createInitialVersion(
        moduleId,
        'Cost Records and Compliance',
        'This section will outline maintenance of cost records and related compliance, where applicable.',
        userId
      )
    );
  }

  return {
    moduleId,
    sections,
  };
}

export function addNarrativeVersion(
  section: NarrativeSection,
  text: string,
  userId: string
): NarrativeSection {
  const now = new Date().toISOString();
  const versionId = `${section.id}-v${section.versions.length + 1}`;
  const version: NarrativeSectionVersion = {
    id: versionId,
    createdAt: now,
    createdBy: userId,
    text,
  };

  return {
    ...section,
    currentVersionId: versionId,
    state: 'draft',
    versions: [...section.versions, version],
  };
}

export function transitionNarrativeState(
  section: NarrativeSection,
  nextState: NarrativeSectionState
): NarrativeSection {
  if (section.state === nextState) return section;

  if (section.state === 'draft' && nextState === 'under_review') {
    return { ...section, state: nextState };
  }

  if (section.state === 'under_review' && nextState === 'final') {
    return { ...section, state: nextState };
  }

  return section;
}

