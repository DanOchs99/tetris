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

app.locals.chat_connects = [];
app.locals.tetris_connects = [];

const db = require("./db")

app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true
  })
);

app.use(express.static("public"));
app.use('/socket.io', express.static("node_modules/socket.io-client/dist"))

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

    if (username == "guest") {
        // don't allow user "guest" to be created
        req.session.destroy();
        res.render("landing", {message: "Please choose a different user name."});
    }

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

app.get("/guest", (req,res) => {
    // play as guest route
    const username = "guest"
    req.session.userId = -999;
    req.session.username = username;
    req.session.isAuthenticated = true;
    req.session.devmode = false;
    req.session.guestScore = -999;
    res.redirect("/leaderboard");
})

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
              res.redirect("/leaderboard");
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
    socket.on('chat message', function (msg_rcvd) {
        let n = msg_rcvd.indexOf(':');
        let user = msg_rcvd.slice(0,n);
        let msg = msg_rcvd.slice(n+1, msg_rcvd.length)
        if (msg=="USER_JOINED") {
            // this is a join notification - so handle it
            app.locals.chat_connects.push({socket_id: socket.id, username: user});
            io.emit('chat message', `UPDATE_CHAT_CONNECTS:${app.locals.chat_connects.length}`);
        }
        else {
            // this is a chat message - forward to everybody
            io.emit('chat message', msg_rcvd);
        }
    });
    socket.on('tetris', function (msg_rcvd) {
      let n = msg_rcvd.indexOf(':');
      let user = msg_rcvd.slice(0,n);
      let msg = msg_rcvd.slice(n+1, msg_rcvd.length)
      if (msg=="USER_JOINED") {
          // this is a join notification - so handle it
          app.locals.tetris_connects.push({socket_id: socket.id, username: user});
          io.emit('chat message', `UPDATE_TETRIS_CONNECTS:${app.locals.tetris_connects.length}`);
      }
      else if (msg=="ADD_ROW") {
          // this is a multiplayer row send
          socket.broadcast('tetris', "ADD_ROW")
      }
      else {
          // don't know what this is ... do nothing
      }
    });
    socket.on('disconnect', function (msg) {
      // somebody dropped off - need to check both tetris and chat
      // get the user that dropped
      let dropped_user = app.locals.chat_connects.filter(s => s.socket_id == socket.id);
      if (dropped_user.length == 0) {
          dropped_user = app.locals.tetris_connects.filter(s => s.socket_id == socket.id);
          app.locals.tetris_connects = app.locals.tetris_connects.filter(s => s.socket_id != socket.id);
      } else {
          // remove the dropped user from the connects list
          app.locals.chat_connects = app.locals.chat_connects.filter(s => s.socket_id != socket.id);
      }
      // make the disconnect notifications
      io.emit('chat message', `UPDATE_CHAT_CONNECTS:${app.locals.chat_connects.length}`);
      io.emit('chat message', `UPDATE_TETRIS_CONNECTS:${app.locals.tetris_connects.length}`);
      io.emit('chat message', `${dropped_user[0].username}: has left the chat...`)
    });
});

http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
