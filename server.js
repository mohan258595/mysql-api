// ============================================================
// LOAD ENVIRONMENT VARIABLES
// ============================================================

require("dotenv").config();


// ============================================================
// IMPORT MODULES
// ============================================================

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");


// ============================================================
// CREATE EXPRESS APP
// ============================================================

const app = express();


// ============================================================
// CREATE HTTP SERVER
// ============================================================

const server = http.createServer(app);


// ============================================================
// CREATE SOCKET.IO SERVER
// ============================================================

const io = new Server(server, {

    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }

});


// ============================================================
// MIDDLEWARE
// ============================================================

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));


// ============================================================
// SERVE FRONTEND
// ============================================================

app.use(express.static(__dirname));


// ============================================================
// REQUEST LOGGER
// ============================================================

app.use((req, res, next) => {

    const time = new Date().toLocaleString();

    console.log("=================================");
    console.log(`[${time}] ${req.method} ${req.originalUrl}`);

    next();

});


// ============================================================
// MYSQL CLOUD CONNECTION
// ============================================================

const db = mysql.createPool({

    host: process.env.DB_HOST,

    port: Number(process.env.DB_PORT || 3306),

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


// ============================================================
// SOCKET LOGGER HELPER
// ============================================================

function socketLog(message, type = "info") {

    console.log(message);

    io.emit("terminal-log", {

        message,
        type,
        time: new Date().toLocaleTimeString()

    });

}


// ============================================================
// TEST MYSQL CONNECTION
// ============================================================

db.getConnection((err, connection) => {

    if (err) {

        console.error("=================================");
        console.error("❌ MySQL connection failed");
        console.error(err.message);
        console.error("=================================");

        socketLog(
            `MYSQL CONNECTION FAILED - ${err.message}`,
            "error"
        );

        return;

    }

    console.log("=================================");
    console.log("✅ Cloud MySQL connected!");
    console.log(`Host: ${process.env.DB_HOST}`);
    console.log(`Database: ${process.env.DB_NAME}`);
    console.log("=================================");

    socketLog(
        `MYSQL CONNECTED - Database: ${process.env.DB_NAME}`,
        "success"
    );

    connection.release();

});


// ============================================================
// SOCKET.IO CONNECTION
// ============================================================

io.on("connection", (socket) => {

    console.log("=================================");
    console.log("🔌 Socket.IO client connected");
    console.log(`Socket ID: ${socket.id}`);
    console.log("=================================");


    socket.emit("terminal-log", {

        message: `Socket.IO connected - ${socket.id}`,

        type: "success",

        time: new Date().toLocaleTimeString()

    });


    socket.on("disconnect", () => {

        console.log(
            `🔌 Socket disconnected - ${socket.id}`
        );

    });

});


// ============================================================
// HOME PAGE
// ============================================================

app.get("/", (req, res) => {

    console.log("🏠 Home page requested");

    res.sendFile(
        path.join(__dirname, "index.html")
    );

});


// ============================================================
// API TEST
// ============================================================

app.get("/api/test", (req, res) => {

    console.log("🧪 API test requested");

    res.json({

        message: "API is working!",

        database: process.env.DB_NAME,

        socket: "Socket.IO enabled"

    });

});


// ============================================================
// DATABASE STATUS
// ============================================================

app.get("/api/db-status", (req, res) => {

    db.query("SELECT 1 AS connected", (err, results) => {

        if (err) {

            return res.status(500).json({

                connected: false,

                error: err.message

            });

        }

        res.json({

            connected: true,

            database: process.env.DB_NAME,

            host: process.env.DB_HOST

        });

    });

});


// ============================================================
// GET ALL STUDENTS
// ============================================================

app.get("/students", (req, res) => {

    const startTime = Date.now();

    socketLog(
        "GET /students",
        "info"
    );


    const sql = `
        SELECT *
        FROM students
        ORDER BY id
    `;


    db.query(sql, (err, results) => {

        const time = new Date().toLocaleString();


        if (err) {

            console.error(
                `[${time}] ❌ READ FAILED`
            );

            console.error(
                "Error:",
                err.message
            );

            socketLog(
                `READ FAILED - ${err.message}`,
                "error"
            );

            return res.status(500).json({

                error: err.message

            });

        }


        console.log(
            `[${time}] ✅ READ SUCCESS`
        );

        console.log(
            `Students returned: ${results.length}`
        );

        console.log(
            `Query time: ${Date.now() - startTime} ms`
        );


        socketLog(
            `READ SUCCESS - ${results.length} students`,
            "success"
        );


        res.json(results);

    });

});


// ============================================================
// CREATE STUDENT
// ============================================================

app.post("/students", (req, res) => {

    const { id, name } = req.body;


    socketLog(
        `CREATE - ID: ${id}, Name: ${name}`,
        "info"
    );


    if (!id || !name) {

        socketLog(
            "CREATE FAILED - ID and name required",
            "error"
        );

        return res.status(400).json({

            error: "ID and name are required"

        });

    }


    const sql = `
        INSERT INTO students (id, name)
        VALUES (?, ?)
    `;


    db.query(
        sql,
        [id, name],
        (err, result) => {

            const time =
                new Date().toLocaleString();


            if (err) {

                console.error(
                    `[${time}] ❌ CREATE FAILED`
                );

                console.error(
                    err.message
                );


                socketLog(
                    `CREATE FAILED - ${err.message}`,
                    "error"
                );


                return res.status(500).json({

                    error: err.message

                });

            }


            console.log(
                `[${time}] ✅ CREATE SUCCESS`
            );


            socketLog(
                `CREATE SUCCESS - Student ${id}`,
                "success"
            );


            // Send real-time event
            io.emit("student-created", {

                id: id,

                name: name

            });


            res.json({

                message:
                    "Student inserted successfully",

                student: {

                    id: id,

                    name: name

                }

            });

        }
    );

});


// ============================================================
// UPDATE STUDENT
// ============================================================

app.put("/students/:id", (req, res) => {

    const id = req.params.id;

    const { name } = req.body;


    socketLog(
        `UPDATE - ID: ${id}, Name: ${name}`,
        "info"
    );


    if (!name) {

        socketLog(
            "UPDATE FAILED - Name required",
            "error"
        );

        return res.status(400).json({

            error: "Name is required"

        });

    }


    const sql = `
        UPDATE students
        SET name = ?
        WHERE id = ?
    `;


    db.query(
        sql,
        [name, id],
        (err, result) => {

            const time =
                new Date().toLocaleString();


            if (err) {

                socketLog(
                    `UPDATE FAILED - ${err.message}`,
                    "error"
                );

                return res.status(500).json({

                    error: err.message

                });

            }


            if (result.affectedRows === 0) {

                socketLog(
                    `UPDATE FAILED - Student ${id} not found`,
                    "warning"
                );

                return res.status(404).json({

                    error: "Student not found"

                });

            }


            socketLog(
                `UPDATE SUCCESS - Student ${id}`,
                "success"
            );


            // Real-time update
            io.emit("student-updated", {

                id: id,

                name: name

            });


            res.json({

                message:
                    "Student updated successfully"

            });

        }
    );

});


// ============================================================
// DELETE STUDENT
// ============================================================

app.delete("/students/:id", (req, res) => {

    const id = req.params.id;


    socketLog(
        `DELETE - Student ID: ${id}`,
        "info"
    );


    const sql = `
        DELETE FROM students
        WHERE id = ?
    `;


    db.query(
        sql,
        [id],
        (err, result) => {

            const time =
                new Date().toLocaleString();


            if (err) {

                socketLog(
                    `DELETE FAILED - ${err.message}`,
                    "error"
                );

                return res.status(500).json({

                    error: err.message

                });

            }


            if (result.affectedRows === 0) {

                socketLog(
                    `DELETE FAILED - Student ${id} not found`,
                    "warning"
                );

                return res.status(404).json({

                    error: "Student not found"

                });

            }


            socketLog(
                `DELETE SUCCESS - Student ${id}`,
                "success"
            );


            // Real-time update
            io.emit("student-deleted", {

                id: id

            });


            res.json({

                message:
                    "Student deleted successfully"

            });

        }
    );

});


// ============================================================
// SQL TERMINAL
// ============================================================

app.post("/api/sql", (req, res) => {

    const startTime = Date.now();

    const { query, adminKey } = req.body;


    // --------------------------------------------------------
    // ADMIN KEY CHECK
    // --------------------------------------------------------

    if (
        process.env.SQL_ADMIN_KEY &&
        adminKey !== process.env.SQL_ADMIN_KEY
    ) {

        socketLog(
            "SQL TERMINAL ACCESS DENIED",
            "error"
        );

        return res.status(403).json({

            error: "Invalid SQL terminal key"

        });

    }


    // --------------------------------------------------------
    // VALIDATE QUERY
    // --------------------------------------------------------

    if (
        !query ||
        typeof query !== "string" ||
        !query.trim()
    ) {

        return res.status(400).json({

            error: "SQL query is required"

        });

    }


    const cleanQuery = query.trim();


    // --------------------------------------------------------
    // LOG QUERY
    // --------------------------------------------------------

    socketLog(
        `SQL> ${cleanQuery}`,
        "info"
    );


    console.log("=================================");
    console.log("SQL TERMINAL QUERY");
    console.log(cleanQuery);
    console.log("=================================");


    // --------------------------------------------------------
    // EXECUTE QUERY
    // --------------------------------------------------------

    db.query(
        cleanQuery,
        (err, results, fields) => {

            const executionTime =
                Date.now() - startTime;


            // ------------------------------------------------
            // SQL ERROR
            // ------------------------------------------------

            if (err) {

                console.error(
                    "❌ SQL ERROR:",
                    err.message
                );


                socketLog(
                    `SQL ERROR - ${err.message}`,
                    "error"
                );


                return res.status(400).json({

                    success: false,

                    error: err.message,

                    query: cleanQuery,

                    executionTime

                });

            }


            // ------------------------------------------------
            // SQL SUCCESS
            // ------------------------------------------------

            socketLog(
                `SQL SUCCESS - ${executionTime} ms`,
                "success"
            );


            let rows = [];

            let resultType = "unknown";


            // SELECT / SHOW / DESCRIBE
            if (Array.isArray(results)) {

                rows = results;

                resultType = "rows";

            }

            // INSERT / UPDATE / DELETE / CREATE
            else {

                resultType = "result";

            }


            // ------------------------------------------------
            // SEND RESULT
            // ------------------------------------------------

            res.json({

                success: true,

                query: cleanQuery,

                resultType,

                results: rows,

                affectedRows:
                    results.affectedRows !== undefined
                        ? results.affectedRows
                        : null,

                insertId:
                    results.insertId !== undefined
                        ? results.insertId
                        : null,

                executionTime,

                fields: fields
                    ? fields.map(field => field.name)
                    : []

            });


            // ------------------------------------------------
            // BROADCAST DATABASE CHANGE
            // ------------------------------------------------

            const upperQuery =
                cleanQuery.toUpperCase();


            if (
                upperQuery.startsWith("INSERT") ||
                upperQuery.startsWith("UPDATE") ||
                upperQuery.startsWith("DELETE") ||
                upperQuery.startsWith("CREATE") ||
                upperQuery.startsWith("ALTER") ||
                upperQuery.startsWith("DROP") ||
                upperQuery.startsWith("TRUNCATE")
            ) {

                io.emit("database-changed", {

                    query: cleanQuery,

                    time:
                        new Date().toLocaleTimeString()

                });


                socketLog(
                    "DATABASE CHANGED - Live clients notified",
                    "warning"
                );

            }

        }
    );

});


// ============================================================
// SERVER ERROR HANDLER
// ============================================================

app.use((err, req, res, next) => {

    console.error("SERVER ERROR:", err);

    res.status(500).json({

        error: "Internal server error"

    });

});


// ============================================================
// START SERVER
// ============================================================

if (require.main === module) {

    const PORT =
        process.env.PORT || 3000;


    server.listen(
        PORT,
        () => {

            console.log("");
            console.log("=================================");
            console.log("🚀 STUDENT API SERVER");
            console.log("=================================");
            console.log(
                `API: http://localhost:${PORT}`
            );
            console.log(
                `Socket.IO: ENABLED`
            );
            console.log(
                `Database: ${process.env.DB_NAME}`
            );
            console.log("=================================");
            console.log("");

        }
    );

}


// ============================================================
// EXPORT
// ============================================================

module.exports = {
    app,
    server,
    io
};