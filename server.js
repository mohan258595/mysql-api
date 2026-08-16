const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
    host: "localhost",
    user: "mohan",
    password: "Mohan@388",
    database: "mohan1"
});

db.connect((err) => {
    if (err) {
        console.log("MySQL connection failed:", err.message);
        return;
    }

    console.log("MySQL connected!");
});

// INSERT
app.post("/students", (req, res) => {

    const { id, name } = req.body;

    const sql = "INSERT INTO students (id, name) VALUES (?, ?)";

    db.query(sql, [id, name], (err, result) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json({
            message: "Student inserted successfully"
        });
    });
});

// GET ALL STUDENTS
app.get("/students", (req, res) => {

    const sql = '"SELECT * FROM students where name="mohan"';

    db.query(sql, (err, results) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json(results);
    });
});

app.listen(3000, () => {
    console.log("API running at http://localhost:3000");
});