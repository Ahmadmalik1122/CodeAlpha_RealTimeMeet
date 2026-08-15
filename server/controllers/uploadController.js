const path = require("path");

// Files are already saved to disk by multer at this point (see
// routes/uploadRoutes.js). We just need to hand back enough metadata for
// the client to render/download it (e.g. inside the meeting chat panel).
const uploadFile = (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded.",
    });
  }

  const fileUrl = `/uploads/${req.file.filename}`;

  res.status(201).json({
    success: true,
    file: {
      fileUrl,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
    },
  });
};

module.exports = { uploadFile };
