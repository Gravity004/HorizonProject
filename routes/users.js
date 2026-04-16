const express = require('express');
const router = express.Router();

const { isAuthenticated, hasRole } = require('../middleware/auth');
const { sanitizeBody } = require('../middleware/sanitize');

// Import OOP Controllers
const userController = require('../controllers/UserController');
const systemConfigController = require('../controllers/SystemConfigController');

// ----------------------------------------------------
// Users Domain Routes
// ----------------------------------------------------

// Get current user's inventory
router.get('/me/inventory', (req, res) => userController.getInventory(req, res));

// Get all users by house
router.get('/house/:houseName', (req, res) => userController.getByHouse(req, res));

// Get top 3 users by balance
router.get('/top', (req, res) => userController.getTop(req, res));

// Get all users (admin only)
router.get('/all', isAuthenticated, hasRole(['admin', 'professor']), (req, res) => userController.getAll(req, res));

// User: Change display name via item
router.post('/changeName', isAuthenticated, sanitizeBody, (req, res) => userController.changeName(req, res));

// ----------------------------------------------------
// Admin Domain Routes
// ----------------------------------------------------

// Admin: Adjust user health
router.post('/admin/health', isAuthenticated, hasRole(['admin', 'professor']), sanitizeBody, (req, res) => userController.adminAdjustHealth(req, res));

// Admin: Detain User
router.post('/admin/detain', isAuthenticated, hasRole(['admin', 'professor']), sanitizeBody, (req, res) => userController.adminDetainUser(req, res));

// ----------------------------------------------------
// System Configurations (Dashboard, Faculty, Boosters)
// ----------------------------------------------------

// GET dashboard status
router.get('/dashboard/status', (req, res) => systemConfigController.getDashboardStatus(req, res));

// POST toggle dashboard
router.post('/dashboard/toggle', isAuthenticated, hasRole(['admin', 'professor']), sanitizeBody, (req, res) => systemConfigController.toggleDashboard(req, res));

// GET Server Boosters
router.get('/boosters', (req, res) => systemConfigController.getBoosters(req, res));

// POST Server Boosters
router.post('/boosters', isAuthenticated, hasRole(['admin', 'professor']), sanitizeBody, (req, res) => systemConfigController.updateBoosters(req, res));

// GET Faculty Members
router.get('/faculty', (req, res) => systemConfigController.getFaculty(req, res));

// POST Faculty Members
router.post('/faculty', isAuthenticated, hasRole(['admin', 'professor']), sanitizeBody, (req, res) => systemConfigController.updateFaculty(req, res));

module.exports = router;
