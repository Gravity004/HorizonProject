require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Item = require('./models/Item');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to target DB.');
        
        const existing = await Item.findOne({ name: 'Parchment Letter' });
        if (existing) {
            console.log('Letter already exists in Shop.');
            process.exit(0);
        }

        const imgPath = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\7c7d36a1-2260-4675-bdfd-530f87434421\\magical_parchment_envelope_1772878299353.png';
        const imgBuffer = fs.readFileSync(imgPath);
        const base64Img = `data:image/png;base64,${imgBuffer.toString('base64')}`;

        const letter = new Item({
            name: 'Parchment Letter',
            description: 'A magical blank parchment for sending formal letters or short messages to other wizards using the Owl Mailbox.',
            type: 'material',
            rarity: 'common',
            price: 15,
            image: base64Img
        });

        await letter.save();
        console.log('✨ Parchment Letter successfully stocked to the shop!');
        process.exit(0);
    } catch (err) {
        console.error('Seeding Error:', err);
        process.exit(1);
    }
};

run();
