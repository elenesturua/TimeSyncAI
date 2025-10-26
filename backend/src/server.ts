import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { sendInviteEmail } from "./email.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Middleware
app.use(cors({
  origin: true, // Allow all origins
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "TimeSyncAI Backend Server is running" });
});

// Email sending endpoint
app.post("/api/send-invite", sendInviteEmail);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error"
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📧 Email API available at http://localhost:${PORT}/api/send-invite`);
  console.log(`✅ Accepting requests from: ${FRONTEND_URL}`);
  
  // Check if required env vars are set
  const requiredEnvVars = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn(`⚠️  Warning: Missing environment variables: ${missingVars.join(", ")}`);
    console.warn(`⚠️  Please create a .env file based on env.example`);
  }
});

