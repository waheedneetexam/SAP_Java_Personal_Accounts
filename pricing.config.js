module.exports = {
  apps: [
    {
      name: "librarya",
      cwd: "/home/user/projects/SAP_Java_Personal_Accounts",
      script: "npx",
      // Force it to look ONLY at the local srv directory, ignoring subfolders
      args: "cds-serve srv --port 4005", 
      interpreter: "none",
      env: {
        PORT: 4005,
        CDS_REQUIRES_DB_KIND: "sqlite"
      }
    },
    {
      name: "pricingapp",
      cwd: "/home/user/projects/SAP_Java_Personal_Accounts/PricingApp",
      script: "npx",
      args: "cds-serve srv --port 4006",
      interpreter: "none",
      env: {
        PORT: 4006,
        CDS_REQUIRES_DB_KIND: "sqlite"
      }
    }
  ]
}