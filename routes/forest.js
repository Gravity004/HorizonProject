// routes/forest.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Item = require('../models/Item');
const { isAuthenticated } = require('../middleware/auth');

// Seed to randomize forest opening times daily
// We will generate a daily seed based on the current date, ensuring it changes every day
function getDailyForestWindow() {
    const now = new Date();
    // Use Thailand time for calculation
    const thTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    
    // Create a deterministic seed based on date string "YYYY-MM-DD"
    const dateStr = `${thTime.getUTCFullYear()}-${thTime.getUTCMonth()}-${thTime.getUTCDate()}`;
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
        hash = Math.imul(31, hash) + dateStr.charCodeAt(i) | 0;
    }
    
    // Convert hash to an hour between 0 and 23
    const startHour = Math.abs(hash) % 24;
    return { startHour, endHour: (startHour + 1) % 24 }; // Open for 1 hour
}

router.get('/status', isAuthenticated, async (req, res) => {
    const window = getDailyForestWindow();
    const now = new Date();
    const thHour = new Date(now.getTime() + (7 * 60 * 60 * 1000)).getUTCHours();
    
    const user = await User.findById(req.user.id);
    const isAdmin = user.roles && (user.roles.includes('admin') || user.roles.includes('professor'));
    
    const isOpen = isAdmin || (thHour === window.startHour || thHour === window.endHour);
    
    res.json({
        isOpen,
        hint: `The forest shifts around hour ${window.startHour}:00 TH Time.`
    });
});

router.post('/gather', isAuthenticated, async (req, res) => {
    try {
        const window = getDailyForestWindow();
        const now = new Date();
        const thTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
        const thHour = thTime.getUTCHours();

        const user = await User.findById(req.user.id);
        const isAdmin = user.roles && (user.roles.includes('admin') || user.roles.includes('professor'));

        // 1. Is the forest open?
        if (!isAdmin && (thHour !== window.startHour && thHour !== window.endHour)) {
           return res.status(400).json({ message: 'The Himmapan Forest is currently closed. It only appears for 1 hour a day.' });
        }

        // 2. Has user gathered today? Count based on 00:00 TH Time
        if (!isAdmin && user.lastForestGatherDate) {
            const lastGather = new Date(user.lastForestGatherDate);
            const thLastGather = new Date(lastGather.getTime() + (7 * 60 * 60 * 1000));
            
            if (
                thLastGather.getUTCFullYear() === thTime.getUTCFullYear() &&
                thLastGather.getUTCMonth() === thTime.getUTCMonth() &&
                thLastGather.getUTCDate() === thTime.getUTCDate()
            ) {
                return res.status(400).json({ message: 'You have already explored the forest today. Rest and return tomorrow.' });
            }
        }

        // 3. Roll for rarity drop
        // Probabilities: Common 55%, Uncommon 25%, Rare 15%, Legendary 5%
        const roll = Math.random() * 100;
        let selectedRarity = 'common';
        
        if (roll <= 5) {
            selectedRarity = 'legendary';
        } else if (roll <= 20) { // 5 to 20 = 15%
            selectedRarity = 'rare';
        } else if (roll <= 45) { // 20 to 45 = 25%
            selectedRarity = 'uncommon';
        } // 45 to 100 = 55% common (default)

        // 4. Fetch random item of that rarity
        const potentialItems = await Item.find({ rarity: selectedRarity, type: 'material' });
        
        if (!potentialItems || potentialItems.length === 0) {
            return res.status(500).json({ message: 'No materials found in the database.' });
        }

        const randomItem = potentialItems[Math.floor(Math.random() * potentialItems.length)];

        // 5. Give to user
        const existingItemIndex = user.inventory.findIndex(i => i.itemId.toString() === randomItem._id.toString());
        const quantityGained = 1; // Or random amount?
        
        if (existingItemIndex > -1) {
            user.inventory[existingItemIndex].quantity += quantityGained;
        } else {
            user.inventory.push({ itemId: randomItem._id, quantity: quantityGained });
        }

        user.lastForestGatherDate = now;
        user.markModified('inventory');
        await user.save();

        res.json({
            message: `You ventured into the Himmapan Forest and found: ${randomItem.name}!`,
            item: randomItem,
            rarity: selectedRarity
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
