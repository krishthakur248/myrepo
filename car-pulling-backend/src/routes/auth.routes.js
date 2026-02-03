const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth');

// Public routes (no authentication required)
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes (authentication required)
router.get('/profile', verifyToken, authController.getProfile);
router.put('/profile', verifyToken, authController.updateProfile);
router.put('/location', verifyToken, authController.updateLocation);
router.post('/verify-phone', verifyToken, authController.verifyPhone);
router.post('/verify-id', verifyToken, authController.verifyID);
router.post('/change-password', verifyToken, authController.changePassword);

module.exports = router;
