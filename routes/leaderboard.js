const express = require("express");
const router = express.Router();

const DATABASE_URL = process.env.DATABASE_URL;
const pgp = require("pg-promise")();
pgp.pg.defaults.ssl = true;
const db = pgp(DATABASE_URL);

router.get("/", (req, res) => {
  db.any(
    "SELECT username, score FROM users ORDER BY score DESC LIMIT 10;"
  ).then(results => {
    console.log(results);
    res.render("leaderboard", { scores: results });
  });
});

router.post("/addtoboard", (req, res) => {
  //post route for adding score of completed game to leaderboard table
});

function displayUserScore() {}
module.exports = router;
