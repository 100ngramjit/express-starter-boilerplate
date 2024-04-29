//imports and config

const express = require("express");
const z = require("zod");
const app = express();

const PORT = 3001;

const schema = z.string().min(4).max(12);
//after below line every request can access express.json() , if we put any middleware in app.use , all requests below the line can access it and we dont need to pass it separately
app.use(express.json());

//port listener

app.listen(PORT, () => console.log(`its alive on http://localhost:${PORT}`));

//middleware

// function userNameMiddleware(req, res, next) {
//   const username = req.headers["username"];

//   if (!username || username.length <= 3) {
//     res.status(404).json({
//        status: "404",
//       msg: "Invalid Username/ Username not found",
//     });
//   } else {
//     next();
//   }
// }

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

app.get("/helloworld", (req, res) => {
  const response = schema.safeParse(req.headers["username"]);
  if (response.success) {
    res.json({
      msg: `Hello ${req.headers["username"]}!`,
      category: "Noob",
    });
  } else {
    res.send(response.error.issues[0]);
  }
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

//global error catches

app.use((err, req, res, next) => {
  res.status(500).send("Something is broken !");
});
