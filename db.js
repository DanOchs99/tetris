require("dotenv").config();
const DATABASE_URL = process.env.DATABASE_URL;
const pgp = require("pg-promise")();
pgp.pg.defaults.ssl = true;
const db = pgp(DATABASE_URL);

module.exports = db;
