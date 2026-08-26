
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();

// =============================
// MIDDLEWARE
// =============================

app.use(cors());
app.use(express.json());

// Serve index.html and other frontend files
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
// MYSQL CONNECTION
// =============================

const db = mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    user: "mohan",
    password: "Mohan@12345",
    database: "mohan1"
});

db.connect((err) => {
    if (err) {
        console.log("MySQL connection failed:", err.message);
        return;
    }

    console.log("MySQL connected!");
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
// GET ALL STUDENTS
// =============================

app.get("/students", (req, res) => {

    const sql = "SELECT * FROM students ORDER BY id";

    db.query(sql, (err, results) => {

        if (err) {
            console.log("SELECT error:", err.message);

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
            console.log("INSERT error:", err.message);

            return res.status(500).json({
                error: err.message
            });
        }

        console.log("Student inserted:", id, name);

        // Notify every connected browser
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
            console.log("UPDATE error:", err.message);

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

        // Notify all browsers
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
            console.log("DELETE error:", err.message);

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

        // Notify all browsers
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
// START SERVER
// =============================

server.listen(3000, () => {

    console.log("=================================");
    console.log("API running at:");
    console.log("http://localhost:3000");
    console.log("=================================");

});

