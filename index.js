'use strict';
const tessel = require('tessel')
const expressJWT = require('express-jwt')
const jwt = require("jsonwebtoken")
const secret = require(__dirname + "/secret.js");
const fs = require('fs')

const ip = require('ip')
const address = ip.address() // my ip address

const express = require('express')
const app = express()
const cors = require('cors')

app.use(express.static(__dirname + '/front'));
app.use(express.json({ limit: "1mb" }));
app.use(cors());

let data = {
  users: []
}
const homeDir = require('os').homedir()
const save = () => fs.writeFileSync(homeDir + '/data.json', JSON.stringify(data))
const load = () => {
  try {
    data = JSON.parse(fs.readFileSync(homeDir + '/data.json'))
  }
  catch (err) { }
}

load();

const getToken = user => jwt.sign({ account: user.account, password: user.password }, secret, { expiresIn: "365d" });

app.post("/auth", (req, res) => {
  const { account, password } = req.body;

  if (!account || !password) {
    res.status(400).end()
    return
  }

  const user = data.users.find(u => u.account === account && u.password === password);

  if (!user) {
    res.status(404).end()
    return
  }

  res.send({
    token: getToken(user),
    ...user
  })
})

app.post("/user", (req, res) => {
  const user = data.users.find(u => u.account === req.body.account)

  if (user) {
    res.status(403).end()
    return res.status(403)
  }

  data.users.push(req.body)
  save()
  res.send(getToken(req.body))
})

app.get("/user", (req, res) => {
  if (!req.headers || !req.headers.authorization) {
    res.status(400).end()
    return
  }

  const token = req.headers.authorization.split(" ")[1];
  const decoded = jwt.verify(token, secret);

  if (!decoded) {
    res.status(406).end()
    return
  }

  const user = data.users.find(u => u.account === decoded.account && u.password === decoded.password);

  if (!user) {
    res.status(404).end()
    return
  }

  res.send({ ...user, password: undefined })
})

app.put("/user", (req, res) => {
  if (!req.headers || !req.headers.authorization) {
    res.status(400).end()
    return
  }

  const token = req.headers.authorization.split(" ")[1];
  const decoded = jwt.verify(token, secret);

  if (!decoded) {
    res.status(406).end()
    return
  }

  const user = data.users.find(u => u.account === decoded.account && u.password === decoded.password);

  if (!user) {
    res.status(404).end()
    return
  }

  Object.assign(user, req.body);
  save();

  res.end();
})


app.get('/open', (req, res) => {
  tessel.led[2].on()
  res.send("toggle open");
})
app.get('/close', (req, res) => {
  tessel.led[2].off()
  res.send("light close");
})
app.listen(3000, function () {
  console.log(`Example app listening on ${address} at port 3000!`)
});