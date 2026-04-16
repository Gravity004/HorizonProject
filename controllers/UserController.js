const userService = require('../services/UserService');

class UserController {
    /**
     * GET /api/users/me/inventory
     */
    async getInventory(req, res) {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        try {
            const inventory = await userService.getUserInventory(req.user.id);
            res.json({ inventory });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }

    /**
     * POST /api/users/changeName
     */
    async changeName(req, res) {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { itemId, newName } = req.body;

        try {
            const username = await userService.changeUserName(req.user.id, itemId, newName);
            res.json({ message: 'Name changed successfully', username });
        } catch (err) {
            // Differentiating validation error vs server error
            if (err.message.includes('length') || err.message.includes('Change Card') || err.message.includes('not found')) {
                res.status(400).json({ message: err.message });
            } else {
                res.status(500).json({ message: err.message });
            }
        }
    }

    /**
     * GET /api/users/house/:houseName
     */
    async getByHouse(req, res) {
        try {
            const users = await userService.getUsersByHouse(req.params.houseName);
            res.json(users);
        } catch (err) {
            if (err.message === 'Invalid house name') {
                res.status(400).json({ message: err.message });
            } else {
                res.status(500).json({ message: err.message });
            }
        }
    }

    /**
     * GET /api/users/top
     */
    async getTop(req, res) {
        try {
            const users = await userService.getTopUsers();
            res.json(users);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }

    /**
     * GET /api/users/all
     */
    async getAll(req, res) {
        try {
            const users = await userService.getAllUsers();
            res.json(users);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }

    /**
     * POST /api/users/admin/health
     */
    async adminAdjustHealth(req, res) {
        const { targetUserId, action, healthAmount } = req.body;
        try {
            const target = await userService.adjustUserHealth(targetUserId, action, healthAmount);
            res.json({
                message: `Adjusted ${target.username}'s health to ${target.health}/${target.maxHealth}`,
                newHealth: target.health
            });
        } catch (err) {
            if (err.message.includes('health amount')) {
                res.status(400).json({ message: err.message });
            } else if (err.message.includes('not found')) {
                res.status(404).json({ message: err.message });
            } else {
                res.status(500).json({ message: err.message });
            }
        }
    }

    /**
     * POST /api/users/admin/detain
     */
    async adminDetainUser(req, res) {
        const { targetUserId, minutes, reason } = req.body;
        try {
            const { target, endDate } = await userService.detainUser(targetUserId, minutes, reason);
            res.json({
                message: `${target.username} has been sent to detention for ${minutes} minutes.`,
                detentionEndDate: endDate
            });
        } catch (err) {
            if (err.message.includes('duration')) {
                res.status(400).json({ message: err.message });
            } else if (err.message.includes('not found')) {
                res.status(404).json({ message: err.message });
            } else {
                res.status(500).json({ message: err.message });
            }
        }
    }
}

module.exports = new UserController();
