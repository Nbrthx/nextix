const express = require("express");
const path = require("path");
const cjs = require("crypto-js");
const pg = require("pg");
const bodyp = require("body-parser");
const cookiep = require("cookie-parser");

const port = process.env.PORT || 5000;
const psph = process.env.PASSPHARSE;
const dburl = process.env.DATABASE_URL

var app = express();

const dbc = new pg.Client({
  connectionString: dburl,
  ssl: { rejectUnauthorized: false }
})
 
app.use(express.static(path.join(__dirname, 'public')))
  .set("views", path.join(__dirname, "views"))
  .set("view engine", "ejs")
  .use(cookiep("secret"))
  .use(bodyp.urlencoded({ extended: true }))
  .use(bodyp.json())

app.get("/", (req, res) => {
    var name = req.signedCookies.user
    var tugas = req.signedCookies.tugas || []
    res.render("index", { data: name, tugas: tugas });
  })
  .get("/soal", (req, res) => {
    var id = req.query.id;
    if(id){
      res.render("soal", { data: id });
   }
  })
  .post("/dosoal", function(req, res) {
    var name = req.signedCookies.user
    var data = JSON.parse(
      fs.readFileSync("public/tugas.json", "utf8")
    );
    var data2 = JSON.parse(
      fs.readFileSync("public/data.json", "utf8")
    );
    var id = req.query.id;
    if(id == null){
      res.redirect("/soal")
      return;
    }
    var nilai = [];
    var total = 0;
    for(let x in data[id].es){
      var es = req.body["es"+x]
      if(es == data[id].es[x][1]){
        nilai.push("y")
      }else{
        nilai.push("x")
      }
      total++;
    }
    var skor = nilai.filter(x => x == "y").length;
    
    data2[req.signedCookies.user][1] = skor/total*100;
    fs.writeFileSync("public/data.json", JSON.stringify(data2), "utf8")
    if(req.signedCookies.tugas){
      res.cookie("tugas", req.signedCookies.tugas.push(id), { signed: true })
    }else{
      res.cookie("tugas", [id], { signed: true })
    }
    res.send(skor+"")
  })
  .post("/dologin", function(req, res) {
    var username = req.body.username;
    var password = req.body.password;
    var data = JSON.parse(
      fs.readFileSync("public/data.json", "utf8")
    );

    var encrypted = cjs.AES.encrypt(password, "Secret Passphrase");
    var decrypted = cjs.AES.decrypt(encrypted, "Secret Passphrase");
    if (username && password) {
      if (data[username] != null && data[username][0] == password) {
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
  })
  .post("/doregister", function(req, res) {
    var username = req.body.username;
    var password = req.body.password;
    var repassword = req.body.repassword;
    var datas = dbc.query("select * from users", (err, row) => {
    if (username && password && repassword) {
      for(let data of datas.rows){
        if (data[username] != null) {
          res.send("Username has already");
        } else {
          if(password == repassword){
            data[username] = [password, 0, 0]
            res.cookie("user", username, { signed: true });
            res.redirect("/");
          }else{
            res.send("Password & Re-Password are not the same");
          }
        }
      }
      })
      res.end();
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
