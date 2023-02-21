const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const Register = require('../models/register');

const auth = async (req,res,next) =>{
    try {
        const token = req.cookies.jwt;
        const verifyUser = jwt.verify(token, process.env.SECRET_KEY);
        // console.log("verify :",verifyUser);

        const user = await Register.findOne({_id : verifyUser._id})

        // console.log("user is",user.fname);

        req.token = token;
        req.user = user;

        next();

    } catch (error) {
        // res.status(401).send(error);
        req.flash('message', 'Please log in to view that resource');
        res.redirect('/login');
    }
}

module.exports = auth;