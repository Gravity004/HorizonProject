const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const User = require('../models/User');

const QUEST_TYPES = [
    { type: 'explore_himmapan', target: 2, label: 'เอาตัวรอดในป่าหิมพานต์ 2 ครั้ง', rng: () => ({ target: 1 + Math.floor(Math.random() * 2) }) },
    { type: 'craft_potion', target: 2, label: 'ปรุงยา 2 ขวด', rng: () => ({ target: 1 + Math.floor(Math.random() * 2) }) },
    { type: 'buy_item', target: 1, label: 'ซื้อไอเทมจากร้านค้า 1 ครั้ง', rng: () => ({ target: 1 }) },
    { type: 'send_gift', target: 1, label: 'ส่งของขวัญให้เพื่อน 1 ครั้ง', rng: () => ({ target: 1 }) }
];

function isNewQuestPeriod(date) {
    if (!date) return true;
    const now = new Date();
    // Convert to Thailand time (UTC+7)
    const TH_OFFSET = 7 * 60; // minutes
    const nowTH = new Date(now.getTime() + TH_OFFSET * 60000);
    const dateTH = new Date(date.getTime() + TH_OFFSET * 60000);

    // Determine the last 8:00 AM Thailand boundary before now
    function getResetBoundary(dt) {
        const y = dt.getUTCFullYear();
        const mo = dt.getUTCMonth();
        const d = dt.getUTCDate();
        const h = dt.getUTCHours();
        // 8 AM TH = 8 AM UTC+7 = 1 AM UTC (hour 1 in UTC)
        if (h >= 1) {
            return new Date(Date.UTC(y, mo, d, 1, 0, 0, 0));
        } else {
            // before 1 AM UTC = before 8 AM TH => previous day's 8 AM TH
            const prev = new Date(Date.UTC(y, mo, d - 1, 1, 0, 0, 0));
            return prev;
        }
    }

    const nowBoundary = getResetBoundary(now);
    const dateBoundary = getResetBoundary(date);
    return nowBoundary > dateBoundary;
}

function generateQuests() {
    // Shuffle and pick 3 unique quests
    const shuffled = QUEST_TYPES.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3);
    
    return selected.map(q => {
        const specs = q.rng();
        const rewardType = Math.random() > 0.5 ? 'galleons' : 'material';
        const rewardAmount = rewardType === 'galleons' ? Math.floor(10 + Math.random() * 41) : 1; // 10-50G or 1 material
        return {
            questType: q.type,
            target: specs.target,
            progress: 0,
            isCompleted: false,
            isClaimed: false,
            rewardType,
            rewardAmount
        };
    });
}

// Get quests or generate if new day
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        
        if (isNewQuestPeriod(user.lastQuestReset)) {
            user.dailyQuests = generateQuests();
            user.lastQuestReset = new Date();
            await user.save();
        }
        res.json({ quests: user.dailyQuests });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Claim a completed quest
router.post('/claim', isAuthenticated, async (req, res) => {
    try {
        const { questId } = req.body; // _id of the quest subdocument
        const user = await User.findById(req.user._id);
        
        const quest = user.dailyQuests.id(questId);
        if (!quest) return res.status(404).json({ message: 'Quest not found' });
        
        if (!quest.isCompleted) return res.status(400).json({ message: 'Quest not completed yet' });
        if (quest.isClaimed) return res.status(400).json({ message: 'Quest already claimed' });
        
        // Give reward
        let rewardMsg = '';
        if (quest.rewardType === 'galleons') {
            user.balance += quest.rewardAmount;
            rewardMsg = `ได้รับ ${quest.rewardAmount} Galleons!`;
        } else if (quest.rewardType === 'material') {
            const Item = require('../models/Item');
            // Give a random common/rare material
            const materials = await Item.find({ type: 'material', rarity: { $in: ['common', 'rare'] } });
            if (materials.length > 0) {
                const randomMat = materials[Math.floor(Math.random() * materials.length)];
                const existing = user.inventory.find(i => i.itemId.toString() === randomMat._id.toString());
                if (existing) {
                    existing.quantity += quest.rewardAmount;
                } else {
                    user.inventory.push({ itemId: randomMat._id, quantity: quest.rewardAmount });
                }
                rewardMsg = `ได้รับ ${randomMat.name} x${quest.rewardAmount}!`;
            } else {
                user.balance += 50; // fallback
                rewardMsg = `ได้รับ 50 Galleons!`;
            }
        }
        
        quest.isClaimed = true;
        user.markModified('inventory'); // If inventory changed
        await user.save();
        
        res.json({ message: rewardMsg, balance: user.balance, quests: user.dailyQuests });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
