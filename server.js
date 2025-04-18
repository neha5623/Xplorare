const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const app = express();
const nodemailer = require("nodemailer");


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "neha.naseer610@gmail.com",       // replace with your email
    pass:"nnvmmbardxtucsuf "
  },
});

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
      methods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
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
        "SELECT first_name, last_name, email, gender, dob, created_at, profile_pic ,userphone FROM users WHERE id = ?",
        [userId],
        (err, results) => {
            if (err) {
                return res.status(500).json({ error: "Database error", details: err.message });
            }
            if (results.length === 0) {
                return res.status(404).json({ error: "User not found." });
            }

            res.json(results[0]); // Send user profile data including profile_pic
            console.log(results[0]);


        }
    );
});
// delete account 
app.delete("/delete-account", verifyToken, async (req, res) => {
    const { password } = req.body;
    const userId = req.user.userId;
    console.log(userId);
    const dbPromise = db.promise();

    try {
        const [rows] = await dbPromise.query("SELECT password FROM users WHERE id = ?", [userId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: "User not found." });
        }

        const match = await bcrypt.compare(password, rows[0].password);
        if (!match) {
            return res.status(403).json({ error: "Incorrect password." });
        }

        await dbPromise.query("DELETE FROM users WHERE id = ?", [userId]);
        res.json({ message: "Account deleted successfully." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error." });
    }
});
//update-profile
app.put("/update-profile", verifyToken, upload.single("profile_pic"), async (req, res) => {
    const userId = req.user.userId;
    const { first_name, last_name, password ,userphone} = req.body;
    const profile_pic = req.file ? req.file.filename : null;

    try {
        const updateFields = [];
        const updateValues = [];

        if (first_name) {
            updateFields.push("first_name = ?");
            updateValues.push(first_name);
        }

        if (last_name) {
            updateFields.push("last_name = ?");
            updateValues.push(last_name);
        }

        if (profile_pic) {
            updateFields.push("profile_pic = ?");
            updateValues.push(profile_pic);
        }
        if (userphone) {
            updateFields.push("userphone = ?");
            updateValues.push(userphone);
        }
        if (password) {
            const passwordRegex = /^.{8,}$/;
            if (!passwordRegex.test(password)) {
                console.log("Password too short:", password);
                return res.status(400).json({ error: "Password must be at least 8 characters long." });
            }
        
            const hashedPassword = await bcrypt.hash(password, 10);
            updateFields.push("password = ?");
            updateValues.push(hashedPassword);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: "No fields to update." });
        }

        updateValues.push(userId); // For WHERE clause
        const sql = `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`;

        db.query(sql, updateValues, (err, result) => {
            if (err) {
                console.error("Update error:", err);
                return res.status(500).json({ error: "Database update failed." });
            }
            res.json({ message: "Profile updated successfully!" });
        });
    } catch (error) {
        console.error("Error in update-profile:", error);
        res.status(500).json({ error: "Server error during profile update." });
    }
});
app.post("/emergency", verifyToken, (req, res) => {
    const userId = req.user.userId;
    const { name, phone, relationship } = req.body;
  
    if (!name || !phone || !relationship) {
      return res.status(400).json({ error: "All fields are required." });
    }
  
    // Validate userphone before proceeding
    db.query("SELECT userphone FROM users WHERE id = ?", [userId], (err, results) => {
      if (err) return res.status(500).json({ error: "Database error." });
      
      if (!results[0] || !results[0].userphone) {
        return res.status(400).json({ error: "Please update your profile with a valid phone number first." });
      }
  
      // Proceed to insert
      const sql = `INSERT INTO emergency (user_id, name, phone, relationship) VALUES (?, ?, ?, ?)`;
      db.query(sql, [userId, name, phone, relationship], (err, result) => {
        if (err) return res.status(500).json({ error: "Database error", details: err.message });
        res.status(201).json({ message: "Emergency contact added!" });
      });
    });
  });
  

