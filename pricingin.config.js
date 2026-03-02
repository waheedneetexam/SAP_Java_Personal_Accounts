module.exports = {
  apps: [
    {
      name: "librarya",
      cwd: "/home/user/projects/SAP_Java_Personal_Accounts",
      script: "./node_modules/.bin/cds-serve",
      args: ["srv", "--port", "4005"],
      interpreter: "none",
      env: {
        PORT: "4005",
        CDS_REQUIRES_DB_KIND: "sqlite",
        CDS_REQUIRES_DB_CREDENTIALS_URL: "db.sqlite"
      }
    },
    {
      name: "pricingapp",
      cwd: "/home/user/projects/SAP_Java_Personal_Accounts/PricingApp",
      script: "./node_modules/.bin/cds-serve",
      args: ["srv", "--port", "4006"],
      interpreter: "none",
      env: {
        PORT: "4006",
        CDS_REQUIRES_DB_KIND: "sqlite",
        CDS_REQUIRES_DB_CREDENTIALS_URL: "db.sqlite"
      }
    }
  ]
};
