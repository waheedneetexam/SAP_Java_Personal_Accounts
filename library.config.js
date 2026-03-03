module.exports = {
  apps: [
    {
      // Local development — uses SQLite (in-memory)
      name: "librarya",
      script: "npm",
      args: "run start:sqlite",
      interpreter: "none",
      env: {
        PORT: 4005,
        NODE_ENV: "development"
      }
    },
    {
      // Production / HANA — requires CF binding in .cdsrc-private.json
      name: "librarya-hana",
      script: "npm",
      args: "run start:hana",
      interpreter: "none",
      env: {
        PORT: 4006,
        NODE_ENV: "production"
      }
    }
  ]
}