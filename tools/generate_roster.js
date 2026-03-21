const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, '../assets/studentlists/student.xlsx');
const workbook = xlsx.readFile(filepath);
const sheetName = workbook.SheetNames[0];
const rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "" });

// Find header row
let headerRowIndex = -1;
let headers = [];
for (let i = 0; i < Math.min(20, rawRows.length); i++) {
    const rowStr = rawRows[i].join(' ');
    if (rowStr.includes('เลขประจำตัว') && rowStr.includes('ชื่อ-นามสกุล')) {
        headerRowIndex = i;
        headers = rawRows[i].map(h => String(h).trim());
        break;
    }
}

const data = [];
for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
    if (rawRows[i].join('').trim() === '') continue;
    let obj = {};
    for (let j = 0; j < headers.length; j++) {
        if (headers[j]) obj[headers[j]] = rawRows[i][j];
    }
    data.push(obj);
}

const houseMap = {
    'พญาครุฑ': 'garuda', 'ครุฑ': 'garuda',
    'เอราวัณ': 'erawan',
    'กิเลน': 'qilin',
    'พญานาค': 'naga', 'นาค': 'naga'
};

const studentData = { garuda: [], erawan: [], qilin: [], naga: [] };

data.forEach(row => {
    let id = String(row['เลขประจำตัว'] || '').trim();
    let name = String(row['ชื่อ-นามสกุล'] || '').trim();
    let yearRaw = String(row['ชั้นปี'] || '1').trim();
    let houseRaw = String(row['บ้าน'] || '').trim();

    let year = 1;
    const m = yearRaw.match(/\d+/);
    if (m) year = parseInt(m[0]);

    let realHouse = '';
    for (const [k, v] of Object.entries(houseMap)) {
        if (houseRaw.includes(k)) { realHouse = v; break; }
    }

    if (id && name && realHouse) {
        let rawId = String(id).replace('RS-', '');
        studentData[realHouse].push({
            id: `RS-${rawId}`,
            name,
            year,
            house: realHouse,
            photo: `assets/students/${rawId}.png`,
            hometown: "ประเทศไทย",
            allergies: ["ไม่มี"],
            inventory: ["ไม้กายสิทธิ์"]
        });
    }
});

// Write out the studentData as JSON for reference
fs.writeFileSync(path.join(__dirname, 'student_data_out.json'), JSON.stringify(studentData, null, 2));
console.log('Wrote tools/student_data_out.json');

// Now update house-roster.js
const rosterFile = path.join(__dirname, '../js/house-roster.js');
let content = fs.readFileSync(rosterFile, 'utf8');

// The block starts at "// Sample student data" and ends with the closing "};\r\n" before "// House colors"
const rosterMatch = content.match(/(\/\/ Sample student data[\s\S]*?const studentData = \{[\s\S]*?\};\r?\n)/);
if (rosterMatch) {
    const replacement = `// Sample student data for all four houses\nconst studentData = ${JSON.stringify(studentData, null, 4)};\n`;
    content = content.replace(rosterMatch[0], replacement);
    fs.writeFileSync(rosterFile, content, 'utf8');
    console.log('Successfully updated js/house-roster.js!');
} else {
    console.error('Could not find studentData pattern. Please check the file manually.');
}
