const express = require('express');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());


//newly adding 

const path = require('path');

app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// MongoDB Connection Setup
const client = new MongoClient(process.env.MONGO_URI);
let db;

client.connect()
    .then(() => {
        db = client.db("examDB");
        console.log(" Connected to MongoDB");
    })
    .catch(err => {
        console.error("MongoDB Connection Error:", err);
    });

// Middleware: Verify Token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ message: "Access Denied. No token provided." });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: "Invalid or Expired Token" });
        req.user = user;
        next();
    });
};

// --- ROUTES ---

// 1. Register User
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try {
        const existingUser = await db.collection("users").findOne({ 
            $or: [{ username }, { email }] 
        });

        if (existingUser) {
            return res.status(400).json({ message: "Username or Email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const defaultProgress = {
            levelA: { status: "unlocked", score: 0, attempts: 0 },
            levelB: { status: "locked", score: 0, attempts: 0 },
            levelC: { status: "locked", score: 0, attempts: 0 }
        };

        const newUser = {
            username,
            email, 
            password: hashedPassword,
            subjects: {
                "DevOps": { ...defaultProgress },
                "CloudComputing": { ...defaultProgress },
                "MongoDB": { ...defaultProgress }
            },
            createdAt: new Date()
        };

        await db.collection("users").insertOne(newUser);
        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error during registration" });
    }
});

// 2. Login User
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await db.collection("users").findOne({ username });

        if (user && await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET, { expiresIn: '2h' });
            res.json({ token, username: user.username, subjects: user.subjects });
        } else {
            res.status(401).json({ message: "Invalid username or password" });
        }
    } catch (error) {
        res.status(500).json({ message: "Server error during login" });
    }
});
app.get('/user-data', authenticateToken, async (req, res) => {
    try {
        const user = await db.collection("users").findOne({ username: req.user.username });
        if (!user) return res.status(404).json({ message: "User not found" });

        // Include username and email so the profile screen isn't "undefined"
        res.json({ 
            username: user.username, 
            email: user.email, 
            subjects: user.subjects 
        });
    } catch (err) {
        res.status(401).json({ message: "Invalid or expired token" });
    }
});

// 4. Get Questions
app.get('/questions', authenticateToken, async (req, res) => {
    const { subject, level, setNumber } = req.query;
    try {
        const questions = await db.collection("questions").find({ 
            subject, 
            level, 
            setNumber: parseInt(setNumber) 
        }).toArray();
        res.json(questions);
    } catch (error) {
        res.status(500).json({ message: "Error fetching questions" });
    }
});


app.post('/submit-exam', authenticateToken, async (req, res) => {
    const { subject, level, score } = req.body;
    const username = req.user.username;
    const passThreshold = 60;

    try {
       
        const user = await db.collection("users").findOne({ username });
        const currentBest = user.subjects[subject][level].score || 0;

        // Base update: Always increment attempts to trigger Set Rotation
        let update = {
            $inc: { [`subjects.${subject}.${level}.attempts`]: 1 }
        };

        if (score >= passThreshold) {
            // If they passed, update status and save the best score
            update.$set = {
                [`subjects.${subject}.${level}.status`]: "passed",
                [`subjects.${subject}.${level}.score`]: Math.max(score, currentBest)
            };

            // Unlock next levels
            if (level === "levelA") update.$set[`subjects.${subject}.levelB.status`] = "unlocked";
            if (level === "levelB") update.$set[`subjects.${subject}.levelC.status`] = "unlocked";

            await db.collection("users").updateOne({ username }, update);
            res.json({ status: "Passed", score });
        } else {
            // If they failed, just save the score if it's better than before
            update.$set = {
                [`subjects.${subject}.${level}.score`]: Math.max(score, currentBest)
            };
            
            await db.collection("users").updateOne({ username }, update);
            res.json({ status: "Failed", score });
        }
    } catch (error) {
        console.error("Submit Error:", error);
        res.status(500).json({ message: "Error submitting exam" });
    }
});

// Update Profile
app.put('/update-profile', authenticateToken, async (req, res) => {
    const { newUsername, newEmail } = req.body;
    try {
        await db.collection("users").findOneAndUpdate(
            { username: req.user.username },
            { $set: { username: newUsername, email: newEmail } }
        );
        res.json({ message: "Profile updated successfully" });
    } catch (err) {
        res.status(500).json({ error: "Update failed" });
    }
});

// Delete Account
app.delete('/delete-account', authenticateToken, async (req, res) => {
    try {
        await db.collection("users").findOneAndDelete({ username: req.user.username });
        res.json({ message: "Account deleted" });
    } catch (err) {
        res.status(500).json({ error: "Deletion failed" });
    }
});

// Reset Subject Progress
app.post('/reset-subject', authenticateToken, async (req, res) => {
    const { subject } = req.body;
    try {
        const resetData = {
            levelA: { status: 'unlocked', score: 0, attempts: 0 },
            levelB: { status: 'locked', score: 0, attempts: 0 },
            levelC: { status: 'locked', score: 0, attempts: 0 }
        };
        const updateField = `subjects.${subject}`;
        await db.collection("users").findOneAndUpdate(
            { username: req.user.username },
            { $set: { [updateField]: resetData } }
        );
        res.json({ message: `${subject} reset successfully` });
    } catch (err) {
        res.status(500).json({ error: "Reset failed" });
    }
});
// Server Listen
//const PORT = process.env.PORT || 8080;
//app.listen(PORT, () => console.log(` Server Running on Port ${PORT}`));

const PORT = process.env.PORT || 8080;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server Running on Port ${PORT}`);
});