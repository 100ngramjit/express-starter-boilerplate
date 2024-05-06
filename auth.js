const express = require("express");
const jwt = require("jsonwebtoken");
const zod = require("zod");
const app = express();

app.use(express.json());

const PORT = 3001;

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
  if (decoded) {
    return true;
  } else {
    return false;
  }
}

app.get("/helloworld", (req, res) => {
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
