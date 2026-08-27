// =============================
// LOAD ENVIRONMENT VARIABLES
// =============================
require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");


// =============================
// CREATE EXPRESS APP
// =============================
const app = express();


// =============================
// MIDDLEWARE
// =============================
app.use(cors());
app.use(express.json());

// Serve frontend files
app.use(express.static(__dirname));


// =============================
// CREATE HTTP SERVER
// =============================
const server = http.createServer(app);


// =============================
// SOCKET.IO
// =============================
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});


// =============================
// MYSQL CLOUD CONNECTION
// =============================

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    ssl: {
        rejectUnauthorized: false
    },

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});


// =============================
// TEST MYSQL CONNECTION
// =============================

db.getConnection((err, connection) => {

    if (err) {
        console.error("❌ MySQL connection failed:");
        console.error(err.message);
        return;
    }

    console.log("✅ Cloud MySQL connected!");

    connection.release();
});


// =============================
// SOCKET CONNECTION
// =============================

io.on("connection", (socket) => {

    console.log("Client connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });

});


// =============================
// HOME PAGE
// =============================

app.get("/", (req, res) => {

    res.sendFile(path.join(__dirname, "index.html"));

});


// =============================
// TEST API
// =============================

app.get("/api/test", (req, res) => {

    res.json({
        message: "API is working!",
        database: process.env.DB_NAME
    });

});


// =============================
// GET ALL STUDENTS
// =============================

app.get("/students", (req, res) => {

    const sql = "SELECT * FROM students ORDER BY id";

    db.query(sql, (err, results) => {

        if (err) {

            console.error("SELECT error:", err.message);

            return res.status(500).json({
                error: err.message
            });

        }

        res.json(results);

    });

});


// =============================
// CREATE STUDENT
// =============================

app.post("/students", (req, res) => {

    const { id, name } = req.body;

    if (!id || !name) {

        return res.status(400).json({
            error: "ID and name are required"
        });

    }

    const sql = `
        INSERT INTO students (id, name)
        VALUES (?, ?)
    `;

    db.query(sql, [id, name], (err, result) => {

        if (err) {

            console.error("INSERT error:", err.message);

            return res.status(500).json({
                error: err.message
            });

        }

        console.log("Student inserted:", id, name);


        // Notify connected browsers
        io.emit("studentsChanged", {
            operation: "CREATE",
            id: id,
            name: name
        });


        res.json({
            message: "Student inserted successfully",

            student: {
                id: id,
                name: name
            }
        });

    });

});


// =============================
// UPDATE STUDENT
// =============================

app.put("/students/:id", (req, res) => {

    const id = req.params.id;
    const { name } = req.body;

    if (!name) {

        return res.status(400).json({
            error: "Name is required"
        });

    }

    const sql = `
        UPDATE students
        SET name = ?
        WHERE id = ?
    `;

    db.query(sql, [name, id], (err, result) => {

        if (err) {

            console.error("UPDATE error:", err.message);

            return res.status(500).json({
                error: err.message
            });

        }


        if (result.affectedRows === 0) {

            return res.status(404).json({
                error: "Student not found"
            });

        }


        console.log("Student updated:", id, name);


        // Notify all connected browsers
        io.emit("studentsChanged", {
            operation: "UPDATE",
            id: id,
            name: name
        });


        res.json({
            message: "Student updated successfully"
        });

    });

});


// =============================
// DELETE STUDENT
// =============================

app.delete("/students/:id", (req, res) => {

    const id = req.params.id;

    const sql = `
        DELETE FROM students
        WHERE id = ?
    `;

    db.query(sql, [id], (err, result) => {

        if (err) {

            console.error("DELETE error:", err.message);

            return res.status(500).json({
                error: err.message
            });

        }


        if (result.affectedRows === 0) {

            return res.status(404).json({
                error: "Student not found"
            });

        }


        console.log("Student deleted:", id);


        // Notify all connected browsers
        io.emit("studentsChanged", {
            operation: "DELETE",
            id: id
        });


        res.json({
            message: "Student deleted successfully"
        });

    });

});


// =============================
// START SERVER - LOCAL ONLY
// =============================

if (require.main === module) {

    const PORT = process.env.PORT || 3000;

    server.listen(PORT, () => {

        console.log("=================================");
        console.log("API running at:");
        console.log(`http://localhost:${PORT}`);
        console.log("=================================");

    });

}


// =============================
// EXPORT FOR VERCEL
// =============================

module.exports = app;