const express = require("express");
const router = express.Router();
const http = require('http').createServer(router)
const io = require('socket.io').listen(http)

const db = require("../db")

router.get("/", (req, res) => {
    let userId = req.session.userId
    let loggedInUsername = req.session.username

    db.any("SELECT username, high_score, high_level, high_score_date FROM users, scores WHERE users.user_id = scores.user_id ORDER BY high_score DESC LIMIT 10;")
    .then(results => {
        //console.log(results);
        const newResults = results.map((r, index) => {
            let hs_date = null;
            if (r.high_score_date) {
                hs_date = r.high_score_date.toLocaleDateString("en-US");
            }
            return {username: r.username, high_score: r.high_score, high_level: r.high_level, high_score_date: hs_date, rankId: ++index};
        });
        //console.log(newResults);
        db.one('SELECT current_score, high_score FROM scores WHERE user_id = $1;', [userId])
        .then(finalResult => {
            //console.log(finalResult)
            res.render("leaderboard", {username: loggedInUsername, userScore: finalResult, scores: newResults})
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

// socket.io repeater
io.on('connection', function (socket) {
    socket.on('chat message', function (msg) {
        io.emit('chat message', msg)
    });
});
  
module.exports = router;
