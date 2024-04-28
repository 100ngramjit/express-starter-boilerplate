//imports and config

const express = require("express");
const app = express();
const PORT = 3001;

app.use(express.json());

//port listener

app.listen(PORT, () => console.log(`its alive on http://localhost:${PORT}`));

//middleware

function userNameMiddleware(req, res, next) {
  const username = req.headers["username"];

  if (!username || username.length <= 3) {
    res.status(404).json({
      status: "404",
      msg: "Invalid Username/ Username not found",
    });
  } else {
    next();
  }
}

function idValidatorMiddleware(req, res, next) {
  const id = req.params.id;
  if (isNaN(id) || Number(id) > 100) {
    res.json({
      msg: "invalid id",
    });
  } else {
    next();
  }
}

//routes

app.get("/helloworld", userNameMiddleware, (req, res) => {
  res.json({
    msg: `Hello ${req.headers["username"]}!`,
    category: "Noob",
  });
});

app.get("/", (req, res) => {
  res.json({
    msg: "Welcome to the API",
  });
});

app.get("/:id", idValidatorMiddleware, (req, res) => {
  const { id } = req.params;
  res.json({
    msg: `This is the ID : ${id}`,
  });
});
