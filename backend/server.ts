const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(express.json());

app.get("/", (req: any, res: any) => {
  res.send("Backend running");
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});