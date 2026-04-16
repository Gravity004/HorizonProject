const express = require('express');
const router = express.Router();
const classroomController = require('../controllers/ClassroomController');
const { isAuthenticated, hasRole } = require('../middleware/auth');
const { sanitizeBody } = require('../middleware/sanitize');

// ─────────────────────────────
//  HERBOLOGY ROUTES
// ─────────────────────────────

// Get current user's herb plots
router.get('/herbs/me', isAuthenticated, (req, res) => classroomController.getMyHerbs(req, res));

// Plant a seed in a slot
router.post('/herbs/plant', isAuthenticated, sanitizeBody, (req, res) => classroomController.plantSeed(req, res));

// Water a plot
router.post('/herbs/water', isAuthenticated, sanitizeBody, (req, res) => classroomController.waterPlant(req, res));

// Harvest a ready plot
router.post('/herbs/harvest', isAuthenticated, sanitizeBody, (req, res) => classroomController.harvestPlant(req, res));

// ─────────────────────────────
//  POTION ROOM ROUTES
// ─────────────────────────────

// Log a potion brew (cosmetic)
router.post('/potion/brew', isAuthenticated, sanitizeBody, (req, res) => classroomController.brewPotion(req, res));

// ─────────────────────────────
//  CHARMS ROOM ROUTES
// ─────────────────────────────

// Log a charm cast attempt
router.post('/charms/cast', isAuthenticated, sanitizeBody, (req, res) => classroomController.castCharm(req, res));

// ─────────────────────────────
//  ADMIN ROUTES
// ─────────────────────────────

// Get classroom logs (admin/professor only)
router.get('/admin/logs', isAuthenticated, hasRole(['admin', 'professor']), (req, res) => classroomController.getLogs(req, res));

module.exports = router;
