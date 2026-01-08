const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Database Connection Configuration
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for NeonDB/Railway SSL connections
    }
});

// Test Route to check if API is live
app.get('/', (req, res) => {
    res.send('Game Store API is running...');
});

// 1. SIGNUP API
app.post('/signup', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
    }

    try {
        const result = await pool.query(
            'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
            [username, password]
        );
        res.status(201).json({ 
            message: "User registered successfully", 
            userId: result.rows[0].id 
        });
    } catch (err) {
        console.error(err);
        if (err.code === '23505') { // Unique violation error code
            res.status(400).json({ error: "Username already exists" });
        } else {
            res.status(500).json({ error: "Internal server error" });
        }
    }
});

// 2. LOGIN API
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await pool.query(
            'SELECT id, username FROM users WHERE username = $1 AND password = $2',
            [username, password]
        );

        if (result.rows.length > 0) {
            res.json({ 
                success: true, 
                message: "Login successful", 
                user: result.rows[0] 
            });
        } else {
            res.status(401).json({ success: false, message: "Invalid username or password" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// 3. GET GAMES API
app.get('/games', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM games ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Could not fetch games" });
    }
});

// IMPORTANT: Use process.env.PORT for Railway deployment
const PORT = process.env.PORT || 3000;

// Listen on 0.0.0.0 to allow external connections on Railway
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});