const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

dotenv.config();

const User = require("./src/models/User");
const PatientReport = require("./src/models/PatientReport");
const { buildNutrientGuidance } = require("./src/utils/nutrients");

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/patient_health_app";
const JWT_SECRET = process.env.JWT_SECRET || "development-secret";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const isAtlasConnection = MONGODB_URI.startsWith("mongodb+srv://");
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const connectToDatabase = async () => {
  await mongoose.connect(MONGODB_URI);
  console.log(
    `Connected to ${isAtlasConnection ? "MongoDB Atlas (online)" : "MongoDB"}`
  );
};

const createToken = (user) =>
  jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, {
    expiresIn: "7d",
  });

const sanitizeText = (value) => String(value || "").trim();

const formatErrorResponse = (res, status, message, details = []) =>
  res.status(status).json({ message, details });

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found." });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

const buildAuthResponse = (user, message) => {
  const token = createToken(user);

  return {
    message,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
  };
};

app.post("/api/auth/signup", async (req, res) => {
  try {
    const name = sanitizeText(req.body.name);
    const email = sanitizeText(req.body.email).toLowerCase();
    const password = String(req.body.password || "");
    const errors = [];

    if (!name) {
      errors.push("Name is required.");
    }
    if (!email) {
      errors.push("Email is required.");
    } else if (!emailPattern.test(email)) {
      errors.push("Please enter a valid email address.");
    }
    if (!password) {
      errors.push("Password is required.");
    } else if (password.length < 6) {
      errors.push("Password must be at least 6 characters long.");
    }

    if (errors.length) {
      return formatErrorResponse(res, 400, "Please fix the highlighted issues.", errors);
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return formatErrorResponse(res, 409, "Email is already registered.", [
        "Use another email or log in with the existing account.",
      ]);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      googleId: null,
    });

    return res.status(201).json(buildAuthResponse(user, "Account created successfully."));
  } catch (error) {
    console.error("Signup error:", error);
    if (error.code === 11000) {
      return formatErrorResponse(res, 409, "Email is already registered.", [
        "Use another email or log in with the existing account.",
      ]);
    }

    return formatErrorResponse(res, 500, "Unable to create account right now.", [
      "Please try again in a moment.",
    ]);
  }
});

app.post("/api/auth/signin", async (req, res) => {
  try {
    const email = sanitizeText(req.body.email).toLowerCase();
    const password = String(req.body.password || "");
    const errors = [];

    if (!email) {
      errors.push("Email is required.");
    } else if (!emailPattern.test(email)) {
      errors.push("Please enter a valid email address.");
    }
    if (!password) {
      errors.push("Password is required.");
    }

    if (errors.length) {
      return formatErrorResponse(res, 400, "Please fix the highlighted issues.", errors);
    }

    const user = await User.findOne({ email });
    if (!user) {
      return formatErrorResponse(res, 401, "Invalid email or password.");
    }

    if (!user.password) {
      return formatErrorResponse(
        res,
        401,
        "This account uses Google sign-in.",
        ["Please use Sign in with Google."]
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return formatErrorResponse(res, 401, "Invalid email or password.");
    }

    return res.json(buildAuthResponse(user, "Signed in successfully."));
  } catch (error) {
    console.error("Signin error:", error);
    return formatErrorResponse(res, 500, "Unable to sign in right now.", [
      "Please try again in a moment.",
    ]);
  }
});

app.post("/api/auth/firebase-google", async (req, res) => {
  try {
    const name = sanitizeText(req.body.name);
    const email = sanitizeText(req.body.email).toLowerCase();
    const googleId = sanitizeText(req.body.googleId);
    const errors = [];

    if (!name) errors.push("Google account name is required.");
    if (!email) {
      errors.push("Google account email is required.");
    } else if (!emailPattern.test(email)) {
      errors.push("Google account email is invalid.");
    }
    if (!googleId) errors.push("Google account ID is required.");

    if (errors.length) {
      return formatErrorResponse(res, 400, "Google sign-in data is incomplete.", errors);
    }

    let user = await User.findOne({
      $or: [{ email }, { googleId }],
    });

    if (!user) {
      user = await User.create({
        name,
        email,
        password: null,
        googleId,
      });
      return res.status(201).json(buildAuthResponse(user, "Signed in with Google successfully."));
    }

    user.name = user.name || name;
    user.googleId = user.googleId || googleId;
    await user.save();

    return res.json(buildAuthResponse(user, "Signed in with Google successfully."));
  } catch (error) {
    console.error("Google signin error:", error);
    return formatErrorResponse(res, 500, "Unable to sign in with Google right now.", [
      "Please try again in a moment.",
    ]);
  }
});

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  return res.json({ user: req.user });
});

