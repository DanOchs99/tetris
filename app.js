const express = require("express");

require("dotenv").config();

const PORT = process.env.PORT || 8080;
const SESSION_SECRET = process.env.SESSION_SECRET;

const app = express();
const http = require('http').createServer(app)
const io = require('socket.io')(http)
const mustacheExpress = require("mustache-express");
const session = require("express-session");
const path = require("path");

const db = require("./db")

app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true
  })
);

app.use(express.urlencoded({ extended: false }));

app.use(express.static("public"));
app.use('/socket.io', express.static("socket.io"))

function authenticate(req, res, next) {
  if (req.session) {
    if (req.session.isAuthenticated) {
      next();
    } else {
      res.redirect("/");
    }
  } else {
    res.redirect("/");
  }
}

//routers
const leaderboardRouter = require("./routes/leaderboard");
app.use("/leaderboard", authenticate, leaderboardRouter);

const playRouter = require("./routes/play");
app.use("/play", authenticate, playRouter);

// configure view engine
app.engine("mustache", mustacheExpress());
app.set("views", "./views");
app.set("view engine", "mustache");

//bcrypt
const bcrypt = require("bcrypt");
const SALT_ROUNDS = 10;

app.post("/register", (req, res) => {
    let username = req.body.username;
    let password = req.body.password;

    db.any("SELECT user_id, username, password FROM users")
    .then(results => {
        // verify that the username does not exist
        let checkName = results.filter(item => item.name == req.body.username);
        if (checkName.length != 0) {
            req.session.destroy();
            res.render("landing", {message: "Please choose a different user name."});
        } 
        else {
            // hash the password provided
            bcrypt.hash(password, SALT_ROUNDS)
            .then(hash => {
                db.one("INSERT INTO users(username, password) VALUES($1, $2) RETURNING user_id;", [username, hash])
                .then(user => {
                    db.none("INSERT INTO scores(user_id, current_score, high_score, high_score_date) VALUES($1, $2, $3, $4);",[user.user_id, 0, 0, new Date()])
                    .then(() => {res.render("landing", {message: "New user created - please sign in"}); })
                    .catch(error => {
                      console.log(error);
                      if (req.session) {
                        req.session.destroy();
                      }
                      res.render("landing", { message: "An error occurred..." });
                    });
                })
                .catch(error => {
                  console.log(error);
                  if (req.session) {
                    req.session.destroy();
                  }
                  res.render("landing", { message: "An error occurred..." });
                });
            })
            .catch(error => {
              console.log(error);
              if (req.session) {
                req.session.destroy();
              }
              res.render("landing", { message: "An error occurred..." });
            });
        }
    })
    .catch(error => {
        console.log(error);
        if (req.session) {
          req.session.destroy();
        }
        res.render("landing", { message: "An error occurred..." });
    }); 
});

app.get("/", (req, res) => {
  res.render("landing", { message: "" });
});

app.get("/registration", (req, res) => {
  res.render("register");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const devmode = req.body.devmode;

  db.oneOrNone(
    `SELECT user_id, username, password FROM users WHERE username = $1`,
    [username]
  )
    .then(userLoggingIn => {
      if (userLoggingIn) {
        bcrypt
          .compare(password, userLoggingIn.password)
          .then(passwordsMatch => {
            if (passwordsMatch) {
              req.session.userId = userLoggingIn.user_id;
              req.session.username = username;
              req.session.isAuthenticated = true;
              if(devmode) {
                  req.session.devmode = true;
              }
              else
              {
                  req.session.devmode = false;
              }
              res.redirect("/play");
            } else {
              res.render("landing", {
                message:
                  "Credentials invalid, please enter a valid username and password"
              });
            }
          })
          .catch(error => {
            console.log(error);
            if (req.session) {
              req.session.destroy();
            }
            res.render("landing", { message: "An error occurred..." });
          });
      } else {
        res.render("landing", {
          message:
            "Credentials invalid, please enter a valid username and password"
        });
      }
    })
    .catch(error => {
      console.log(error);
      if (req.session) {
        req.session.destroy();
      }
      res.render("landing", { message: "An error occurred..." });
    });
});

// socket.io repeater
io.on('connection', function (socket) {
    socket.on('chat message', function (msg) {
        io.emit('chat message', msg);
    });
});

http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
