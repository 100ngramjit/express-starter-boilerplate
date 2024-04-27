const express = require("express");
const app = express();
const PORT = 8080;

app.use(express.json());

app.listen(PORT, () => console.log(`its alive on http://localhost:${PORT}`));

app.get("/helloworld", (req, res) => {
  res.json({
    msg: "Hello World!",
    category: "Noob",
  });
});

app.get("/", (req, res) => {
  res.json({
    msg: "Welcome to the API",
  });
});

app.get("/:id", (req, res) => {
  const { id } = req.params;
  res.json({
    msg: `This is the ID : ${id}`,
  });
});
