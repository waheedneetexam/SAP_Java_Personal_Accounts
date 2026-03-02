module.exports = {
  apps : [{
    name: "librarya",
    script: "npm",
    args: "start",
    // ADD THIS LINE:
    interpreter: "none", 
    env: {
      PORT: 4005,
      CDS_REQUIRES_DB_KIND: "sqlite"
    }
  }]
}