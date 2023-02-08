const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    fname: {
        type: String,
        required: true
    },
    lname: {
        type: String,
        required: true
    },
    gender: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unqiue: true
    },
    password: {
        type: String,
        required: true
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }]
})
// generating tokens
userSchema.methods.generateAuthToken = async function () {
    try {
        const siteToken = jwt.sign({ _id: this._id.toString() }, process.env.SECRET_KEY);
        console.log(siteToken);
        this.tokens = this.tokens.concat({ token: siteToken })
        await this.save();
        return siteToken;
    } catch (error) {
        resizeBy.send("the error is" + error);
        console.log("the error is" + error);
    }
}

userSchema.pre("save", async function (next) {
    // console.log(this.password);
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10);
        next();
    }

})

// now we need to create a collections

const Register = new mongoose.model("Register", userSchema);

module.exports = Register;