const express = require("express");

require("dotenv").config();

const PORT = process.env.PORT || 8080;
const DATABASE_URL = process.env.DATABASE_URL;
console.log(DATABASE_URL);

const pgp = require("pg-promise")();
pgp.pg.defaults.ssl = true;
const app = express();
const mustacheExpress = require("mustache-express");
const session = require("express-session");
const path = require("path");
const db = pgp(DATABASE_URL);

app.use(express.urlencoded({ extended: false }));
//routers
const leaderboardRouter = require("./routes/leaderboard");
app.use("/leaderboard", leaderboardRouter);

const playRouter = require("./routes/play");
app.use("/play", playRouter);

app.use(express.static("public"));

// configure view engine
app.engine("mustache", mustacheExpress());
app.set("views", "./views");
app.set("view engine", "mustache");

//bcrypt
const bcrypt = require("bcrypt");
const SALT_ROUNDS = 10;

app.post("/register", (req, res) => {
  console.log(req.body);
  let username = req.body.username;
  let password = req.body.password;

  bcrypt.hash(password, SALT_ROUNDS).then(hash => {
    db.none("INSERT INTO users(username, password) VALUES($1, $2);", [
      username,
      hash
    ]).then(() => {
      res.redirect("/login");
    });
  });
});

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/registration", (req, res) => {
  res.render("register");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/leaderboard", (req, res) => {
  res.render("leaderboard");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
