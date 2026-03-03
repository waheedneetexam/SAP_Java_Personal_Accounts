# Hybrid DB (SQLite/H2 + SAP HANA) — Implemented Solution

## Approach: Option A — Profile-Based (Implemented)
Single CAP app; DB target switches via `--profile` flag. No dual-instance routing needed.

---

## Node.js Layer

### Profiles
| Profile | DB | Adapter |
|---|---|---|
| `development` (default) | SQLite in-memory | `@cap-js/sqlite` |
| `production` | SAP HANA | `@cap-js/hana` |

### Config: `.cdsrc.json`
```json
{
  "requires": { "db": { "kind": "sqlite", "impl": "@cap-js/sqlite" } },
  "[development]": { "requires": { "db": { "kind": "sqlite", "impl": "@cap-js/sqlite" } } },
  "[production]": { "requires": { "db": { "kind": "hana", "impl": "@cap-js/hana" } } }
}
```

### Scripts: `package.json`
```
start:sqlite  →  cds watch --in-memory
start:hana    →  cds watch --profile production
build:hana    →  cds build --production
```

### HANA Binding: `.cdsrc-private.json`
CF binding to `lulu-db` service in `waheed_space` on CF trial instance. File preserved as-is.

---

## Java Layer

### Profiles
| Profile | DB | SQL Init |
|---|---|---|
| `default` | H2 in-memory | `always` (from `schema-h2.sql`) |
| `hana` | SAP HANA | `never` (HDI manages schema) |

### Config: `application.yaml` + `application-hana.yaml`
- `application.yaml`: default (H2) and hana profiles defined
- `application-hana.yaml`: H2 auto-config excluded, mock auth disabled, HANA via VCAP_SERVICES

### `srv/pom.xml`
- H2 scope changed to `test` — never ships in production JAR

---

## DB / HDI

### HDI Deploy Flow
```bash
npm run build:hana        # CAP → generates db/src/gen/ HDI artifacts
cd db && npm run start    # @sap/hdi-deploy → deploys to HANA HDI container
```

### `db/undeploy.json`
Patterns: `.hdbview`, `.hdbindex`, `.hdbconstraint`, `.hdbtable`, `.hdbcalculationview`, `.hdbrole`, `.hdbgrants`

---

## Business Logic — DB-Agnostic ✅
- Node.js `service.js`: uses CDS `SELECT/INSERT/UPDATE` only — no raw SQL
- Java `LibraryServiceHandler.java`: uses CDS Java APIs (`Select.from`, `Update.entity`, `Insert.into`) — no raw SQL
- No code branching needed between environments

---

## Important CAP Constraint (unchanged)
A single running CAP Node.js process does **not** safely hot-swap `cds.requires.db` at runtime.
Profile switch requires process restart. The PM2 config in `library.config.js` manages both modes as separate named apps.
