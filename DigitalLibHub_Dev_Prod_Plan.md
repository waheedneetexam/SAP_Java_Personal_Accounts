# Digital Library Hub: Dev (SQLite) + Prod (SAP HANA) Plan

## Goal
Run two clear versions of the same project:
1. Development: SQLite only
2. Production: SAP HANA only

## 1. Target Operating Model
- **Development environment**
  - DB: SQLite
  - Fast local iteration
  - Seed data from `test/data`
- **Production environment**
  - DB: SAP HANA
  - Managed via SAP BTP service bindings
  - No SQLite in prod runtime

## 2. Configuration Strategy
Use CAP profiles and explicit scripts.

### Development Profile
- `requires.db.kind = sqlite`
- Local DB file or in-memory for quick testing

### Production Profile
- `requires.db.kind = hana`
- Credentials from bound HANA service

## 3. Recommended Config Structure
Keep config profile-driven in `.cdsrc.json` and/or `package.json` (`cds` section):
- default/dev -> sqlite
- `[production]` -> hana

Example intent:
- Dev start command always uses sqlite profile
- Prod start command always uses production/hana profile

## 4. Script Plan
Maintain separate, explicit scripts:
- `start:sqlite` for development
- `start:hana` for production

Optional additions:
- `build:prod` for deployment builds
- `deploy:hana` for HANA schema deployment

## 5. Development Workflow (SQLite)
1. Install dependencies
2. Start with sqlite profile
3. Verify app + OData
4. Run local tests

Command flow:
```bash
cd /home/user/projects/SAP_Java_Personal_Accounts
npm install
CDS_REQUIRES_DB_KIND=sqlite npm run start:sqlite
```

## 6. Production Workflow (HANA)
1. Provision HANA service (SAP BTP)
2. Bind app to HANA service
3. Build/deploy CAP app
4. Start with production profile
5. Verify OData and UI endpoints

Command concept:
```bash
cd /home/user/projects/SAP_Java_Personal_Accounts
npm run start:hana
```

## 7. Data & Schema Considerations
- Keep CDS model database-agnostic where possible.
- Use CAP-generated artifacts for HANA deployment.
- Validate constraints/indexes in HANA for production scale.

## 8. Security Plan
- Dev can use mocked auth.
- Prod should use enterprise auth (XSUAA/IAS as required).
- Map roles for admin/user access in production.

## 9. Validation Checklist
### Dev (SQLite)
- App loads on expected port
- CRUD works for Books/Authors/Genres/Members/Loans
- Borrow/return logic works

### Prod (HANA)
- Service binding resolved
- App boot without DB errors
- Same business flows work
- Performance baseline acceptable

## 10. Rollout Phases
1. Stabilize SQLite dev version
2. Validate HANA in non-prod space
3. UAT on HANA-backed build
4. Production cutover
5. Monitor and tune

## 11. Risks and Mitigations
- Risk: accidental SQLite usage in prod
  - Mitigation: enforce `production` profile + CI checks
- Risk: schema mismatch between envs
  - Mitigation: automated deploy pipeline and migration checks
- Risk: credential/binding issues
  - Mitigation: pre-deployment health verification

## 12. Success Criteria
- Developers run quickly on SQLite with zero HANA dependency.
- Production runs only on SAP HANA.
- No code branching required for business logic between envs.
