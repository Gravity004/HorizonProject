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

let count = 0;
console.log('--- FIRST 20 NON-EMPTY ROWS ---');
for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const isNotEmpty = row.some(cell => String(cell).trim() !== '');
    if (isNotEmpty) {
        console.log(`Row ${i}:`, row);
        count++;
        if (count >= 20) break;
    }
}
