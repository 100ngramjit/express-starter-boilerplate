const express = require("express");
const jwt = require("jsonwebtoken");
const zod = require("zod");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const session = require("express-session");
require("dotenv").config();

const app = express();

app.use(express.json());

const PORT = 3000;

const jwtPassword = process.env.JWT_SECRET;
// ========== SESSION SETUP (Required for Passport OAuth) ==========
app.use(
  session({
    secret: "session_secret_key_change_in_production",
    resave: false,
    saveUninitialized: false,
  })
);

// ========== PASSPORT SETUP ==========
app.use(passport.initialize());
app.use(passport.session());

// Serialize user into session (minimal data storage)
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user from session
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// ========== GOOGLE OAUTH STRATEGY ==========
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    function (accessToken, refreshToken, profile, done) {
      // Here you can save user to database if needed
      // For now, just pass the profile through
      return done(null, profile);
    }
  )
);

// ========== ZOD SCHEMAS (Existing) ==========
const usernameSchema = zod.string().email();
const passwordSchema = zod.string().min(6);

// ========== HELPER FUNCTIONS (Existing) ==========
function signJwt(username, password) {
  const usernameResp = usernameSchema.safeParse(username);
  const passwordResp = passwordSchema.safeParse(password);
  const msg = {
    error: !usernameResp.success ? usernameResp : passwordResp,
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

// ========== EXISTING ROUTES ==========

// Traditional email/password signin
app.get("/signin", (req, res) => {
  if (!req.body || !req.body.username || !req.body.password) {
    return res.status(400).json({ error: "Username/password is required" });
  }
  const responseMessage = signJwt(req.body["username"], req.body["password"]);
  if (typeof responseMessage === "object") {
    res.json({
      Error: responseMessage,
    });
  } else {
    res.json({
      Token: responseMessage,
    });
  }
});

// Profile route (works with JWT from either signin or Google OAuth)
app.get("/profile", (req, res) => {
  if (!req.headers || !req.headers.authorization) {
    return res.status(400).json({ error: "Token is required" });
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

// ========== NEW GOOGLE OAUTH ROUTES ==========

// Start Google OAuth flow
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google OAuth callback route
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/google/failure" }),
  (req, res) => {
    // req.user contains the Google profile
    const email =
      req.user.emails && req.user.emails.length > 0
        ? req.user.emails[0].value
        : req.user.displayName;

    // Generate your own JWT (so /profile route works as before)
    const token = jwt.sign({ username: email }, jwtPassword, {
      expiresIn: "1h",
    });

    // Return the JWT token (you can also redirect to a frontend page)
    res.json({
      Token: token,
      message: "Google authentication successful",
    });
  }
);

// Failure route
app.get("/auth/google/failure", (req, res) => {
  res.status(401).json({ error: "Google OAuth authentication failed" });
});

// ========== START SERVER ==========
app.listen(PORT, () => console.log(`its alive on http://localhost:${PORT}`));
