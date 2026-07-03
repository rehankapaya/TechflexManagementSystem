import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const generateTechflexRecord = async (studentsData, coursesData, feesData, expensesData, currentYearFilter) => {
    const wb = new ExcelJS.Workbook();
    
    // Default objects
    const students = studentsData || {};
    const courses = coursesData || {};
    const fees = feesData || {};
    const expenses = expensesData || {};

    const monthsFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthLabels = { "January":"Jan", "February":"Feb", "March":"Mar", "April":"Apr", "May":"May", "June":"June", "July":"July", "August":"Aug", "September":"Sep", "October":"Oct", "November":"Nov", "December":"Dec" };

    const currentYear = new Date().getFullYear();
    let yearsList = Array.from({ length: currentYear - 2023 + 1 }, (_, i) => 2023 + i);
    if (currentYearFilter !== 'all') {
        yearsList = [Number(currentYearFilter)];
    }

    const dbMonthLabels = { "January":"Jan", "February":"Feb", "March":"Mar", "April":"Apr", "May":"May", "June":"Jun", "July":"Jul", "August":"Aug", "September":"Sep", "October":"Oct", "November":"Nov", "December":"Dec" };

    // Dashboard Data
    const dashboardWs = wb.addWorksheet('Dashboard');
    const dashCols = [{ header: 'Month', key: 'col0', width: 25 }];
    yearsList.forEach(y => dashCols.push({ header: y.toString(), key: `y${y}`, width: 15 }));
    dashboardWs.columns = dashCols;

    const revenueByYearMonth = {};
    const genderYear = { "Male": {}, "Female": {} };
    const laptopYear = { "Has Laptop": {}, "No! Provided By ins": {} };
    const statusYear = { "dropout": {}, "coursecomplete": {}, "active": {} };
    const totalsByStatus = { active: 0, coursecomplete: 0, dropout: 0 };
    const courseYear = {};
    
    yearsList.forEach(y => {
       revenueByYearMonth[y] = {};
       genderYear["Male"][y] = 0; genderYear["Female"][y] = 0;
       laptopYear["Has Laptop"][y] = 0; laptopYear["No! Provided By ins"][y] = 0;
       statusYear["dropout"][y] = 0; statusYear["coursecomplete"][y] = 0; statusYear["active"][y] = 0;
    });

    // Admission Record Data
    const admissionWs = wb.addWorksheet('Admission Record');
    admissionWs.columns = [
        { header: 'Student ID', key: 'studentId', width: 15 },
        { header: 'Student Name', key: 'name', width: 25 },
        { header: 'Gender', key: 'gender', width: 10 },
        { header: 'Contact', key: 'contact', width: 15 },
        { header: 'Admission Fees', key: 'admissionFee', width: 15 },
        { header: 'Date Of Joining', key: 'doj', width: 15 },
        { header: 'Added By', key: 'addedBy', width: 15 },
        { header: 'Month', key: 'month', width: 15 },
        { header: 'Year', key: 'year', width: 10 },
        { header: 'Laptop', key: 'laptop', width: 15 }
    ];

    // Students Record Data
    const studentsRecordWs = wb.addWorksheet('Students Record');
    studentsRecordWs.columns = [
        { header: 'Student ID', key: 'studentId', width: 15 },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Account Status', key: 'accStatus', width: 15 },
        { header: 'Course Name', key: 'courseName', width: 25 },
        { header: 'Course Status', key: 'courseStatus', width: 15 },
        { header: 'Start Date', key: 'startDate', width: 15 },
        { header: 'Status Date', key: 'statusDate', width: 15 },
        { header: 'Contact', key: 'contact', width: 15 },
        { header: 'Year', key: 'year', width: 10 }
    ];

    const courseSheets = {};
    const feesRecordWs = wb.addWorksheet('Fees Record');
    const feeColumns = [
        { header: 'Student ID', key: 'studentId', width: 15 },
        { header: 'Student Name', key: 'name', width: 25 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Course', key: 'course', width: 20 },
        { header: 'Year', key: 'year', width: 10 },
        { header: 'Agreed Monthly Fee', key: 'monthlyFee', width: 20 },
        { header: 'Jan', key: 'Jan', width: 10 },
        { header: 'Feb', key: 'Feb', width: 10 },
        { header: 'Mar', key: 'Mar', width: 10 },
        { header: 'Apr', key: 'Apr', width: 10 },
        { header: 'May', key: 'May', width: 10 },
        { header: 'June', key: 'June', width: 10 },
        { header: 'July', key: 'July', width: 10 },
        { header: 'Aug', key: 'Aug', width: 10 },
        { header: 'Sep', key: 'Sep', width: 10 },
        { header: 'Oct', key: 'Oct', width: 10 },
        { header: 'Nov', key: 'Nov', width: 10 },
        { header: 'Dec', key: 'Dec', width: 10 },
        { header: 'Start Date', key: 'startDate', width: 15 },
        { header: 'Status Date', key: 'statusDate', width: 15 },
        { header: 'Amount Paid', key: 'amountPaid', width: 15 },
        { header: 'Balance Remaining', key: 'balance', width: 15 },
        { header: 'Waived Amount', key: 'waived', width: 15 },
        { header: 'Payment Date', key: 'paymentDate', width: 15 }
    ];
    feesRecordWs.columns = feeColumns;

    const fmtDate = (d) => d ? new Date(d).toISOString().split('T')[0] : 'N/A';

    Object.keys(students).forEach(sid => {
        const student = students[sid];
        const admissionDate = new Date(student.createdAt || new Date());
        const doj = fmtDate(student.createdAt);
        const admMonth = monthsFull[admissionDate.getMonth()];
        const admYear = admissionDate.getFullYear();

        // Populate Admission Record
        if (currentYearFilter === 'all' || admYear.toString() === currentYearFilter) {
            admissionWs.addRow({
                studentId: student.student_id,
                name: student.name,
                gender: student.gender,
                contact: student.contact,
                admissionFee: student.admission_fee || 0,
                doj: doj,
                addedBy: student.addedBy || 'Admin',
                month: admMonth,
                year: admYear,
                laptop: student.laptop_status
            });
        }

        if (yearsList.includes(admYear)) {
            if (student.gender && genderYear[student.gender] !== undefined) genderYear[student.gender][admYear] += 1;
            if (student.laptop_status && laptopYear[student.laptop_status] !== undefined) laptopYear[student.laptop_status][admYear] += 1;
        }

        if (student.enrolled_courses) {
            Object.keys(student.enrolled_courses).forEach(cid => {
                const cInfo = student.enrolled_courses[cid];
                const cName = courses[cid]?.name || cInfo.course_name || "Unknown";
                const cStatus = cInfo.course_status || "active";
                const cStartDate = fmtDate(cInfo.enrolledAt);
                const cYear = new Date(cInfo.enrolledAt || new Date()).getFullYear();

                // Populate Students Record
                if (currentYearFilter === 'all' || cYear.toString() === currentYearFilter) {
                    studentsRecordWs.addRow({
                        studentId: student.student_id,
                        name: student.name,
                        accStatus: student.status === 'active' ? 'ACTIVE' : 'INACTIVE',
                        courseName: cName,
                        courseStatus: cStatus,
                        startDate: cStartDate,
                        statusDate: cStartDate,
                        contact: student.contact,
                        year: cYear
                    });
                }

                if (totalsByStatus[cStatus] !== undefined) totalsByStatus[cStatus] += 1;
                if (yearsList.includes(cYear)) {
                    if (statusYear[cStatus] !== undefined) statusYear[cStatus][cYear] += 1;
                    if (!courseYear[cName]) {
                        courseYear[cName] = {};
                        yearsList.forEach(y => courseYear[cName][y] = 0);
                    }
                    courseYear[cName][cYear] += 1;
                }

                // Create individual course sheets dynamically
                let safeName = cName.substring(0, 31).replace(/[\*\?\/\\\[\]]/g, '');
                if (!courseSheets[safeName]) {
                    courseSheets[safeName] = wb.addWorksheet(safeName);
                    courseSheets[safeName].columns = feeColumns;
                }

                const feeHistory = fees[sid]?.[cid] || {};
                let yearsPresent = new Set();
                Object.keys(feeHistory).forEach(mk => yearsPresent.add(mk.split('_')[1]));
                if (yearsPresent.size === 0) yearsPresent.add(cYear.toString());
                if (currentYearFilter !== 'all') {
                    yearsPresent.add(currentYearFilter);
                }

                yearsPresent.forEach(yr => {
                    if (currentYearFilter !== 'all' && yr.toString() !== currentYearFilter) return;

                    const rowData = {
                        studentId: student.student_id,
                        name: student.name,
                        phone: student.contact,
                        status: student.status === 'active' ? 'ACTIVE' : 'INACTIVE',
                        course: cName,
                        year: yr,
                        monthlyFee: cInfo.agreed_monthly_fee || 0,
                        Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, June: 0, 
                        July: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0,
                        startDate: cStartDate,
                        statusDate: cStartDate,
                        amountPaid: 0,
                        balance: 0,
                        waived: 0,
                        paymentDate: 'N/A'
                    };

                    let totalPaid = 0;
                    let lastPayment = 0;
                    
                    monthsFull.forEach(m => {
                        const rec = feeHistory[`${dbMonthLabels[m]}_${yr}`];
                        if (rec) {
                            rowData[monthLabels[m]] = Number(rec.paid || 0);
                            totalPaid += Number(rec.paid || 0);
                            rowData.balance += Number(rec.balance || 0);
                            rowData.waived += Number(rec.waived || 0);
                            if (rec.timestamp && rec.timestamp > lastPayment) {
                                lastPayment = rec.timestamp;
                            }
                            if (!revenueByYearMonth[yr]) revenueByYearMonth[yr] = {};
                            revenueByYearMonth[yr][m] = (revenueByYearMonth[yr][m] || 0) + Number(rec.paid || 0);
                        }
                    });

                    if (student.admission_fee && yr == admYear) {
                         if (!revenueByYearMonth[admYear]) revenueByYearMonth[admYear] = {};
                         revenueByYearMonth[admYear][admMonth] = (revenueByYearMonth[admYear][admMonth] || 0) + Number(student.admission_fee);
                    }

                    rowData.paymentDate = lastPayment ? fmtDate(lastPayment) : 'N/A';

                    // Add to Fees Record
                    const fRow = feesRecordWs.addRow(rowData);
                    // Add Excel SUM Formula for Amount Paid
                    fRow.getCell('amountPaid').value = { formula: `SUM(H${fRow.number}:S${fRow.number})`, result: totalPaid };

                    // Add to Course Sheet
                    const cRow = courseSheets[safeName].addRow(rowData);
                    cRow.getCell('amountPaid').value = { formula: `SUM(H${cRow.number}:S${cRow.number})`, result: totalPaid };
                });
            });
        }
    });

    // Populate Dashboard Data
    monthsFull.forEach(m => {
        const row = { col0: m };
        yearsList.forEach(y => row[`y${y}`] = revenueByYearMonth[y]?.[m] || 0);
        dashboardWs.addRow(row);
    });

    const writeTable = (title, dataObj, rowKeys) => {
        dashboardWs.addRow([]);
        const headerRow = { col0: title };
        yearsList.forEach(y => headerRow[`y${y}`] = y.toString());
        const hr = dashboardWs.addRow(headerRow);
        hr.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        hr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B2559' } };
        
        rowKeys.forEach(rk => {
            const row = { col0: rk };
            yearsList.forEach(y => row[`y${y}`] = dataObj[rk] ? dataObj[rk][y] : 0);
            dashboardWs.addRow(row);
        });
    };

    writeTable('Gender', genderYear, ['Male', 'Female']);
    writeTable('Laptop', laptopYear, ['Has Laptop', 'No! Provided By ins']);
    writeTable('Student Status', statusYear, ['dropout', 'coursecomplete', 'active']);

    dashboardWs.addRow([]);
    const stHeader = dashboardWs.addRow({ col0: 'Active Enrollments', [`y${yearsList[0]}`]: 'Completed Enrollments', [`y${yearsList[1]}`]: 'Dropped Enrollments' });
    stHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    stHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B2559' } };
    dashboardWs.addRow({ col0: totalsByStatus.active, [`y${yearsList[0]}`]: totalsByStatus.coursecomplete, [`y${yearsList[1]}`]: totalsByStatus.dropout });

    writeTable('Course', courseYear, Object.keys(courseYear));

    // Expense Track Sheet
    const expenseWs = wb.addWorksheet('Expense track');
    expenseWs.columns = [
        { header: 'Month', key: 'course', width: 25 },
        { header: 'JANUARY', key: 'January', width: 12 },
        { header: 'FEBRUARY', key: 'February', width: 12 },
        { header: 'MARCH', key: 'March', width: 12 },
        { header: 'APRIL', key: 'April', width: 12 },
        { header: 'MAY', key: 'May', width: 12 },
        { header: 'JUNE', key: 'June', width: 12 },
        { header: 'JULY', key: 'July', width: 12 },
        { header: 'AUGUST', key: 'August', width: 12 },
        { header: 'SEPTEMBER', key: 'September', width: 12 },
        { header: 'OCTOBER', key: 'October', width: 12 },
        { header: 'NOVEMBER', key: 'November', width: 12 },
        { header: 'DECEMBER', key: 'December', width: 12 }
    ];

    const expenseMatrix = {};
    Object.values(courses).forEach(c => expenseMatrix[c.name] = {});
    expenseMatrix['General'] = {};

    const expYear = currentYearFilter === 'all' ? new Date().getFullYear().toString() : currentYearFilter;

    Object.values(expenses).forEach(exp => {
        const expDate = new Date(exp.date);
        if (expDate.getFullYear().toString() === expYear) {
            const m = monthsFull[expDate.getMonth()];
            const cName = exp.courseName || 'General';
            if (!expenseMatrix[cName]) expenseMatrix[cName] = {};
            expenseMatrix[cName][m] = (expenseMatrix[cName][m] || 0) + Number(exp.amount || 0);
        }
    });

    Object.keys(expenseMatrix).forEach(cName => {
        const row = { course: cName };
        monthsFull.forEach(m => {
            row[m] = expenseMatrix[cName][m] || 0;
        });
        expenseWs.addRow(row);
    });

    // Formatting Header Rows
    wb.eachSheet((worksheet) => {
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B2559' } };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    });

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `TECHFLEX_RECORD_${Date.now()}.xlsx`);
};
