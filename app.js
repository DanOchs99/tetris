const express = require("express");

require("dotenv").config();

const PORT = process.env.PORT || 8080;
const DATABASE_URL = process.env.DATABASE_URL;
const SESSION_SECRET = process.env.SESSION_SECRET;

const pgp = require("pg-promise")();
pgp.pg.defaults.ssl = true;
const app = express();
const mustacheExpress = require("mustache-express");
const session = require("express-session");
const path = require("path");
const db = pgp(DATABASE_URL);

app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true
  })
);

app.use(express.urlencoded({ extended: false }));

function authenticate(req,res,next) {
  if(req.session) {
      if(req.session.isAuthenticated) {
          next()
      } else {
          res.redirect('/')
      }
  } else {
      res.redirect('/')
  }
}

//routers
const leaderboardRouter = require("./routes/leaderboard");
app.use("/leaderboard", authenticate, leaderboardRouter);

const playRouter = require("./routes/play");
app.use("/play", authenticate, playRouter);

app.use(express.static("public"));

// configure view engine
app.engine("mustache", mustacheExpress());
app.set("views", "./views");
app.set("view engine", "mustache");

//bcrypt
const bcrypt = require("bcrypt");
const SALT_ROUNDS = 10;

// TODO - add catch blocks in this function
app.post("/register", (req, res) => {
    let username = req.body.username;
    let password = req.body.password;

    db.any('SELECT user_id, username, password FROM users')
    .then((results) => {
        // verify that the username exists
        let checkName =  results.filter(item => item.name==req.body.username)
        if (checkName.length != 1) {
            req.session.destroy()
            res.redirect('/')
        }
        else {
        // check the password provided
            bcrypt.hash(password, SALT_ROUNDS).then(hash => {
                db.none("INSERT INTO users(username, password) VALUES($1, $2);", [
                    username,
                    hash])
                .then(() => {
                    res.redirect("/login");
                });
            });
        }
    });
});

app.get("/", (req, res) => {
  res.render("landing", {message: ""});
});

app.get("/registration", (req, res) => {
  res.render("register");
});

app.get("/login", (req, res) => {
  res.render("login");
});

// TODO - add catch block in this function
app.post("/login", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  db.oneOrNone(`SELECT user_id, username, password FROM users WHERE username = $1`, [
    username
  ]).then(userLoggingIn => {
    if (userLoggingIn) {
      bcrypt.compare(password, userLoggingIn.password).then(passwordsMatch => {
        if (passwordsMatch) {
          req.session.userId = userLoggingIn.user_id
          req.session.isAuthenticated = true;
          res.redirect("/play");
        } else {
          res.render("landing", {
            message:
              "Credentials invalid, please enter a valid username and password"
          });
        }
      });
    } else {
      res.render("landing", {
        message:
          "Credentials invalid, please enter a valid username and password"
      });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
