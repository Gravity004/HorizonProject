const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Item = require('../models/Item');
const mongoose = require('mongoose');

// Middleware to check authentication
const ensureAuth = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ message: 'Not authenticated' });
};

// --- Helpers ---
const isToday = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
};

const generatePetBuffs = (rarity) => {
    const buffs = [];
    const rand = Math.random();
    if (rarity === 'legendary') {
        buffs.push({ target: 'max_hp', value: 50 });
        buffs.push({ target: 'forest_drop_rate', value: 15 });
    } else if (rarity === 'epic') {
        buffs.push({ target: 'max_hp', value: 30 });
        if (rand > 0.5) buffs.push({ target: 'forest_drop_rate', value: 10 });
    } else if (rarity === 'rare') {
        buffs.push({ target: 'max_hp', value: 15 });
        if (rand > 0.7) buffs.push({ target: 'craft_time_reduction', value: 10 });
    } else {
        // common
        buffs.push({ target: 'max_hp', value: 10 });
    }
    return buffs;
};

// 1. Get Incubator & Pets data
router.get('/', ensureAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('incubator pets activePetId');
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error fetching pets data' });
    }
});

// 2. Put egg into incubator
router.post('/incubate', ensureAuth, async (req, res) => {
    try {
        const { itemId } = req.body;
        const user = await User.findById(req.user._id);

        if (user.incubator && user.incubator.eggItemId) {
            return res.status(400).json({ message: 'Incubator is already occupied!' });
        }

        // Check if user has the item
        const invItemIndex = user.inventory.findIndex(i => i.itemId.toString() === itemId);
        if (invItemIndex === -1 || user.inventory[invItemIndex].quantity < 1) {
            return res.status(400).json({ message: 'You do not own this egg.' });
        }

        const itemInfo = await Item.findById(itemId);
        if (!itemInfo || !itemInfo.name.toLowerCase().includes('egg')) {
            return res.status(400).json({ message: 'This item is not a valid egg.' });
        }

        // Deduct item
        user.inventory[invItemIndex].quantity -= 1;
        if (user.inventory[invItemIndex].quantity <= 0) {
            user.inventory.splice(invItemIndex, 1);
        }

        // Determine required days based on rarity
        let reqDays = 3;
        if (itemInfo.rarity === 'rare') reqDays = 4;
        if (itemInfo.rarity === 'epic') reqDays = 5;
        if (itemInfo.rarity === 'legendary') reqDays = 7;

        user.incubator = {
            eggItemId: itemInfo._id,
            eggName: itemInfo.name,
            eggImage: itemInfo.image,
            eggRarity: itemInfo.rarity,
            requiredDays: reqDays,
            warmedDays: 0,
            lastWarmedDate: null,
            isReadyToHatch: false
        };

        await user.save();
        res.json({ message: 'Egg placed in incubator!', incubator: user.incubator, inventory: user.inventory });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error placing egg in incubator.' });
    }
});

// 3. Give warmth
router.post('/warm', ensureAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const inc = user.incubator;

        if (!inc || !inc.eggItemId) {
            return res.status(400).json({ message: 'Incubator is empty.' });
        }
        if (inc.isReadyToHatch) {
            return res.status(400).json({ message: 'The egg is already ready to hatch!' });
        }
        if (isToday(inc.lastWarmedDate)) {
            return res.status(400).json({ message: 'You have already warmed the egg today.' });
        }

        inc.lastWarmedDate = new Date();
        inc.warmedDays += 1;

        if (inc.warmedDays >= inc.requiredDays) {
            inc.isReadyToHatch = true;
        }

        await user.save();
        res.json({ 
            message: inc.isReadyToHatch ? 'The egg is glowing! It is ready to hatch!' : 'You imparted magical warmth to the egg.', 
            incubator: inc 
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error warming egg.' });
    }
});

// 4. Hatch egg
router.post('/hatch', ensureAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const inc = user.incubator;

        if (!inc || !inc.eggItemId || !inc.isReadyToHatch) {
            return res.status(400).json({ message: 'There is no egg ready to hatch.' });
        }

        const rarity = inc.eggRarity || 'common';
        
        // Generate pet
        const petNames = {
            'common': ['Fluffy Owl', 'Toad', 'Black Cat', 'Puffskein'],
            'rare': ['Phoenix Chick', 'Baby Niffler', 'Bowtruckle'],
            'epic': ['Hippogriff Foal', 'Thestral Foal', 'Baby Naga'],
            'legendary': ['Baby Dragon', 'Miniature Garuda', 'Golden Qilin']
        };

        const namesList = petNames[rarity] || petNames['common'];
        const randomName = namesList[Math.floor(Math.random() * namesList.length)];
        const buffs = generatePetBuffs(rarity);

        const newPet = {
            name: randomName,
            petType: randomName.toLowerCase().replace(/\s+/g, '_'),
            image: inc.eggImage, // Can ideally be swapped to a hatched image later
            rarity: rarity,
            buffs: buffs,
            acquiredAt: new Date()
        };

        user.pets.push(newPet);
        
        // Clear incubator
        user.incubator = {
            eggItemId: null,
            eggName: null,
            eggImage: null,
            eggRarity: 'common',
            requiredDays: 3,
            warmedDays: 0,
            lastWarmedDate: null,
            isReadyToHatch: false
        };

        await user.save();

        const insertedPet = user.pets[user.pets.length - 1];
        res.json({ message: `Hatched! Say hello to your new familiar: ${randomName} 💖`, pet: insertedPet, incubator: user.incubator });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error hatching egg.' });
    }
});

// 5. Select Active Pet
router.post('/equip', ensureAuth, async (req, res) => {
    try {
        const { petId } = req.body;
        const user = await User.findById(req.user._id);

        let newMaxHp = 100; // base max HP

        if (!petId) {
            user.activePetId = null;
            user.maxHealth = newMaxHp;
            if (user.health > user.maxHealth) user.health = user.maxHealth;
            await user.save();
            return res.json({ message: 'Pet unequipped.', activePetId: null, maxHealth: user.maxHealth });
        }

        const pet = user.pets.find(p => p._id.toString() === petId);
        if (!pet) {
            return res.status(400).json({ message: 'Pet not found in your collection.' });
        }

        const hpBuff = pet.buffs.find(b => b.target === 'max_hp');
        if (hpBuff) newMaxHp += hpBuff.value;

        user.activePetId = petId;
        user.maxHealth = newMaxHp;
        await user.save();
        res.json({ message: 'Pet equipped successfully!', activePetId: petId, maxHealth: user.maxHealth });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error equipping pet.' });
    }
});

module.exports = router;
