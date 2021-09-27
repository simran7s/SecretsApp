//jshint esversion:6
const express = require('express');
const ejs = require('ejs');
const port = 3000;
const mongoose = require("mongoose")
const encrypt = require('mongoose-encryption');
// Hashing
const bcrypt = require('bcrypt');
const saltRounds = 10;
require('dotenv').config()

const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

// Creating Connection to DB
mongoose.connect("mongodb://localhost:27017/userDB")

// Creating User schema (MUST use "new" if using encryption)
const userSchema = new mongoose.Schema({
    email: String,
    password: String
})

// SECRET used for encryption
const secret = process.env.SECRET

// Adding a encrypt plugin to the userSchema (ONLY password is encrypted)
userSchema.plugin(encrypt, { secret: secret, encryptedFields: ['password'] });

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
        const username = req.body.username
        const password = req.body.password
        // Find if there is a user with that username
        User.findOne({ email: username }, (err, foundUser) => {
            if (err) {
                console.log(err)
            } else {
                if (!foundUser) {
                    res.send("User not found")
                } else {
                    // Compared stored hash+salt with the hashed+salted version of entered password
                    bcrypt.compare(password, foundUser.password, function (err, result) {
                        if (result) {
                            res.render("secrets")
                        } else {
                            res.send("Password Incorrect")
                        }
                    });

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
        bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
            if (err) {
                console.log(err)
            } else {
                // Store hash in your password DB.
                const newUser = new User({
                    email: req.body.username,
                    // hashing the password before storing
                    password: hash
                })
                newUser.save((err) => {
                    if (err) {
                        console.log(err)
                    } else {
                        // if successful registration, then go to secrets page (we dont want a secrets endpoint)
                        res.render("secrets")
                    }
                })
            }

        });

    })


app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});