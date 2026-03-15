require('dotenv').config();
const mongoose = require('mongoose');
const Item = require('./models/Item');
const Recipe = require('./models/Recipe');

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        // Helper to ensure item exists
        async function ensureItem(name, type, rarity, price, description = '') {
            let item = await Item.findOne({ name });
            if (!item) {
                item = await Item.create({ name, type, rarity, price, description, image: '/assets/images/item.png' });
                console.log(`Created item: ${name}`);
            }
            return item;
        }

        // 1. Ensure all ingredients exist
        const parchment = await ensureItem('Enchanted Parchment', 'material', 'uncommon', 50);
        const redInk = await ensureItem('Red Ink', 'material', 'common', 20);
        const grain = await ensureItem('Grain', 'food', 'common', 5);
        const berry = await ensureItem('Berry', 'food', 'common', 5); // Assuming fairy berry or normal berry. User just said "Berry"
        const dragonBlood = await ensureItem('Dragon Blood', 'material', 'epic', 500);
        const ironleaf = await ensureItem('Ironleaf', 'material', 'rare', 100);

        // 2. Ensure the Result Items exist
        const howler = await ensureItem('Howler Letter', 'equipment', 'epic', 200, 'จดหมายกรีดร้อง - ส่งเสียงเตือน');
        const owlFeed = await ensureItem('Basic Owl Feed', 'food', 'common', 20, 'อาหารสัตว์เลี้ยง');
        const strengthSol = await ensureItem('Strengthening Solution', 'potion', 'rare', 300, 'น้ำยาเพิ่มพลัง - เพิ่มโอกาสสำเร็จการคราฟต์ +15% เป็นเวลา 1 ชม.');

        // 3. Create the Recipes
        async function ensureRecipe(resultItem, ingredients, successRate) {
            let recipe = await Recipe.findOne({ resultItemId: resultItem._id });
            if (!recipe) {
                await Recipe.create({
                    resultItemId: resultItem._id,
                    ingredients: ingredients,
                    craftingType: 'cauldron', // Default
                    successRate: successRate
                });
                console.log(`Created recipe for: ${resultItem.name}`);
            } else {
                console.log(`Recipe for ${resultItem.name} already exists. Updating successRate...`);
                recipe.successRate = successRate;
                recipe.ingredients = ingredients;
                await recipe.save();
            }
        }

        await ensureRecipe(howler, [
            { itemId: parchment._id, quantity: 1 },
            { itemId: redInk._id, quantity: 1 }
        ], 100);

        await ensureRecipe(owlFeed, [
            { itemId: grain._id, quantity: 2 },
            { itemId: berry._id, quantity: 1 }
        ], 100);

        await ensureRecipe(strengthSol, [
            { itemId: dragonBlood._id, quantity: 1 },
            { itemId: ironleaf._id, quantity: 2 }
        ], 60);

        console.log('Done!');
        process.exit(0);

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
