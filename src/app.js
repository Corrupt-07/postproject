require('dotenv').config()
const express = require('express');
const path = require('path');
const hbs = require('hbs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


const app = express();
const port = process.env.PORT || 3000;
require("./db/conn");

const Register = require("./models/register");

const static_path = path.join(__dirname,"../public");
const template_path = path.join(__dirname,"../templates/views");
const partials_path = path.join(__dirname,"../templates/partials");

app.use(express.urlencoded({extended: false}));

app.use(express.static(static_path))
app.set("view engine","hbs");
app.set("views",template_path)
hbs.registerPartials(partials_path);

app.get("/", (req,res) =>{
    res.render("index");
})

app.get("/login", (req,res) =>{
    res.render("login");
})

app.get("/register", (req,res) =>{
    res.render("register");
})

// create a new user in out database
app.post("/register", async (req, res) =>{
    try{
        // console.log(req.body.fname);
        const password = req.body.password;
        const repassword = req.body.repassword;

        if (password === repassword) {
            const registerUser = new Register({
                fname : req.body.fname,
                lname : req.body.lname,
                gender : req.body.gender,
                password : req.body.password,
                email : req.body.email
            })

            const token = await registerUser.generateAuthToken();
            console.log("token part is "+token);
            const registered = await registerUser.save();
            res.status(201).render("index");
        }else{
            res.send("Password are not matching")
        }
    }catch(error){
        res.status(400).send(error);
    }
})

app.post("/login", async(req,res)=>{
    try {
        const email = req.body.email;
        const password = req.body.password;

        // console.log(`${email} and password is ${password}`);
        const userEmail = await Register.findOne({email : email});

        const isMatch = await bcrypt.compare(password, userEmail.password);
        console.log(isMatch);

        const token = await userEmail.generateAuthToken();
        console.log("token part is "+token);


        if (isMatch) {
            res.status(201).render("index");
        }else{
            res.send("Invalid login details")
        }
        // console.log(userEmail);
    } catch (error) {
        res.status(400).send("Invalid login details");
    }
})

// const securePassword = async (password) =>{
//     const passwordHash1 = await bcrypt.hash(password, 10);
//     console.log(passwordHash1);

//     const passwordHash2 = await bcrypt.compare(password, passwordHash1);
//     console.log(passwordHash2);
// }
// securePassword("harsh")

// const createToken = async() =>{
//     const token = await jwt.sign({_id:"12345"}, "mynameisharshverenkar",{
//         expiresIn:"2 seconds"
//     })
//     console.log(token);

//     const userVer = await jwt.verify(token, "mynameisharshverenkar");
//     console.log(userVer);
// }
// createToken();



app.listen(port, () =>{
    console.log(`server is running at port no ${port}`);
});