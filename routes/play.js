const express = require("express");
const router = express.Router();

router.get("/play", (req, res) => {
  //update with correct view file
  res.render("mustachefile");
});




module.exports = router;
