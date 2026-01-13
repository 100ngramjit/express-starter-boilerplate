const request = require("supertest");
const app = require("../assignment-db");
const { prisma } = require("../src/db/prisma");

describe("Todo API with Database", () => {
  let authToken;
  let testUser;

  // Create a test user and get auth token before tests
  beforeEach(async () => {
    const signupRes = await request(app)
      .post("/signup")
      .send({ email: "test@example.com", password: "password123" });

    testUser = signupRes.body.user;

    const signinRes = await request(app)
      .post("/signin")
      .send({ email: "test@example.com", password: "password123" });

    authToken = signinRes.body.token;
  });

  describe("Authentication", () => {
    test("should create a new user on signup", async () => {
      const res = await request(app)
        .post("/signup")
        .send({ email: "newuser@example.com", password: "password123" });

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe("newuser@example.com");
      expect(res.body.user.id).toBeDefined();

      // Verify user is persisted in database
      const user = await prisma.user.findUnique({
        where: { email: "newuser@example.com" },
      });
      expect(user).not.toBeNull();
      expect(user.email).toBe("newuser@example.com");
    });

    test("should reject duplicate email on signup", async () => {
      const res = await request(app)
        .post("/signup")
        .send({ email: "test@example.com", password: "password123" });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain("already exists");
    });

    test("should return token on valid signin", async () => {
      const res = await request(app)
        .post("/signin")
        .send({ email: "test@example.com", password: "password123" });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe("test@example.com");
    });

    test("should reject invalid credentials", async () => {
      const res = await request(app)
        .post("/signin")
        .send({ email: "test@example.com", password: "wrongpassword" });

      expect(res.status).toBe(401);
    });
  });

  describe("Todo CRUD Operations", () => {
    test("should create a todo and persist it", async () => {
      const res = await request(app)
        .post("/todos")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "Test Todo", description: "This is a test" });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe("Test Todo");
      expect(res.body.userId).toBe(testUser.id);

      // Verify persistence
      const todo = await prisma.todo.findUnique({ where: { id: res.body.id } });
      expect(todo).not.toBeNull();
      expect(todo.title).toBe("Test Todo");
    });

    test("should require authentication for todos", async () => {
      const res = await request(app).get("/todos");

      expect(res.status).toBe(401);
    });

    test("should get all todos for authenticated user", async () => {
      // Create two todos
      await request(app)
        .post("/todos")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "Todo 1", description: "First todo" });

      await request(app)
        .post("/todos")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "Todo 2", description: "Second todo" });

      const res = await request(app)
        .get("/todos")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    test("should filter todos by completed status", async () => {
      // Create one completed and one incomplete todo
      await request(app)
        .post("/todos")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "Incomplete", description: "Not done" });

      const completedRes = await request(app)
        .post("/todos")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "Completed", description: "Done" });

      // Toggle to complete
      await request(app)
        .patch(`/todos/${completedRes.body.id}`)
        .set("Authorization", `Bearer ${authToken}`);

      // Filter by completed=true
      const res = await request(app)
        .get("/todos?completed=true")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe("Completed");
    });

    test("should search todos by title", async () => {
      await request(app)
        .post("/todos")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "Buy groceries", description: "Milk, bread" });

      await request(app)
        .post("/todos")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "Clean house", description: "Kitchen, bathroom" });

      const res = await request(app)
        .get("/todos?search=groceries")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe("Buy groceries");
    });

    test("should update a todo", async () => {
      const createRes = await request(app)
        .post("/todos")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "Original", description: "Original description" });

      const updateRes = await request(app)
        .put(`/todos/${createRes.body.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Updated",
          description: "Updated description",
          completed: true,
        });

      expect(updateRes.status).toBe(201);
      expect(updateRes.body.title).toBe("Updated");
      expect(updateRes.body.completed).toBe(true);

      // Verify persistence
      const todo = await prisma.todo.findUnique({
        where: { id: createRes.body.id },
      });
      expect(todo.title).toBe("Updated");
      expect(todo.completed).toBe(true);
    });

    test("should toggle todo completion", async () => {
      const createRes = await request(app)
        .post("/todos")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "Toggle me", description: "Test toggle" });

      expect(createRes.body.completed).toBe(false);

      const toggleRes = await request(app)
        .patch(`/todos/${createRes.body.id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(toggleRes.body.todo.completed).toBe(true);

      // Toggle back
      const toggleBack = await request(app)
        .patch(`/todos/${createRes.body.id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(toggleBack.body.todo.completed).toBe(false);
    });

    test("should delete a todo", async () => {
      const createRes = await request(app)
        .post("/todos")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "Delete me", description: "Test delete" });

      const deleteRes = await request(app)
        .delete(`/todos/${createRes.body.id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(deleteRes.status).toBe(204);

      // Verify deletion
      const todo = await prisma.todo.findUnique({
        where: { id: createRes.body.id },
      });
      expect(todo).toBeNull();
    });

    test("should not access other user todos", async () => {
      // Create a todo with first user
      const createRes = await request(app)
        .post("/todos")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "Private todo", description: "Only for me" });

      // Create second user
      await request(app)
        .post("/signup")
        .send({ email: "other@example.com", password: "password123" });

      const otherSignin = await request(app)
        .post("/signin")
        .send({ email: "other@example.com", password: "password123" });

      // Try to access first user's todo with second user's token
      const getRes = await request(app)
        .get(`/todos/${createRes.body.id}`)
        .set("Authorization", `Bearer ${otherSignin.body.token}`);

      expect(getRes.status).toBe(404);
    });
  });

  describe("Data Persistence", () => {
    test("should persist data across requests", async () => {
      // Create todo
      const createRes = await request(app)
        .post("/todos")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "Persistent todo", description: "Should survive" });

      // Query directly from database
      const todoFromDb = await prisma.todo.findUnique({
        where: { id: createRes.body.id },
        include: { user: true },
      });

      expect(todoFromDb).not.toBeNull();
      expect(todoFromDb.title).toBe("Persistent todo");
      expect(todoFromDb.user.email).toBe("test@example.com");

      // Fetch again via API
      const getRes = await request(app)
        .get(`/todos/${createRes.body.id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.id).toBe(todoFromDb.id);
    });

    test("should join user data with todos", async () => {
      await request(app)
        .post("/todos")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "Join test", description: "Check user join" });

      const res = await request(app)
        .get("/todos")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.body[0].user).toBeDefined();
      expect(res.body[0].user.email).toBe("test@example.com");
    });
  });

  describe("Validation", () => {
    test("should reject short title", async () => {
      const res = await request(app)
        .post("/todos")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "AB", description: "Valid description" });

      expect(res.status).toBe(400);
    });

    test("should reject invalid email on signup", async () => {
      const res = await request(app)
        .post("/signup")
        .send({ email: "notanemail", password: "password123" });

      expect(res.status).toBe(400);
    });

    test("should reject short password on signup", async () => {
      const res = await request(app)
        .post("/signup")
        .send({ email: "valid@email.com", password: "12345" });

      expect(res.status).toBe(400);
    });
  });
});
