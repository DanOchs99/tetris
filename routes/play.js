const express = require("express");
const router = express.Router();

const db = require("../db")

router.get("/", (req, res) => {
  res.render("game",{devmode: req.session.devmode});
});

router.post("/submitScore", (req, res) => {
  const userScore = req.body.recordScore;
  const userLevel = req.body.recordLevel;
  const userId = req.session.userId;

  // check for guest user
  if (userId == -999) {
    req.session.guestScore = userScore;
    res.redirect("/leaderboard");
  }

  // get high score for this user
  db.one("SELECT high_score FROM scores WHERE user_id = $1;", [userId]).then(
    score => {
      if (score.high_score < userScore) {
        // update the score, high score, high level, high score date for this game
        db.none(
          "UPDATE scores SET current_score = $1, high_score = $2, high_score_date = $3, high_level = $4 WHERE user_id = $5;",
          [userScore, userScore, new Date(), userLevel, userId]
        )
          .then(() => {
            res.redirect("/leaderboard");
          })
          .catch(error => {
            console.log(error);
            if (req.session) {
              req.session.destroy();
            }
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
            if (req.session) {
              req.session.destroy();
            }
            res.render("landing", {
              message: "An error occurred updating scores"
            });
          });
      }
    }
  );
});

module.exports = router;