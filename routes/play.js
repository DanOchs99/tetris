const express = require("express");
const router = express.Router();

const db = require("../db")

router.get("/", (req, res) => {
    //update with correct view file
    res.render("game");
});

router.post("/submitScore", (req, res) => {
    const userScore = req.body.recordScore
    const userId = req.session.userId

    // get high score for this user
    db.one('SELECT high_score FROM scores WHERE user_id = $1;',[userId])
    .then((score) => {
        if(score.high_score < userScore) {
            // update the score, high score, high score date for this game
            db.none('UPDATE scores SET current_score = $1, high_score = $2 WHERE user_id = $3;', [userScore, score.high_score, userId])
            .then(() => {
                res.redirect('/leaderboard')
            })
            .catch((error) => {
                console.log(error)
                res.render("landing", {message: "An error occurred updating scores" })
            });
        }
        else {
            // save just the current score for this game
            db.none('UPDATE scores SET current_score = $1 WHERE user_id = $2;', [userScore, userId])
            .then(() => {
                res.redirect('/leaderboard')
            })
            .catch((error) => {
                console.log(error)
                res.render("landing", {message: "An error occurred updating scores" })
            });
        }
    })
})

module.exports = router;