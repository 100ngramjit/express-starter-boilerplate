const express = require("express");
const z = require("zod");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { prisma } = require("./src/db/prisma");
require("dotenv").config();

const app = express();
const PORT = 3001; // Different port to run alongside original

app.use(express.json());

const jwtPassword = process.env.JWT_SECRET;

// ========== VALIDATION SCHEMAS ==========
const titleSchema = z
  .string({ message: "title required" })
  .min(3, "title is too short")
  .max(200, "maximum 200 chars allowed in title");
const descriptionSchema = z
  .string({ message: "description required" })
  .max(2000, "maximum 2000 characters allowed in description");
const emailSchema = z.string().email("invalid email format");
const passwordSchema = z
  .string()
  .min(6, "password must be at least 6 characters");

// ========== AUTH MIDDLEWARE ==========
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization token required" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, jwtPassword);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

// ========== UTILITY ROUTES ==========
app.get("/ping", (req, res) => {
  res.json({ message: "pong" });
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
  const { path, method, headers } = req;
  console.log({ path, method, headers });
  res.json({ ...req.body, timestamp: new Date().toISOString() });
});

// ========== AUTH ROUTES ==========

// User Registration
app.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  const emailResult = emailSchema.safeParse(email);
  const passwordResult = passwordSchema.safeParse(password);

  if (!emailResult.success) {
    return res.status(400).json({ errors: emailResult.error.issues[0] });
  }
  if (!passwordResult.success) {
    return res.status(400).json({ errors: passwordResult.error.issues[0] });
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res
        .status(409)
        .json({ error: "User with this email already exists" });
    }

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash },
      select: { id: true, email: true, createdAt: true },
    });

    res.status(201).json({ message: "User created successfully", user });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// User Login
app.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // Find user by email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      jwtPassword,
      {
        expiresIn: "24h",
      }
    );

    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get current user profile
app.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, email: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ========== TODO ROUTES (All require authentication) ==========

// GET all todos for authenticated user (with filtering, search, sorting)
app.get("/todos", authenticateToken, async (req, res) => {
  const { completed, search, sort, order, limit = 10, offset = 0 } = req.query;

  try {
    // Build where clause
    const where = { userId: req.user.userId };

    // Filter by search term (title contains search string)
    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }

    // Filter by completed status
    if (completed === "true" || completed === "false") {
      where.completed = completed === "true";
    }

    // Build orderBy
    let orderBy = undefined;
    if (sort) {
      const validSortFields = ["title", "createdAt", "updatedAt", "completed"];
      if (validSortFields.includes(sort)) {
        orderBy = {
          [sort]: order === "desc" || order === "descending" ? "desc" : "asc",
        };
      }
    }

    const totalTodos = await prisma.todo.count({ where });
    if (totalTodos === 0) {
      return res.status(404).json({ error: "No todos found" });
    }

    const skip = parseInt(offset);
    const take = parseInt(limit);
    const hasMore = skip + take < totalTodos;

    if (skip >= totalTodos) {
      return res.status(404).json({
        error: "Offset out of bounds",
        meta: { totalTodos, hasMore: false },
      });
    }

    const todos = await prisma.todo.findMany({
      where,
      orderBy,
      include: { user: { select: { email: true } } },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    res.json({
      data: todos,
      meta: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: totalTodos,
        hasMore,
      },
    });
  } catch (error) {
    console.error("Get todos error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET single todo by ID
app.get("/todos/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const intId = parseInt(id);

  if (isNaN(intId)) {
    return res.status(400).json({ error: "Invalid todo ID" });
  }

  try {
    const todo = await prisma.todo.findFirst({
      where: { id: intId, userId: req.user.userId },
      include: { user: { select: { email: true } } },
    });

    if (!todo) {
      return res.status(404).json({
        errors: { status: 404, message: "element not found with given id" },
      });
    }

    res.json(todo);
  } catch (error) {
    console.error("Get todo error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST create new todo
app.post("/todos", authenticateToken, async (req, res) => {
  const { title, description } = req.body;

  // Validate input
  const titleResult = titleSchema.safeParse(title);
  const descResult = descriptionSchema.safeParse(description);

  if (!titleResult.success || !descResult.success) {
    const errors =
      titleResult?.error?.issues[0] || descResult?.error?.issues?.[0];
    return res.status(400).json({ errors });
  }

  try {
    const todo = await prisma.todo.create({
      data: {
        title,
        description,
        userId: req.user.userId,
      },
    });

    res.status(201).json(todo);
  } catch (error) {
    console.error("Create todo error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT update todo (full update)
app.put("/todos/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const intId = parseInt(id);
  const { title, description, completed } = req.body;

  if (isNaN(intId)) {
    return res.status(400).json({ error: "Invalid todo ID" });
  }

  // Validate input
  const titleResult = titleSchema.safeParse(title);
  const descResult = descriptionSchema.safeParse(description);

  if (!titleResult.success || !descResult.success) {
    const errors =
      titleResult?.error?.issues[0] || descResult?.error?.issues?.[0];
    return res.status(400).json({ errors });
  }

  try {
    // Check if todo exists and belongs to user
    const existingTodo = await prisma.todo.findFirst({
      where: { id: intId, userId: req.user.userId },
    });

    if (!existingTodo) {
      return res.status(404).json({
        errors: { status: 404, message: "element not found with given id" },
      });
    }

    const todo = await prisma.todo.update({
      where: { id: intId },
      data: {
        title,
        description,
        completed: completed === true || completed === "true",
      },
    });

    res.status(201).json(todo);
  } catch (error) {
    console.error("Update todo error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH toggle todo completed status
app.patch("/todos/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const intId = parseInt(id);

  if (isNaN(intId)) {
    return res.status(400).json({ error: "Invalid todo ID" });
  }

  try {
    // Check if todo exists and belongs to user
    const existingTodo = await prisma.todo.findFirst({
      where: { id: intId, userId: req.user.userId },
    });

    if (!existingTodo) {
      return res.status(404).json({
        errors: { status: 404, message: "element not found with given id" },
      });
    }

    const todo = await prisma.todo.update({
      where: { id: intId },
      data: { completed: !existingTodo.completed },
    });

    res.json({ message: "todo updated", todo });
  } catch (error) {
    console.error("Toggle todo error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE todo
app.delete("/todos/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const intId = parseInt(id);

  if (isNaN(intId)) {
    return res.status(400).json({ error: "Invalid todo ID" });
  }

  try {
    // Check if todo exists and belongs to user
    const existingTodo = await prisma.todo.findFirst({
      where: { id: intId, userId: req.user.userId },
    });

    if (!existingTodo) {
      return res.status(404).json({
        errors: { status: 404, message: "element not found with given id" },
      });
    }

    await prisma.todo.delete({ where: { id: intId } });

    res.status(204).send();
  } catch (error) {
    console.error("Delete todo error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ========== GRACEFUL SHUTDOWN ==========
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// ========== START SERVER ==========
app.listen(PORT, () =>
  console.log(`Database-backed API running on http://localhost:${PORT}`)
);

module.exports = app;
