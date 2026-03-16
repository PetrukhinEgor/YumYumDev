//YumYum-server/routes/receipts.routes.js
const matchIngredient = require("../utils/productMatcher");
const pool = require("../db");
const express = require("express");
const axios = require("axios");
const router = express.Router();

router.post("/scan", async (req, res) => {
  try {
    const { qr } = req.body;

    const formData = new URLSearchParams();
    formData.append("token", process.env.PROVERKA_TOKEN);
    formData.append("qrraw", qr);

    const response = await axios.post(
      "https://proverkacheka.com/api/v1/check/get",
      formData,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 10000,
      },
    );

    const items = response.data?.data?.json?.items || [];

    await pool.query("BEGIN");

    for (const item of items) {
      const ingredientName = matchIngredient(item.name);

      let ingredientId = null;

      if (ingredientName) {
        const ingredientResult = await pool.query(
          "SELECT id FROM ingredients WHERE name=$1",
          [ingredientName],
        );

        if (ingredientResult.rows.length > 0) {
          ingredientId = ingredientResult.rows[0].id;
        }
      }

      await pool.query(
        `
  INSERT INTO products (user_id, name, quantity, ingredient_id)
  VALUES ($1, $2, $3, $4)
  ON CONFLICT (user_id, name)
  DO UPDATE SET quantity = products.quantity + EXCLUDED.quantity
  `,
        [1, item.name, 1, ingredientId],
      );
    }

    await pool.query("COMMIT");

    res.json(response.data);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error(error.message);
    res.status(500).json({ error: "Ошибка получения данных чека" });
  }
});



module.exports = router;
