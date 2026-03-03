# Digital Library Hub

## Project Overview
A CAP-based library management app supporting **SQLite** (local dev) and **SAP HANA** (production).

### Architecture
| Layer | Runtime | Dev DB | Production DB |
|---|---|---|---|
| Node.js CAP | `@sap/cds` | SQLite (`@cap-js/sqlite`) | HANA (`@cap-js/hana`) |
| Java Spring Boot | CAP Java SDK | H2 (in-memory) | SAP HANA (*via VCAP_SERVICES*) |

---

## Prerequisites
- Node.js 18+
- npm
- Java 21 + Maven (for Java layer)
- SAP BTP CF account with `lulu-db` HANA service (for HANA runs)

---

## 1. Install Dependencies
```bash
cd /home/waheed/Work/Anti-Gravity/Durai/SAP/SAP_Java_Personal_Accounts
npm install
```

---

## 2. Run — Node.js Layer

### Development (SQLite, in-memory)
```bash
npm run start:sqlite
```
- App URL: `http://localhost:4004`
- UI URL: `http://localhost:4004/library/webapp/index.html`

### Production (SAP HANA)
> Requires CF CLI logged in and CF binding to `lulu-db` in `.cdsrc-private.json`.

```bash
npm run start:hana
```

### Build HANA HDI Artifacts (before deploying to BTP)
```bash
npm run build:hana
# then deploy:
cd db && npm run start
```

---

## 3. Run — Java Spring Boot Layer

### Development (H2, in-memory)
```bash
cd srv
mvn spring-boot:run
```
- App URL: `http://localhost:8080`

### Production (SAP HANA)
> Requires VCAP_SERVICES env var or CF binding available.

```bash
cd srv
mvn spring-boot:run -Dspring-boot.run.profiles=hana
```

---

## 4. PM2 (Process Manager)

```bash
# SQLite (local)
pm2 start library.config.js --only librarya

# HANA (production)
pm2 start library.config.js --only librarya-hana
```

---

## 5. Health Checks
```bash
# Node.js layer
curl -i http://localhost:4004/

# Java layer
curl -i http://localhost:8080/actuator/health

# OData service check (Node.js, default mock user)
curl -u alice:password "http://localhost:4004/service/sAP_Java_Personal_Accounts_cds/Books?$top=1"
```

---

## 6. Stop Server
```bash
# cds watch
pkill -f 'cds watch'

# Spring Boot
pkill -f 'spring-boot:run'
```

---

## 7. Troubleshooting

| Problem | Fix |
|---|---|
| Port in use | Kill process or change `PORT` env var |
| SQLite error | Confirm `NODE_ENV=development` or use `npm run start:sqlite` |
| HANA connection fail | Verify `.cdsrc-private.json` binding and CF login |
| H2 in HANA build | Ensure `mvn spring-boot:run -Dspring-boot.run.profiles=hana` |
| HDI deploy fails | Run `npm install` in `db/` first; check HANA service binding |
