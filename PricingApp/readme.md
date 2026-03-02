# PricingApp

Enterprise pricing foundation on SAP CAP Node.js, aligned to a clean-core architecture.

## Implemented Architecture
- Hexagonal structure:
  - `srv/core/*`: domain logic (DAG pricing engine, workflow machine)
  - `srv/adapters/*`: persistence adapter/repository
  - `srv/pricing-service.js`: application/service orchestration
- OData V4 service: `PricingService` at `/pricing`
- RBAC on entities/actions:
  - `PricingViewer`, `PricingAnalyst`, `PricingManager`, `PricingAuditor`
- Audit ledger via `AuditHistory` entity

## Data Model
- Master: `Products`, `Regions`
- Transactional: `Quotes`, `QuoteItems`, `PricingTransactions`
- Governance: `WorkflowTransitions`, `AuditHistory`
- Dynamic custom fields: `customFields : LargeString` (JSON-validated in service layer)

## Analytics-Oriented Features
- Actions:
  - `priceWaterfall`
  - `scatter`
  - `timeSeries`
- SQLite index bootstrap + migration script:
  - `db/migrations/001_olap_indexes.sql`

## Dual Database Profiles
`package.json` includes CAP profile-based DB config:
- Development: SQLite (`@cap-js/sqlite`)
- Production: HANA (`@cap-js/hana`)

## Run
```bash
npm install
npm run start:dev
```

Production profile:
```bash
npm run start:prod
```

## Auth (mocked)
- `alice / password` -> all roles
- `analyst / password` -> viewer + analyst
- `viewer / password` -> viewer

## Next Extensions
- React UI with row virtualization and memoized selectors.
- Workflow policy administration UI.
- HANA-native deployment descriptors for Cloud Foundry.
