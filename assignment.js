const express = require("express");
const z = require("zod");
const app = express();
const PORT = 3000;

app.use(express.json());

const titleSchema = z
  .string({ message: "title required" })
  .min(3, "title is too short")
  .max(200, "maximum 200 chars allowed in title");
const descriptionSchema = z
  .string({ message: "description required" })
  .max(2000, "maximum 2000 characters allowed in description");

const todos = [];

app.get("/ping", (req, res) => {
  const message = "pong";
  res.json({ message });
});

app.get("/status", (req, res) => {
  const { code } = req.query;
  const statusCode = parseInt(code);
  if (statusCode === 404) {
    return res
      .status(statusCode)
      .json({ status: statusCode, message: "not found" });
  }
  return res.status(400).json({ status: 400, message: "invalid code" });
});

app.post("/echo", (req, res) => {
  const path = req.path;
  const method = req.method;
  const headers = req.headers;
  console.log({ path, method, headers });
  const body = req.body;
  res.json({ ...body, timestamp: new Date().toISOString() });
});

app.get("/todos", (req, res) => {
  const { completed, search, sort, order } = req.query;

  let todoCopy = todos.filter((todo) =>
    todo.title.includes(String(search || ""))
  );

  if (completed === "true" || completed === "false") {
    todoCopy = todoCopy.filter(
      (todo) => todo.completed === (completed === "true")
    );
  }

  if (sort) {
    const isDesc = order === "desc" || order === "descending";
    todoCopy.sort((a, b) => {
      const valA = a[sort];
      const valB = b[sort];

      if (valA < valB) return isDesc ? 1 : -1;
      if (valA > valB) return isDesc ? -1 : 1;
      return 0;
    });
  }

  res.json(todoCopy);
});

app.get("/todos/:id", (req, res) => {
  const { id } = req.params;
  const intId = parseInt(id);
  const ele = todos.find((todo) => todo.id === intId);
  if (ele) {
    return res.status(200).json(ele);
  }
  return res.status(404).json({
    errors: { status: 404, message: "element not found with given id" },
  });
});

app.post("/todos", (req, res) => {
  const { title, description } = req.body;
  const titleResponse = titleSchema.safeParse(title);
  const descResponse = descriptionSchema.safeParse(description);
  if (!titleResponse.success || !descResponse.success) {
    const errors =
      titleResponse?.error?.issues[0] || descResponse?.error?.issues?.[0];
    return res.status(400).json({ errors });
  }

  const newTodo = {
    id: todos.length + 1,
    title,
    description,
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  todos.push(newTodo);
  res.status(201).json(newTodo);
});

app.put("/todos/:id", (req, res) => {
  const { id } = req.params;
  const intId = parseInt(id);
  const { title, description, completed } = req.body;
  const titleResponse = titleSchema.safeParse(title);
  const descResponse = descriptionSchema.safeParse(description);
  if (!titleResponse.success || !descResponse.success) {
    const errors =
      titleResponse?.error?.issues[0] || descResponse?.error?.issues?.[0];
    return res.status(400).json({ errors });
  }
  const ele = todos.find((todo) => todo.id === intId);
  if (ele) {
    ele.title = title;
    ele.description = description;
    ele.completed = completed === "true";
    ele.updatedAt = new Date().toISOString();
    return res.status(201).json(ele);
  }
  res.status(404).json({
    errors: { status: 404, message: "element not found with given id" },
  });
});

app.patch("/todos/:id", (req, res) => {
  const { id } = req.params;
  const intId = parseInt(id);
  const ele = todos.find((ele) => ele.id === intId);
  if (ele) {
    ele.completed = !ele.completed;
    ele.updatedAt = new Date().toISOString();
    return res.status(200).json({ message: "todo updated", todo: ele });
  }
  res.status(404).json({
    errors: { status: 404, message: "element not found with given id" },
  });
});

app.delete("/todos/:id", (req, res) => {
  const { id } = req.params;
  const intId = parseInt(id);
  const ele = todos.find((todo) => todo.id === intId);
  if (ele) {
    todos.splice(todos.indexOf(ele), 1);
    return res
      .status(204)
      .json({ message: "element deleted successfully", ...ele });
  }
  return res.status(404).json({
    errors: { status: 404, message: "element not found with given id" },
  });
});

app.listen(PORT, () => console.log(`its alive on http://localhost:${PORT}`));
