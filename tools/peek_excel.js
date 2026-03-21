const xlsx = require('xlsx');
const fs = require('fs');
const filepath = 'c:/Users/User/Documents/GitHub/HorizonProject/assets/studentlists/student.xlsx';
const workbook = xlsx.readFile(filepath);
const sheetName = workbook.SheetNames[0];
const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
const result = data.slice(0, 5); // Just peek at first 5
fs.writeFileSync('c:/Users/User/Documents/GitHub/HorizonProject/tools/excel_peek.json', JSON.stringify(result, null, 2));
console.log('Peek successful');
