const express = require("express");
const path = require("path");
const cjs = require("crypto-js");
const pg = require("pg");
const bodyp = require("body-parser");
const cookieParser = require("cookie-parser");

const port = process.env.PORT || 5000;
const psph = process.env.PASSPHARSE;
const dburl = process.env.DATABASE_URL

var app = express();

const pool = new pg.Pool({
  connectionString: dburl,
  ssl: { rejectUnauthorized: false }
})
 
app
  .use(express.static(path.join(__dirname, 'public')))
  .set("views", path.join(__dirname, "views"))
  .set("view engine", "ejs")
  .use(cookieParser(psph))
  .use(bodyp.urlencoded({ extended: true }))
  .use(bodyp.json())
  .get("/", (req, res) => {
    var name = req.signedCookies.user
    var tugas = req.signedCookies.tugas || []
    res.render("index", { data: name, tugas: tugas });
  })
  .post("/dologin", function(req, res) {
    var username = req.body.username.toLowerCase();
    var password = req.body.password;

    pool.query("select uname, pword from users where uname='"+username+"'", (err, data) => {
    if(err) return err;
    else if(data.rows[0] == null)
      res.send("Incorrect Username and/or Password!");
    else{
      var decrypted = cjs.AES.decrypt(data.rows[0]["pword"], psph).toString(cjs.enc.Utf8);
      if (username && password) {
        if (data.rows[0]["uname"] == username && decrypted == password) {
          res.cookie("user", username, { signed: true });
          res.redirect("/");
        } else {
          res.send("Incorrect Username and/or Password!");
        }
        res.end();
      } else {
        res.send("Please enter Username and Password!");
        res.end();
      }
    }
    })
  })
  .post("/doregister", function(req, res) {
    var username = req.body.username.toLowerCase();
    var name = req.body.name;
    var password = req.body.password
    var encrypt = cjs.AES.encrypt(password, psph);
    var repassword = req.body.repassword;
    if (username && password && repassword) {
      var exist = false
      pool.query("select * from users", (err, data) => {
      for(let dt of data.rows){
        if (dt["uname"] == username) {
          exist = true;
        }
      }
      })
      if(exist == true) res.send("Username has already");
      else if(password == repassword){
        pool.query("insert into users values ('"+username+"','"+name+"','"+encrypt+"')")
        res.cookie("user", username, { signed: true });
        res.redirect("/");
      }else{
        res.send("Password & Re-Password are not the same");
      }
    } else {
      res.send("Please enter Username and Password and Re-Password!");
      res.end();
    }
  })
  .get("/logout", (req,res) => {
    res.clearCookie("user")
    res.redirect("/")
  })
  .get("/login", (req, res) => res.render("login"))
  .get("/register", (req, res) => res.render("register"))

app.listen(port, () => {
  console.log("Listening on "+port)
}, app.settings.env);
