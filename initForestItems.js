require('dotenv').config();
const mongoose = require('mongoose');
const Item = require('./models/Item');

const materials = [
    // Common 55%
    { name: 'Flobberworm Mucus', description: 'เมือกหนอนฟลอบเบอร์', type: 'material', rarity: 'common', price: 5, image: '/assets/images/item.png' },
    { name: 'Glowworm Powder', description: 'ผงหนอนเรืองแสง', type: 'material', rarity: 'common', price: 5, image: '/assets/images/item.png' },
    { name: 'Fairy Berry', description: 'เบอร์รี่ภูต', type: 'material', rarity: 'common', price: 5, image: '/assets/images/item.png' },
    { name: 'Moonflower Petal', description: 'กลีบดอกไม้จันทร์', type: 'material', rarity: 'common', price: 5, image: '/assets/images/item.png' },
    { name: 'Silverleaf Herb', description: 'ใบเงินเวทมนตร์', type: 'material', rarity: 'common', price: 5, image: '/assets/images/item.png' },
    { name: 'Forest Mint', description: 'สะระแหน่ป่า', type: 'material', rarity: 'common', price: 5, image: '/assets/images/item.png' },
    { name: 'Ghost Mushroom', description: 'เห็ดวิญญาณ', type: 'material', rarity: 'common', price: 5, image: '/assets/images/item.png' },
    { name: 'Crystal Dewdrop', description: 'หยดน้ำค้างผลึก', type: 'material', rarity: 'common', price: 5, image: '/assets/images/item.png' },
    { name: 'Ancient Tree Resin', description: 'ยางไม้โบราณ', type: 'material', rarity: 'common', price: 5, image: '/assets/images/item.png' },
    { name: 'Spider Silk Thread', description: 'เส้นใยแมงมุมเวท', type: 'material', rarity: 'common', price: 5, image: '/assets/images/item.png' },

    // Uncommon 25%
    { name: 'Unicorn Hair Strand', description: 'เส้นผมยูนิคอร์น', type: 'material', rarity: 'uncommon', price: 20, image: '/assets/images/item.png' },
    { name: 'Ashwinder Egg Shell', description: 'เปลือกไข่อัชวินเดอร์', type: 'material', rarity: 'uncommon', price: 20, image: '/assets/images/item.png' },
    { name: 'Dragon Scale Fragment', description: 'เศษเกล็ดมังกร', type: 'material', rarity: 'uncommon', price: 20, image: '/assets/images/item.png' },
    { name: 'Demiguise Hair', description: 'ขนเดมิกายส์', type: 'material', rarity: 'uncommon', price: 20, image: '/assets/images/item.png' },
    { name: 'Moonlit Feather', description: 'ขนนกต้องแสงจันทร์', type: 'material', rarity: 'uncommon', price: 20, image: '/assets/images/item.png' },
    { name: 'Hippogriff Feather Tip', description: 'ปลายขนฮิปโปกริฟ', type: 'material', rarity: 'uncommon', price: 20, image: '/assets/images/item.png' },
    { name: 'Fairy Wing Dust', description: 'ฝุ่นปีกภูต', type: 'material', rarity: 'uncommon', price: 20, image: '/assets/images/item.png' },
    { name: 'Goblin Silver Dust', description: 'ผงเงินก็อบลิน', type: 'material', rarity: 'uncommon', price: 20, image: '/assets/images/item.png' },
    { name: 'Runestone Fragment', description: 'เศษหินรูน', type: 'material', rarity: 'uncommon', price: 20, image: '/assets/images/item.png' },
    { name: 'Enchanted Bark', description: 'เปลือกไม้ต้องมนตร์', type: 'material', rarity: 'uncommon', price: 20, image: '/assets/images/item.png' },

    // Rare 15%
    { name: 'Phoenix Feather Ember', description: 'เถ้าขนนกฟีนิกซ์', type: 'material', rarity: 'rare', price: 100, image: '/assets/images/item.png' },
    { name: 'Basilisk Fang Fragment', description: 'เศษเขี้ยวบาซิลิสก์', type: 'material', rarity: 'rare', price: 100, image: '/assets/images/item.png' },
    { name: 'Thestral Mane Hair', description: 'เส้นขนแผงคอเทสตรัล', type: 'material', rarity: 'rare', price: 100, image: '/assets/images/item.png' },
    { name: 'Acromantula Venom Sac', description: 'ถุงพิษอาโครแมนทูลา', type: 'material', rarity: 'rare', price: 100, image: '/assets/images/item.png' },
    { name: 'Moon Crystal Shard', description: 'เศษคริสตัลจันทร์', type: 'material', rarity: 'rare', price: 100, image: '/assets/images/item.png' },

    // Legendary 5%
    { name: 'One millimeter of a Qilin fur', description: 'ขนหนึ่งมิลลิเมตรของกิเลน', type: 'material', rarity: 'legendary', price: 500, image: '/assets/images/item.png' },
    { name: 'Phoenix Ash', description: 'เถ้าฟีนิกซ์', type: 'material', rarity: 'legendary', price: 500, image: '/assets/images/item.png' },
    { name: 'Ancient Dragon Heart Scale', description: 'เกล็ดหัวใจมังกรโบราณ', type: 'material', rarity: 'legendary', price: 500, image: '/assets/images/item.png' },
    { name: 'Unicorn Tear Crystal', description: 'ผลึกน้ำตายูนิคอร์น', type: 'material', rarity: 'legendary', price: 500, image: '/assets/images/item.png' },
    { name: 'Fragment of a Forbidden Rune', description: 'เศษรูนต้องห้าม', type: 'material', rarity: 'legendary', price: 500, image: '/assets/images/item.png' },
    
    // Extra specific items requested for new recipes:
    { name: 'Enchanted Parchment', description: 'กระดาษต้องมนตร์พิเศษ', type: 'material', rarity: 'uncommon', price: 25, image: '/assets/images/item.png' },
    { name: 'Red Ink', description: 'หมึกสีแดงเพลิง', type: 'material', rarity: 'common', price: 10, image: '/assets/images/item.png' },
    { name: 'Grain', description: 'ธัญพืช', type: 'material', rarity: 'common', price: 2, image: '/assets/images/item.png' },
    { name: 'Berry', description: 'ผลเบอร์รี่รวม', type: 'material', rarity: 'common', price: 3, image: '/assets/images/item.png' },
    { name: 'Dragon Blood', description: 'เลือดมังกร 1 หยด', type: 'material', rarity: 'rare', price: 150, image: '/assets/images/item.png' },
    { name: 'Ironleaf', description: 'ใบไม้เหล็ก', type: 'material', rarity: 'uncommon', price: 30, image: '/assets/images/item.png' },

    // Special functional item (Strengthening solution etc)
    { name: 'Strengthening Solution', description: 'น้ำยาเพิ่มพลัง (+15% โอกาสคราฟสำเร็จเป็นเวลา 1 ชั่วโมง)', type: 'potion', rarity: 'rare', price: 250, image: '/assets/images/item.png' }
];

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        for (const mat of materials) {
            const exists = await Item.findOne({ name: mat.name });
            if (!exists) {
                await Item.create(mat);
                console.log(`Created: ${mat.name}`);
            } else {
                console.log(`Already exists: ${mat.name}`);
            }
        }
        
        console.log('Initialization complete.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
