# PricingApp Migration Plan: SQLite -> SAP HANA

## 1. Objective
Migrate `PricingApp` from local SQLite development to SAP HANA for production-grade deployment, while preserving CAP service behavior and the `/pricing` + `/api` endpoints used by the web app.

## 2. Current Baseline
- CAP Node.js service
- SQLite local persistence (`db.sqlite`)
- HANA plugin already present in dependencies (`@cap-js/hana`)
- Profile-based config in `package.json` (`development` -> sqlite, `production` -> hana)
- UI served from `app/webapp`

## 3. Migration Strategy
Use **profile-based dual runtime**:
- Keep SQLite for local developer productivity.
- Use HANA in production profile.
- Deploy DB artifacts to HANA HDI container.

## 4. Prerequisites
1. SAP BTP subaccount and Cloud Foundry org/space (or Kyma runtime).
2. HANA Cloud instance.
3. HDI container service instance + service key.
4. Cloud Foundry CLI and login configured.
5. `mbt` and `cf` tooling (if using MTA deployment).

## 5. Configuration Tasks
1. Confirm production DB config in `package.json`:
   - `cds.[production].requires.db.kind = "hana"`
2. Keep development sqlite config unchanged.
3. Add or verify `.cdsrc-private.json` (local only) for developer-specific bindings if needed.
4. Remove sqlite-only assumptions from scripts for prod startup.

## 6. Data Model Hardening for HANA
1. Review CDS types for HANA compatibility:
   - keep explicit decimal precision/scale for money/analytics fields.
2. Replace any sqlite-specific SQL logic with CDS queries or db-agnostic SQL.
3. Keep index strategy in HANA-native deployment artifacts if required.
4. Ensure all entities have clear keys and integrity constraints.

## 7. Build and Deploy Artifacts
1. Generate HANA artifacts from CDS model:
   - `cds build --production`
2. If using MTA:
   - create/verify `mta.yaml` with modules:
     - Node.js service module
     - HDI deployer module
   - build MTA archive: `mbt build`
3. Deploy to CF:
   - `cf deploy <mta-archive>`
4. Bind app service to HDI container and restage.

## 8. Data Migration
1. Export required data from SQLite:
   - master data (`UiProducts`, `UiCustomers`, `UiSellers`, etc.)
   - operational data (`UiQuotes`, `UiQuoteItems`, transactions)
2. Transform data formats (dates/decimals/booleans) to HANA-compatible CSV.
3. Import into HANA tables using HDI-compatible load process.
4. Validate row counts and critical aggregates.

## 9. API and UI Validation
Run smoke tests in HANA profile:
1. OData endpoints:
   - `/pricing/$metadata`
   - key entities CRUD
2. Compatibility API endpoints:
   - `/api/quotes/*`
   - `/api/master/*`
   - `/api/admin/line-item-config`
3. UI checks:
   - `/webapp/index.html`
   - create/edit quote flow
   - analytics and admin screens

## 10. Security and Ops
1. Replace mocked auth with SAP XSUAA in production.
2. Map business roles (`PricingViewer`, `PricingAnalyst`, etc.) in role collections.
3. Enable application logging and error tracing.
4. Add health checks and readiness probes.

## 11. Performance Validation on HANA
1. Run large dataset test (10k+ transactions).
2. Measure latency for:
   - quote list
   - analytics actions (`priceWaterfall`, `scatter`, `timeSeries`)
3. Optimize with HANA indexes/calculation views if needed.
4. Verify no expensive full scans in critical paths.

## 12. Cutover Plan
1. Freeze schema changes.
2. Deploy final artifacts to production space.
3. Run migration/import and post-migration validation.
4. Enable traffic to new HANA-backed app.
5. Monitor errors/latency and keep rollback path.

## 13. Rollback Plan
1. Keep prior release artifact available.
2. Preserve SQLite-backed build for emergency rollback.
3. If severe issue occurs:
   - route traffic back to previous app version
   - restore previous DB state if necessary

## 14. Recommended Execution Order
1. Dev validation in `--profile production` against non-prod HANA.
2. Fix compatibility/performance gaps.
3. Stage deployment + UAT.
4. Production cutover with monitored release window.
