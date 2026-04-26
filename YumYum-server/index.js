// YumYum-server/index.js

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const initDb = require("./initDb");

// const authRoutes = require("./routes/auth.routes");
const receiptRoutes = require("./routes/receipts.routes");
const productRoutes = require("./routes/products.routes");
const recipeRoutes = require("./routes/recipes.routes");
const shoppingRoutes = require("./routes/shopping.routes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// app.use("/api/auth", authRoutes);
app.use("/api/receipts", receiptRoutes);
app.use("/api/products", productRoutes);
app.use("/api/recipes", recipeRoutes);
app.use("/api/shopping-list", shoppingRoutes);

app.get("/", (req, res) => {
  res.send("YumYum API is running");
});

async function startServer() {
  try {
    await initDb();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

startServer();
