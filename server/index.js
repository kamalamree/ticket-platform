const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { Client } = require("pg");

const app = express();

app.use(cors());
app.use(express.json());


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


// إنشاء طلب جديد
app.post("/api/orders", async (req, res) => {

  const {
    buyer_name,
    buyer_email,
    buyer_phone,
    ticket_type_id,
    quantity
  } = req.body;

  if (
    !buyer_name ||
    !buyer_email ||
    !ticket_type_id ||
    !quantity
  ) {
    return res.status(400).json({
      success: false,
      message: "Missing required order data ❌",
    });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {

    await client.connect();

    await client.query("BEGIN");


    // جلب نوع التذكرة
    const ticketResult = await client.query(
      `
      SELECT *
      FROM ticket_types
      WHERE id = $1
      AND is_active = true
      FOR UPDATE
      `,
      [ticket_type_id]
    );


    if (ticketResult.rows.length === 0) {

      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Ticket type not found ❌",
      });
    }


    const ticket = ticketResult.rows[0];


    // التأكد من توفر التذاكر
    const available =
      Number(ticket.quantity_available) -
      Number(ticket.quantity_sold);


    if (available < Number(quantity)) {

      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Not enough tickets available ❌",
      });
    }


    // حساب الإجمالي
    const totalAmount =
      Number(ticket.price) *
      Number(quantity);


    // رقم الطلب
    const orderNumber =
      "TKT-" + Date.now();


    // إنشاء الطلب
    const orderResult = await client.query(
      `
      INSERT INTO orders
      (
        order_number,
        buyer_name,
        buyer_email,
        buyer_phone,
        total_amount,
        currency,
        status
      )
      VALUES
      ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING *
      `,
      [
        orderNumber,
        buyer_name,
        buyer_email,
        buyer_phone || null,
        totalAmount,
        ticket.currency
      ]
    );


    const order = orderResult.rows[0];


    // إضافة تفاصيل الطلب
    await client.query(
      `
      INSERT INTO order_items
      (
        order_id,
        ticket_type_id,
        quantity,
        unit_price,
        total_price
      )
      VALUES
      ($1, $2, $3, $4, $5)
      `,
      [
        order.id,
        ticket.id,
        quantity,
        ticket.price,
        totalAmount
      ]
    );


    // تحديث التذاكر المباعة
    await client.query(
      `
      UPDATE ticket_types
      SET quantity_sold = quantity_sold + $1
      WHERE id = $2
      `,
      [
        quantity,
        ticket.id
      ]
    );


    await client.query("COMMIT");


    res.json({
      success: true,
      message: "Order created successfully ✅",
      order: order
    });


  } catch (error) {

    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error(rollbackError.message);
    }

    console.error(error.message);

    res.status(500).json({
      success: false,
      message: "Failed to create order ❌",
      error: error.message
    });


  } finally {

    await client.end();

  }

});


// تشغيل السيرفر
const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});