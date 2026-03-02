const cds = require("@sap/cds");
const registerApiCompat = require("./api-compat");

cds.on("bootstrap", (app) => {
  registerApiCompat(app);
});

module.exports = cds.server;
