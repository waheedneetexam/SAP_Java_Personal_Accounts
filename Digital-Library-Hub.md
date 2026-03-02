# Digital Library Hub

## Can We Still Run the Digital Library Project?
Yes. The project can still be run locally with SQLite and can be configured for production with SAP HANA.

## Project Location
`/home/user/projects/SAP_Java_Personal_Accounts`

## 1. Prerequisites
- Node.js 18+
- npm
- CAP tooling available through project dependencies (`@sap/cds`, `@sap/cds-dk`)

## 2. Install Dependencies
```bash
cd /home/user/projects/SAP_Java_Personal_Accounts
npm install
```

## 3. Run Development Version (SQLite)
Use SQLite for local development/testing.

```bash
cd /home/user/projects/SAP_Java_Personal_Accounts
CDS_REQUIRES_DB_KIND=sqlite npm run start:sqlite
```

Expected URL:
- `http://localhost:4004`

Main app URL:
- `http://localhost:4004/library/webapp/index.html`

## 4. Run Production-Like Version (HANA Profile)
Use HANA only when proper HANA bindings/credentials are available.

```bash
cd /home/user/projects/SAP_Java_Personal_Accounts
npm run start:hana
```

Notes:
- Ensure HANA service binding/config exists before running.
- In SAP BTP, HANA credentials are usually provided through service bindings.

## 5. Common Checks
Health check:
```bash
curl -i http://localhost:4004/
```

Service check:
```bash
curl -i -u alice:password "http://localhost:4004/service/sAP_Java_Personal_Accounts_cds/Books?$top=1"
```

## 6. Stop Running Server
If started in terminal: `Ctrl + C`

Or kill CAP watcher:
```bash
pkill -f 'cds watch'
```

## 7. Troubleshooting
- Port already in use:
  - Stop existing process or run on another port.
- SQLite syntax/deploy issues:
  - Ensure SQLite mode is actually used (`CDS_REQUIRES_DB_KIND=sqlite`).
- HANA connection errors:
  - Verify HANA bindings/credentials and network access.
