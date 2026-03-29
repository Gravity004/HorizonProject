require('dotenv').config();
const mongoose = require('mongoose');
const Item = require('./models/Item');

const materials = [
    // Common 100
    { name: 'Flobberworm Mucus', description: 'เมือกหนอนฟลอบเบอร์', type: 'material', rarity: 'common', price: 100, image: '/assets/images/iteminshop/Flobberworm mucus.png' },
    { name: 'Glowworm Powder', description: 'ผงหนอนเรืองแสง', type: 'material', rarity: 'common', price: 100, image: '/assets/images/iteminshop/Glowworm Powder.png' },
    { name: 'Fairy Berry', description: 'เบอร์รี่ภูต', type: 'material', rarity: 'common', price: 100, image: '/assets/images/iteminshop/Fairy berry.png' },
    { name: 'Moonflower Petal', description: 'กลีบดอกไม้จันทร์', type: 'material', rarity: 'common', price: 100, image: '/assets/images/iteminshop/Moonflower petal.png' },
    { name: 'Silverleaf Herb', description: 'ใบเงินเวทมนตร์', type: 'material', rarity: 'common', price: 100, image: '/assets/images/iteminshop/Silverleaf Hreb.png' },
    { name: 'Forest Mint', description: 'สะระแหน่ป่า', type: 'material', rarity: 'common', price: 100, image: '/assets/images/iteminshop/Forest mint.png' },
    { name: 'Ghost Mushroom', description: 'เห็ดวิญญาณ', type: 'material', rarity: 'common', price: 100, image: '/assets/images/iteminshop/Ghost mushrooms.png' },
    { name: 'Crystal Dewdrop', description: 'หยดน้ำค้างผลึก', type: 'material', rarity: 'common', price: 100, image: '/assets/images/iteminshop/Crystal Dewdrop.png' },
    { name: 'Ancient Tree Resin', description: 'ยางไม้โบราณ', type: 'material', rarity: 'common', price: 100, image: '/assets/images/iteminshop/Ancient Tree Resin.png' },
    { name: 'Spider Silk Thread', description: 'เส้นใยแมงมุมเวท', type: 'material', rarity: 'common', price: 100, image: '/assets/images/iteminshop/Spider Silk Thread.png' },

    // Uncommon 600
    { name: 'Unicorn Hair Strand', description: 'เส้นผมยูนิคอร์น', type: 'material', rarity: 'uncommon', price: 600, image: '/assets/images/iteminshop/Unicorn Hair Strand.png' },
    { name: 'Ashwinder Egg Shell', description: 'เปลือกไข่อัชวินเดอร์', type: 'material', rarity: 'uncommon', price: 600, image: '/assets/images/iteminshop/Ashwinder Egg Shell.png' },
    { name: 'Dragon Scale Fragment', description: 'เศษเกล็ดมังกร', type: 'material', rarity: 'uncommon', price: 600, image: '/assets/images/iteminshop/Dragon Scale Fragment.png' },
    { name: 'Demiguise Hair', description: 'ขนเดมิกายส์', type: 'material', rarity: 'uncommon', price: 600, image: '/assets/images/iteminshop/Demiguise Hair.png' },
    { name: 'Moonlit Feather', description: 'ขนนกต้องแสงจันทร์', type: 'material', rarity: 'uncommon', price: 600, image: '/assets/images/iteminshop/Moonlit Feather.png' },
    { name: 'Hippogriff Feather Tip', description: 'ปลายขนฮิปโปกริฟ', type: 'material', rarity: 'uncommon', price: 600, image: '/assets/images/iteminshop/Hippogriff Feather Tip.png' },
    { name: 'Fairy Wing Dust', description: 'ฝุ่นปีกภูต', type: 'material', rarity: 'uncommon', price: 600, image: '/assets/images/iteminshop/Fairy Wing Dust.png' },
    { name: 'Goblin Silver Dust', description: 'ผงเงินก็อบลิน', type: 'material', rarity: 'uncommon', price: 600, image: '/assets/images/iteminshop/Goblin Silver Dust.png' },
    { name: 'Runestone Fragment', description: 'เศษหินรูน', type: 'material', rarity: 'uncommon', price: 600, image: '/assets/images/iteminshop/Runestone Fragment.png' },
    { name: 'Enchanted Bark', description: 'เปลือกไม้ต้องมนตร์', type: 'material', rarity: 'uncommon', price: 600, image: '/assets/images/iteminshop/Enchanted Bark.png' },

    // Rare 1500
    { name: 'Phoenix Feather Ember', description: 'เถ้าขนนกฟีนิกซ์', type: 'material', rarity: 'rare', price: 1500, image: '/assets/images/iteminshop/Phoenix Feather Ember.png' },
    { name: 'Basilisk Fang Fragment', description: 'เศษเขี้ยวบาซิลิสก์', type: 'material', rarity: 'rare', price: 1500, image: '/assets/images/iteminshop/Basilisk Fang Fragment.png' },
    { name: 'Thestral Mane Hair', description: 'เส้นขนแผงคอเทสตรัล', type: 'material', rarity: 'rare', price: 1500, image: '/assets/images/iteminshop/Thestral Mane Hair.png' },
    { name: 'Acromantula Venom Sac', description: 'ถุงพิษอาโครแมนทูลา', type: 'material', rarity: 'rare', price: 1500, image: '/assets/images/iteminshop/Acromantula Venom Sac.png' },
    { name: 'Moon Crystal Shard', description: 'เศษคริสตัลจันทร์', type: 'material', rarity: 'rare', price: 1500, image: '/assets/images/iteminshop/Moon Crystal Shard.png' },

    // Legendary 2200
    { name: 'One millimeter of a Qilin fur', description: 'ขนหนึ่งมิลลิเมตรของกิเลน', type: 'material', rarity: 'legendary', price: 2200, image: '/assets/images/iteminshop/One millimeter of a Qilin fur.png' },
    { name: 'Phoenix Ash', description: 'เถ้าฟีนิกซ์', type: 'material', rarity: 'legendary', price: 2200, image: '/assets/images/iteminshop/Phoenix Ash.png' },
    { name: 'Ancient Dragon Heart Scale', description: 'เกล็ดหัวใจมังกรโบราณ', type: 'material', rarity: 'legendary', price: 2200, image: '/assets/images/iteminshop/Ancient Dragon Heart Scale.png' },
    { name: 'Unicorn Tear Crystal', description: 'ผลึกน้ำตายูนิคอร์น', type: 'material', rarity: 'legendary', price: 2200, image: '/assets/images/iteminshop/Unicorn Tear Crystal.png' },
    { name: 'Fragment of a Forbidden Rune', description: 'เศษรูนต้องห้าม', type: 'material', rarity: 'legendary', price: 2200, image: '/assets/images/iteminshop/Fragment of a Forbidden Rune.png' },

    // Extra specific items requested for new recipes:
    { name: 'Enchanted Parchment', description: 'กระดาษต้องมนตร์พิเศษ', type: 'material', rarity: 'uncommon', price: 600, image: '/assets/images/iteminshop/Enchanted Parchment.png' },
    { name: 'Red Ink', description: 'หมึกสีแดงเพลิง', type: 'material', rarity: 'common', price: 100, image: '/assets/images/iteminshop/Red Ink.png' },
    { name: 'Grain', description: 'ธัญพืช', type: 'material', rarity: 'common', price: 100, image: '/assets/images/iteminshop/Grain.png' },
    { name: 'Berry', description: 'ผลเบอร์รี่รวม', type: 'material', rarity: 'common', price: 100, image: '/assets/images/iteminshop/Berry.png' },
    { name: 'Dragon Blood', description: 'เลือดมังกร 1 หยด', type: 'material', rarity: 'rare', price: 1500, image: '/assets/images/iteminshop/Dragon Blood.png' },
    { name: 'Ironleaf', description: 'ใบไม้เหล็ก', type: 'material', rarity: 'uncommon', price: 600, image: '/assets/images/iteminshop/Ironleaf.png' },

    // Special functional item (Strengthening solution etc)
    { name: 'Strengthening Solution', description: 'น้ำยาเพิ่มพลัง (+15% โอกาสคราฟสำเร็จเป็นเวลา 1 ชั่วโมง)', type: 'potion', rarity: 'rare', price: 1500, image: '/assets/images/iteminshop/Strengthening Solution.png' }
];

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        for (const mat of materials) {
            await Item.findOneAndUpdate(
                { name: mat.name },
                { $set: mat },
                { upsert: true, new: true }
            );
            console.log(`Upserted: ${mat.name}`);
        }

        console.log('Initialization complete.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
