const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Database Connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // CRITICAL: Allows connection to NeonDB
    }
});

// 1. TEST ROUTE
app.get('/', (req, res) => {
    res.send('Game Store API is Online');
});

// 2. SIGNUP API
app.post('/signup', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
            [username, password]
        );
        res.status(201).json({ message: "User created", id: result.rows[0].id });
    } catch (err) {
        console.error("Signup Error:", err.message);
        if (err.code === '23505') {
            res.status(400).json({ error: "Username already exists" });
        } else {
            res.status(500).json({ error: "Database error" });
        }
    }
});

// 3. LOGIN API
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1 AND password = $2',
            [username, password]
        );
        if (result.rows.length > 0) {
            res.json({ message: "Login successful", user: result.rows[0] });
        } else {
            res.status(401).json({ error: "Invalid username or password" });
        }
    } catch (err) {
        console.error("Login Error:", err.message);
        res.status(500).json({ error: "Database error" });
    }
});

// 4. GET ALL GAMES
app.get('/games', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM games ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. PLACE ORDER (Add to Cart)
app.post('/orders', async (req, res) => {
    const { username, game_title, price } = req.body;
    try {
        await pool.query(
            'INSERT INTO orders (username, game_title, price) VALUES ($1, $2, $3)',
            [username, game_title, price]
        );
        res.status(201).json({ message: "Order placed successfully" });
    } catch (err) {
        console.error("Order Error:", err.message);
        res.status(500).json({ error: "Failed to place order" });
    }
});

// 6. GET MY ORDERS (Cart View with Image Support)
app.get('/my-orders/:username', async (req, res) => {
    const { username } = req.params;
    try {
        // This SQL JOIN connects the Order to the Game table to find the image name
        const result = await pool.query(
            `SELECT o.id, o.game_title as title, o.price, g.image_url 
             FROM orders o 
             JOIN games g ON o.game_title = g.title 
             WHERE o.username = $1`, 
            [username]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Fetch Orders Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/empty-cart/:username', async (req, res) => {
    const { username } = req.params;
    try {
        await pool.query('DELETE FROM orders WHERE username = $1', [username]);
        res.json({ message: "Cart emptied successfully" });
    } catch (err) {
        console.error("Empty Cart Error:", err.message);
        res.status(500).json({ error: "Failed to empty cart" });
    }
});

// Server Configuration
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
