# Private Limited (`pvt_ltd`) — specification

**Module key (storage):** `pvt_ltd`  
**Company field:** `company.entity_type === 'pvt_ltd'`  
**UI config:** `src/lib/entityConfig/pvtLtd.ts`  
**Init:** `src/entities/private-limited/init.ts` via `initEntityData()`  
**Hook:** `src/hooks/usePvtLtdData.ts`

## Law & product scope

- **Companies Act 2013** private company (not listed; OPC/public are separate entity types).
- **Schedule III** financials (`profitLossFormat` / `balanceSheetFormat`: `schedule_iii`).
- **ITR-6**, tax audit **3CA/3CB** per classification.
- Statutory audit always; CARO / IFC / secretarial / cost audit / CSR / XBRL driven by **classification engine**.

## Folder map (implement in this order)

| Subfolder | Files | Responsibility |
|-----------|-------|----------------|
| `classification/` | `engine.ts`, `types.ts`, `thresholds.ts` | Size class, Ind AS vs Indian GAAP, audit flags, filing obligations |
| `compliance/` | `calendar.ts`, `eventFilings.ts` | FY compliance calendar (ROC, GST, IT, etc.) |
| `ifc/` | `templates.ts`, `types.ts` | IFC/ICFR package: entity controls, RCM, ITGC, coverage matrix |
| `registers/` | `metadata.ts`, `types.ts` | Statutory register types + empty register buckets on init |
| `filings/` | `types.ts`, `index.ts` | Filing trackers (MCA, etc.) |
| `audit/` | `templates.ts`, `types.ts` | DRS template, CARO/tax/secretarial applicability flags |
| `schedule-iii/` | `notes.ts`, `ratios.ts`, `types.ts` | Division I/II, ratio disclosures, extra disclosures |
| `init.ts` | — | Bootstrap all sections below into `entity_data` |
| `index.ts` | — | Public exports |

## `entity_data` sections (offline DB)

Written by `initPrivateLimited(company)`:

| Section key | Content |
|-------------|---------|
| `classification` | `Classification` — drives audits, CFS, MGT-7 vs 7A, XBRL, etc. |
| `compliance_calendar` | `{ fyEnd, agmDate, items: ComplianceItem[] }` |
| `ifc_package` | `IFCPackage` — controls, RCM, narratives, ITGC, coverage |
| `registers` | `Record<registerType, unknown[]>` from `REGISTER_METADATA` |
| `filing_trackers` | `[]` initially |
| `audit` | DRS template + `caroApplicable`, `taxAuditApplicable`, `secretarialAuditApplicable` |
| `schedule_iii` | Division, ratio disclosures, additional disclosure flags |

Read/write: `getEntityData(companyId, 'pvt_ltd', section)` / `upsertEntityData(...)`.

## UI nav spec (`pvtLtd.ts`) — highlights

- **Always:** journal, cash book, trial balance, P&L (Schedule III), balance sheet (Schedule III), share capital, audit, related party, accounting policies, AS checklist, directors report, CARO, ratio analysis, BS notes, tax computation, MSME, contingent liabilities, income tax, advance/deferred tax, BRS, vouchers.
- **Conditional:** purchase/sales registers, GST, TDS/TCS, inventory, trading account, cash flow, funds flow, debentures (GST/inventory flags on company).
- **Off:** partners capital, HUF karta, fund accounts (trust), income & expenditure / receipts & payments (NGO formats), Form 10B, LLP forms, FCRA.

Sidebar uses `getEntityConfig(entity_type)` — changing nav = edit `pvtLtd.ts` only.

## Shared pages vs Pvt Ltd–only UI

Most routes live under `src/app/company/[id]/...` and are **shared**. Pvt Ltd–specific logic should:

1. Read classification from `usePvtLtdData()` when `entity_type === 'pvt_ltd'`, or
2. Live under `src/entities/private-limited/` and be imported by thin page wrappers.

**Do not** fork journal/offlineDb into this folder.

## Phase 1 checklist (Private Limited “done”)

- [ ] Classification recomputes when FY inputs change (paid-up, turnover, listing, etc.)
- [ ] Compliance calendar reflects classification (small co exemptions)
- [ ] IFC package editable and persisted
- [ ] Registers CRUD per register type
- [ ] Filing trackers wired to compliance items
- [ ] Schedule III notes/ratios align with `schedule_iii` section + journal-derived statements
- [ ] All `pvtLtd.ts` nav flags have working routes or intentional “coming soon”
- [ ] `initEntityData` runs on company create; `usePvtLtdData` auto-inits legacy companies
- [ ] Journal / AI / BS / P&L use same `company_id` and journal entries (see root `CLAUDE.md`)

## Adding a new Pvt Ltd feature

1. Decide: domain logic → `entities/private-limited/<area>/`  
2. New persisted blob → new `section` string + types + init default  
3. UI → hook section in `usePvtLtdData` + page under `app/company/[id]/`  
4. If new sidebar item → `pvtLtd.ts` nav flag + `routes.tsx` + Sidebar filter

## Out of scope for this folder

- Partnership capital accounts, LLP agreement forms, trust Form 10B, cooperative Form N — other entity `SPEC.md` files later.