app.post("/api/reports", authMiddleware, async (req, res) => {
  try {
    const patientId = sanitizeText(req.body.patientId);
    const patientName = sanitizeText(req.body.patientName);
    const patientAge = Number(req.body.patientAge);
    const patientGender = sanitizeText(req.body.patientGender);
    const lastAppointment = sanitizeText(req.body.lastAppointment);
    const doctorName = sanitizeText(req.body.doctorName);
    const appointmentDate = sanitizeText(req.body.appointmentDate);
    const bloodPressure = sanitizeText(req.body.bloodPressure);
    const cholesterol = sanitizeText(req.body.cholesterol);
    const sugar = sanitizeText(req.body.sugar);
    const errors = [];

    if (!patientId) errors.push("Patient ID is required.");
    if (!patientName) errors.push("Patient name is required.");
    if (Number.isNaN(patientAge) || patientAge <= 0) {
      errors.push("Patient age must be a valid number.");
    }
    if (!patientGender) errors.push("Patient gender is required.");
    if (!doctorName) errors.push("Doctor name is required.");
    if (!appointmentDate) errors.push("Appointment date is required.");
    if (!bloodPressure) errors.push("Blood pressure is required.");
    if (!cholesterol) errors.push("Cholesterol value is required.");
    if (!sugar) errors.push("Sugar value is required.");

    if (errors.length) {
      return formatErrorResponse(res, 400, "Please fix the report form errors.", errors);
    }

    const report = await PatientReport.create({
      patientId,
      patientName,
      patientAge,
      patientGender,
      lastAppointment: lastAppointment || null,
      doctorName,
      appointmentDate,
      bloodPressure,
      cholesterol,
      sugar,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      message: "Patient report saved successfully.",
      report,
    });
  } catch (error) {
    console.error("Create report error:", error);
    return formatErrorResponse(res, 500, "Unable to save patient report.", [
      "Please try again in a moment.",
    ]);
  }
});

app.get("/api/reports", authMiddleware, async (req, res) => {
  try {
    const reports = await PatientReport.find({ createdBy: req.user._id }).sort({
      createdAt: -1,
    });

    return res.json({ reports });
  } catch (error) {
    console.error("Fetch reports error:", error);
    return formatErrorResponse(res, 500, "Unable to fetch reports.", [
      "Please refresh and try again.",
    ]);
  }
});

app.get("/api/nutrients", (req, res) => {
  const age = Number(req.query.age);

  if (Number.isNaN(age) || age < 0) {
    return formatErrorResponse(res, 400, "Please provide a valid age.");
  }

  return res.json(buildNutrientGuidance(age));
});

app.get("/api/health", (_req, res) => {
  return res.json({
    status: "ok",
    database: {
      state: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      mode: isAtlasConnection ? "online-atlas" : "local",
    },
  });
});

app.get("/{*path}", (_req, res) => {
  return res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((error, _req, res, _next) => {
  console.error("Unhandled server error:", error);

  if (error instanceof SyntaxError && "body" in error) {
    return formatErrorResponse(res, 400, "Invalid request data.");
  }

  return formatErrorResponse(res, 500, "Something went wrong on the server.", [
    "Please try again later.",
  ]);
});

connectToDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  });
