# HANA Run Notes

## What Was Wrong
- `start:hana` was using only `production` profile, so CAP could not read the Cloud Foundry HANA binding from the `hybrid` profile.
- `@sap/xssec` was missing, which is required when running JWT/XSUAA auth in production profile.

## Fixes Applied
- Updated npm script:
  - `start:hana` -> `cds watch --profile hybrid`
- Added npm script:
  - `start:hana:prod` -> `cds watch --profile production,hybrid`
- Installed dependency:
  - `@sap/xssec`

## Commands
- Bind HANA service key (your current setup):
```bash
cds bind -2 lulu-db:lulu-db-key
```

- Bind XSUAA service key (required only for JWT/production-like run):
```bash
cds bind -2 <xsuaa-instance-name>:<xsuaa-key-name>
```

- Optional: bind both in one command:
```bash
cds bind -2 lulu-db:lulu-db-key <xsuaa-instance-name>:<xsuaa-key-name>
```

- Local HANA run:
```bash
npm run start:hana
```

- Production-like local run (requires XSUAA binding):
```bash
npm run start:hana:prod
```

- HANA build:
```bash
npm run build:hana
```

## Verified
- `npm run start:hana` connects to HANA and starts CAP service.
- `npm run build:hana` completes successfully and generates HANA artifacts.

## Quick Check
- See active bindings:
```bash
cds env get requires --profile production,hybrid
```
