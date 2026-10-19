const express = require("express");
const path = require("path");
const cors = require("cors");
require("dotenv").config();

const { Client } = require("pg");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..")));

// الصفحة الرئيسية
app.get("/", (req, res) => {
  res.send("Ticket Platform Server is Running 🚀");
});


// اختبار قاعدة البيانات
app.get("/db-test", async (req, res) => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    await client.query("SELECT 1");
    await client.end();

    res.json({
      success: true,
      message: "Database connected successfully ✅",
    });
  } catch (error) {
    console.error(error.message);

    res.status(500).json({
      success: false,
      message: "Database connection failed ❌",
    });
  }
});


// اختبار API
app.get("/api/test", async (req, res) => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    const result = await client.query("SELECT NOW() AS time");

    await client.end();

    res.json({
      success: true,
      message: "API is working ✅",
      database_time: result.rows[0].time,
    });
  } catch (error) {
    console.error(error.message);

    res.status(500).json({
      success: false,
      message: "API database error ❌",
    });
  }
});


// جلب الأحداث
app.get("/api/events", async (req, res) => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    const result = await client.query(`
      SELECT *
      FROM events
      ORDER BY event_date ASC
    `);

    await client.end();

    res.json({
      success: true,
      events: result.rows,
    });

  } catch (error) {
    console.error(error.message);

    res.status(500).json({
      success: false,
      message: "Failed to load events ❌",
    });
  }
});


const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});