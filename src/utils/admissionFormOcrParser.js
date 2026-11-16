import { GoogleGenerativeAI } from '@google/generative-ai';

export const parseAdmissionFormLocal = (rawText, courses = [], coachingGrades = []) => {
  const result = {
    name: '',
    father_name: '',
    gender: 'Male',
    dob: '',
    cnic: '',
    religion: '',
    address: '',
    contact: '',
    secondary_contact: '',
    course_or_class: '',
    matchedCourseId: '',
    matchedGrade: '',
    timeslot: '',
    class_type: '',
    qualification: '',
    email: '',
    batch_code: '',
    reg_no: '',
    admission_date: new Date().toISOString().split('T')[0],
    rawText
  };

  if (!rawText || typeof rawText !== 'string') return result;

  const textClean = rawText.replace(/\s+/g, ' ');

  // 1. Student Name
  const nameMatch = textClean.match(/(?:Name\s*of\s*Student|Student\s*Name)[\s:\-_]+([A-Za-z\s]{2,35})(?:\s+Father|\s+Religion|\s+Batch|\s+D\.?O|\s*$)/i);
  if (nameMatch) {
    result.name = nameMatch[1].trim();
  }

  // 2. Father's Name
  const fatherMatch = textClean.match(/(?:Father(?:[\'’]s)?\s*Name)[\s:\-_]+([A-Za-z\s]{2,35})(?:\s+Religion|\s+N\.?I\.?C|\s+CNIC|\s+D\.?O|\s+Gender|\s*$)/i);
  if (fatherMatch) {
    result.father_name = fatherMatch[1].trim();
  }

  // 3. Gender (Male / Female)
  if (/\bFemale\b/i.test(textClean) && !/\bMale\b/i.test(textClean.replace(/Female/gi, ''))) {
    result.gender = 'Female';
  } else if (/\bMale\b/i.test(textClean)) {
    result.gender = 'Male';
  }

  // 4. CNIC / N.I.C (e.g. 42101-1234567-1 or 4210112345671)
  const cnicMatch = textClean.match(/\b(\d{5}[-\s]?\d{7}[-\s]?\d)\b/);
  if (cnicMatch) {
    result.cnic = cnicMatch[1].replace(/\s+/g, '-');
  }

  // 5. Date of Birth (D.O.B)
  const dobMatch = textClean.match(/(?:D\.?O\.?B|Date\s*of\s*Birth)[\s:\-_]+(\d{1,2}[\/\-\.\s]\d{1,2}[\/\-\.\s](?:19\d{2}|20\d{2}))/i);
  if (dobMatch) {
    result.dob = dobMatch[1].trim();
  }

  // 6. Religion
  const relMatch = textClean.match(/Religion[\s:\-_]+([A-Za-z]+)(?:\s+N\.?I|\s+CNIC|\s*$)/i);
  if (relMatch) {
    result.religion = relMatch[1].trim();
  }

  // 7. Residential Address
  const addrMatch = textClean.match(/(?:Residential\s*Address|Address)[\s:\-_]+([^\n\r]+?)(?:\s+Contact|\s+WhatsApp|\s+Phone|\s*$)/i);
  if (addrMatch) {
    result.address = addrMatch[1].trim();
  }

  // 8. Contact Numbers (Primary & WhatsApp)
  const phoneRegex = /(?:03\d{2}[-\s]?\d{7}|\+?92[-\s]?3\d{2}[-\s]?\d{7}|\b0\d{10}\b)/g;
  const phonesFound = Array.from(textClean.matchAll(phoneRegex)).map(m => m[0].replace(/[-\s]/g, ''));

  if (phonesFound.length > 0) {
    result.contact = phonesFound[0];
    if (phonesFound.length > 1) {
      result.secondary_contact = phonesFound[1];
    }
  }

  // Check specific WhatsApp line if available
  const waMatch = textClean.match(/(?:WhatsApp|Whatsapp)[\s:\-_]+([0-9+\-\s]{10,16})/i);
  if (waMatch) {
    const waClean = waMatch[1].replace(/[-\s]/g, '');
    if (waClean) result.secondary_contact = waClean;
  }

  // 9. Course / Class
  const courseMatch = textClean.match(/(?:Course\s*\/?\s*Class)[\s:\-_]+([^\n\r]+?)(?:\s+Timimg|\s+Timing|\s+Time|\s+Last|\s+Email|\s*$)/i);
  if (courseMatch) {
    result.course_or_class = courseMatch[1].trim();
  }

  // Match against Computer Institute courses
  if (Array.isArray(courses) && courses.length > 0) {
    const pool = result.course_or_class.toLowerCase() || textClean.toLowerCase();
    for (const c of courses) {
      if (c.name && pool.includes(c.name.toLowerCase())) {
        result.matchedCourseId = c.id;
        break;
      }
    }
  }

  // Match against Coaching Grades
  if (Array.isArray(coachingGrades) && coachingGrades.length > 0) {
    const pool = result.course_or_class.toLowerCase() || textClean.toLowerCase();
    for (const g of coachingGrades) {
      const cleanG = g.toLowerCase().replace(/[\(\)]/g, '');
      if (pool.includes(cleanG) || pool.includes(g.toLowerCase())) {
        result.matchedGrade = g;
        break;
      }
    }
    if (!result.matchedGrade) {
      if (/matric\s*ii|class\s*10/i.test(pool)) result.matchedGrade = 'Class 10 (Matric II)';
      else if (/matric\s*i|class\s*9/i.test(pool)) result.matchedGrade = 'Class 9 (Matric I)';
      else if (/inter\s*i\b|1st\s*year/i.test(pool)) result.matchedGrade = '1st Year (Inter I)';
      else if (/inter\s*ii\b|2nd\s*year/i.test(pool)) result.matchedGrade = '2nd Year (Inter II)';
      else if (/class\s*8/i.test(pool)) result.matchedGrade = 'Class 8';
      else if (/class\s*7/i.test(pool)) result.matchedGrade = 'Class 7';
      else if (/class\s*6/i.test(pool)) result.matchedGrade = 'Class 6';
    }
  }

  // 10. Timing / Timeslot
  const timingMatch = textClean.match(/(?:Timimg|Timing|Time)[\s:\-_]+([0-9:\sAPMapm\-]+)/i);
  if (timingMatch) {
    const tRaw = timingMatch[1].trim();
    result.timeslot = tRaw;

    // Detect class_type
    if (/\b(?:2\s*hours?|alternate)\b/i.test(textClean)) {
      result.class_type = 'Alternate (2 Hours)';
    } else {
      result.class_type = 'Regular (1 Hour)';
    }
  }

  // 11. Last Qualification
  const qualMatch = textClean.match(/(?:Last\s*Qualification|Qualification)[\s:\-_]+([A-Za-z0-9\s,\-_]+?)(?:\s+Email|\s+Contact|\s*$)/i);
  if (qualMatch) {
    result.qualification = qualMatch[1].trim();
  }

  // 12. Email
  const emailMatch = textClean.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
  if (emailMatch) {
    result.email = emailMatch[0].trim();
  }

  // 13. Batch Code
  const batchMatch = textClean.match(/Batch\s*Code[\s:\-_]+([A-Za-z0-9\-_]+)/i);
  if (batchMatch) {
    result.batch_code = batchMatch[1].trim();
  }

  // 14. Registration / Roll Number (Office Use)
  const regMatch = textClean.match(/(?:Reg\s*No|Roll\s*No)[\s:\-_]+([A-Za-z0-9\-_]+)/i);
  if (regMatch) {
    result.reg_no = regMatch[1].trim();
  }

  // 15. Admission Date
  const dateMatch = textClean.match(/(?:Date)[\s:\-_]+(\d{1,2}[\/\-\.\s]\d{1,2}[\/\-\.\s](?:202[4-9]|203[0-5]))/i);
  if (dateMatch) {
    const dStr = dateMatch[1].trim();
    const parts = dStr.split(/[\/\-\.\s]+/);
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parts[2];
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
        result.admission_date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }

  return result;
};

export const parseAdmissionFormWithGeminiAI = async (base64Image, apiKey, courses = [], coachingGrades = []) => {
  if (!apiKey) {
    throw new Error("Gemini API key is required for AI Vision extraction.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const cleanB64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

  const prompt = `You are an automated document data extractor for TechFlex Institute's Student Admission Form.
Examine this admission form photo or scan carefully. Extract the filled fields as a single JSON object.

Important layout notes from the form:
- "Name of Student": Student full name
- "Father's Name": Father full name
- "Religion": e.g. Islam
- "N.I.C": CNIC / Identity number (e.g. 42101-1234567-1)
- "D.O.B": Date of birth (YYYY-MM-DD or string)
- "Gender": "Male" or "Female"
- "Residential Address": Address text
- "Contact": Primary phone number
- "WhatsApp": WhatsApp / secondary phone number
- "Course / Class": Enrolled course or school/college coaching class
- "Timing": Batch class timing / slot (e.g. "3:00 PM - 4:00 PM", "5:00 PM - 6:00 PM", etc.)
- "Last Qualification": e.g. Matric, Intermediate, O-Levels, Graduation, etc.
- "Email": Student email address
- "Batch Code": e.g. "B-01" or string
- "Date": Admission date (YYYY-MM-DD format)
- "Reg No": Registration / roll number in office use section

Output MUST be strictly valid JSON without markdown fences or extra commentary:
{
  "student_name": "string or null",
  "father_name": "string or null",
  "gender": "Male" or "Female",
  "dob": "string or null",
  "cnic": "string or null",
  "religion": "string or null",
  "address": "string or null",
  "contact": "string or null",
  "whatsapp": "string or null",
  "course_or_class": "string or null",
  "timing": "string or null",
  "qualification": "string or null",
  "email": "string or null",
  "batch_code": "string or null",
  "reg_no": "string or null",
  "admission_date": "YYYY-MM-DD or null"
}`;

  const imagePart = {
    inlineData: {
      data: cleanB64,
      mimeType: 'image/png'
    }
  };

  const response = await model.generateContent([prompt, imagePart]);
  const textResponse = response.response.text();

  let cleanedJson = textResponse.trim();
  if (cleanedJson.startsWith('```json')) {
    cleanedJson = cleanedJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanedJson.startsWith('```')) {
    cleanedJson = cleanedJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  const aiData = JSON.parse(cleanedJson);

  const parsed = {
    name: aiData.student_name || '',
    father_name: aiData.father_name || '',
    gender: aiData.gender || 'Male',
    dob: aiData.dob || '',
    cnic: aiData.cnic || '',
    religion: aiData.religion || '',
    address: aiData.address || '',
    contact: aiData.contact || '',
    secondary_contact: aiData.whatsapp || '',
    course_or_class: aiData.course_or_class || '',
    matchedCourseId: '',
    matchedGrade: '',
    timeslot: aiData.timing || '',
    class_type: aiData.timing?.includes('2') ? 'Alternate (2 Hours)' : 'Regular (1 Hour)',
    qualification: aiData.qualification || '',
    email: aiData.email || '',
    batch_code: aiData.batch_code || '',
    reg_no: aiData.reg_no || '',
    admission_date: aiData.admission_date || new Date().toISOString().split('T')[0],
    rawText: textResponse
  };

  // Match Course
  if (Array.isArray(courses) && courses.length > 0 && parsed.course_or_class) {
    const cTarget = parsed.course_or_class.toLowerCase();
    const match = courses.find(c => c.name && (c.name.toLowerCase().includes(cTarget) || cTarget.includes(c.name.toLowerCase())));
    if (match) parsed.matchedCourseId = match.id;
  }

  // Match Grade
  if (Array.isArray(coachingGrades) && coachingGrades.length > 0 && parsed.course_or_class) {
    const gTarget = parsed.course_or_class.toLowerCase();
    const match = coachingGrades.find(g => g.toLowerCase().includes(gTarget) || gTarget.includes(g.toLowerCase()));
    if (match) parsed.matchedGrade = match;
  }

  return parsed;
};

