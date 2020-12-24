require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const findOrCreate = require("mongoose-findorcreate");

const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
// const md5 = require("md5");
// const bcrypt = require("bcrypt");

// const saltRounds = 10;

// const encrypt  = require("mongoose-encryption");
// const _ = require("lodash");
const app = express(); 
app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
  secret: "yeetYoteYought",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser:true})
mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set('useCreateIndex', true);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  facebookId: String,
  secret: String
});

// userSchema.plugin(encrypt,{ secret: process.env.SECRET, encryptedFields: ["password"] });
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User",userSchema);

// const testUser = new User({
//   email: "2@2.com" ,
//   password: "123"
// });
// testUser.save();

passport.use(User.createStrategy());
 
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets"
},
function(accessToken, refreshToken, profile, cb) {
  console.log(profile);
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_CLIENT_ID,
  clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/facebook/secrets"
},
function(accessToken, refreshToken, profile, cb) {
  console.log(profile);
  User.findOrCreate({ facebookId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));
// passport.use(new FacebookStrategy({
//   clientID: process.env.FACEBOOK_APP_ID,
//   clientSecret: process.env.FACEBOOK_APP_SECRET,
//   callbackURL: "http://localhost:3000/auth/facebook/secrets"
// },
// function(accessToken, refreshToken, profile, cb) {
//   console.log(profile);
//   // User.findOrCreate({ facebookId: profile.id }, function (err, user) {
//   //   return cb(err, user);
//   // });
// }
// ));

app.get("/",(req,res)=>{
  res.render("home")
});

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"]
 }));

app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
});

app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get("/login",(req,res)=>{
  res.render("login")
});

app.get("/register",(req,res)=>{
  res.render("register")
});

app.get("/secrets",(req,res)=>{
  User.find({"secret":{$ne:null}},"secret",(err,secrets)=>{
    if(err)
      console.log(err);
    else if(secrets){
      // console.log(secrets);
      res.render("secrets",{secrets:secrets});
    }
  });
  // if(req.isAuthenticated()){
  //   res.render("secrets");
  // } else {
  //   res.redirect("/login")
  // }
})

app.get("/logout",(req,res)=>{
  req.logout();
  res.redirect("/")
})

app.get("/submit",(req,res)=>{
  if(req.isAuthenticated()){
    res.render("submit");
  } else {
    res.redirect("/login")
  }
})

app.post("/submit",(req,res)=>{
  const submittedSecret = req.body.secret;
  const uesrID= req.user.id;
  User.findById(uesrID,(err, foundUser)=>{
    if(err){
      console.log(err);
    } if(foundUser){
      foundUser.secret=submittedSecret;
      foundUser.save(()=>{
        res.redirect("/secrets");
      });
    }
  })
})

app.post("/register",(req,res)=>{
  const userEmail=req.body.username;
  const userPassword=req.body.password;
  User.register({username:userEmail},userPassword,(err,user)=>{
    if(err){
      console.log(err);
      res.redirect("/register");
    }
    else{
      passport.authenticate("local")(req,res,()=>{
        res.redirect("/secrets")
      })
    }
  })
});

app.post("/login",(req,res)=>{
  const userEmail=req.body.username;
  const userPassword=req.body.password;
  const user = new User({
    username: userEmail,
    password: userPassword
  });
  req.login(user,(err)=>{
    if(err){
      console.log(err);
    } else {
      passport.authenticate("local")(req,res,()=>{
        res.redirect("/secrets")
      })
    }
  });
  // const userPassword= md5(req.body.password);
});


app.listen(3000, function() {
  console.log("Server started on port 3000");
});
// app.post("/register",(req,res)=>{
//   const userEmail=req.body.username;
//   const userPassword=req.body.password;

//   bcrypt.hash(userPassword, saltRounds, function(err, hash) {
//     const newUser= new User({
//       email: userEmail,
//       password: hash
//     });
    
//     newUser.save(err=>{
//       if(err)
//         console.log(err);
//       else 
//         res.render("secrets")
//     });
//   });
// });

// app.post("/login",(req,res)=>{
//   const userEmail=req.body.username;
//   const userPassword=req.body.password;
//   // const userPassword= md5(req.body.password);
//   User.findOne({email:userEmail},(err, foundUser)=>{
//     if(err)
//       console.log(err);
//     else
//       if(foundUser)
//         bcrypt.compare(userPassword,foundUser.password,(err,result)=>{
//           if(result === true)
//             res.render("secrets");

//         });
//         // if(foundUser.password === userPassword)
//         //   res.render("secrets");
//   });
// });
