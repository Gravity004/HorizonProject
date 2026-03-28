require('dotenv').config();
const mongoose = require('mongoose');
const Item = require('./models/Item');

const imageUpdates = {
    'Flobberworm Mucus': '/assets/images/iteminshop/Flobberworm mucus.png',
    'Glowworm Powder': '/assets/images/iteminshop/Glowworm Powder.png',
    'Fairy Berry': '/assets/images/iteminshop/Fairy berry.png',
    'Moonflower Petal': '/assets/images/iteminshop/Moonflower petal.png',
    'Silverleaf Herb': '/assets/images/iteminshop/Silverleaf Hreb.png', // Matches the typo in the file system
    'Forest Mint': '/assets/images/iteminshop/Forest mint.png',
    'Ghost Mushroom': '/assets/images/iteminshop/Ghost mushrooms.png',
    'Crystal Dewdrop': '/assets/images/iteminshop/Crystal Dewdrop.png',
    'Ancient Tree Resin': '/assets/images/iteminshop/Ancient Tree Resin.png',
    'Spider Silk Thread': '/assets/images/iteminshop/Spider Silk Thread.png',
    
    'Unicorn Hair Strand': '/assets/images/iteminshop/Unicorn Hair Strand.png',
    'Ashwinder Egg Shell': '/assets/images/iteminshop/Ashwinder Egg Shell.png',
    'Dragon Scale Fragment': '/assets/images/iteminshop/Dragon Scale Fragment.png',
    'Demiguise Hair': '/assets/images/iteminshop/Demiguise Hair.png',
    'Moonlit Feather': '/assets/images/iteminshop/Moonlit Feather.png',
    'Hippogriff Feather Tip': '/assets/images/iteminshop/Hippogriff Feather Tip.png',
    
    'Mystery Egg': '/assets/images/picitem/Egg.png'
};

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        for (const [name, imagePath] of Object.entries(imageUpdates)) {
            const result = await Item.updateOne({ name }, { $set: { image: imagePath } });
            if (result.modifiedCount > 0) {
                console.log(`✅ Updated image for: ${name} -> ${imagePath}`);
            } else {
                console.log(`⏭  No update needed or item not found for: ${name}`);
            }
        }

        console.log('Finished updating image paths');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
