const express = require("express");
const router = express.Router();

// TODO: the router needs to get db connection from app.js not create its own
const DATABASE_URL = process.env.DATABASE_URL;
const pgp = require("pg-promise")();
pgp.pg.defaults.ssl = true;
const db = pgp(DATABASE_URL);

router.get("/", (req, res) => {
  //update with correct view file
  res.render("game");
});

router.post("/submitScore", (req, res) => {
  const userScore = req.body.recordScore;
  const userId = req.session.userId;

  // get high score for this user
  db.one("SELECT high_score FROM scores WHERE user_id = $1;", [userId]).then(
    score => {
      if (score.high_score < userScore) {
        // update the score, high score, high score date for this game
        db.none(
          "UPDATE scores SET current_score = $1, high_score = $2 WHERE user_id = $3;",
          [userScore, userScore, userId]
        )
          .then(() => {
            res.redirect("/leaderboard");
          })
          .catch(error => {
            console.log(error);
            res.render("landing", {
              message: "An error occurred updating scores"
            });
          });
      } else {
        // save just the current score for this game
        db.none("UPDATE scores SET current_score = $1 WHERE user_id = $2;", [
          userScore,
          userId
        ])
          .then(() => {
            res.redirect("/leaderboard");
          })
          .catch(error => {
            console.log(error);
            res.render("landing", {
              message: "An error occurred updating scores"
            });
          });
      }
    }
  );
});

module.exports = router;
