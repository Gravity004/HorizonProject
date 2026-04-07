/**
 * seed_herbs.js — Seeds herb items into the database for the Herbology Room.
 * Run: node seed_herbs.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Item = require('./models/Item');

const HERBS = [
    {
        name: 'Mandrake Seeds',
        description: 'Seeds of the Mandrake (Mandragora). Its cry is fatal to anyone who hears it. Grows in 72 hours.',
        type: 'seed', price: 80, rarity: 'rare',
        image: 'assets/images/seeds/Mandrake Seeds.png',
        effects: { growHours: 72, waterIntervalHours: 24, herbItemName: 'Mandrake Root' }
    },
    {
        name: "Devil's Snare Seeds",
        description: "Seeds of Devil's Snare — a dark vine that tightens when it senses struggle. Grows in 48 hours.",
        type: 'seed', price: 60, rarity: 'rare',
        image: 'assets/images/seeds/Devils Snare Seeds.png',
        effects: { growHours: 48, waterIntervalHours: 12, herbItemName: "Devil's Snare" }
    },
    {
        name: 'Venomous Tentacula Seeds',
        description: 'Seeds of the dangerous biting plant that spits venom. Grows in 96 hours.',
        type: 'seed', price: 100, rarity: 'epic',
        image: 'assets/images/seeds/Venomous Tentacula Seeds.png',
        effects: { growHours: 96, waterIntervalHours: 24, herbItemName: 'Venomous Tentacula Leaf' }
    },
    {
        name: 'Dittany Seeds',
        description: 'Dittany — a powerful healing herb. Essential for healing potions. Grows in 24 hours.',
        type: 'seed', price: 40, rarity: 'common',
        image: 'assets/images/seeds/Dittany Seeds.png',
        effects: { growHours: 24, waterIntervalHours: 8, herbItemName: 'Dittany' }
    },
    {
        name: 'Fluxweed Seeds',
        description: 'Fluxweed — must be picked at full moon for Polyjuice Potion. Grows in 36 hours.',
        type: 'seed', price: 50, rarity: 'rare',
        image: 'assets/images/seeds/Fluxweed Seeds.png',
        effects: { growHours: 36, waterIntervalHours: 12, herbItemName: 'Fluxweed' }
    },
    {
        name: 'Gillyweed Seeds',
        description: 'Gillyweed — consumed to breathe underwater and grow webbed feet temporarily. Grows in 48 hours.',
        type: 'seed', price: 70, rarity: 'rare',
        image: 'assets/images/seeds/Gillyweed Seeds.png',
        effects: { growHours: 48, waterIntervalHours: 16, herbItemName: 'Gillyweed' }
    },
    {
        name: 'Wolfsbane Seeds',
        description: 'Wolfsbane — key ingredient of the Wolfsbane Potion, extremely dangerous to grow. Grows in 120 hours.',
        type: 'seed', price: 150, rarity: 'epic',
        image: 'assets/images/seeds/Wolfsbane Seeds.png',
        effects: { growHours: 120, waterIntervalHours: 24, herbItemName: 'Wolfsbane' }
    },
    {
        name: 'Puffapod Seeds',
        description: 'Seeds of the Puffapod — beautiful pink pods that explode into flowers when touched. Grows in 18 hours.',
        type: 'seed', price: 30, rarity: 'common',
        image: 'assets/images/seeds/Puffapod Seeds.png',
        effects: { growHours: 18, waterIntervalHours: 6, herbItemName: 'Puffapod' }
    }
];

// Corresponding harvested herb items
const HERB_ITEMS = [
    { name: 'Mandrake Root', description: 'Root of the Mandrake. Used to restore Petrified victims.', type: 'material', price: 0, rarity: 'rare', image: 'assets/images/herbs/mandrake_root.png' },
    { name: "Devil's Snare", description: 'Dark vine cuttings. Used in dark potions.', type: 'material', price: 0, rarity: 'rare', image: 'assets/images/herbs/devils_snare.png' },
    { name: 'Venomous Tentacula Leaf', description: 'A single leaf from the Venomous Tentacula.', type: 'material', price: 0, rarity: 'epic', image: 'assets/images/herbs/tentacula_leaf.png' },
    { name: 'Dittany', description: 'Fresh Dittany herb. Used in healing potions.', type: 'material', price: 0, rarity: 'common', image: 'assets/images/herbs/dittany.png' },
    { name: 'Fluxweed', description: 'Freshly picked Fluxweed. An ingredient for Polyjuice Potion.', type: 'material', price: 0, rarity: 'rare', image: 'assets/images/herbs/fluxweed.png' },
    { name: 'Gillyweed', description: 'A handful of Gillyweed. Provides underwater breathing for an hour.', type: 'material', price: 0, rarity: 'rare', image: 'assets/images/herbs/gillyweed.png' },
    { name: 'Wolfsbane', description: 'Extremely toxic Wolfsbane herb. Handle with care.', type: 'material', price: 0, rarity: 'epic', image: 'assets/images/herbs/wolfsbane.png' },
    { name: 'Puffapod', description: 'A beautiful Puffapod pod ready to burst into flowers.', type: 'material', price: 0, rarity: 'common', image: 'assets/images/herbs/puffapod.png' }
];

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    let created = 0, skipped = 0;
    for (const item of [...HERB_ITEMS, ...HERBS]) {
        const exists = await Item.findOne({ name: item.name });
        if (exists) { skipped++; continue; }
        await Item.create(item);
        console.log(`  ✅ Created: ${item.name}`);
        created++;
    }

    console.log(`\nDone! Created: ${created}, Skipped (already exists): ${skipped}`);
    await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
