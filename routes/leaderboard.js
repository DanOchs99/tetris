const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  //update with correct view file
  res.render("mustachefile");
});

router.post("/addtoboard", (req, res) => {
  //post route for adding score of completed game to leaderboard table
});

module.exports = router;
