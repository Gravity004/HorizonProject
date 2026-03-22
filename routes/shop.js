const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Item = require('../models/Item');
const User = require('../models/User');
const { isAuthenticated, hasRole } = require('../middleware/auth');
const { sanitizeBody } = require('../middleware/sanitize');

// Multer config for image uploads
// Multer config for image uploads (Memory Storage for Base64)
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error('Only image files are allowed'));
    }
});

// Get all items
router.get('/items', async (req, res) => {
    try {
        const items = await Item.find();
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Buy item
router.post('/buy', isAuthenticated, sanitizeBody, async (req, res) => {
    const { itemId, quantity } = req.body;

    try {
        const item = await Item.findById(itemId);
        if (!item) return res.status(404).json({ message: 'Item not found' });

        const user = await User.findById(req.user.id);
        const totalCost = item.price * quantity;

        if (user.balance < totalCost) {
            return res.status(400).json({ message: 'Insufficient funds' });
        }

        user.balance -= totalCost;

        const existingItemIndex = user.inventory.findIndex(i => i.itemId.toString() === itemId);
        if (existingItemIndex > -1) {
            user.inventory[existingItemIndex].quantity += quantity;
        } else {
            user.inventory.push({ itemId, quantity });
        }

        user.markModified('inventory');
        await user.save();

        // ✅ ส่ง mailbox message เมื่อซื้อ equipment (ถ้า admin ได้กำหนดข้อความไว้)
        if (item.type === 'equipment' && item.mailboxMessage) {
            const Gift = require('../models/Gift');
            const letter = new Gift({
                senderId: user._id,
                senderName: 'Rachata School of Wizardry',
                recipientId: user._id,
                recipientName: user.username,
                itemId: item._id,
                quantity: 0,
                message: item.mailboxMessage,
                isClaimed: false
            });
            await letter.save();
        }

        res.json({ message: 'Purchase successful', balance: user.balance, inventory: user.inventory });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Use/Consume item from inventory
router.post('/use', isAuthenticated, sanitizeBody, async (req, res) => {
    const { itemId, targetUsername } = req.body;

    try {
        const user = await User.findById(req.user.id);
        const slot = user.inventory.find(i => i.itemId.toString() === itemId);

        if (!slot || slot.quantity <= 0) {
            return res.status(400).json({ message: 'Item not in inventory' });
        }

        slot.quantity -= 1;
        if (slot.quantity <= 0) {
            user.inventory = user.inventory.filter(i => i.itemId.toString() !== itemId);
        }

        const item = await Item.findById(itemId);
        let healAmount = 0;
        let healthMsg = '';

        if (item) {
            if (item.name === 'Amortentia Potion') {
                if (!targetUsername) return res.status(400).json({ message: 'Target username is required for Love Potion!' });

                const target = await User.findOne({ username: targetUsername });
                if (!target) return res.status(404).json({ message: 'Target user not found' });

                const isAdmin = target.roles && (target.roles.includes('admin') || target.roles.includes('professor'));

                slot.quantity -= 1;
                if (slot.quantity <= 0) {
                    user.inventory = user.inventory.filter(i => i.itemId.toString() !== itemId);
                }
                user.markModified('inventory');
                await user.save();

                if (!isAdmin) {
                    target.activeEffects = target.activeEffects || [];
                    target.activeEffects = target.activeEffects.filter(e => e.effectId !== 'love_potion');

                    target.activeEffects.push({
                        effectId: 'love_potion',
                        casterId: user._id,
                        casterName: user.username,
                        expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hr
                    });

                    target.markModified('activeEffects');
                    await target.save();

                    const Gift = require('../models/Gift');
                    const gift = new Gift({
                        senderId: user._id,
                        senderName: 'System',
                        recipientId: target._id,
                        recipientName: target.username,
                        itemId: item._id,
                        quantity: 0,
                        message: `คุณถูกใช้คาถา Amortentia Potion (น้ำยาลุ่มหลง) เป็นเวลา 1 ชั่วโมง! การกระทำถัดไปในธนาคารหรือการส่งของของคุณอาจถูกครอบงำ...`,
                        isClaimed: false
                    });
                    await gift.save();

                    return res.json({
                        message: `Love potion successfully cast on ${target.username}!`,
                        itemName: item.name,
                        inventory: user.inventory
                    });
                } else {
                    return res.json({
                        message: `You consumed the potion, but ${target.username} is immune!`,
                        itemName: item.name,
                        inventory: user.inventory
                    });
                }
            }

            if (item.name === 'ชาอัญชัน') healAmount = 10;
            else if (item.name === 'ต้มยำ') healAmount = 50;
            else if (item.type === 'food') healAmount = 25;

            if (healAmount > 0) {
                user.health = Math.min(user.maxHealth, user.health + healAmount);
                healthMsg = ` (Restored +${healAmount} HP)`;
            }
        }

        user.markModified('inventory');
        await user.save();

        res.json({
            message: `Consumed ${item ? item.name : 'item'} successfully${healthMsg}`,
            itemName: item ? item.name : 'Unknown',
            newHealth: user.health,
            inventory: user.inventory
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Upload image (Admin only) - returns Base64 URL
router.post('/upload', isAuthenticated, hasRole(['admin', 'professor']), upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No image uploaded' });

    // Convert buffer to Base64 string
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    res.json({ imageUrl: base64Image });
});

// Add item (Admin only)
router.post('/add', isAuthenticated, hasRole(['admin', 'professor']), sanitizeBody, async (req, res) => {
    const { name, type, price, image, rarity, effects, description } = req.body;

    // Check for existing item with the same name
    const existingItem = await Item.findOne({ name });
    if (existingItem) {
        return res.status(400).json({ message: 'Item with this name already exists in the shop!' });
    }

    const newItem = new Item({
        name,
        description,
        type,
        price,
        image: image || '/assets/images/item.png',
        rarity: rarity || 'common',
        effects
    });

    try {
        const savedItem = await newItem.save();
        res.json(savedItem);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Edit item (Admin only)
router.put('/:id', isAuthenticated, hasRole(['admin', 'professor']), sanitizeBody, async (req, res) => {
    try {
        const updated = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return res.status(404).json({ message: 'Item not found' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete item (Admin only)
router.delete('/:id', isAuthenticated, hasRole(['admin', 'professor']), async (req, res) => {
    try {
        await Item.findByIdAndDelete(req.params.id);
        res.json({ message: 'Item removed from archives.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
