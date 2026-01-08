const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// 1. LOGIN & SIGNUP (Existing code stays here...)

// 2. GET ALL GAMES
app.get('/games', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM games ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. PLACE ORDER (Fixes the "Order Failed" error)
app.post('/orders', async (req, res) => {
    const { username, game_title, price } = req.body;
    try {
        await pool.query(
            'INSERT INTO orders (username, game_title, price) VALUES ($1, $2, $3)',
            [username, game_title, price]
        );
        res.status(201).json({ message: "Order placed!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
});

// 4. GET MY ORDERS (With Image Support)
app.get('/my-orders/:username', async (req, res) => {
    const { username } = req.params;
    try {
        // This SQL JOIN links the order to the game to get the image_url
        const result = await pool.query(
            `SELECT o.id, o.game_title as title, o.price, g.image_url 
             FROM orders o 
             JOIN games g ON o.game_title = g.title 
             WHERE o.username = $1`, 
            [username]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
