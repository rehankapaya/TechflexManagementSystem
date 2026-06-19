import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// === SAMPLE DOWNLOADS ===

export const downloadExpenseSample = async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Expense Sample');
  
  ws.columns = [
    { header: 'Date (YYYY-MM-DD)', key: 'date', width: 20 },
    { header: 'Course Name', key: 'course', width: 25 },
    { header: 'Description', key: 'desc', width: 30 },
    { header: 'Amount', key: 'amount', width: 15 }
  ];

  ws.addRow({ date: '2024-06-15', course: 'Graphic Designing', desc: 'Marketing Materials', amount: 5000 });
  ws.addRow({ date: '2024-06-16', course: 'General', desc: 'Office Stationery', amount: 1500 });

  // Format header
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), 'Expense_Upload_Sample.xlsx');
};

export const downloadFeeSample = async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Fee Sample');

  ws.columns = [
    { header: 'Student ID', key: 'studentId', width: 15 },
    { header: 'Course Name', key: 'courseName', width: 25 },
    { header: 'Month', key: 'month', width: 15 },
    { header: 'Year', key: 'year', width: 15 },
    { header: 'Payable', key: 'payable', width: 15 },
    { header: 'Paid', key: 'paid', width: 15 },
    { header: 'Waived', key: 'waived', width: 15 }
  ];

  ws.addRow({ studentId: 'STU-001', courseName: 'Graphic Designing', month: 'Jan', year: '2024', payable: 2500, paid: 2500, waived: 0 });
  
  // Format header
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), 'Fee_Upload_Sample.xlsx');
};

// === PARSE UPLOADS ===

export const parseExcelUpload = async (file) => {
  return new Promise(async (resolve, reject) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(arrayBuffer);
      const ws = wb.worksheets[0];
      
      const rows = [];
      let headers = [];

      ws.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          headers = row.values.slice(1).map(h => h ? h.toString().trim() : '');
        } else {
          const rowData = {};
          row.values.slice(1).forEach((val, index) => {
            const header = headers[index];
            if (header) {
                // If it's a Date object (ExcelJS parses dates automatically), format it
                if (val instanceof Date) {
                    rowData[header] = val.toISOString().split('T')[0];
                } 
                // If it's a formula result object { formula, result }
                else if (val && typeof val === 'object' && val.result !== undefined) {
                    rowData[header] = val.result;
                }
                else {
                    rowData[header] = val;
                }
            }
          });
          rows.push(rowData);
        }
      });
      
      resolve(rows);
    } catch (err) {
      reject(err);
    }
  });
};
