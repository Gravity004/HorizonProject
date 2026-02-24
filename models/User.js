const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    discordId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    avatar: { type: String },
    roles: [{ type: String }], // Array of role IDs
    house: { type: String, enum: ['Garuda', 'Naga', 'Qilin', 'Erawan', 'None'], default: 'None' },
    accessToken: { type: String }, // ✅ เพิ่มบรรทัดนี้
    balance: { type: Number, default: 1000 }, // Starting gold
    inventory: [{
        itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
        quantity: { type: Number, default: 1 }
    }],
    createdAt: { type: Date, default: Date.now }
}, {
    toJSON: { versionKey: false }
});

module.exports = mongoose.model('User', userSchema);
