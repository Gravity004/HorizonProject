const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    discordId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    avatar: { type: String },
    roles: [{ type: String }], // Array of role IDs
    house: { type: String, enum: ['Garuda', 'Naga', 'Qilin', 'Erawan', 'None'], default: 'None' },
    accessToken: { type: String }, // ✅ เพิ่มบรรทัดนี้
    balance: { type: Number, default: 100 }, // Starting gold
    lastDailyReward: { type: Date, default: null }, // Tracking daily reward
    lastHealthDecrease: { type: Date, default: null }, // Tracking daily HP penalty
    health: { type: Number, default: 100 },
    maxHealth: { type: Number, default: 100 },
    inventory: [{
        itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
        quantity: { type: Number, default: 1 }
    }],
    activeEffects: [{
        effectId: { type: String, enum: ['love_potion'] },
        casterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        casterName: { type: String },
        expiresAt: { type: Date }
    }],
    lastQuestReset: { type: Date, default: null },
    dailyQuests: [{
        questType: { type: String }, // e.g. 'craft_potion', 'explore_himmapan', 'buy_item'
        target: { type: Number, default: 1 },
        progress: { type: Number, default: 0 },
        isCompleted: { type: Boolean, default: false },
        isClaimed: { type: Boolean, default: false },
        rewardType: { type: String, enum: ['galleons', 'material'] },
        rewardAmount: { type: Number, default: 0 }
    }],
    incubator: {
        eggItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
        eggName: { type: String, default: null },
        eggImage: { type: String, default: null },
        eggRarity: { type: String, default: 'common' }, // Determines required days (3-7)
        requiredDays: { type: Number, default: 3 },
        warmedDays: { type: Number, default: 0 },
        lastWarmedDate: { type: Date, default: null },
        isReadyToHatch: { type: Boolean, default: false }
    },
    pets: [{
        name: { type: String },
        petType: { type: String }, // e.g. 'owl', 'cat', 'mini_naga'
        image: { type: String },
        rarity: { type: String },
        buffs: [{
            target: { type: String }, // 'max_hp', 'forest_drop_rate', 'craft_time'
            value: { type: Number }
        }],
        acquiredAt: { type: Date, default: Date.now }
    }],
    activePetId: { type: mongoose.Schema.Types.ObjectId, default: null }, // _id of the pet in pets array
    isDetained: { type: Boolean, default: false },
    detentionEndDate: { type: Date, default: null },
    detentionReason: { type: String, default: '' },
    dailyDivination: {
        buffType: { type: String, default: null },
        expiryDate: { type: Date, default: null }
    },
    createdAt: { type: Date, default: Date.now }
}, {
    toJSON: { versionKey: false }
});

module.exports = mongoose.model('User', userSchema);
