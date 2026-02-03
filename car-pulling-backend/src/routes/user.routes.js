const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { verifyToken } = require('../middleware/auth');

// Public routes
router.get('/:id', userController.getUserById);
router.get('/:id/ratings', userController.getUserRatings);
router.post('/nearby-drivers', userController.findNearbyDrivers);
router.get('/:driverId/driver-info', userController.getDriverInfo);

// Protected routes
router.post('/:userId/add-rating', verifyToken, userController.addRating);

module.exports = router;
