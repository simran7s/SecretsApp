//jshint esversion:6
require('dotenv').config()
const express = require('express');
const ejs = require('ejs');
const port = 3000;
const mongoose = require("mongoose")
const session = require("express-session")
const passport = require("passport")
// NOTE: passportLocal does not need to be required bc it is a part of passport-local-mongoose
const passportLocalMongoose = require("passport-local-mongoose")
const GoogleStrategy = require('passport-google-oauth20').Strategy
const findOrCreate = require("mongoose-findorcreate")

const app = express();



app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

// MUST be placed b/w app.uses and mongoose.connect
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}))

app.use(passport.initialize())
app.use(passport.session())
// MUST be placed b/w app.uses and mongoose.connect

// Creating Connection to DB
mongoose.connect("mongodb://localhost:27017/userDB")

// Creating User schema (MUST use "new" if using encryption)
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String
})
// NO LONGER NEED THESE
// // SECRET used for encryption
// const secret = process.env.SECRET

// // Adding a encrypt plugin to the userSchema (ONLY password is encrypted)
// userSchema.plugin(encrypt, { secret: secret, encryptedFields: ['password'] });

// required plugin(above User model creation)
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate)

// User Model (Users Collection)
const User = new mongoose.model("User", userSchema)


/* Needed for serializing and deserializing sessions    */
passport.use(User.createStrategy());                   //

// Only work for local auth (so we need to change this)
// passport.serializeUser(User.serializeUser());         //
// passport.deserializeUser(User.deserializeUser());    //

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

// Google Auth
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
},
    // accessToken is sent back to let us access users info from Google for longer period of time
    // profile contains all their information
    function (accessToken, refreshToken, profile, cb) {
        // Check if there is already a user with the same google id on our db
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));


/****************      /    *********************** */
app.get("/", (req, res) => {
    res.render("home")
})


/****************      /secrets    *********************** */
app.get("/secrets", (req, res) => {
    // Check if user is authenticated (allowed to be here)
    if (req.isAuthenticated()) {
        // show them the secrets
        res.render("secrets")
    } else {
        // tell them to login before they can view
        res.redirect("/login")
    }

})

/****************      /login     *********************** */
app.route("/login")
    .get((req, res) => {
        res.render("login")
    })
    .post((req, res) => {
        const user = new User({
            username: req.body.username,
            password: req.body.password
        })
        // Use passport to login user then authenticate them 
        req.login(user, (err) => {
            if (err) {
                console.log(err)
            } else {
                // authenticate user(send a cookie) then redirect them to secrets
                passport.authenticate("local")(req, res, () => {
                    res.redirect("/secrets")
                })
            }
        })

    })

/****************      /auth/google    *********************** */
app.get('/auth/google',
    //brings up google pop up (tells google we want the profile)   
    passport.authenticate('google', { scope: ['profile'] }));


/****************      /auth/google/secrets    *********************** */
// Where google sends up back to after authing from their end
app.get('/auth/google/secrets',
    //if fail to login to google, redirect to login page 
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect secrets.
        res.redirect('/secrets');
    });
/****************      /logout    *********************** */
app.get("/logout", (req, res) => {
    req.logout();
    res.redirect("/")
})


/****************      /register     *********************** */
app.route("/register")
    .get((req, res) => {
        res.render("register")
    })
    .post((req, res) => {

        User.register({ username: req.body.username }, req.body.password, (err, user) => {
            if (err) {
                // if error, log error then redirect user back to register page
                console.log(err)
                res.redirect("/register")
            } else {
                // Perform a local authentication. ONCE authed, then callback fxn is active
                passport.authenticate("local")(req, res, () => {
                    // This means they are authenticated
                    res.redirect("/secrets")
                })
            }
        })

    })


app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});