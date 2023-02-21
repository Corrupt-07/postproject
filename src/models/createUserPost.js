const mongoose = require('mongoose');


const userPost = new mongoose.Schema({
    image: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    }

})


// now we need to create a collections

const Post = new mongoose.model("Post", userPost);

module.exports = Post;