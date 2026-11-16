import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import {
  COACHING_GRADES,
  COACHING_FIELDS,
  isClassAboveEight
} from './admissionFormOcrParser';

// === SAMPLE DOWNLOADS ===

export const downloadExpenseSample = async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Expense Sample');
  
  ws.columns = [
    { header: 'Date (DD-MMM-YYYY)', key: 'date', width: 20 },
    { header: 'Course Name', key: 'course', width: 25 },
    { header: 'Description', key: 'desc', width: 30 },
    { header: 'Amount', key: 'amount', width: 15 }
  ];

  ws.addRow({ date: new Date(2024, 5, 15), course: 'Graphic Designing', desc: 'Marketing Materials', amount: 5000 });
  ws.addRow({ date: new Date(2024, 5, 16), course: 'General', desc: 'Office Stationery', amount: 1500 });

  ws.getColumn('date').numFmt = 'dd-mmm-yyyy';

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
    { header: 'Waived', key: 'waived', width: 15 },
    { header: 'Pay Date', key: 'payDate', width: 15 }
  ];

  ws.addRow({ studentId: 'STU-001', courseName: 'Graphic Designing', month: 'Jan', year: '2024', payable: 2500, paid: 2500, waived: 0, payDate: '2024-01-15' });
  
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
                    const year = val.getFullYear();
                    const month = String(val.getMonth() + 1).padStart(2, '0');
                    const day = String(val.getDate()).padStart(2, '0');
                    rowData[header] = `${year}-${month}-${day}`;
                } 
                // If it's a formula result object { formula, result }
                else if (val && typeof val === 'object' && val.result !== undefined) {
                    if (val.result instanceof Date) {
                        const d = val.result;
                        const year = d.getFullYear();
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        rowData[header] = `${year}-${month}-${day}`;
                    } else {
                        rowData[header] = val.result;
                    }
                }
                else if (val && typeof val === 'object' && val.richText) {
                    rowData[header] = val.richText.map(rt => rt.text).join('');
                }
                else if (val && typeof val === 'object' && val.text) {
                    rowData[header] = val.text;
                }
                else if (typeof val === 'string' && header.toLowerCase().includes('date') && val.includes('/')) {
                    const parts = val.split('/');
                    if (parts.length === 3) {
                       let year = parts[2];
                       let month = parts[1];
                       let day = parts[0];
                       if (year.length === 2) year = '20' + year;
                       if (year.length === 4) {
                           rowData[header] = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                       } else {
                           rowData[header] = val;
                       }
                    } else {
                        rowData[header] = val;
                    }
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

export const exportExpenses = async (expensesData, filename = 'Expenses.xlsx') => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Expenses');

  ws.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Course Category', key: 'courseName', width: 25 },
    { header: 'Description', key: 'description', width: 35 },
    { header: 'Amount (PKR)', key: 'amount', width: 15 },
    { header: 'Added By', key: 'addedBy', width: 20 }
  ];

  expensesData.forEach(exp => {
    ws.addRow({
      date: new Date(exp.date).toLocaleDateString('en-GB'),
      courseName: exp.courseName,
      description: exp.description,
      amount: exp.amount,
      addedBy: exp.addedBy || ''
    });
  });

  // Format header
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), filename);
};

/**
 * Downloads a pre-formatted Excel template for bulk Coaching Students import.
 * Includes sample data rows and an "Instructions & Options" reference sheet.
 */
