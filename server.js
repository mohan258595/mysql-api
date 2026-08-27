// =============================
// LOAD ENVIRONMENT VARIABLES
// =============================
require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");


// =============================
// CREATE EXPRESS APP
// =============================
const app = express();


// =============================
// MIDDLEWARE
// =============================
app.use(cors());
app.use(express.json());


// =============================
// SERVE FRONTEND
// =============================
app.use(express.static(__dirname));


// =============================
// REQUEST LOGGER
// =============================
app.use((req, res, next) => {

    const time = new Date().toLocaleString();

    console.log("=================================");

    console.log(`[${time}] ${req.method} ${req.originalUrl}`);

    next();

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

    console.log("=================================");
    console.log("✅ Cloud MySQL connected!");
    console.log(`Database: ${process.env.DB_NAME}`);
    console.log("=================================");

    connection.release();

});


// =============================
// HOME PAGE
// =============================
app.get("/", (req, res) => {

    console.log("🏠 Home page requested");

    res.sendFile(
        path.join(__dirname, "index.html")
    );

});


// =============================
// TEST API
// =============================
app.get("/api/test", (req, res) => {

    console.log("🧪 API test requested");

    res.json({

        message: "API is working!",

        database: process.env.DB_NAME

    });

});


// =============================
// GET ALL STUDENTS
// =============================
app.get("/students", (req, res) => {

    const startTime = Date.now();

    console.log("📖 READ - Getting all students...");


    const sql =
        "SELECT * FROM students ORDER BY id";


    db.query(sql, (err, results) => {

        const time =
            new Date().toLocaleString();


        if (err) {

            console.error(
                `[${time}] ❌ READ FAILED`
            );

            console.error(
                "Error:",
                err.message
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


        res.json(results);

    });

});


// =============================
// CREATE STUDENT
// =============================
app.post("/students", (req, res) => {

    const { id, name } = req.body;


    console.log("🟢 CREATE - Adding student");

    console.log(`ID: ${id}`);

    console.log(`Name: ${name}`);


    if (!id || !name) {

        console.log(
            "❌ CREATE FAILED - ID and name required"
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
                    "Error:",
                    err.message
                );

                return res.status(500).json({

                    error: err.message

                });

            }


            console.log(
                `[${time}] ✅ CREATE SUCCESS`
            );

            console.log(
                `Student ID: ${id}`
            );

            console.log(
                `Student Name: ${name}`
            );

            console.log(
                `Inserted rows: ${result.affectedRows}`
            );


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


// =============================
// UPDATE STUDENT
// =============================
app.put("/students/:id", (req, res) => {

    const id = req.params.id;

    const { name } = req.body;


    console.log("🟡 UPDATE - Updating student");

    console.log(`Student ID: ${id}`);

    console.log(`New Name: ${name}`);


    if (!name) {

        console.log(
            "❌ UPDATE FAILED - Name required"
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

                console.error(
                    `[${time}] ❌ UPDATE FAILED`
                );

                console.error(
                    "Error:",
                    err.message
                );

                return res.status(500).json({

                    error: err.message

                });

            }


            if (result.affectedRows === 0) {

                console.log(
                    `[${time}] ⚠️ UPDATE FAILED - Student not found`
                );

                return res.status(404).json({

                    error: "Student not found"

                });

            }


            console.log(
                `[${time}] ✅ UPDATE SUCCESS`
            );

            console.log(
                `Student ID: ${id}`
            );

            console.log(
                `New Name: ${name}`
            );


            res.json({

                message:
                    "Student updated successfully"

            });

        }
    );

});


// =============================
// DELETE STUDENT
// =============================
app.delete("/students/:id", (req, res) => {

    const id = req.params.id;


    console.log("🔴 DELETE - Deleting student");

    console.log(
        `Student ID: ${id}`
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

                console.error(
                    `[${time}] ❌ DELETE FAILED`
                );

                console.error(
                    "Error:",
                    err.message
                );

                return res.status(500).json({

                    error: err.message

                });

            }


            if (result.affectedRows === 0) {

                console.log(
                    `[${time}] ⚠️ DELETE FAILED - Student not found`
                );

                return res.status(404).json({

                    error: "Student not found"

                });

            }


            console.log(
                `[${time}] ✅ DELETE SUCCESS`
            );

            console.log(
                `Student ID: ${id}`
            );

            console.log(
                `Deleted rows: ${result.affectedRows}`
            );


            res.json({

                message:
                    "Student deleted successfully"

            });

        }
    );

});


// =============================
// LOCAL SERVER
// =============================
if (require.main === module) {

    const PORT =
        process.env.PORT || 3000;


    app.listen(
        PORT,
        () => {

            console.log("");
            console.log("=================================");
            console.log("🚀 STUDENT API SERVER");
            console.log("=================================");
            console.log(
                `API running at: http://localhost:${PORT}`
            );
            console.log(
                `Database: ${process.env.DB_NAME}`
            );
            console.log("=================================");
            console.log("");

        }
    );

}


// =============================
// EXPORT FOR VERCEL
// =============================
module.exports = app;