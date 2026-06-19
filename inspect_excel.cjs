const XLSX = require('xlsx');
console.log("Reading file...");
const wb = XLSX.readFile('TECHFLEX RECORD .xlsx', { sheetRows: 10 }); 
console.log("Sheets:", wb.SheetNames);
wb.SheetNames.forEach(sheetName => {
  console.log("\nSheet:", sheetName);
  const sheet = wb.Sheets[sheetName];
  console.log(XLSX.utils.sheet_to_json(sheet, { header: 1 }));
});
