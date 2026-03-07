require('dotenv').config();
const mongoose = require('mongoose');
const Item = require('./models/Item');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to target DB.');

        const teaExists = await Item.findOne({ name: 'ชาอัญชัน' });
        if (!teaExists) {
            const tea = new Item({
                name: 'ชาอัญชัน',
                description: 'A soothing magical tea that restores a small amount of energy.',
                type: 'food',
                rarity: 'common',
                price: 15,
                image: 'assets/item/Potion1.png'
            });
            await tea.save();
            console.log('✨ ชาอัญชัน successfully stocked to the shop!');
        } else {
            teaExists.type = 'food';
            await teaExists.save();
            console.log('✨ ชาอัญชัน already exists. Updated type to food.');
        }

        const tomYumExists = await Item.findOne({ name: 'ต้มยำ' });
        if (!tomYumExists) {
            const tomYum = new Item({
                name: 'ต้มยำ',
                description: 'A spicy and sour magical soup that restores a massive amount of energy!',
                type: 'food',
                rarity: 'rare',
                price: 50,
                image: 'assets/item/Potion2.png'
            });
            await tomYum.save();
            console.log('✨ ต้มยำ successfully stocked to the shop!');
        } else {
            tomYumExists.type = 'food';
            await tomYumExists.save();
            console.log('✨ ต้มยำ already exists. Updated type to food.');
        }

        process.exit(0);
    } catch (err) {
        console.error('Seeding Error:', err);
        process.exit(1);
    }
};

run();
