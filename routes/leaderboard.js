const express = require("express");
const router = express.Router();

const db = require("../db")

router.get("/", (req, res) => {
    let userId = req.session.userId
    db.any("SELECT username, high_score, high_score_date FROM users, scores WHERE users.user_id = scores.user_id ORDER BY high_score DESC LIMIT 10;")
    .then(results => {
        //console.log(results);
        const newResults = results.map((r, index) => {
            return {...r, rankId: ++index};
        });
        //console.log(newResults);
        db.one('SELECT current_score, high_score FROM scores WHERE user_id = $1;', [userId])
        .then(finalResult => {
            //console.log(finalResult)
            res.render("leaderboard", {userScore: finalResult, scores: newResults})
        })
        .catch((error) => {
            console.log(error);
            if (req.session) {
              req.session.destroy();
            }
            res.render("landing", {message: "An error occurred..."})  
        });
    })
    .catch((error) => {
        console.log(error);
        if (req.session) {
          req.session.destroy();
        }
        res.render("landing", {message: "An error occurred..."})  
    });
});

module.exports = router;
