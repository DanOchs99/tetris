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
  const userScore = req.body.recordScore
  const userId = req.session.userId
  db.none('UPDATE users SET score = $1 WHERE user_id = $2', [userScore, userId])
      .then(() => {
          res.redirect('/leaderboard')
       })
       .catch((error) => {
           console.log(error)
           res.redirect('/')
       })
})

module.exports = router;