app.get("/emergency", verifyToken, (req, res) => {
    const userId = req.user.userId;

    db.query("SELECT id, name, phone, relationship FROM emergency WHERE user_id = ?", [userId], (err, results) => {
        if (err) return res.status(500).json({ error: "Database error", details: err.message });
        res.json(results);
    });
});
app.delete("/emergency/:id", verifyToken, (req, res) => {
    const contactId = req.params.id;
    const userId = req.user.userId;

    const sql = `DELETE FROM emergency WHERE id = ? AND user_id = ?`;
    db.query(sql, [contactId, userId], (err, result) => {
        if (err) return res.status(500).json({ error: "Database error", details: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: "Contact not found" });
        res.json({ message: "Emergency contact deleted." });
    });
});
//OTP-SEND
app.post("/send-otp", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required." });
  
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60000); // expires in 10 mins
  
    // Save OTP to DB
    db.query("INSERT INTO password_resets (email, otp, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE otp = ?, expires_at = ?",
      [email, otp, expiresAt, otp, expiresAt],
      (err) => {
        if (err) return res.status(500).json({ error: "Database error." });
  
        // Send email
        const mailOptions = {
          from: "youremail@gmail.com",
          to: email,
          subject: "Xplorare Password Reset OTP",
          text: `Your OTP for resetting password is: ${otp}. It is valid for 10 minutes.`,
        };
  
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error(error);
            return res.status(500).json({ error: "Failed to send OTP." });
          }
          res.json({ message: "OTP sent to email." });
        });
      }
    );
  });
  
//OTP-VERIFY
app.post("/verify-otp", (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and OTP required." });
  
    db.query(
      "SELECT * FROM password_resets WHERE email = ? AND otp = ?",
      [email, otp],
      (err, results) => {
        if (err) return res.status(500).json({ error: "Database error." });
        if (results.length === 0) return res.status(400).json({ error: "Invalid OTP." });
  
        const expiresAt = new Date(results[0].expires_at);
        if (new Date() > expiresAt) {
          return res.status(400).json({ error: "OTP expired." });
        }
  
        res.json({ message: "OTP verified successfully." });
      }
    );
  });
//reset
app.post("/reset-password", async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: "Missing data." });
    }
  
    // Validate OTP first
    db.query("SELECT * FROM password_resets WHERE email = ? AND otp = ?", [email, otp], async (err, results) => {
      if (err) return res.status(500).json({ error: "Database error." });
      if (results.length === 0) return res.status(400).json({ error: "Invalid OTP." });
  
      const expiresAt = new Date(results[0].expires_at);
      if (new Date() > expiresAt) {
        return res.status(400).json({ error: "OTP expired." });
      }
  
      const hashedPassword = await bcrypt.hash(newPassword, 10);
  
      db.query("UPDATE users SET password = ? WHERE email = ?", [hashedPassword, email], (err) => {
        if (err) return res.status(500).json({ error: "Failed to update password." });
  
        db.query("DELETE FROM password_resets WHERE email = ?", [email]); // cleanup
        res.json({ message: "Password reset successful!" });
      });
    });
  });
  
  app.post("/emailcheck", (req, res) => {
    const { email } = req.body;
    db.query("SELECT id FROM users WHERE email = ?", [email], (err, results) => {
      if (err) {
        return res.status(500).json({ error: "Database error" });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: "Email not registered." });
      }
      return res.json({ message: "Email is registered." });
    });
  });
//feebdack  
  app.post("/feedback", verifyToken, (req, res) => {
    const { message } = req.body;
    const userId = req.user.userId;

  
    if (!message || !userId) {
        return res.status(400).json({ error: "Message and user required." });
      }
    
      const sql = "INSERT INTO feedback (user_id, message) VALUES (?, ?)";
      db.query(sql, [userId, message], (err, result) => {
        if (err) {
          console.error("DB error:", err);
          return res.status(500).json({ error: "Database error." });
        }
        res.status(200).json({ message: "Feedback received. Thank you!" });
      });
    });
  
app.listen(5000, () => {
    console.log("Server running on port 5000");
});