export const downloadCoachingStudentSample = async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Coaching Students Template');

  ws.columns = [
    { header: 'Roll Number (Optional)', key: 'roll_no', width: 22 },
    { header: 'Student Full Name *', key: 'name', width: 28 },
    { header: 'Class / Grade *', key: 'grade', width: 24 },
    { header: 'Field / Group (Commerce, Science, etc.)', key: 'field', width: 34 },
    { header: 'Gender', key: 'gender', width: 14 },
    { header: 'Monthly Fee (PKR) *', key: 'monthly_fee', width: 20 },
    { header: 'Admission Fee (PKR)', key: 'admission_fee', width: 20 },
    { header: 'Primary Phone (Optional)', key: 'contact', width: 24 },
    { header: 'Guardian / 2nd Phone (Optional)', key: 'secondary_contact', width: 28 },
    { header: 'Admission Date (YYYY-MM-DD)', key: 'joined_date', width: 25 },
    { header: 'Status (Active / Inactive)', key: 'status', width: 22 }
  ];

  // Sample data rows matching real-world student data
  ws.addRow({
    roll_no: 'TFC-001',
    name: 'Abdul Rehman',
    grade: 'Class 9 (Matric I)',
    field: 'Commerce',
    gender: 'Male',
    monthly_fee: 3000,
    admission_fee: 500,
    contact: '0331-2118429',
    secondary_contact: '0332-3363793',
    joined_date: '2024-09-23',
    status: 'Active'
  });

  ws.addRow({
    roll_no: '',
    name: 'Muhammad Ahmad',
    grade: 'Class 7',
    field: '',
    gender: 'Male',
    monthly_fee: 2500,
    admission_fee: 0,
    contact: '0343-8075590',
    secondary_contact: '',
    joined_date: '2024-09-18',
    status: 'Active'
  });

  ws.addRow({
    roll_no: '',
    name: 'Sakina Ashiq',
    grade: 'Class 9 (Matric I)',
    field: 'Commerce',
    gender: 'Female',
    monthly_fee: 3200,
    admission_fee: 0,
    contact: '0321-2258403',
    secondary_contact: '',
    joined_date: '2024-10-04',
    status: 'Active'
  });

  ws.addRow({
    roll_no: '',
    name: 'Qasim Muhammad Hassan',
    grade: 'Class 9 (Matric I)',
    field: 'Science',
    gender: 'Male',
    monthly_fee: 3000,
    admission_fee: 0,
    contact: '0343-2338998',
    secondary_contact: '0318-1258435',
    joined_date: '2024-10-10',
    status: 'Active'
  });

  ws.addRow({
    roll_no: '',
    name: 'Imran Ullah',
    grade: 'Class 5',
    field: '',
    gender: 'Male',
    monthly_fee: 2000,
    admission_fee: 0,
    contact: '0300-0880725',
    secondary_contact: '',
    joined_date: '2024-08-13',
    status: 'Active'
  });

  // Header styling with Emerald branding
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 28;

  for (let i = 2; i <= 6; i++) {
    const row = ws.getRow(i);
    row.height = 20;
    row.alignment = { vertical: 'middle' };
  }

  // Reference sheet with available options
  const refWs = wb.addWorksheet('Instructions & Options');
  refWs.columns = [
    { header: 'Available Classes / Grades', key: 'grades', width: 26 },
    { header: 'Available Fields / Groups (Class > 8)', key: 'fields', width: 34 },
    { header: 'Rules & Guidelines', key: 'rules', width: 55 }
  ];

  const rulesList = [
    '1. Student Full Name, Class / Grade, and Monthly Fee are required.',
    '2. Roll Number is optional. If left blank, the system automatically assigns the next consecutive TFC-00X.',
    '3. Primary Phone is optional. You can enter phone numbers with or without dashes.',
    '4. Field / Group is applicable for Class 9 and above (Science, Commerce, etc.). Leave blank for junior classes.',
    '5. Gender should be Male, Female, or Other.',
    '6. Admission Date format is YYYY-MM-DD (e.g. 2024-09-18) or DD/MM/YYYY.',
    '7. Status can be Active or Inactive (defaults to Active if left blank).'
  ];

  const maxLen = Math.max(COACHING_GRADES.length, COACHING_FIELDS.length, rulesList.length);
  for (let i = 0; i < maxLen; i++) {
    refWs.addRow({
      grades: COACHING_GRADES[i] || '',
      fields: COACHING_FIELDS[i] || '',
      rules: rulesList[i] || ''
    });
  }

  const refHeader = refWs.getRow(1);
  refHeader.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  refHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  refHeader.height = 26;

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), 'Coaching_Students_Import_Template.xlsx');
};

/**
 * Flexible Excel / CSV parser for bulk coaching students import.
 * Supports .xlsx, .xls, and .csv with automatic header detection and sequential roll number assignment.
 */
