const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { isAuthenticated } = require('../middleware/auth');

const BUFF_TYPES = [
    { id: 'bonus_quest_galleons', name: 'Wealth of the Stars', desc: '+50% Galleons from daily quests today.', emoji: '🌟' },
    { id: 'extra_forest_entry', name: 'Path of the Centipede', desc: 'Can enter the Himmapan Forest an extra time today.', emoji: '🌿' },
    { id: 'bonus_daily_reward', name: 'Gilderoy\'s Grace', desc: '+100 extra Galleons when claiming daily reward today.', emoji: '💰' },
    { id: 'shop_discount', name: 'Merchant\'s Insight', desc: '10% discount on all Shop items today.', emoji: '🛍️' }
];

router.get('/status', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        let activeBuff = null;
        let canDraw = true;

        if (user.dailyDivination && user.dailyDivination.expiryDate) {
            const expiry = new Date(user.dailyDivination.expiryDate);
            const now = new Date();
            
            // Check if buff expired (past midnight TH time)
            if (now < expiry) {
                canDraw = false;
                activeBuff = BUFF_TYPES.find(b => b.id === user.dailyDivination.buffType);
            }
        }

        res.json({ canDraw, activeBuff, currentType: user.dailyDivination?.buffType });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error fetching divination status.' });
    }
});

router.post('/draw', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const now = new Date();
        
        if (user.dailyDivination && user.dailyDivination.expiryDate) {
            if (now < new Date(user.dailyDivination.expiryDate)) {
                return res.status(400).json({ message: 'The stars have already spoken to you today.' });
            }
        }

        // Pick random buff
        const randomBuff = BUFF_TYPES[Math.floor(Math.random() * BUFF_TYPES.length)];

        // Set expiry to next midnight TH time
        const thTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
        const nextMidnightTh = new Date(Date.UTC(thTime.getUTCFullYear(), thTime.getUTCMonth(), thTime.getUTCDate() + 1, -7, 0, 0, 0));

        user.dailyDivination = {
            buffType: randomBuff.id,
            expiryDate: nextMidnightTh
        };

        await user.save();

        res.json({ message: 'The crystal ball clears...', buff: randomBuff });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'The stars are clouded right now. Try again later.' });
    }
});

module.exports = router;
