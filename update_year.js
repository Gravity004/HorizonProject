const fs = require('fs');
const filePath = 'js/house-roster.js';
let content = fs.readFileSync(filePath, 'utf8');
content = content.replace(/"year":\s*(\d+)/g, (match, p1) => {
    return `"year": ${parseInt(p1) - 1}`;
});
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated years.');
