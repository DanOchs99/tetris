const express = require("express");

require("dotenv").config();

const PORT = process.env.PORT || 8080;
const DATABASE_URL = process.env.DATABASE_URL;
const SESSION_SECRET = process.env.SESSION_SECRET;
console.log(SESSION_SECRET);

const pgp = require("pg-promise")();
pgp.pg.defaults.ssl = true;
const app = express();
const mustacheExpress = require("mustache-express");
const session = require("express-session");
const path = require("path");
const db = pgp(DATABASE_URL);

/*app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true
  })
);
*/
app.use(express.urlencoded({ extended: false }));

function authenticate() {}
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

app.post("/register", (req, res) => {
  console.log(req.body);
  let username = req.body.username;
  let password = req.body.password;

  db.none("INSERT INTO users(username, password) VALUES($1, $2);", [
    username,
    password
  ]).then(() => {
    res.redirect("/login");
  });
});

app.post("/login", (req, res) => {
  let username = req.body.username;
  let password = req.body.password;
  console.log(username);
  console.log(password);
  db.oneOrNone(
    `SELECT username, password FROM users WHERE username = $1 AND password = $2;`,
    [username, password]
  ).then(singleUser => {
    console.log(singleUser);
    if (singleUser) {
      if (req.session) {
        req.session.isAuthenticated = true;
        res.redirect("/leaderboard");
      } else {
        res.redirect("/login");
      }
    } else {
      res.redirect("/login");
    }
  });
});

app.get("/", (req, res) => {
  res.render("game");
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
