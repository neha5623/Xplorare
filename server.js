const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const app = express();
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/"); // ensure this folder exists
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
});



app.use(
    cors({
        origin: "http://127.0.0.1:5500",
        methods: ["GET", "POST"],
        credentials: true,
    })
);

app.use(bodyParser.json());

const db = mysql.createPool({
    connectionLimit: 10,
    host: "localhost",
    user: "root",
    password: "fp#dfr0ea8X",
    database: "xplorare",
});

db.getConnection((err) => {
    if (err) {
        console.error("Database connection failed:", err);
    } else {
        console.log("Connected to MySQL database");
    }
});

const SECRET_KEY = "your_secret_key";

// ✅ Input Validation Function
function validateInput(firstName, lastName, email, password) {
    const nameRegex = /^[A-Za-z]+$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^.{8,}$/;

    if (!nameRegex.test(firstName) || !nameRegex.test(lastName)) {
        return "Name cannot contain special characters or numbers.";
    }
    if (!emailRegex.test(email)) {
        return "Invalid email format.";
    }
    if (!passwordRegex.test(password)) {
        return "Password must be at least 8 characters long.";
    }
    return null;
}

// ✅ Signup Route
app.post("/signup", upload.single("profilePic"), (req, res) => {
    const { firstName, lastName, email, password, gender, dob } = req.body;
    const profilePic = req.file ? req.file.filename : null;

    const validationError = validateInput(firstName, lastName, email, password);
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    db.query("SELECT email FROM users WHERE email = ?", [email], (err, results) => {
        if (err) return res.status(500).json({ error: "Database error", details: err.message });
        if (results.length > 0) return res.status(400).json({ error: "Email already exists!" });

        bcrypt.hash(password, 10, (err, hash) => {
            if (err) return res.status(500).json({ error: "Hashing error" });

            const sql = `
                INSERT INTO users (first_name, last_name, email, password, gender, dob, profile_pic)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            db.query(sql, [firstName, lastName, email, hash, gender, dob, profilePic], (err, result) => {
                if (err) return res.status(500).json({ error: "Database error", details: err.message });

                res.status(201).json({ message: "User registered successfully!" });
            });
        });
    });
});


// ✅ Login Route (with Email & Password Validation)
app.post("/login", (req, res) => {
    const { email, password } = req.body;

    // ✅ Validate Email and Password
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^.{8,}$/;

    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format." });
    }
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ error: "Password must be at least 8 characters long." });
    }

    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
        if (err) {
            return res.status(500).json({ message: "Database error" });
        }
        if (results.length === 0) {
            return res.status(401).json({ message: "User not found" });
        }

        const user = results[0];

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Incorrect password" });
        }

        const token = jwt.sign({ userId: user.id, email: user.email }, SECRET_KEY, { expiresIn: "1h" });

        res.json({ message: "Login successful", token });
    });
});
// Add this function to server.js after the login route
function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "No token provided" });
    }
    
    const token = authHeader.split(' ')[1];
    
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: "Invalid token" });
      }
      
      req.user = decoded;
      next();
    });
  }
  app.get("/profile", verifyToken, (req, res) => {
    const userId = req.user.userId;

    db.query(
        "SELECT first_name, last_name, email, gender, dob, created_at, profile_pic FROM users WHERE id = ?",
        [userId],
        (err, results) => {
            if (err) {
                return res.status(500).json({ error: "Database error", details: err.message });
            }
            if (results.length === 0) {
                return res.status(404).json({ error: "User not found." });
            }

            res.json(results[0]); // Send user profile data including profile_pic
        }
    );
});



app.listen(5000, () => {
    console.log("Server running on port 5000");
});
