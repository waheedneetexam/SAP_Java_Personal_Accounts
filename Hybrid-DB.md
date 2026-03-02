# Hybrid DB Plan (SQLite + HANA) for CAP
codex resume 019cac9b-b6c8-7ae2-8dae-9ffb61178856

## 1. Goal
Enable the CAP app to:
- Use `@cap-js/sqlite` in development.
- Use `@cap-js/hana` in production.
- Let users switch the active DB target from the web app.

## 2. Important CAP Constraint
A single running CAP Node.js process does **not** safely hot-swap `cds.requires.db` at runtime for active OData services.
- `cds.env` is resolved at startup.
- Service/database connections are initialized and cached.
- Changing env/profile requires process restart or routing to another already-running instance.

Because of this, true "live" switching inside one process should be implemented as:
- A profile switch request + controlled restart, or
- A router/proxy selecting between two running CAP instances (SQLite instance + HANA instance).

## 3. Recommended Architecture
Use profile-based dual config + runtime toggle API + restart orchestration.

### Option A (Recommended for single app deployment)
- Keep one CAP service.
- UI toggle calls backend API `/admin/db/switch` with target: `sqlite` or `hana`.
- Backend validates request, persists desired mode, and triggers graceful restart.
- On startup, app reads persisted mode and starts with the corresponding profile.

### Option B (No restart UX)
- Run two CAP instances simultaneously:
  - instance 1: `--profile development` (SQLite)
  - instance 2: `--profile production` (HANA)
- UI toggle updates a routing target via proxy/config service.
- Requests are routed to selected instance.

## 4. Package/Config Changes

### 4.1 Dependencies
Update `package.json`:
- `@cap-js/sqlite` (dev/local)
- `@cap-js/hana` (prod)
- keep `@sap/cds` and `@sap/cds-dk` as needed

### 4.2 CAP DB Configuration (`cds.requires.db`)
Configure profile-specific DB in `package.json` (`cds` section) or `.cdsrc.json`:
- `[development]`: sqlite
- `[production]`: hana

Example structure:
- `requires.db.kind = sqlite` for development
- `[production].requires.db.kind = hana`
- HANA credentials from bindings (`VCAP_SERVICES` / service binding)

### 4.3 Startup Scripts
Add scripts:
- `start:dev` -> `cds watch --profile development`
- `start:prod` -> `cds-serve --profile production`
- `start:sqlite` and `start:hana` convenience scripts if needed

## 5. Runtime Switching Design

### 5.1 Config Persistence
Create a small table/entity, e.g. `RuntimeSettings`:
- `key` (e.g. `activeDbProfile`)
- `value` (`development` or `production`)
- `updatedAt`, `updatedBy`

Fallback: local file/env store in dev.

### 5.2 Admin Config Service
Add service endpoints:
- `GET /admin/db/profile` -> returns current + desired profile
- `POST /admin/db/switch` -> validate + persist desired profile + switch action

Validation:
- only allow `development|production` (or `sqlite|hana` mapped)
- require admin role
- reject if already active

### 5.3 Switch Execution
Implement a switch manager:
- In dev: execute graceful restart command with target profile.
- In cloud: emit switch request event / update deployment variable, then rolling restart.
- Return clear status: `accepted`, `in-progress`, `failed`, `activeProfile`.

## 6. UI Toggle Implementation

### 6.1 UI Components
Add to main view:
- current DB indicator (SQLite/HANA)
- toggle control (Switch/SegmentedButton)
- confirmation dialog before switching

### 6.2 UI Flow
1. Load current profile from `/admin/db/profile`.
2. User toggles target DB.
3. Call `/admin/db/switch`.
4. Show progress toast/dialog.
5. Poll status endpoint until active profile changes.
6. Refresh app data bindings.

### 6.3 Error Handling
Show actionable messages:
- invalid target profile
- unauthorized action
- HANA binding missing
- restart failed / timeout

## 7. Backend Reliability/Validation
- Pre-flight connectivity check before switching to HANA.
- Verify required service binding exists.
- Log switch initiator, timestamp, old/new profile.
- Add circuit-breaker: rollback to last known good profile on failed restart.

## 8. OData/Persistence Compatibility
Keep business logic DB-agnostic:
- No hardcoded SQL dialect.
- Use CDS queries (`SELECT/INSERT/UPDATE`) only.
- Use migrations/deploy flow compatible with both targets.

## 9. Testing Plan
- Unit tests for switch validation and profile mapping.
- Integration tests:
  - start in sqlite, run CRUD.
  - switch request to hana, verify reconnect after restart.
  - execute same CRUD without code changes.
- Negative tests:
  - missing HANA binding
  - unauthorized switch
  - invalid profile

## 10. Delivery Steps
1. Update dependency/config for dual DB plugins and profile-based `cds.requires.db`.
2. Add `RuntimeSettings` + admin switch service.
3. Implement switch manager with graceful restart workflow.
4. Add UI toggle + status + error states.
5. Add logs, validation, and automated tests.
6. Document operations for local dev and cloud deployment.

## 11. Note for Production
For enterprise stability, prefer **Option B (dual-instance routing)** if true zero-downtime live switching is mandatory. For most projects, **Option A (profile switch + controlled restart)** is simpler and reliable.
