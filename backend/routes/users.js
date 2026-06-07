import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileTypeFromFile } from "file-type";

const router = express.Router();

// Storage configuration for profile photos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'uploads/profiles/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
});

// Configure multer with file size limits and MIME type validation
// Fixes Issue #693: Prevent DoS via large files and restrict to images
const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 5 * 1024 * 1024 // 5MB limit to prevent server disk space exhaustion
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  }
});

const uploadProfilePhoto = (req, res, next) => {
  upload.single("profilePhoto")(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "Profile photo exceeds 5MB limit." });
    }
    if (err) {
      return res.status(415).json({ error: err.message || "Unsupported Media Type" });
    }
    next();
  });
};

// User profile photo upload endpoint
router.post("/upload-photo", uploadProfilePhoto, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded or invalid file type." });
  }

  try {
    const detected = await fileTypeFromFile(req.file.path);
    if (!detected || !detected.mime.startsWith("image/")) {
      fs.unlinkSync(req.file.path);
      return res.status(415).json({ error: "Only valid image files are allowed." });
    }
  } catch (err) {
    fs.unlinkSync(req.file.path);
    return res.status(500).json({ error: "Error validating file type." });
  }

  res.json({ 
    success: true, 
    message: "Profile photo uploaded successfully.",
    fileUrl: `/uploads/profiles/${req.file.filename}`
  });
});

export default router;
