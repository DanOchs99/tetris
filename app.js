const express = require("express");

require("dotenv").config();

const PORT = process.env.PORT || 8080;
const DATABASE_URL = process.env.DATABASE_URL;

const pgp = require("pg-promise")();
const app = express();
const mustacheExpress = require("mustache-express");
const session = require("express-session");
const path = require("path");

//routers
const leaderboardRouter = require("./routes/leaderboard");
app.use("/leaderboard", leaderboardRouter);
const playRouter = require("./routes/play");
app.use("/play", playRouter);

app.use(express.static("public"));

// configure view engine
app.engine('mustache', mustacheExpress())
app.set('views', './views')
app.set('view engine', 'mustache')

app.get('/',(req,res) => {
    res.render('index')
})

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})
