const express = require("express");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

const protect = require("../middleware/authMiddleware");
const { uploadFile } = require("../controllers/uploadController");

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB — generous for chat attachments,
// small enough to keep the server's disk usage sane for a demo/FYP project.

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(8).toString("hex");
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
});

router.post("/", protect, upload.single("file"), uploadFile);

module.exports = router;
