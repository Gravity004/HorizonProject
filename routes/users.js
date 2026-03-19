const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Config = require('../models/Config');

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

// Get Server Boosters
router.get('/boosters', async (req, res) => {
    try {
        let boosterConfig = await Config.findOne({ key: 'server_boosters' });
        if (!boosterConfig) {
            boosterConfig = new Config({
                key: 'server_boosters',
                value: [
                    { rank: 1, title: 'Arcane Sovereign', name: '- ระบุชื่อ -', boosts: 0 },
                    { rank: 2, title: 'Mystic Conqueror', name: '- ระบุชื่อ -', boosts: 0 },
                    { rank: 3, title: 'Enchanted Vanguard', name: '- ระบุชื่อ -', boosts: 0 }
                ]
            });
            await boosterConfig.save();
        }
        res.json(boosterConfig.value);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update Server Boosters (Admin only)
router.post('/boosters', isAuthenticated, hasRole(['admin', 'professor']), async (req, res) => {
    try {
        const { boosters } = req.body;
        if (!Array.isArray(boosters) || boosters.length !== 3) {
            return res.status(400).json({ message: 'Invalid boosters data layout.' });
        }
        
        let config = await Config.findOne({ key: 'server_boosters' });
        if (!config) {
            config = new Config({ key: 'server_boosters', value: boosters });
        } else {
            config.value = boosters;
        }
        
        // Use markModified because value is Mixed type
        config.markModified('value');
        await config.save();
        
        res.json({ message: 'Boosters configuration updated successfully.', boosters: config.value });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
