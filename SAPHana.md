# Running the Digital Library on SAP HANA (SAP Environment)

This guide covers everything needed to run the Digital Library Hub against a real **SAP HANA** database on **SAP Business Technology Platform (BTP)**.

---

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | ≥ 18 | CAP Node.js runtime |
| npm | ≥ 9 | Package management |
| Java JDK | 21 | Spring Boot runtime |
| Maven | ≥ 3.6.3 | Java build tool |
| CF CLI | ≥ 8 | Cloud Foundry deployment |
| `@sap/cds-dk` | ≥ 9.5 | CAP build & tooling |

Install CF CLI: https://docs.cloudfoundry.org/cf-cli/install-go-cli.html

---

## 1. Log In to Cloud Foundry

```bash
cf login -a https://api.cf.us10-001.hana.ondemand.com
# Enter your SAP BTP username and password when prompted.
# Select org: 24ff5b34trial_gladguy
# Select space: waheed_space
```

---

## 2. Create the HANA Service and Key (First Time Only)

> Skip this step if `lulu-db` and `lulu-key` already exist in your space.

```bash
# Create an SAP HANA Cloud service instance (schema plan)
cf create-service hana-cloud hana lulu-db

# Create a service key for local binding
cf create-service-key lulu-db lulu-key
```

Verify:
```bash
cf service lulu-db
cf service-key lulu-db lulu-key
```

---

## 3. Bind HANA Credentials Locally (Node.js Layer)

The `.cdsrc-private.json` file already contains the CF binding config for `lulu-db`. Activate it by running:

```bash
cd /home/waheed/Work/Anti-Gravity/Durai/SAP/SAP_Java_Personal_Accounts

# Pull live HANA credentials from CF into local profile
cds bind -2 lulu-db
```

This updates `.cdsrc-private.json` automatically with the latest credentials.

---

## 4. Build HANA HDI Artifacts

Generate the HANA-compatible database artifacts from the CDS model:

```bash
cd /home/waheed/Work/Anti-Gravity/Durai/SAP/SAP_Java_Personal_Accounts

npm run build:hana
# → generates db/src/gen/ with .hdbtable, .hdbview, .hdbconstraint files
```

---

## 5. Deploy Schema to HANA (HDI Container)

```bash
cd /home/waheed/Work/Anti-Gravity/Durai/SAP/SAP_Java_Personal_Accounts/db

# Install HDI deploy dependencies (first time)
npm install

# Deploy to the bound HANA HDI container
npm run start
```

Expected output:
```
Deploying to instance: lulu-db
...
HDI deployment completed successfully.
```

---

## 6. Run the Node.js CAP Layer on HANA

```bash
cd /home/waheed/Work/Anti-Gravity/Durai/SAP/SAP_Java_Personal_Accounts

npm run start:hana
```

The server starts on **`http://localhost:4004`** connected to your HANA instance.

Health check:
```bash
curl -i http://localhost:4004/
```

OData check (requires admin role):
```bash
curl -i -u alice:password \
  "http://localhost:4004/service/sAP_Java_Personal_Accounts_cds/Books?$top=3"
```

---

## 7. Run the Java Spring Boot Layer on HANA

### Step 7a — Export HANA Credentials to VCAP_SERVICES

```bash
# Get credentials from the CF service key
cf service-key lulu-db lulu-key

# Export as env var (replace <...> with the actual JSON from cf service-key output)
export VCAP_SERVICES='{"hana": [{ ... paste service key JSON here ... }]}'
```

Or use the `cds-services` approach with `default-env.json` (CAP Java):

```bash
# Generate default-env.json from CF binding
cds bind -2 lulu-db --for java
# → creates srv/default-env.json with HANA VCAP_SERVICES
```

### Step 7b — Start with HANA Profile

```bash
cd /home/waheed/Work/Anti-Gravity/Durai/SAP/SAP_Java_Personal_Accounts/srv

mvn spring-boot:run -Dspring-boot.run.profiles=hana
```

Health check:
```bash
curl -i http://localhost:8080/actuator/health
# Expected: {"status":"UP","components":{"db":{"status":"UP"}, ...}}
```

---

## 8. Using PM2 (Production Process Manager)

```bash
cd /home/waheed/Work/Anti-Gravity/Durai/SAP/SAP_Java_Personal_Accounts

# Start HANA-backed Node.js process
pm2 start library.config.js --only librarya-hana

# Check status
pm2 status

# View logs
pm2 logs librarya-hana

# Stop
pm2 stop librarya-hana
```

---

## 9. Deploying to SAP BTP Cloud Foundry (Full Push)

```bash
cd /home/waheed/Work/Anti-Gravity/Durai/SAP/SAP_Java_Personal_Accounts

# Build production artifacts
npm run build:hana

# Push the app (requires mta.yaml or manifest.yml)
cf push
```

Bind the HANA service to the deployed app:
```bash
cf bind-service <app-name> lulu-db
cf restage <app-name>
```

---

## 10. Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| `No HANA service binding found` | Missing credentials | Re-run `cds bind -2 lulu-db` |
| `HDI deploy failed` | Artifacts not built | Run `npm run build:hana` first |
| `H2 datasource` appears in Java logs | Wrong Spring profile | Add `-Dspring-boot.run.profiles=hana` |
| `401 Unauthorized` on OData | Mock auth in HANA profile | Use real XSUAA token or set up IAS |
| `ECONREFUSED localhost:39013` | HANA port blocked | Use CF-bound VCAP_SERVICES, not direct TCP |
| `connection timeout` | HANA trial instance asleep | Wake instance from BTP cockpit |

---

## Key Reference

| Item | Value |
|---|---|
| CF API Endpoint | `https://api.cf.us10-001.hana.ondemand.com` |
| CF Org | `24ff5b34trial_gladguy` |
| CF Space | `waheed_space` |
| HANA Service | `lulu-db` |
| Service Key | `lulu-key` |
| Node.js HANA Script | `npm run start:hana` |
| Java HANA Profile | `mvn spring-boot:run -Dspring-boot.run.profiles=hana` |
| HDI Deploy | `cd db && npm run start` |
