const HerbPlot = require('../models/HerbPlot');
const ClassroomLog = require('../models/ClassroomLog');
const User = require('../models/User');
const Item = require('../models/Item');

class ClassroomController {
    // ─────────────────────────────
    //  HERBOLOGY
    // ─────────────────────────────

    async getMyHerbs(req, res) {
        try {
            const plots = await HerbPlot.find({ userId: req.user.id }).populate('seedItemId herbItemId');
            const now = new Date();
            for (const p of plots) {
                if (!p.isHarvested && p.harvestAt && now >= p.harvestAt) {
                    p.isReady = true;
                    await p.save();
                }
            }
            res.json(plots);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }

    async plantSeed(req, res) {
        const { slot, seedItemId } = req.body;
        if (slot === undefined || !seedItemId) return res.status(400).json({ message: 'slot and seedItemId are required' });

        try {
            const user = await User.findById(req.user.id);
            const invSlot = user.inventory.find(i => i.itemId.toString() === seedItemId);
            if (!invSlot || invSlot.quantity < 1) return res.status(400).json({ message: 'You do not have this seed' });

            const seedItem = await Item.findById(seedItemId);
            if (!seedItem || seedItem.type !== 'seed') return res.status(400).json({ message: 'Item is not a seed' });

            const existing = await HerbPlot.findOne({ userId: req.user.id, slot });
            if (existing && !existing.isHarvested) return res.status(400).json({ message: 'Slot already occupied' });

            invSlot.quantity -= 1;
            if (invSlot.quantity <= 0) user.inventory = user.inventory.filter(i => i.itemId.toString() !== seedItemId);
            user.markModified('inventory');
            await user.save();

            let growHours = (seedItem.effects && seedItem.effects.growHours) ? seedItem.effects.growHours : 48;
            if (user.dailyDivination && user.dailyDivination.buffType === 'herb_boost' &&
                user.dailyDivination.expiryDate && new Date() < new Date(user.dailyDivination.expiryDate)) {
                growHours = growHours * 0.7;
            }

            const waterIntervalHours = (seedItem.effects && seedItem.effects.waterIntervalHours) ? seedItem.effects.waterIntervalHours : 24;
            const now = new Date();
            const harvestAt = new Date(now.getTime() + growHours * 3600 * 1000);

            let herbItemId = null;
            if (seedItem.effects && seedItem.effects.herbItemName) {
                const herb = await Item.findOne({ name: seedItem.effects.herbItemName });
                if (herb) herbItemId = herb._id;
            }

            const plot = await HerbPlot.findOneAndUpdate(
                { userId: req.user.id, slot },
                {
                    userId: req.user.id, slot,
                    seedName: seedItem.name,
                    seedItemId: seedItem._id,
                    herbItemId,
                    plantedAt: now,
                    lastWateredAt: now,
                    waterIntervalHours,
                    harvestAt,
                    growHours,
                    isReady: false,
                    isHarvested: false,
                    image: seedItem.image || null
                },
                { upsert: true, new: true }
            );

            await ClassroomLog.create({
                userId: req.user.id, username: user.username,
                room: 'herbology', action: 'plant',
                details: { seed: seedItem.name, slot }
            });

            res.json({ message: `Planted ${seedItem.name} in slot ${slot}`, plot });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }

    async waterPlant(req, res) {
        const { slot } = req.body;
        try {
            const plot = await HerbPlot.findOne({ userId: req.user.id, slot });
            if (!plot || plot.isHarvested || !plot.seedName) return res.status(404).json({ message: 'No plant in this slot' });

            const now = new Date();
            const hoursSinceWatered = plot.lastWateredAt ? (now - plot.lastWateredAt) / 3600000 : 999;
            const cooldownHours = plot.waterIntervalHours * 0.5;
            if (hoursSinceWatered < cooldownHours) {
                const nextWater = new Date(plot.lastWateredAt.getTime() + cooldownHours * 3600000);
                return res.status(400).json({ message: `Wait before watering again`, nextWaterAt: nextWater });
            }

            plot.lastWateredAt = now;
            await plot.save();

            const user = await User.findById(req.user.id);
            await ClassroomLog.create({
                userId: req.user.id, username: user.username,
                room: 'herbology', action: 'water',
                details: { seed: plot.seedName, slot }
            });

            res.json({ message: `Watered ${plot.seedName}`, plot });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }

    async harvestPlant(req, res) {
        const { slot } = req.body;
        try {
            const plot = await HerbPlot.findOne({ userId: req.user.id, slot });
            if (!plot || plot.isHarvested) return res.status(404).json({ message: 'Nothing to harvest' });

            const now = new Date();
            if (now < plot.harvestAt) {
                return res.status(400).json({ message: 'Plant is not ready yet', harvestAt: plot.harvestAt });
            }

            plot.isReady = true;
            plot.isHarvested = true;
            await plot.save();

            const user = await User.findById(req.user.id);
            let harvestedName = plot.seedName ? plot.seedName.replace(' Seed', '').replace(' Seeds', '') : 'Herb';
            let bonusMsg = '';
            if (plot.herbItemId) {
                let harvestQty = 1;
                if (user.activePetId) {
                    const activePet = user.pets.find(p => p._id.toString() === user.activePetId.toString());
                    if (activePet) {
                        const doubleBuff = activePet.buffs.find(b => b.target === 'herb_double_chance');
                        if (doubleBuff && Math.random() * 100 < doubleBuff.value) {
                            harvestQty = 2;
                            bonusMsg = ` 🐸 ${activePet.name}'s blessing doubled your harvest!`;
                        }
                    }
                }

                if (harvestQty === 1 && user.dailyDivination && user.dailyDivination.buffType === 'herb_double_chance' &&
                    user.dailyDivination.expiryDate && new Date() < new Date(user.dailyDivination.expiryDate)) {
                    if (Math.random() * 100 < 20) {
                        harvestQty = 2;
                        bonusMsg = ` 🌟 The Harvest doubled your yield!`;
                    }
                }

                const existingIdx = user.inventory.findIndex(i => i.itemId.toString() === plot.herbItemId.toString());
                if (existingIdx > -1) user.inventory[existingIdx].quantity += harvestQty;
                else user.inventory.push({ itemId: plot.herbItemId, quantity: harvestQty });
                user.markModified('inventory');
                await user.save();
                const herbItem = await Item.findById(plot.herbItemId);
                if (herbItem) harvestedName = herbItem.name;
            }

            await ClassroomLog.create({
                userId: req.user.id, username: user.username,
                room: 'herbology', action: 'harvest',
                details: { herb: harvestedName, slot }
            });

            res.json({ message: `Harvested ${harvestedName}!${bonusMsg}`, harvestedName });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }

    // ─────────────────────────────
    //  POTION
    // ─────────────────────────────

    async brewPotion(req, res) {
        const { potionName } = req.body;
        if (!potionName) return res.status(400).json({ message: 'potionName is required' });

        try {
            const user = await User.findById(req.user.id);
            await ClassroomLog.create({
                userId: req.user.id, username: user.username,
                room: 'potion', action: 'brew',
                details: { potion: potionName }
            });
            res.json({ message: `Successfully brewed ${potionName}! (Class demonstration)` });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }

    // ─────────────────────────────
    //  CHARMS
    // ─────────────────────────────

    async castCharm(req, res) {
        const { charmName, success } = req.body;
        if (!charmName) return res.status(400).json({ message: 'charmName is required' });

        try {
            const user = await User.findById(req.user.id);
            await ClassroomLog.create({
                userId: req.user.id, username: user.username,
                room: 'charms', action: 'cast_charm',
                details: { charm: charmName, success: !!success }
            });
            res.json({ message: success ? `✨ ${charmName} cast successfully!` : `The spell fizzled... Try again.`, success: !!success });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }

    // ─────────────────────────────
    //  ADMIN
    // ─────────────────────────────

    async getLogs(req, res) {
        try {
            const { room, username, page = 1, limit = 50 } = req.query;
            const query = {};
            if (room) query.room = room;
            if (username) query.username = new RegExp(username, 'i');
            
            const total = await ClassroomLog.countDocuments(query);
            const logs = await ClassroomLog.find(query)
                .sort({ timestamp: -1 })
                .skip((page - 1) * limit)
                .limit(Number(limit));
            res.json({ logs, total, page: Number(page), totalPages: Math.ceil(total / limit) });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
}

module.exports = new ClassroomController();
