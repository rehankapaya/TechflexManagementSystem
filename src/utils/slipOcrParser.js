import { MONTHS_SHORT, normalizeMonth } from './monthUtils';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Common Coaching Grades for matching
export const COACHING_GRADES = [
  'Class 5',
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9 (Matric I)',
  'Class 10 (Matric II)',
  '1st Year (Inter I)',
  '2nd Year (Inter II)',
  'O-Levels',
  'A-Levels',
  'General Coaching'
];

/**
 * Intelligent regex and heuristic parser for TechFlex Coaching Fee Slips
 * Slip fields:
 * - Student Name
 * - Course/Class
 * - Fees for the month of
 * - Late Fees Rs
 * - Rs. [Amount]
 * - Date [DD] [MM] [20YY]
 * - Cash / Online Transfer
 * - Serial No (optional)
 */
export const parseSlipTextLocal = (rawText, coachingStudents = []) => {
  const result = {
    studentName: '',
    rollNo: '',
    grade: '',
    month: '',
    year: new Date().getFullYear().toString(),
    payDate: new Date().toISOString().split('T')[0],
    amount: 0,
    lateFee: 0,
    serialNo: '',
    paymentMethod: 'Cash',
    matchedStudent: null,
    confidence: 'low',
    rawText
  };

  if (!rawText || typeof rawText !== 'string') return result;

  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const textClean = rawText.replace(/\s+/g, ' ');

  // 1. Roll Number Search (e.g. TFC-001, TFC-02, TFC001)
  const rollMatch = textClean.match(/\b(TFC[-\s]?\d{1,4})\b/i);
  if (rollMatch) {
    const formattedRoll = rollMatch[1].toUpperCase().replace(/\s+/, '-');
    result.rollNo = formattedRoll.includes('-') ? formattedRoll : formattedRoll.replace('TFC', 'TFC-');
  }

  // 2. Serial Number / Slip Number Search (Optional)
  // Matches: S.No: 1042, Slip No: 1042, Serial No: 1042, No: 1042, #1042, S# 1042
  const serialMatch = textClean.match(/(?:S\.?\s*No\.?|Serial\s*No\.?|Slip\s*No\.?|Receipt\s*No\.?|S\s*#|#)\s*[:\-]?\s*([A-Za-z0-9\-]{2,10})/i);
  if (serialMatch) {
    result.serialNo = serialMatch[1].trim();
  }

  // 3. Late Fees Extraction
  const lateMatch = textClean.match(/Late\s*Fees?\s*(?:Rs\.?)?[\s:\-_]+([0-9,]+)/i);
  if (lateMatch) {
    const lateVal = parseInt(lateMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(lateVal)) result.lateFee = lateVal;
  }

  // 4. Main Payment Amount (Rs. [amount])
  // Remove the late fee string first to avoid picking late fee as main amount
  let textForAmount = textClean;
  if (lateMatch) {
    textForAmount = textClean.replace(lateMatch[0], ' ');
  }

  // Find all Rs. / PKR amounts
  const rsMatches = Array.from(textForAmount.matchAll(/(?:Rs\.?|PKR)\s*[:\-]?\s*([0-9,]{3,8})/gi));
  if (rsMatches.length > 0) {
    // Pick the largest reasonable fee amount (e.g. 500 to 50000)
    const amounts = rsMatches
      .map(m => parseInt(m[1].replace(/,/g, ''), 10))
      .filter(n => !isNaN(n) && n >= 300);
    if (amounts.length > 0) {
      result.amount = Math.max(...amounts);
    }
  }

  // Fallback for amount: if no Rs prefix found, look for isolated 3-5 digit numbers
  if (!result.amount) {
    const numMatches = textForAmount.match(/\b([1-9][0-9]{2,4})\b/g);
    if (numMatches) {
      const candidates = numMatches
        .map(n => parseInt(n, 10))
        .filter(n => n >= 500 && n <= 50000 && n !== 2024 && n !== 2025 && n !== 2026 && n !== 2027);
      if (candidates.length > 0) {
        result.amount = candidates[candidates.length - 1]; // often at the bottom
      }
    }
  }

  // 5. Month & Year Extraction (Fees for the month of ______)
  const monthTargetMatch = textClean.match(/(?:Fess|Fees)\s+for\s+the\s+month\s+of[\s:\-_]+([A-Za-z0-9\s,\-_]+)/i);
  const monthSearchPool = monthTargetMatch ? monthTargetMatch[1] : textClean;

  // Search standard months
  const monthNames = [
    { key: 'Jan', regex: /\b(?:Jan|January)\b/i },
    { key: 'Feb', regex: /\b(?:Feb|February)\b/i },
    { key: 'Mar', regex: /\b(?:Mar|March)\b/i },
    { key: 'Apr', regex: /\b(?:Apr|April)\b/i },
    { key: 'May', regex: /\b(?:May)\b/i },
    { key: 'Jun', regex: /\b(?:Jun|June)\b/i },
    { key: 'Jul', regex: /\b(?:Jul|July)\b/i },
    { key: 'Aug', regex: /\b(?:Aug|August)\b/i },
    { key: 'Sep', regex: /\b(?:Sep|September)\b/i },
    { key: 'Oct', regex: /\b(?:Oct|October)\b/i },
    { key: 'Nov', regex: /\b(?:Nov|November)\b/i },
    { key: 'Dec', regex: /\b(?:Dec|December)\b/i }
  ];

  for (const m of monthNames) {
    if (m.regex.test(monthSearchPool) || (monthTargetMatch && m.regex.test(textClean))) {
      result.month = m.key;
      break;
    }
  }

  // Year Extraction (2024 - 2030)
  const yearMatch = textClean.match(/\b(202[4-9]|203[0-5])\b/);
  if (yearMatch) {
    result.year = yearMatch[1];
  }

  // 6. Date Extraction (From DD MM 20YY boxes or standard date)
  const dateMatch = textClean.match(/\b(\d{1,2})[\s\/\-\.]+(\d{1,2})[\s\/\-\.]+(202[4-9]|203[0-5])\b/);
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const monthNum = parseInt(dateMatch[2], 10);
    const yr = dateMatch[3];
    if (day >= 1 && day <= 31 && monthNum >= 1 && monthNum <= 12) {
      result.payDate = `${yr}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (!result.month) {
        result.month = MONTHS_SHORT[monthNum - 1];
      }
    }
  }

  // 7. Payment Mode (Cash vs Online Transfer)
  if (/Online\s*Transfer/i.test(textClean) && !/Cash/i.test(textClean)) {
    result.paymentMethod = 'Online Transfer';
  } else if (/Cash/i.test(textClean)) {
    result.paymentMethod = 'Cash';
  }

  // 8. Class / Grade Extraction
  for (const g of COACHING_GRADES) {
    const cleanG = g.toLowerCase().replace(/[\(\)]/g, '');
    if (textClean.toLowerCase().includes(cleanG) || textClean.toLowerCase().includes(g.toLowerCase())) {
      result.grade = g;
      break;
    }
  }
  if (!result.grade) {
    if (/matric\s*ii|class\s*10/i.test(textClean)) result.grade = 'Class 10 (Matric II)';
    else if (/matric\s*i|class\s*9/i.test(textClean)) result.grade = 'Class 9 (Matric I)';
    else if (/inter\s*i\b|1st\s*year/i.test(textClean)) result.grade = '1st Year (Inter I)';
    else if (/inter\s*ii\b|2nd\s*year/i.test(textClean)) result.grade = '2nd Year (Inter II)';
    else if (/class\s*8/i.test(textClean)) result.grade = 'Class 8';
    else if (/class\s*7/i.test(textClean)) result.grade = 'Class 7';
    else if (/class\s*6/i.test(textClean)) result.grade = 'Class 6';
  }

  // 9. Student Name Extraction & Database Student Matching
  let rawExtractedName = '';
  const nameLineMatch = textClean.match(/(?:Student\s*Name|StudentName)[\s:\-_]+([A-Za-z\s]{3,35})(?:\s+Course|\s+Class|\s+Fess|\s+Fees|\s*$)/i);
  if (nameLineMatch) {
    rawExtractedName = nameLineMatch[1].trim();
    result.studentName = rawExtractedName;
  }

  // Match against loaded coaching students list
  if (Array.isArray(coachingStudents) && coachingStudents.length > 0) {
    // 9a. Exact Roll Number Match
    if (result.rollNo) {
      const byRoll = coachingStudents.find(s =>
        (s.roll_no && s.roll_no.toUpperCase() === result.rollNo.toUpperCase()) ||
        (s.student_id && s.student_id.toUpperCase() === result.rollNo.toUpperCase())
      );
      if (byRoll) {
        result.matchedStudent = byRoll;
        result.studentName = byRoll.name;
        result.confidence = 'high';
        if (!result.grade && byRoll.grade) result.grade = byRoll.grade;
        if (!result.amount && byRoll.monthly_fee) result.amount = Number(byRoll.monthly_fee);
      }
    }

    // 9b. Name matching if no roll number match
    if (!result.matchedStudent) {
      // Check if full student name exists in OCR text
      let bestMatch = null;
      let highestScore = 0;

      coachingStudents.forEach(student => {
        if (!student.name) return;
        const sName = student.name.toLowerCase().trim();
        const ocrLower = textClean.toLowerCase();

        // Exact substring match in OCR text
        if (ocrLower.includes(sName)) {
          bestMatch = student;
          highestScore = 100;
          return;
        }

        // Substring parts match
        const parts = sName.split(/\s+/).filter(p => p.length >= 3);
        let matchCount = 0;
        parts.forEach(p => {
          if (ocrLower.includes(p)) matchCount++;
        });

        const score = parts.length > 0 ? (matchCount / parts.length) * 80 : 0;
        if (score > highestScore && score >= 50) {
          highestScore = score;
          bestMatch = student;
        }
      });

      if (bestMatch) {
        result.matchedStudent = bestMatch;
        result.studentName = bestMatch.name;
        result.rollNo = bestMatch.roll_no || bestMatch.student_id || '';
        result.confidence = highestScore >= 80 ? 'high' : 'medium';
        if (!result.grade && bestMatch.grade) result.grade = bestMatch.grade;
        if (!result.amount && bestMatch.monthly_fee) result.amount = Number(bestMatch.monthly_fee);
      }
    }
  }

  return result;
};

/**
 * Advanced AI Vision Extractor using Gemini Flash
 * Reads handwriting, checkboxes, and slip tables with ultra-high fidelity
 */
export const parseSlipWithGeminiAI = async (base64Image, apiKey, coachingStudents = []) => {
  if (!apiKey) {
    throw new Error("Gemini API key is required for AI Vision extraction.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Support gemini-1.5-flash or gemini-2.5-flash
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  // Clean base64 string
  const cleanB64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

  const prompt = `You are an automated document data extractor for TechFlex Institute's Coaching Center Fee Slip.
Examine this fee slip photo or scan carefully. Extract the filled fields as a single JSON object.

Important layout notes:
- "Student Name": Name of the student written on the line.
- "Course/Class": Class or grade (e.g. Class 9, Class 10, Matric, Inter, etc.).
- "Fess for the month of": The billing month and year (e.g. "Nov 2026", "December", etc.).
- "Late Fees Rs": Late fees amount if any (number, default 0).
- "Rs. [Box]": The tuition fee payment amount (number).
- "Date boxes [DD][MM][20YY]": Payment receipt date.
- Payment method: "Cash" or "Online Transfer" (based on which box is checked or written).
- Serial Number / Slip No: A receipt serial number if stamped or written anywhere (e.g. "1042", "SN-502", etc.), or null if none.
- Roll number: If written (e.g. "TFC-001"), extract it.

Output MUST be strictly valid JSON without any markdown formatting or commentary:
{
  "student_name": "string or null",
  "roll_no": "string or null",
  "grade": "string or null",
  "month": "3-letter short month like Nov or null",
  "year": "4-digit year like 2026 or null",
  "pay_date": "YYYY-MM-DD string or null",
  "amount": 0,
  "late_fee": 0,
  "serial_no": "string or null",
  "payment_method": "Cash"
}`;

  const imagePart = {
    inlineData: {
      data: cleanB64,
      mimeType: 'image/png'
    }
  };

  const response = await model.generateContent([prompt, imagePart]);
  const textResponse = response.response.text();

  // Parse JSON
  let cleanedJson = textResponse.trim();
  if (cleanedJson.startsWith('```json')) {
    cleanedJson = cleanedJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanedJson.startsWith('```')) {
    cleanedJson = cleanedJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  const aiData = JSON.parse(cleanedJson);

  // Normalize month
  const normMonth = aiData.month ? normalizeMonth(aiData.month) : getCanonicalShortMonth();

  const parsed = {
    studentName: aiData.student_name || '',
    rollNo: aiData.roll_no || '',
    grade: aiData.grade || '',
    month: normMonth,
    year: aiData.year || new Date().getFullYear().toString(),
    payDate: aiData.pay_date || new Date().toISOString().split('T')[0],
    amount: Number(aiData.amount) || 0,
    lateFee: Number(aiData.late_fee) || 0,
    serialNo: aiData.serial_no || '',
    paymentMethod: aiData.payment_method || 'Cash',
    matchedStudent: null,
    confidence: 'high',
    rawText: textResponse
  };

  // Match against loaded students list
  if (Array.isArray(coachingStudents) && coachingStudents.length > 0) {
    if (parsed.rollNo) {
      const byRoll = coachingStudents.find(s =>
        (s.roll_no && s.roll_no.toUpperCase() === parsed.rollNo.toUpperCase()) ||
        (s.student_id && s.student_id.toUpperCase() === parsed.rollNo.toUpperCase())
      );
      if (byRoll) {
        parsed.matchedStudent = byRoll;
        parsed.studentName = byRoll.name;
        if (!parsed.grade && byRoll.grade) parsed.grade = byRoll.grade;
      }
    }

    if (!parsed.matchedStudent && parsed.studentName) {
      const target = parsed.studentName.toLowerCase().trim();
      const byName = coachingStudents.find(s => s.name && s.name.toLowerCase().trim() === target) ||
        coachingStudents.find(s => s.name && (s.name.toLowerCase().includes(target) || target.includes(s.name.toLowerCase())));
      if (byName) {
        parsed.matchedStudent = byName;
        parsed.rollNo = byName.roll_no || byName.student_id || '';
        if (!parsed.grade && byName.grade) parsed.grade = byName.grade;
      }
    }
  }

  return parsed;
};

