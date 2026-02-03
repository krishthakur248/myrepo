const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const { verifyToken } = require('../middleware/auth');

// All message routes require authentication
router.use(verifyToken);

// Send a message
router.post('/send', messageController.sendMessage);

// Get all messages for a trip
router.get('/trip/:tripId', messageController.getMessages);

// Get unread message count for a trip
router.get('/unread/:tripId', messageController.getUnreadCount);

// Mark messages as read
router.put('/mark-read/:tripId', messageController.markAsRead);

module.exports = router;
