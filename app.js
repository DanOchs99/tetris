const express = require("express");
const PORT = process.env.PORT || 8080;
const pgp = require("pg-promise")();
const app = express();
const mustacheExpress = require("mustache-express");
const session = require("express-session");
const path = require("path");

app.use(express.static("public"));

// configure view engine
app.engine("mustache", mustacheExpress());
app.set("views", "./views");
app.set("view engine", "mustache");

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/registration", (req, res) => {
  res.render("register");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
