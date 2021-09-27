//jshint esversion:6
const express = require('express');
const ejs = require('ejs');
const port = 3000;
const mongoose = require("mongoose")
require('dotenv').config()

const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

// Creating Connection to DB
mongoose.connect("mongodb://localhost:27017/userDB")

// Creating User schema
const userSchema = mongoose.Schema({
    email: String,
    password: String
})

// User Model (Users Collection)
const User = new mongoose.model("User", userSchema)

/****************      /    *********************** */
app.get("/", (req, res) => {
    res.render("home")
})

/****************      /login     *********************** */
app.route("/login")
    .get((req, res) => {
        res.render("login")
    })
    .post((req, res) => {
        // Find if there is a user with that username
        User.findOne({ email: req.body.username }, (err, foundUser) => {
            if (err) {
                console.log(err)
            } else {
                if (!foundUser) {
                    res.send("User not found")
                } else {
                    if (foundUser.password === req.body.password) {
                        res.render("secrets")
                    } else {
                        res.send("Password Incorrect")
                    }
                }
            }
        })
    })

/****************      /register     *********************** */
app.route("/register")
    .get((req, res) => {
        res.render("register")
    })
    .post((req, res) => {
        const newUser = new User({
            email: req.body.username,
            password: req.body.password
        })
        newUser.save((err) => {
            if (err) {
                console.log(err)
            } else {
                // if successful registration, then go to secrets page (we dont want a secrets endpoint)
                res.render("secrets")
            }
        })
    })


app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});