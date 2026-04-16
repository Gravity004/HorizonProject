const path = require('path');

class ViewController {
    serveClassroom(req, res) {
        res.sendFile(path.join(__dirname, '../classroom.html'));
    }

    serveDashboard(req, res) {
        res.sendFile(path.join(__dirname, '../dashboard.html'));
    }

    serveIndex(req, res) {
        res.sendFile(path.join(__dirname, '../index.html'));
    }

    serveRachataHouse(req, res) {
        res.sendFile(path.join(__dirname, '../rachata_house.html'));
    }

    serveRachataSchool(req, res) {
        res.sendFile(path.join(__dirname, '../rachata_school.html'));
    }

    serveWorldGuide(req, res) {
        res.sendFile(path.join(__dirname, '../world_guide.html'));
    }
}

module.exports = new ViewController();
