# Entity modules — roadmap

**Do not implement all entity types at once.** One folder per legal form; each folder has its own `SPEC.md`.

## Build order (mandatory)

| Phase | `entity_type` | Folder | `entityConfig` | `entities/` module | Status |
|-------|---------------|--------|----------------|-------------------|--------|
| **1** | `pvt_ltd` | `private-limited/` | `lib/entityConfig/pvtLtd.ts` | **Yes — build here first** | **Active** |
| 2 | `opc` | `opc/` (planned) | `opc.ts` | Planned | Nav only |
| 3 | `public_ltd` | `public-limited/` (planned) | `publicLtd.ts` | Planned | Nav only |
| 4 | `llp` | `llp/` (planned) | `llp.ts` | Planned | Nav only |
| 5 | `partnership` | `partnership/` (planned) | `partnership.ts` | Planned | Nav only |
| 6 | `sole_proprietorship` | `sole-proprietorship/` (planned) | `soleProprietorship.ts` | Planned | Nav only |
| 7 | `huf` | `huf/` (planned) | `huf.ts` | Planned | Nav only |
| 8 | `trust` | `trust/` (planned) | `trust.ts` | Planned | Nav only |
| 9 | `society` | `society/` (planned) | `society.ts` | Planned | Nav only |
| 10 | `section8` | `section-8/` (planned) | `section8.ts` | Planned | Nav only |
| 11 | `aop_boi` | `aop-boi/` (planned) | `aopBoi.ts` | Planned | Nav only |
| 12 | `cooperative` | `cooperative/` (planned) | `cooperative.ts` | Planned | Nav only |

Labels and ITR hints: `src/lib/constants/entityTypes.ts`.

## Two layers per entity (do not mix)

| Layer | Path | Purpose |
|-------|------|---------|
| **UI / nav spec** | `src/lib/entityConfig/<file>.ts` | Which sidebar routes exist (`always` / `conditional` / `never`), statement format (`traditional` vs `schedule_iii`), audit form |
| **Domain module** | `src/entities/<kebab-folder>/` | Classification, compliance calendar, registers, filings, audit templates, init on company create |

**Storage for domain data:** `upsertEntityData(companyId, moduleKey, section, data)` in `offlineDb.ts` (`entity_data[]` in `ca_offline_db_v2`).

**Dispatcher:** `src/entities/initEntity.ts` → call entity `init.ts` when company is created.

**React hook (Pvt Ltd only today):** `src/hooks/usePvtLtdData.ts` — pattern to copy per entity later.

## Shared core (all entities — do not duplicate per folder)

- Journal: `offlineDb` journal_entries, `useJournalEntries`, `ManualEntryDialog`, AI page
- COA / classification on lines: `lib/masterCOA`, `lib/accounting/inventoryJournal`
- Generic computes: `lib/accounting/balanceSheetCompute`, `profitLossCompute`, etc.
- Routes: `src/routes.tsx` (shared pages; visibility from `getEntityConfig`)

Entity folders add **legal-form-specific** data and rules, not a second journal DB.

## Current session rule

Unless the user names another entity type, **only read and edit `private-limited/`** plus shared files the task touches. Do not scaffold other entity folders until Phase 1 is signed off.
