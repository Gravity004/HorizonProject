const mongoose = require('mongoose');

const giftSchema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, required: true },
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipientName: { type: String, required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' }, // The item being gifted
    quantity: { type: Number, default: 1 },
    message: { type: String }, // The letter attached to the gift
    isClaimed: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
}, {
    toJSON: { versionKey: false }
});

module.exports = mongoose.model('Gift', giftSchema);
