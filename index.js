const app = require("express")();
const PORT = 8080;

app.use(express.json());

app.listen(PORT, () => console.log(`its alive on http://localhost:${PORT}`));

app.get("/helloworld", (req, res) => {
  res.status(200).send({
    msg: "Hello World!",
    category: "Noob",
  });
});

app.get("/", (req, res) => {
  res.status(200).send({
    msg: "Welcome to the API Bitch",
  });
});

app.get("/:id", (req, res) => {
  const { id } = req.params;
  res.status(200).send({
    status: 200,
    msg: `This is a very beginner level api , the ID passed is : ${id}`,
    ID: Number(id),
  });
});
