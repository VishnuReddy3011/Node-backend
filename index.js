const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors()); // ✅ HERE
app.use(express.json()); // body parser

const userRoutes = require("./routes/userRoutes");
app.use("/api", userRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
 