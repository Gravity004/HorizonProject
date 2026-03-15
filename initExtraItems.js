require('dotenv').config();
const mongoose = require('mongoose');
const Item = require('./models/Item');

const items = [
    { name: 'Howler Letter', description: 'จดหมายกรีดร้อง - ส่งเสียงเตือนในเซิร์ฟเวอร์เมื่อผู้รับเปิด (100% คราฟคติด)', type: 'equipment', rarity: 'epic', price: 100, image: '/assets/images/item.png' },
    { name: 'Basic Owl Feed', description: 'อาหารสัตว์เลี้ยงสำหรับนกฮูก', type: 'food', rarity: 'common', price: 10, image: '/assets/images/item.png' }
];

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        for (const it of items) {
            const exists = await Item.findOne({ name: it.name });
            if (!exists) {
                await Item.create(it);
                console.log(`Created: ${it.name}`);
            }
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
