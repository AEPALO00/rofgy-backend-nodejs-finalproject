const express = require('express');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'aepalo00^#';

mongoose.set('strictQuery', false);

const uri =  "mongodb://mongodb:27017";
mongoose.connect(uri,{'dbName':'SocialDB'});

const User = mongoose.model('User', { 
    username: String, 
    email: String, 
    password: String });
const Post = mongoose.model('Post', { 
    userId: mongoose.Schema.Types.ObjectId, 
    text: String });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: SECRET_KEY, resave: false, saveUninitialized: true, cookie: { secure: false } }));


// Insert your authenticateJWT Function code here.
function authenticateJWT(req, res, next) {
    const token = req.session.token;

    if (!token) return res.status(401).json({message:"Unauthorized"});

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
}

// Insert your requireAuth Function code here.
function requireAuth(req, res, next) {
    const token = req.session.token;

    if(!token) return res.redirect("/login");

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (error) {
        return res.redirect("/login");
    }
}

// Insert your routing HTML code here.
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/post', requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'public', 'post.html')));
app.get('/index', requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html'), { username: req.user.username }));

// Insert your user registration code here.
app.post("/register", async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });

        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        const newUser = new User({ username, email, password });
        await newUser.save();

        const token = jwt.sign({ userId: newUser._id, username: newUser.username }, SECRET_KEY, { expiresIn: '1h' });
        req.session.token = token;
        //res.send({"message":`The user ${username}has been added`});
        res.redirect(`/index?username=${newUser.username}`);
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Internal Server Error"})
    }
})

// Insert your user login code here.
app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        const existingUser = await User.findOne({ username, password });

        if (!existingUser) return res.status(400).json({ message: 'Invalid Credentials' });

        const token = jwt.sign({ userId: existingUser._id, username: existingUser.username }, SECRET_KEY, { expiresIn: '1h' });
        req.session.token = token;
        res.redirect(`/index?username=${existingUser.username}`);
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Internal Server Error"})
    }
})

// Insert your post creation code here.
app.post("/posts", authenticateJWT, async (req, res) => {
    const { text } = req.body;

    if (!text || typeof text !== "string") return res.status(400).json({message:"Please provide valid post content."});

    const newPost = new User({ userId: req.user.id, text });
    await newPost.save();

    res.status(201).json({message: "Post created successfully!"});
})

// Insert your post updation code here.
app.put('/posts/:postId', authenticateJWT, async (req, res) => {
    const postId = parseInt(req.params.postId);
    const { text } = req.body;
    
    try {
        await Post.updateOne({_id:postId}, {text:text});
        
        res.json({ message: 'Post updated successfully', updatedPost: postId });
    } catch (error) {
        res.status(500).json({message:"Internal Server Error"});
    }  
});

// Insert your post deletion code here.
app.delete('/posts/:postId', authenticateJWT, async (req, res) => {
    const postId = parseInt(req.params.postId);
    const { text } = req.body;
    
    try {
        await Post.deleteOne({_id:postId});
        
        res.json({ message: 'Post deleted successfully', deletedPost: postId });
    } catch (error) {
        res.status(500).json({message:"Internal Server Error"});
    }  
});

// Insert your user logout code here.
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) console.error(err);
      res.redirect('/login');
    });
});

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
