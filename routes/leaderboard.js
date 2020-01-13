const express = require("express");
const router = express.Router();

const db = require("../db")

router.get("/", (req, res) => {
  db.any(
    "SELECT username, high_score FROM users, scores WHERE users.user_id = scores.user_id ORDER BY high_score DESC LIMIT 10;"
  ).then(results => {
    console.log(results);
    results = results.map((r, index) => {
      return {
        ...r,
        rankId: ++index
      };
    });
    console.log(results);
    res.render("leaderboard", {
      scores: results
    });
  });
});

router.post("/addtoboard", (req, res) => {
  //post route for adding score of completed game to leaderboard table
});

module.exports = router;