const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    discordId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    avatar: { type: String },
    roles: [{ type: String }], // Array of role IDs
    house: { type: String, enum: ['Garuda', 'Naga', 'Qilin', 'Erawan', 'None'], default: 'None' },
    accessToken: { type: String },
    balance: { type: Number, default: 100 }, // Starting gold
    lastDailyReward: { type: Date, default: null },
    lastHealthDecrease: { type: Date, default: null },
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
        questType: { type: String },
        target: { type: Number, default: 1 },
        progress: { type: Number, default: 0 },
        isCompleted: { type: Boolean, default: false },
        isClaimed: { type: Boolean, default: false },
        rewardType: { type: String, enum: ['galleons', 'material'] },
        rewardAmount: { type: Number, default: 0 }
    }],
    // ─── Incubator ───
    incubator: {
        eggItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
        eggName: { type: String, default: null },
        eggImage: { type: String, default: null },
        eggRarity: { type: String, default: 'common' },
        hatchAt: { type: Date, default: null },           // absolute hatch time (72 hr from placement)
        potionBoostHours: { type: Number, default: 0 },   // total hours skipped via Incubation Potion
        isReadyToHatch: { type: Boolean, default: false }
    },
    // ─── Pets ───
    pets: [{
        name: { type: String },
        species: { type: String }, // 'owl', 'toad', 'kneazle', 'seal', 'puffskein', 'niffler', 'hippogriff', 'thestral', 'dragon', 'qilin'
        petType: { type: String }, // display name / slug
        image: { type: String },
        rarity: { type: String, enum: ['common', 'rare', 'epic', 'legendary'], default: 'common' },
        buffs: [{
            target: { type: String }, // 'shop_bonus_chance', 'herb_double_chance', 'craft_safety', 'heal_chance', 'max_hp'
            value: { type: Number }
        }],
        // Affection & Feeding
        hunger: { type: Number, default: 50 },       // 0 = starving, 100 = full
        affection: { type: Number, default: 0 },     // 0–100
        affectionLevel: { type: Number, default: 1 }, // 1 (Common), 2 (Rare), 3 (Epic+)
        lastFed: { type: Date, default: null },
        lastPetted: { type: Date, default: null },
        acquiredAt: { type: Date, default: Date.now }
    }],
    activePetId: { type: mongoose.Schema.Types.ObjectId, default: null },
    // ─── Detention ───
    isDetained: { type: Boolean, default: false },
    detentionEndDate: { type: Date, default: null },
    detentionReason: { type: String, default: '' },
    // ─── Divination ───
    dailyDivination: {
        buffType: { type: String, default: null },
        buffName: { type: String, default: null },
        isOmen: { type: Boolean, default: false },  // true = bad omen (debuff)
        readingType: { type: String, default: null }, // 'tea_leaves' | 'tarot'
        symbol: { type: String, default: null },      // card name or tea-shape name
        expiryDate: { type: Date, default: null }
    },
    // ─── Curse Quest ───
    curseQuest: {
        isActive: { type: Boolean, default: false },
        questType: { type: String, default: 'craft_cleansing_potion' },
        deadlineAt: { type: Date, default: null },
        penaltyGalleons: { type: Number, default: 50 },
        isCleansed: { type: Boolean, default: false }
    },
    createdAt: { type: Date, default: Date.now }
}, {
    toJSON: { versionKey: false }
});

module.exports = mongoose.model('User', userSchema);
