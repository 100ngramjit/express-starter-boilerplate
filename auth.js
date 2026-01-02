const express = require("express");
const jwt = require("jsonwebtoken");
const zod = require("zod");
const app = express();

app.use(express.json());

const PORT = 3000;

app.listen(PORT, () => console.log(`its alive on http://localhost:${PORT}`));

const jwtPassword = "secret";

const usernameSchema = zod.string().email();

const passwordSchema = zod.string().min(6);

function signJwt(username, password) {
  const usernameResp = usernameSchema.safeParse(username);
  const passwordResp = passwordSchema.safeParse(password);
  const msg = {
    error: !usernameResp.response ? usernameResp : passwordResp,
  };
  if (!usernameResp.success || !passwordResp.success) {
    return msg;
  }
  return jwt.sign({ username }, jwtPassword);
}

function verifyJwt(token) {
  let ans = true;
  try {
    jwt.verify(token, jwtPassword);
  } catch (e) {
    ans = false;
  }
  return ans;
}

function decodeJwt(token) {
  const decoded = jwt.decode(token);
  console.log(decoded);
  return decoded;
}

app.get("/signin", (req, res) => {
  if (!req.body || !req.body.username || !req.body.password) {
    return res.status(400).json({ error: "Username/password is required" });
  }
  const responseMessage = signJwt(req.body["username"], req.body["password"]);
  if (typeof responseMessage === Object) {
    res.json({
      Error: responseMessage,
    });
  } else {
    res.json({
      Token: responseMessage,
    });
  }
});

app.get("/profile", (req, res) => {
  if (!req.headers || !req.headers.authorization) {
    res.status(400).json({ error: "Token is required" });
  }
  let token = req.headers.authorization.split(" ")[1];
  if (verifyJwt(token)) {
    res.json({
      msg: decodeJwt(token),
    });
  } else {
    res
      .status(400)
      .json({ error: "Invalid token", tk: req.headers.authorization });
  }
});
