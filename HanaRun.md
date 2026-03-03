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
