const Config = require('../models/Config');

class SystemConfigService {
    /**
     * Retrieves the current dashboard status
     */
    async getDashboardStatus() {
        const config = await Config.findOne({ key: 'dashboard_closed' });
        return {
            isClosed: config?.value === true,
            message: config?.message || 'ระบบปิดชั่วคราว กรุณารอสักครู่...'
        };
    }

    /**
     * Toggles the dashboard access on or off
     */
    async toggleDashboard(isClosed, message) {
        let config = await Config.findOne({ key: 'dashboard_closed' });
        if (!config) {
            config = new Config({ key: 'dashboard_closed', value: !!isClosed, message: message || '' });
        } else {
            config.value = !!isClosed;
            if (message !== undefined) config.message = message;
            config.markModified('value');
        }
        await config.save();
        return config;
    }

    /**
     * Retrieves the top 3 server boosters configuration
     */
    async getServerBoosters() {
        let boosterConfig = await Config.findOne({ key: 'server_boosters' });
        if (!boosterConfig) {
            boosterConfig = new Config({
                key: 'server_boosters',
                value: [
                    { rank: 1, title: 'Arcane Sovereign', name: '- ระบุชื่อ -', boosts: 0 },
                    { rank: 2, title: 'Mystic Conqueror', name: '- ระบุชื่อ -', boosts: 0 },
                    { rank: 3, title: 'Enchanted Vanguard', name: '- ระบุชื่อ -', boosts: 0 }
                ]
            });
            await boosterConfig.save();
        }
        return boosterConfig.value;
    }

    /**
     * Overwrites server booster configuration
     */
    async updateServerBoosters(boosters) {
        if (!Array.isArray(boosters) || boosters.length !== 3) {
            throw new Error('Invalid boosters data layout.');
        }

        let config = await Config.findOne({ key: 'server_boosters' });
        if (!config) {
            config = new Config({ key: 'server_boosters', value: boosters });
        } else {
            config.value = boosters;
        }

        config.markModified('value');
        await config.save();
        return config.value;
    }

    /**
     * Retrieves faculty members
     */
    async getFacultyMembers() {
        const defaultFaculty = [
            { name: 'Prof. Richard Moore', subject: 'Aweth', image: 'assets/images/Prof/Prof.Richard.png' },
            { name: 'Prof. Mathal', subject: 'Charms', image: 'assets/images/Prof/Prof.Mathal.png' },
            { name: 'Prof. King Zadkiel Winchester', subject: 'Faculty Member', image: 'assets/images/Prof/Prof.King.png' },
            { name: 'Prof. Navin White Rosier', subject: 'Astronomy', image: 'assets/images/Prof/Prof. Navin White Rosier.png' },
            { name: 'Prof. Tulphat Narintrapakdee', subject: 'Faculty Member', image: 'assets/images/Prof/Prof. Tulphat Narintrapakdee.png' },
            { name: 'Prof. Sofia McQueen', subject: 'Herblology', image: 'assets/images/Prof/Prof. Sofia McQueen.png' },
            { name: 'Prof. ScarDKillz', subject: 'Faculty Member', image: 'assets/images/Prof/Prof. ScarDKillz.png' },
            { name: 'Sir. Ngong Ngaeng', subject: 'Faculty Member', image: 'assets/images/Prof/Sir. Ngong Ngaeng.png' },
            { name: 'Prof. Mary Greengrass', subject: 'Faculty Member', image: 'assets/images/Prof/Prof.Mary Greengrass.png' }
        ];

        let facultyConfig = await Config.findOne({ key: 'faculty_members' });
        if (!facultyConfig) {
            facultyConfig = new Config({
                key: 'faculty_members',
                value: defaultFaculty
            });
            await facultyConfig.save();
        } else {
            // Auto-update db to ensure latest faculty list
            facultyConfig.value = defaultFaculty;
            facultyConfig.markModified('value');
            await facultyConfig.save();
        }
        return facultyConfig.value;
    }

    /**
     * Updates faculty members
     */
    async updateFacultyMembers(faculty) {
        if (!Array.isArray(faculty)) {
            throw new Error('Invalid faculty data layout.');
        }

        let config = await Config.findOne({ key: 'faculty_members' });
        if (!config) {
            config = new Config({ key: 'faculty_members', value: faculty });
        } else {
            config.value = faculty;
        }

        config.markModified('value');
        await config.save();
        return config.value;
    }
}

module.exports = new SystemConfigService();
