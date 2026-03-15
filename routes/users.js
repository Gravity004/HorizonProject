const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Get all users by house (for house roster)
router.get('/house/:houseName', async (req, res) => {
    const houseName = req.params.houseName.toLowerCase();
    const validHouses = ['garuda', 'naga', 'qilin', 'erawan'];

    if (!validHouses.includes(houseName)) {
        return res.status(400).json({ message: 'Invalid house name' });
    }

    try {
        const users = await User.find({
            roles: houseName
        }).select('-_id discordId username avatar balance roles house').sort({ username: 1 });

        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get top 3 users by balance (excluding admins)
router.get('/top', async (req, res) => {
    try {
        const topUsers = await User.find({ roles: { $ne: 'admin' } })
            .select('-_id username balance roles house avatar')
            .sort({ balance: -1 })
            .limit(3);
        res.json(topUsers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all users (admin only)
const { isAuthenticated, hasRole } = require('../middleware/auth');

router.get('/all', isAuthenticated, hasRole(['admin', 'professor']), async (req, res) => {
    try {
        const users = await User.find().select('-_id discordId username avatar balance roles house').sort({ username: 1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Admin: Adjust user health
router.post('/admin/health', isAuthenticated, hasRole(['admin', 'professor']), async (req, res) => {
    const { targetUserId, healthAmount } = req.body;
    const newHealth = parseInt(healthAmount);

    if (isNaN(newHealth) || newHealth < 0) return res.status(400).json({ message: 'Invalid health amount' });

    try {
        const target = await User.findOne({
            $or: [{ discordId: targetUserId }, { username: targetUserId }]
        });

        if (!target) return res.status(404).json({ message: 'User not found' });

        target.health = Math.min(newHealth, target.maxHealth);
        await target.save();

        res.json({
            message: `Adjusted ${target.username}'s health to ${target.health}/${target.maxHealth}`,
            newHealth: target.health
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
