require('dotenv').config()
const express = require('express');
const path = require('path');
const hbs = require('hbs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const auth = require('./middleware/auth')
const session = require('express-session')
const flash = require('connect-flash')
const fs = require('fs')

const app = express();
const port = process.env.PORT || 3000;
require("./db/conn");

const Register = require("./models/register");
const Post = require("./models/createUserPost");

const static_path = path.join(__dirname, "../public");
const template_path = path.join(__dirname, "../templates/views");
const partials_path = path.join(__dirname, "../templates/partials");

app.use(express.urlencoded({ extended: false }));

// cookie middleware
app.use(cookieParser());

// session middleware
app.use(session({
    secret: 'secret',
    saveUninitialized: true,
    resave: true
}));
app.use(flash());

app.use(express.static(static_path))
app.set("view engine", "hbs");
app.set("views", template_path)
hbs.registerPartials(partials_path);

// for custom string compare
hbs.registerHelper('ifEquals', function (a, b, options) {
    if (a == b) {
        return options.fn(this);
    }
    return options.inverse(this);
});

// for empty array
hbs.registerHelper('checklength', function (v1, options) {
    if (v1.length <= 0) {
        return options.fn(this);
    }
    return options.inverse(this);
});


// to restrict character length to display
hbs.registerHelper('dotdotdot', function (str, id) {
    let string_of_html = `<div>Cool</div>`;
    if (str.length > 10)
        return str.substring(0, 10) + '...<a href="/' + id + '">Read More</a>';
    return str;
})

// Storage
const storage = multer.diskStorage({
    destination: 'public/img',
    filename: function (req, file, cb) {
        cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
    },
});
const upload = multer({ storage: storage });

app.use((req, res, next) => {
    res.locals.message = req.flash('message')
    res.locals.passwordError = req.flash('passwordError')
    res.locals.loginError = req.flash('loginError')
    res.locals.postCreated = req.flash('postCreated')
    res.locals.postDeleted = req.flash('postDeleted')
    next();
});

app.get("/index", auth, async (req, res) => {
    try {
        const allData = await Post.find().sort('-date');
        // console.log(allData);
        res.status(201).render('index', { btn1: "", btn2: "Logout", posts: allData });
    } catch (error) {
        res.status(500).send(error);
    }
    // res.render("index", { btn1: "", btn2: "Logout" });
})

app.get("/login", (req, res) => {
    res.render("login", { btn1: "Login", btn2: "Sign Up For Free" });
})

app.get("/register", (req, res) => {
    res.render("register", { btn1: "Login", btn2: "Sign Up For Free" });
})

app.get("/createPost", auth, (req, res) => {
    res.render("post", { btn1: "", btn2: "Logout" });
})

app.get("/logout", auth, async (req, res) => {
    try {
        // console.log(req.user);

        // for single logout
        // req.user.tokens = req.user.tokens.filter((currentElemnt) =>{
        //     return currentElemnt.token != req.token
        // })

        // logout from all devices
        req.user.tokens = []

        res.clearCookie("jwt");
        console.log("log Out successfully");
        await req.user.save();
        res.status(201).redirect("/login")
    } catch (error) {
        res.status(500).send(error);
    }
})



// create a new user in out database
app.post("/register", async (req, res) => {
    try {
        // console.log(req.body.fname);
        const password = req.body.password;
        const repassword = req.body.repassword;

        if (password === repassword) {
            const registerUser = new Register({
                fname: req.body.fname,
                lname: req.body.lname,
                gender: req.body.gender,
                password: req.body.password,
                email: req.body.email
            })

            const token = await registerUser.generateAuthToken();
            // console.log("token part is "+token);

            // cookie(name,value,{[option]})
            res.cookie("jwt", token, {
                expires: new Date(Date.now() + 30000),
                httpOnly: true
            });
            // console.log(cookie);

            const registered = await registerUser.save();
            res.status(201).redirect("/login");
        } else {
            req.flash('passwordError', 'Password are not matching');
            // res.send("Password are not matching")
            res.redirect('/register');
        }
    } catch (error) {
        res.status(400).send(error);
    }
})

app.post("/login", async (req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;

        // console.log(`${email} and password is ${password}`);
        const userEmail = await Register.findOne({ email: email });

        const isMatch = await bcrypt.compare(password, userEmail.password);
        // console.log(isMatch);



        if (isMatch) {
            const token = await userEmail.generateAuthToken();
            // console.log("token part is "+token);

            res.cookie("jwt", token, {
                // expires: new Date(Date.now() + 60000),
                httpOnly: true,
                // secure:true
            });

            // console.log(`${req.cookies.jwt} this the cookie`);

            res.status(201).redirect("/index")
            // res.status(201).render("index");

        } else {
            req.flash('loginError', 'Invalid login details');
            // res.send("Invalid login details")
            res.redirect('/login');

        }
        // console.log(userEmail);
    } catch (error) {
        req.flash('loginError', 'Invalid login details');
        res.redirect('/login');
        // res.status(400).send("Invalid login details");
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


// Create post
app.post("/createPost", auth, upload.single('image'), async (req, res) => {
    try {
        const createUserPost = new Post({
            image: req.file.filename,
            title: req.body.title,
            description: req.body.description,
            username: req.user.fname,
            date: new Date()
        })
        const posted = await createUserPost.save();
        // console.log(posted);
        req.flash('postCreated', 'Post Created Successfully');
        res.status(201).redirect("/createPost");
    } catch (error) {
        res.status(400).send(error);
    }
})





app.get("/latestPost", auth, (req, res) => {
    // console.log(req.date);
    Post.find().sort('-date').exec(function (err, content) {
        res.render('index', {
            btn1: "", btn2: "Logout", posts: content,
        }
        );
    });
})

app.get("/oldPost", auth, (req, res) => {
    // console.log(req.date);
    Post.find().sort('date').exec(function (err, content) {
        res.render('index', {
            btn1: "", btn2: "Logout", posts: content,
        }
        );
    });
})

app.get("/:id", auth, async (req, res) => {
    try {
        const userPost = await Post.findOne({ _id: req.params.id })
        // console.log(userPost != null);
        if (userPost != null) {
            res.status(201).render("viewpost", { btn1: "", btn2: "Logout", user: userPost });
        } else {
            res.status(201).redirect("/index");
        }

    } catch (error) {
        res.status(500).send(error);
    }

})

app.get("/dpost/:id", auth, async (req, res) => {
    try {
        const findPostID = await Post.findOne({ _id: req.params.id })
        fs.unlink(static_path + '/img/' + findPostID.image, (err) => {
            if (err) {
                console.log("failed to delete local image:" + err);
            } else {
                console.log('successfully deleted local image');
            }
        });
        const deletePost = await Post.deleteOne({ _id: req.params.id })

        // console.log(deletePost.deletedCount);
        if (deletePost.deletedCount == 1) {
            req.flash('postDeleted', 'Post Deleted!');
            res.status(201).redirect("/index");
        }
    } catch (error) {
        res.status(500).send(error);
    }
});


app.post("/updatePost/:id", auth, upload.single('image'), async (req, res) => {
    try {
        const findPost = await Post.findOne({ _id: req.params.id })
        // console.log(findPost);
        // console.log("this is"+ req.file);
        if (req.file != undefined){
            fs.unlink(static_path + '/img/' + findPost.image, (err) => {
                if (err) {
                    console.log("failed to delete local image:" + err);
                } else {
                    console.log('successfully deleted local image');
                }
            });
        }
        

        // console.log(req.body);
        // console.log(req.params.id);
        var objForUpdate = {};
        var id = req.params.id;
        // console.log(req.body.image);


        if (req.file != undefined) objForUpdate.image = req.file.filename;
        if (req.body.title) objForUpdate.title = req.body.title;
        if (req.body.description) objForUpdate.description = req.body.description;

        // console.log(objForUpdate);


        const updatedPost = await Post.updateOne({ _id: req.params.id }, { $set: objForUpdate });
        // console.log(updatedPost);
        // req.flash('postCreated', 'Post Created Successfully');
        res.status(201).redirect(`/${id}`);
    } catch (error) {
        res.status(400).send(error);
    }
})

app.listen(port, () => {
    console.log(`server is running at port no ${port}`);
});