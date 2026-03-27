const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    type: { type: String, enum: ['material', 'potion', 'equipment', 'quest', 'food', 'seed', 'egg'], required: true },
    price: { type: Number, required: true }, // Buy price
    sellPrice: { type: Number }, // Sell price (usually lower)
    image: { type: String }, // URL or path to image
    rarity: { type: String, enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'], default: 'common' },
    effects: { type: Object }, // JSON for special effects stats
    mailboxMessage: { type: String } // Message sent to mailbox when equipment is purchased
}, {
    toJSON: { versionKey: false }
});

module.exports = mongoose.model('Item', itemSchema);
