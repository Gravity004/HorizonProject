const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, '../assets/studentlists/student.xlsx');
if (!fs.existsSync(filepath)) {
    console.error('File not found:', filepath);
    process.exit(1);
}

const workbook = xlsx.readFile(filepath);
const sheetName = workbook.SheetNames[0];
const rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "" });

let headerRowIndex = -1;
let headers = [];

for (let i = 0; i < Math.min(20, rawRows.length); i++) {
    const rowStr = rawRows[i].join(' ').toLowerCase();
    if (rowStr.match(/id|เลข|ประจำตัว|รหัส/) && rowStr.match(/name|ชื่อ|สกุล/)) {
        headerRowIndex = i;
        headers = rawRows[i];
        break;
    }
}

if (headerRowIndex === -1) {
    console.error('Could not find header row. Sample data:', rawRows.slice(0, 5));
    process.exit(1);
}

const data = [];
for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
    // Skip empty rows
    if (rawRows[i].join('').trim() === '') continue;
    let obj = {};
    for (let j = 0; j < headers.length; j++) {
        if (headers[j]) obj[String(headers[j]).trim()] = rawRows[i][j];
    }
    data.push(obj);
}

const studentData = {
    garuda: [],
    erawan: [],
    qilin: [],
    naga: []
};
// Smart column detection
const idKey = keys.find(k => /id|เลข|ประจำตัว/i.test(k));
const nameKey = keys.find(k => /name|ชื่อ|สกุล/i.test(k));
const yearKey = keys.find(k => /year|ปี/i.test(k));
const houseKey = keys.find(k => /house|บ้าน/i.test(k));

if (!idKey || !nameKey || !houseKey) {
    console.error('Could not detect necessary columns. Found keys:', keys);
    process.exit(1);
}

const houseMap = {
    'garuda': 'garuda', 'ครุฑ': 'garuda', 'พญาครุฑ': 'garuda',
    'erawan': 'erawan', 'ช้าง': 'erawan', 'เอราวัณ': 'erawan',
    'qilin': 'qilin', 'กิเลน': 'qilin',
    'naga': 'naga', 'นาค': 'naga', 'พญานาค': 'naga'
};

data.forEach(row => {
    let id = String(row[idKey] || '').trim();
    let name = String(row[nameKey] || '').trim();
    let yearRaw = String(row[yearKey] || '1').trim();
    let houseRaw = String(row[houseKey] || '').trim().toLowerCase();
    
    // Extract number from year string
    let year = 1;
    const yearMatch = yearRaw.match(/\d+/);
    if (yearMatch) year = parseInt(yearMatch[0], 10);
    
    // Normalize house
    let realHouse = '';
    for (const [k, v] of Object.entries(houseMap)) {
        if (houseRaw.includes(k)) { realHouse = v; break; }
    }
    
    if (id && name && realHouse) {
        // Assume ID format like RS-123 or just 123. If just 123, make it RS-123. Ensure photo uses raw ID part.
        let rawId = id;
        if (rawId.startsWith('RS-')) {
            rawId = rawId.substring(3);
        } else {
            id = `RS-${rawId}`;
        }
        
        studentData[realHouse].push({
            id: id,
            name: name,
            year: year,
            house: realHouse,
            photo: `assets/students/${rawId}.png`,
            hometown: "ประเทศไทย",
            allergies: ["ไม่มี"],
            inventory: ["ไม้กายสิทธิ์"]
        });
    }
});

// Load house-roster.js and replace studentData
const rosterFile = path.join(__dirname, '../js/house-roster.js');
let rosterContent = fs.readFileSync(rosterFile, 'utf8');

// Replace the const studentData block
const regex = /const\s+studentData\s*=\s*\{[\s\S]*?\};\n/m;
const newDataString = `const studentData = ${JSON.stringify(studentData, null, 4)};\n`;

if (regex.test(rosterContent)) {
    rosterContent = rosterContent.replace(regex, newDataString);
    fs.writeFileSync(rosterFile, rosterContent, 'utf8');
    console.log('Successfully updated js/house-roster.js!');
} else {
    // Write just the mapped mapping so AI can manually insert
    fs.writeFileSync(path.join(__dirname, 'student_data.json'), JSON.stringify(studentData, null, 2));
    console.log('Could not find studentData block in js/house-roster.js. Dumped to tools/student_data.json instead.');
}