export const parseCoachingStudentUpload = async (file, existingStudents = []) => {
  return new Promise(async (resolve, reject) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });

      if (!rawRows || rawRows.length === 0) {
        throw new Error('The uploaded file contains no data rows.');
      }

      // Compute highest existing roll number to avoid collisions
      let maxRollNum = 0;
      (existingStudents || []).forEach(s => {
        const val = s.roll_no || s.student_id || '';
        const m = val.match(/TFC-(\d+)/i);
        if (m) {
          const num = parseInt(m[1], 10);
          if (num > maxRollNum) maxRollNum = num;
        }
      });

      const today = new Date().toISOString().split('T')[0];
      const validRows = [];
      const invalidRows = [];

      const findField = (row, ...keywords) => {
        const rowKeys = Object.keys(row);
        for (const kw of keywords) {
          if (row[kw] !== undefined && String(row[kw]).trim() !== '') {
            return String(row[kw]).trim();
          }
          const cleanKw = kw.toLowerCase().replace(/[^a-z0-9]/g, '');
          const found = rowKeys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(cleanKw));
          if (found && row[found] !== undefined && String(row[found]).trim() !== '') {
            return String(row[found]).trim();
          }
        }
        return '';
      };

      rawRows.forEach((row, index) => {
        const rowNum = index + 2; // Row number in spreadsheet (1 is header)
        const rawName = findField(row, 'Student Full Name', 'Full Name', 'Student Name', 'Name');

        if (!rawName) {
          invalidRows.push({
            rowNumber: rowNum,
            data: row,
            reason: 'Missing student full name'
          });
          return;
        }

        const rawGrade = findField(row, 'Class / Grade', 'Class', 'Grade', 'Course');
        const rawField = findField(row, 'Field / Group', 'Field', 'Group', 'Subject');
        const rawGender = findField(row, 'Gender', 'Sex');
        const rawMonthly = findField(row, 'Monthly Fee', 'Monthly', 'Fee', 'Tuition Fee');
        const rawAdm = findField(row, 'Admission Fee', 'Adm Fee', 'Registration Fee');
        const rawContact = findField(row, 'Primary Phone', 'Phone', 'Contact', 'Mobile', 'Cell');
        const rawSecondary = findField(row, 'Guardian / 2nd Phone', 'Guardian Phone', 'Secondary Phone', '2nd Phone', 'WhatsApp');
        const rawDate = findField(row, 'Admission Date', 'Joined Date', 'Date');
        const rawStatus = findField(row, 'Status', 'State');
        const rawRoll = findField(row, 'Roll Number', 'Roll No', 'RollNo', 'ID');

        // Resolve Grade
        let resolvedGrade = 'Class 9 (Matric I)';
        if (rawGrade) {
          const matchedG = COACHING_GRADES.find(g =>
            g.toLowerCase() === rawGrade.toLowerCase() ||
            rawGrade.toLowerCase().includes(g.toLowerCase()) ||
            g.toLowerCase().includes(rawGrade.toLowerCase())
          );
          if (matchedG) {
            resolvedGrade = matchedG;
          } else {
            if (/matric\s*ii|10th|class\s*10/i.test(rawGrade)) resolvedGrade = 'Class 10 (Matric II)';
            else if (/matric\s*i|9th|class\s*9/i.test(rawGrade)) resolvedGrade = 'Class 9 (Matric I)';
            else if (/inter\s*i\b|1st\s*year|first\s*year/i.test(rawGrade)) resolvedGrade = '1st Year (Inter I)';
            else if (/inter\s*ii\b|2nd\s*year|second\s*year/i.test(rawGrade)) resolvedGrade = '2nd Year (Inter II)';
            else if (/class\s*8|8th/i.test(rawGrade)) resolvedGrade = 'Class 8';
            else if (/class\s*7|7th/i.test(rawGrade)) resolvedGrade = 'Class 7';
            else if (/class\s*6|6th/i.test(rawGrade)) resolvedGrade = 'Class 6';
            else if (/class\s*5|5th|five/i.test(rawGrade)) resolvedGrade = 'Class 5';
            else if (/class\s*4|4th|four/i.test(rawGrade)) resolvedGrade = 'Class 4';
            else if (/class\s*3|3rd|three/i.test(rawGrade)) resolvedGrade = 'Class 3';
            else if (/class\s*2|2nd|two/i.test(rawGrade)) resolvedGrade = 'Class 2';
            else if (/class\s*1|1st|one/i.test(rawGrade)) resolvedGrade = 'Class 1';
            else if (/playgroup|nursery/i.test(rawGrade)) resolvedGrade = 'Playgroup / Nursery';
            else if (/kg|prep/i.test(rawGrade)) resolvedGrade = 'KG / Prep';
            else if (/o[-\s]?level/i.test(rawGrade)) resolvedGrade = 'O-Levels';
            else if (/a[-\s]?level/i.test(rawGrade)) resolvedGrade = 'A-Levels';
            else resolvedGrade = rawGrade;
          }
        }

        // Resolve Field (if Class > 8)
        let resolvedField = '';
        if (isClassAboveEight(resolvedGrade)) {
          if (rawField) {
            const matchedF = COACHING_FIELDS.find(f => f.toLowerCase() === rawField.toLowerCase());
            resolvedField = matchedF || rawField;
          } else {
            if (/commerce/i.test(rawGrade)) resolvedField = 'Commerce';
            else if (/pre[-\s]?med/i.test(rawGrade)) resolvedField = 'Pre-Medical';
            else if (/pre[-\s]?eng/i.test(rawGrade)) resolvedField = 'Pre-Engineering';
            else if (/computer|ics/i.test(rawGrade)) resolvedField = 'Computer Science (ICS)';
            else if (/arts/i.test(rawGrade)) resolvedField = 'Arts / Humanities';
            else resolvedField = 'Science';
          }
        }

        // Resolve Gender
        let resolvedGender = 'Male';
        if (rawGender) {
          if (/female|f|girl|woman/i.test(rawGender)) resolvedGender = 'Female';
          else if (/other/i.test(rawGender)) resolvedGender = 'Other';
        }

        // Resolve Fees
        const numMonthly = Number(String(rawMonthly).replace(/[^0-9.]/g, '')) || 0;
        const numAdm = Number(String(rawAdm).replace(/[^0-9.]/g, '')) || 0;

        // Resolve Roll Number (auto sequential if omitted)
        let assignedRoll = '';
        if (rawRoll) {
          const m = rawRoll.match(/TFC-(\d+)/i);
          if (m) {
            assignedRoll = `TFC-${String(parseInt(m[1], 10)).padStart(3, '0')}`;
            const parsedNum = parseInt(m[1], 10);
            if (parsedNum > maxRollNum) maxRollNum = parsedNum;
          } else {
            assignedRoll = rawRoll;
          }
        } else {
          maxRollNum++;
          assignedRoll = `TFC-${String(maxRollNum).padStart(3, '0')}`;
        }

        // Resolve Status
        let resolvedStatus = 'active';
        if (rawStatus && /inactive|left|dropped|complete/i.test(rawStatus)) {
          resolvedStatus = rawStatus.toLowerCase();
        }

        // Format Date
        let cleanDate = today;
        if (rawDate) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
            cleanDate = rawDate;
          } else if (rawDate.includes('/')) {
            const parts = rawDate.split('/');
            if (parts.length === 3) {
              const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
              cleanDate = `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          } else {
            cleanDate = rawDate;
          }
        }

        validRows.push({
          rowNumber: rowNum,
          roll_no: assignedRoll,
          name: rawName,
          grade: resolvedGrade,
          field: resolvedField,
          gender: resolvedGender,
          monthly_fee: numMonthly,
          admission_fee: numAdm,
          contact: rawContact,
          contact_number: rawContact,
          secondary_contact: rawSecondary,
          guardian_contact: rawSecondary,
          joined_date: cleanDate,
          status: resolvedStatus,
          class_type: 'Regular',
          timeslot: '',
          timing: ''
        });
      });

      resolve({
        validRows,
        invalidRows,
        totalRows: rawRows.length
      });
    } catch (err) {
      reject(err);
    }
  });
};

