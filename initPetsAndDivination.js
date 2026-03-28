require('dotenv').config();
const mongoose = require('mongoose');
const Item = require('./models/Item');
const Recipe = require('./models/Recipe');

async function ensureItem(name, type, rarity, price, description, image) {
    let item = await Item.findOne({ name });
    if (!item) {
        item = await Item.create({ name, type, rarity, price, description, image: image || '/assets/images/item.png' });
        console.log(`✅ Created item: ${name}`);
    } else {
        console.log(`⏭  Item already exists: ${name}`);
    }
    return item;
}

async function ensureRecipe(resultItem, ingredients, craftingType, successRate) {
    let recipe = await Recipe.findOne({ resultItemId: resultItem._id });
    if (!recipe) {
        recipe = await Recipe.create({
            resultItemId: resultItem._id,
            ingredients,
            craftingType: craftingType || 'cauldron',
            successRate: successRate || 100
        });
        console.log(`✅ Created recipe for: ${resultItem.name}`);
    } else {
        recipe.ingredients = ingredients;
        recipe.successRate = successRate || 100;
        await recipe.save();
        console.log(`🔄 Updated recipe for: ${resultItem.name}`);
    }
    return recipe;
}

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('🔌 Connected to DB');

        // ─── Pet System Items ──────────────────────────────────────────────────

        // Mystery Egg: Purchasable from shop, drops random pet on hatch
        const mysteryEgg = await ensureItem(
            'Mystery Egg', 'egg', 'common', 1000,
            'ไข่ปริศนา — วางในตู้ฟักและรอ 72 ชั่วโมง เพื่อฟักสัตว์เลี้ยงเวทมนตร์ผู้คู่หูของคุณ!',
            '/assets/images/picitem/Egg.png'
        );

        // Basic Pet Feed: Daily food for pets
        const petFeed = await ensureItem(
            'Basic Pet Feed', 'food', 'common', 20,
            'อาหารสัตว์เลี้ยงทั่วไป — ให้อาหารสัตว์เลี้ยงของคุณเพื่อเพิ่มค่าความผูกพัน (Affection)',
            'assets/images/items/pet_feed.png'
        );

        // Incubation Potion: craft-only, reduces egg hatch time by 24hr
        const oldOwlFeed = await ensureItem('Basic Owl Feed', 'food', 'common', 20, 'อาหารสัตว์เลี้ยง', '/assets/images/item.png');
        const incubationPotion = await ensureItem(
            'Incubation Potion', 'potion', 'rare', 0,
            'น้ำยาเร่งการฟัก — ใช้กับตู้ฟักเพื่อร่นเวลาฟักไข่ลง 24 ชั่วโมง (Craft Only)',
            'assets/images/items/incubation_potion.png'
        );

        // Cleansing Potion: craft-only, removes bad omen curse quest
        const cleansingPotion = await ensureItem(
            'Cleansing Potion', 'potion', 'uncommon', 0,
            'น้ำยาล้างสาป — ใช้เพื่อล้างคำสาปจากหอคอยพยากรณ์ก่อนที่เวลาจะหมด (Craft Only)',
            'assets/images/items/cleansing_potion.png'
        );

        // ─── Ingredient References ─────────────────────────────────────────────
        // These reference items that should already exist from initRequiredItemsAndRecipes.js
        const parchment = await Item.findOne({ name: 'Enchanted Parchment' });
        const redInk = await Item.findOne({ name: 'Red Ink' });
        const grain = await Item.findOne({ name: 'Grain' });
        const berry = await Item.findOne({ name: 'Berry' });
        const dragonBlood = await Item.findOne({ name: 'Dragon Blood' });
        const ironleaf = await Item.findOne({ name: 'Ironleaf' });

        // ─── Recipes ───────────────────────────────────────────────────────────

        // Incubation Potion recipe: 2x Ironleaf + 1x Dragon Blood (cauldron)
        if (ironleaf && dragonBlood) {
            await ensureRecipe(incubationPotion, [
                { itemId: ironleaf._id, quantity: 2 },
                { itemId: dragonBlood._id, quantity: 1 }
            ], 'cauldron', 80);
        } else {
            console.warn('⚠️  Missing ingredients for Incubation Potion recipe (Ironleaf / Dragon Blood). Run initRequiredItemsAndRecipes.js first.');
        }

        // Cleansing Potion recipe: 1x Enchanted Parchment + 2x Red Ink (cauldron)
        if (parchment && redInk) {
            await ensureRecipe(cleansingPotion, [
                { itemId: parchment._id, quantity: 1 },
                { itemId: redInk._id, quantity: 2 }
            ], 'cauldron', 100);
        } else {
            console.warn('⚠️  Missing ingredients for Cleansing Potion recipe. Run initRequiredItemsAndRecipes.js first.');
        }

        console.log('\n🎉 Pets & Divination items seeded successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

run();
