const systemConfigService = require('../services/SystemConfigService');

class SystemConfigController {
    /**
     * GET /api/users/dashboard/status
     */
    async getDashboardStatus(req, res) {
        try {
            const status = await systemConfigService.getDashboardStatus();
            res.json(status);
        } catch (err) {
            // Default to not closed on error
            res.json({ isClosed: false });
        }
    }

    /**
     * POST /api/users/dashboard/toggle
     */
    async toggleDashboard(req, res) {
        const { isClosed, message } = req.body;
        try {
            await systemConfigService.toggleDashboard(isClosed, message);
            res.json({ message: `Dashboard ${isClosed ? 'ปิด' : 'เปิด'} สำเร็จ` });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }

    /**
     * GET /api/users/boosters
     */
    async getBoosters(req, res) {
        try {
            const boosters = await systemConfigService.getServerBoosters();
            res.json(boosters);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }

    /**
     * POST /api/users/boosters
     */
    async updateBoosters(req, res) {
        try {
            const updatedBoosters = await systemConfigService.updateServerBoosters(req.body.boosters);
            res.json({ message: 'Boosters configuration updated successfully.', boosters: updatedBoosters });
        } catch (err) {
            if (err.message.includes('layout')) {
                res.status(400).json({ message: err.message });
            } else {
                res.status(500).json({ message: err.message });
            }
        }
    }

    /**
     * GET /api/users/faculty
     */
    async getFaculty(req, res) {
        try {
            const faculty = await systemConfigService.getFacultyMembers();
            res.json(faculty);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }

    /**
     * POST /api/users/faculty
     */
    async updateFaculty(req, res) {
        try {
            const updatedFaculty = await systemConfigService.updateFacultyMembers(req.body.faculty);
            res.json({ message: 'Faculty configuration updated successfully.', faculty: updatedFaculty });
        } catch (err) {
            if (err.message.includes('layout')) {
                res.status(400).json({ message: err.message });
            } else {
                res.status(500).json({ message: err.message });
            }
        }
    }
}

module.exports = new SystemConfigController();
