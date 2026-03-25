const mongoose = require('mongoose');

const herbPlotSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    slot: { type: Number, required: true, min: 0, max: 5 }, // 6 slots (0-5)
    seedName: { type: String, default: null },
    seedItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
    herbItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null }, // item given on harvest
    plantedAt: { type: Date, default: null },
    lastWateredAt: { type: Date, default: null },
    waterIntervalHours: { type: Number, default: 24 }, // how often must be watered
    harvestAt: { type: Date, default: null },  // when ready to harvest
    growHours: { type: Number, default: 48 },  // total grow time
    isReady: { type: Boolean, default: false },
    isHarvested: { type: Boolean, default: false },
    image: { type: String, default: null }
}, {
    toJSON: { versionKey: false }
});

// Each user can only have one document per slot
herbPlotSchema.index({ userId: 1, slot: 1 }, { unique: true });

module.exports = mongoose.model('HerbPlot', herbPlotSchema);
