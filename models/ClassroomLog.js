const mongoose = require('mongoose');

const classroomLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    room: { type: String, enum: ['potion', 'herbology', 'charms'], required: true },
    action: { type: String, required: true }, // 'brew', 'plant', 'water', 'harvest', 'cast_charm'
    details: { type: Object, default: {} },   // extra info (potion name, herb name, charm name, success/fail)
    timestamp: { type: Date, default: Date.now }
}, {
    toJSON: { versionKey: false }
});

module.exports = mongoose.model('ClassroomLog', classroomLogSchema);
