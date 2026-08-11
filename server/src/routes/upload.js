const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { verifyToken } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

// Test upload endpoint
router.post('/test', verifyToken, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Return the path to the uploaded file
    const filePath = `/uploads/events/${req.file.filename}`;
    res.status(200).json({ 
      message: 'File uploaded successfully',
      filePath,
      fullUrl: `https://eventnet-production.up.railway.app${filePath}`
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'File upload failed', error: error.message });
  }
});

module.exports = router;
