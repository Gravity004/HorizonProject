const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { isAuthenticated, hasRole } = require('../middleware/auth');
const crypto = require('crypto');

function generateTxId() {
    return 'GRN-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

// Get User Balance
router.get('/balance', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.json({ balance: user.balance });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get Transaction History
router.get('/transactions', isAuthenticated, async (req, res) => {
    try {
        const transactions = await Transaction.find({
            $or: [{ senderId: req.user.id }, { recipientId: req.user.id }]
        }).select('-_id -senderId -recipientId -__v').sort({ timestamp: -1 }).limit(50);
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Daily Reward
router.post('/daily', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const now = new Date();
        // Shift time to UTC+7 (Thailand)
        const thTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
        
        // Define the threshold: Today at 08:00:00 TH time (in UTC Date object)
        const threshold = new Date(Date.UTC(
            thTime.getUTCFullYear(),
            thTime.getUTCMonth(),
            thTime.getUTCDate(),
            8, 0, 0, 0
        ));

        // If current TH time is before 8 AM, the threshold belongs to *yesterday* 8 AM
        if (thTime.getUTCHours() < 8) {
            threshold.setUTCDate(threshold.getUTCDate() - 1);
        }

        // Convert threshold back to UTC for database comparison
        const utcThreshold = new Date(threshold.getTime() - (7 * 60 * 60 * 1000));

        // Check if user has already claimed since the threshold
        const isAdmin = user.roles && (user.roles.includes('admin') || user.roles.includes('professor'));
        if (!isAdmin && user.lastDailyReward && new Date(user.lastDailyReward) >= utcThreshold) {
            return res.status(400).json({ 
                message: 'You have already claimed your daily magic today! The stars will realign tomorrow at 8:00 AM.' 
            });
        }

        // Calculate reward (0 to 100 Galleons)
        const reward = Math.floor(Math.random() * 101);

        user.balance += reward;
        user.lastDailyReward = now;
        await user.save();

        // Log transaction
        const txId = generateTxId();
        const transaction = new Transaction({
            transactionId: txId,
            type: 'daily_reward',
            senderId: user._id, // System sending to user
            senderName: 'Daily Magic',
            recipientId: user._id,
            recipientName: user.username,
            amount: reward,
            description: `Daily magic convergence reward`
        });
        await transaction.save();

        res.json({
            message: `Magic converges... You found ${reward} Galleons!`,
            rewardAmount: reward,
            newBalance: user.balance
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Transfer Funds
router.post('/transfer', isAuthenticated, async (req, res) => {
    const { recipientId, amount } = req.body;
    const transferAmount = parseInt(amount);

    if (!transferAmount || transferAmount <= 0) return res.status(400).json({ message: 'Invalid amount' });

    try {
        const sender = await User.findById(req.user.id);
        // Search by discordId or username
        let recipient = await User.findOne({
            $or: [{ discordId: recipientId }, { username: recipientId }]
        });

        // LOVE POTION EFFECT CHECK
        if (sender.activeEffects && sender.activeEffects.length > 0) {
            const lovePotion = sender.activeEffects.find(e => e.effectId === 'love_potion');
            if (lovePotion && new Date(lovePotion.expiresAt) > new Date()) {
                const caster = await User.findById(lovePotion.casterId);
                // Don't swap if they somehow transfer to themselves
                if (caster && caster.id !== sender.id) {
                    recipient = caster; 
                }
            }
        }

        if (!recipient) return res.status(404).json({ message: 'Recipient not found' });
        if (recipient.id === sender.id) return res.status(400).json({ message: 'Cannot transfer to yourself' });
        if (sender.balance < transferAmount) return res.status(400).json({ message: 'Insufficient funds' });

        sender.balance -= transferAmount;
        recipient.balance += transferAmount;

        await sender.save();
        await recipient.save();

        // Save transaction
        const txId = generateTxId();
        const transaction = new Transaction({
            transactionId: txId,
            type: 'transfer',
            senderId: sender._id,
            senderName: sender.username,
            recipientId: recipient._id,
            recipientName: recipient.username,
            amount: transferAmount,
            description: `Transfer from ${sender.username} to ${recipient.username}`
        });
        await transaction.save();

        res.json({
            message: 'Transfer successful',
            newBalance: sender.balance,
            transaction: {
                transactionId: txId,
                senderName: sender.username,
                recipientName: recipient.username,
                amount: transferAmount,
                timestamp: transaction.timestamp
            }
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Admin: Adjust user balance (add/subtract gold)
router.post('/admin/adjust', isAuthenticated, hasRole(['admin', 'professor']), async (req, res) => {
    const { targetUserId, amount, reason } = req.body;
    const adjustAmount = parseInt(amount);

    if (!adjustAmount) return res.status(400).json({ message: 'Invalid amount' });

    try {
        const target = await User.findOne({
            $or: [{ discordId: targetUserId }, { username: targetUserId }]
        });

        if (!target) return res.status(404).json({ message: 'User not found' });

        target.balance += adjustAmount;
        if (target.balance < 0) target.balance = 0;
        await target.save();

        // Log the admin action
        const txId = generateTxId();
        const transaction = new Transaction({
            transactionId: txId,
            type: 'admin_adjust',
            senderId: req.user.id,
            senderName: req.user.username,
            recipientId: target._id,
            recipientName: target.username,
            amount: adjustAmount,
            description: reason || `Admin adjustment by ${req.user.username}`
        });
        await transaction.save();

        res.json({
            message: `Adjusted ${target.username}'s balance by ${adjustAmount}G`,
            newBalance: target.balance,
            transactionId: txId
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Admin: Get ALL transactions (for log view)
router.get('/admin/logs', isAuthenticated, hasRole(['admin', 'professor']), async (req, res) => {
    try {
        const skip = parseInt(req.query.skip) || 0;
        const limit = parseInt(req.query.limit) || 200;
        const logs = await Transaction.find()
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
