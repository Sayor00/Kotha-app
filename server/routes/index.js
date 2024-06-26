const router = require('express').Router();
// routes
const user = require('./user');
const chat = require('./chat');
const contact = require('./contact');
const setting = require('./setting');
const profile = require('./profile');
const inbox = require('./inbox');
const group = require('./group');
const avatar = require('./avatar');

// Import the URL preview route controller
const urlPreviewController = require('./urlPreview');

// Define URL preview route
router.use(urlPreviewController);

// Use other routes
router.use(user);
router.use(chat);
router.use(contact);
router.use(setting);
router.use(profile);
router.use(inbox);
router.use(group);
router.use(avatar);

module.exports = router;
