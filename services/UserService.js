const User = require('../models/User');

class UserService {
    /**
     * Gets a user's inventory populated with item details
     */
    async getUserInventory(userId) {
        if (!userId) throw new Error('User ID is required');

        const user = await User.findById(userId)
            .select('inventory')
            .populate('inventory.itemId', 'name image type rarity');
        
        return user?.inventory || [];
    }

    /**
     * Replaces a user's display name using a Name Change Card from inventory
     */
    async changeUserName(userId, itemId, newName) {
        if (!newName || newName.length < 2 || newName.length > 50) {
            throw new Error('Invalid name length.');
        }

        const user = await User.findById(userId);
        if (!user) throw new Error('User not found.');

        const itemIdx = user.inventory.findIndex(i => i.itemId.toString() === itemId);

        if (itemIdx === -1 || user.inventory[itemIdx].quantity < 1) {
            throw new Error('You do not have a Name Change Card.');
        }

        // Deduct 1 item
        user.inventory[itemIdx].quantity -= 1;
        if (user.inventory[itemIdx].quantity <= 0) {
            user.inventory.splice(itemIdx, 1);
        }

        user.markModified('inventory');
        user.username = newName;

        await user.save();
        return user.username;
    }

    /**
     * Gets a list of users by their house name
     */
    async getUsersByHouse(houseName) {
        const normalizedHouseName = houseName.toLowerCase();
        const validHouses = ['garuda', 'naga', 'qilin', 'erawan'];

        if (!validHouses.includes(normalizedHouseName)) {
            throw new Error('Invalid house name');
        }

        return await User.find({ roles: normalizedHouseName })
            .select('-_id discordId username avatar balance roles house')
            .sort({ username: 1 });
    }

    /**
     * Gets the top 3 users by balance (excluding admins)
     */
    async getTopUsers(limit = 3) {
        return await User.find({ roles: { $ne: 'admin' } })
            .select('-_id username balance roles house avatar')
            .sort({ balance: -1 })
            .limit(limit);
    }

    /**
     * Gets all users (typically for admins)
     */
    async getAllUsers() {
        return await User.find()
            .select('-_id discordId username avatar balance roles house')
            .sort({ username: 1 });
    }

    /**
     * Adjusts a user's health balance
     */
    async adjustUserHealth(targetUserId, action, healthAmount) {
        const amount = parseInt(healthAmount);
        if (isNaN(amount) || amount < 0) throw new Error('Invalid health amount');

        const target = await User.findOne({
            $or: [{ discordId: targetUserId }, { username: targetUserId }]
        });

        if (!target) throw new Error('Target user not found');

        if (action === 'add') {
            target.health = Math.min(target.health + amount, target.maxHealth);
        } else if (action === 'sub') {
            target.health = Math.max(0, target.health - amount);
        } else {
            target.health = Math.min(amount, target.maxHealth);
        }

        await target.save();
        return target;
    }

    /**
     * Places a user in detention
     */
    async detainUser(targetUserId, minutes, reason) {
        const mins = parseInt(minutes);

        if (!targetUserId || isNaN(mins) || mins <= 0) {
            throw new Error('Invalid target or duration.');
        }

        const target = await User.findOne({
            $or: [{ discordId: targetUserId }, { username: targetUserId }]
        });

        if (!target) throw new Error('User not found');

        const endDate = new Date(Date.now() + mins * 60000);
        target.isDetained = true;
        target.detentionEndDate = endDate;
        target.detentionReason = reason || 'Violation of school rules';

        await target.save();

        return {
            target,
            endDate
        };
    }
}

module.exports = new UserService();
