const express = require('express');
const router = express.Router();
const urlPreviewController = require('../controllers/urlPreviewController');

// Define routes
router.get('/url-preview', urlPreviewController.fetchUrlPreview);

module.exports = router;
