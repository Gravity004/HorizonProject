const xlsx = require('xlsx');
const workbook = xlsx.readFile('c:/Users/User/Documents/GitHub/HorizonProject/assets/studentlists/student.xlsx');
const sheetName = workbook.SheetNames[0];
const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
console.log(JSON.stringify(data.slice(0, 5), null, 2));
console.log('Total rows:', data.length);
