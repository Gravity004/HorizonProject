const User = require('../models/User');

/**
 * Updates the progress of a specific daily quest type for a user
 * @param {String} userId - The user's MongoDB ObjectId
 * @param {String} questType - 'explore_himmapan', 'craft_potion', 'buy_item', 'send_gift'
 * @param {Number} increment - How much to increment the progress
 */
async function updateQuestProgress(userId, questType, increment = 1) {
    try {
        const user = await User.findById(userId);
        if (!user || (!user.dailyQuests || user.dailyQuests.length === 0)) return;

        // Check if date needs reset. If so, don't increment until they load dashboard to generate new ones.
        // But for safety, we can just skip if it's an old date to avoid completing yesterday's quests.
        const now = new Date();
        const last = user.lastQuestReset;
        if (!last || last.getDate() !== now.getDate() || last.getMonth() !== now.getMonth() || last.getFullYear() !== now.getFullYear()) {
            return; // Quests need to be regenerated first
        }

        let updated = false;
        for (let quest of user.dailyQuests) {
            if (quest.questType === questType && !quest.isCompleted) {
                quest.progress += increment;
                if (quest.progress >= quest.target) {
                    quest.progress = quest.target;
                    quest.isCompleted = true;
                }
                updated = true;
            }
        }

        if (updated) {
            await user.save();
        }
    } catch (err) {
        console.error('Error updating quest progress:', err);
    }
}

module.exports = { updateQuestProgress };
