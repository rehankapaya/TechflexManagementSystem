import { GoogleGenerativeAI } from '@google/generative-ai';

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

// Set of known form field labels to prevent labels from being extracted as user values
const KNOWN_LABELS = new Set([
  'batch code', 'date', 'name of student', 'student name', 'father’s name', "father's name", 'father name',
  'religion', 'n.i.c', 'nic', 'cnic', 'd.o.b', 'dob', 'date of birth', 'gender', 'gender:', 'male', 'female',
  'male / female', 'residential address', 'address', 'contact', 'whatsapp', 'course / class', 'course', 'class',
  'timimg', 'timing', 'time', 'last qualification', 'qualification', 'email', 'student’s signature',
  "student's signature", 'guardian’s signature', "guardian's signature", 'office use only',
  'reg no', 'roll no', 'signature', 'flex your skills', 'master the tech', 'techflex institute',
  'khalsai manzil', 'yousuf street', 'gari khata', 'cycle market', 'karachi', 'cell', 'cell :'
]);

// Helper to determine if a string is actually a label rather than student data
const isLabelOrEmpty = (val) => {
  if (!val || typeof val !== 'string') return true;
  const clean = val.trim().toLowerCase().replace(/[:\-_/.]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean.length < 2) return true;
  return KNOWN_LABELS.has(clean);
};

// Helper to sanitize field values and cut off adjacent field labels
const cleanFieldValue = (rawVal, stopLabels = []) => {
  if (!rawVal || typeof rawVal !== 'string') return '';
  let str = rawVal.trim();
  for (const label of stopLabels) {
    const idx = str.toLowerCase().indexOf(label.toLowerCase());
    if (idx !== -1) {
      str = str.substring(0, idx).trim();
    }
  }
  str = str.replace(/^[:\-_/.\s]+/, '').replace(/[:\-_/.\s]+$/, '').trim();
  return isLabelOrEmpty(str) ? '' : str;
};

// Match course and coaching grade from raw text or extracted course string
export const matchCourseAndGrade = (extractedCourseOrClass, fullText = '', courses = [], coachingGrades = COACHING_GRADES) => {
  let matchedCourseId = '';
  let matchedGrade = '';

  const pool = `${extractedCourseOrClass || ''} ${fullText || ''}`.toLowerCase();

  // 1. Computer Institute Course Match
  if (Array.isArray(courses) && courses.length > 0) {
    for (const c of courses) {
      if (c.name) {
        const cNameLower = c.name.toLowerCase();
        if (extractedCourseOrClass && extractedCourseOrClass.toLowerCase().includes(cNameLower)) {
          matchedCourseId = c.id;
          break;
        } else if (pool.includes(cNameLower)) {
          matchedCourseId = c.id;
          break;
        }
      }
    }
  }

  // 2. Coaching Center Grade Match
  if (Array.isArray(coachingGrades) && coachingGrades.length > 0) {
    // Exact or partial string match first
    for (const g of coachingGrades) {
      const cleanG = g.toLowerCase().replace(/[\(\)]/g, '').trim();
      const gLower = g.toLowerCase();
      if (extractedCourseOrClass && (extractedCourseOrClass.toLowerCase().includes(cleanG) || extractedCourseOrClass.toLowerCase().includes(gLower))) {
        matchedGrade = g;
        break;
      }
    }

    // Heuristic & Roman Numeral / Handwritten mappings
    if (!matchedGrade) {
      if (/\b(?:01\s*commerce|1st\s*year|first\s*year|inter\s*i\b|xi\b)/i.test(pool)) {
        matchedGrade = '1st Year (Inter I)';
      } else if (/\b(?:02\s*commerce|2nd\s*year|second\s*year|inter\s*ii\b|xii\b)/i.test(pool)) {
        matchedGrade = '2nd Year (Inter II)';
      } else if (/\b(?:matric\s*ii|class\s*10|10th|\bx\b)/i.test(pool)) {
        matchedGrade = 'Class 10 (Matric II)';
      } else if (/\b(?:matric\s*i\b|class\s*9|9th|ix\b)/i.test(pool)) {
        matchedGrade = 'Class 9 (Matric I)';
      } else if (/\b(?:class\s*8|8th|viii\b)/i.test(pool)) {
        matchedGrade = 'Class 8';
      } else if (/\b(?:class\s*7|7th|vii\b|\b07\b)/i.test(pool)) {
        matchedGrade = 'Class 7';
      } else if (/\b(?:class\s*6|6th|vi\b|\b06\b)/i.test(pool)) {
        matchedGrade = 'Class 6';
      } else if (/\b(?:class\s*5|5th|\bv\b|five\b|\b05\b)/i.test(pool)) {
        matchedGrade = 'Class 5';
      } else if (/\b(?:o[-\s]?levels?)\b/i.test(pool)) {
        matchedGrade = 'O-Levels';
      } else if (/\b(?:a[-\s]?levels?)\b/i.test(pool)) {
        matchedGrade = 'A-Levels';
      } else if (/\b(?:four|primary|coaching)\b/i.test(pool)) {
        matchedGrade = 'General Coaching';
      }
    }
  }

  return { matchedCourseId, matchedGrade };
};

/**
 * Enhanced Local Regex & Heuristic Parser for TechFlex Admission Form
 * Strictly avoids capturing field labels as values and ignores the institute's phone number
 */
export const parseAdmissionFormLocal = (rawText, courses = [], coachingGrades = COACHING_GRADES) => {
  const result = {
    name: '',
    father_name: '',
    gender: 'Male',
    dob: '',
    cnic: '',
    religion: 'Islam',
    address: '',
    contact: '',
    secondary_contact: '',
    course_or_class: '',
    matchedCourseId: '',
    matchedGrade: '',
    timeslot: '',
    class_type: 'Regular (1 Hour)',
    qualification: '',
    email: '',
    batch_code: '',
    reg_no: '',
    admission_date: new Date().toISOString().split('T')[0],
    rawText
  };

  if (!rawText || typeof rawText !== 'string') return result;

  // Institute header cell number to exclude from student contact detection
  const INSTITUTE_PHONES = ['03403002715', '923403002715', '+923403002715'];

  // Strip institute header before "ADMISSION FORM" to prevent header noise
  let bodyText = rawText;
  const admFormIdx = rawText.search(/ADMISSION\s*FORM/i);
  if (admFormIdx !== -1) {
    bodyText = rawText.substring(admFormIdx + 'ADMISSION FORM'.length);
  }

  // 1. Email Address
  const emailMatch = bodyText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
  if (emailMatch) {
    result.email = emailMatch[0].trim();
  }

  // 2. CNIC / N.I.C (e.g. 42301-0195991-5 or 4210112345671)
  const cnicMatch = bodyText.match(/\b(\d{5}[-\s]?\d{7}[-\s]?\d)\b/);
  if (cnicMatch) {
    result.cnic = cnicMatch[1].replace(/\s+/g, '-');
  }

  // 3. Date of Birth (D.O.B)
  const dobMatch = bodyText.match(/(?:D\.?O\.?B|Date\s*of\s*Birth)[\s:\-_]+([0-9A-Za-z\/\-\.\s]{4,15})/i);
  if (dobMatch) {
    const dStr = dobMatch[1].trim();
    if (!isLabelOrEmpty(dStr) && /\d/.test(dStr)) {
      result.dob = dStr;
    }
  }

  // 4. Contact Numbers (Primary & Secondary/WhatsApp)
  const phoneRegex = /(?:03\d{2}[-\s]?\d{7}|\+?92[-\s]?3\d{2}[-\s]?\d{7}|\b0\d{10}\b)/g;
  const allPhones = Array.from(bodyText.matchAll(phoneRegex))
    .map(m => m[0].replace(/[-\s]/g, ''))
    .filter(p => !INSTITUTE_PHONES.includes(p));

  // Check specific Contact line
  const contactLineMatch = bodyText.match(/Contact[\s:\-_]+([0-9+\-\s/]{10,25})/i);
  if (contactLineMatch) {
    const rawMatches = Array.from(contactLineMatch[1].matchAll(phoneRegex))
      .map(m => m[0].replace(/[-\s]/g, ''))
      .filter(p => !INSTITUTE_PHONES.includes(p));
    if (rawMatches.length > 0) {
      result.contact = rawMatches[0];
      if (rawMatches.length > 1) {
        result.secondary_contact = rawMatches[1];
      }
    }
  }

  // Check specific WhatsApp line
  const waMatch = bodyText.match(/(?:WhatsApp|Whatsapp)[\s:\-_]+([0-9+\-\s/]{10,25})/i);
  if (waMatch) {
    const rawWa = Array.from(waMatch[1].matchAll(phoneRegex))
      .map(m => m[0].replace(/[-\s]/g, ''))
      .filter(p => !INSTITUTE_PHONES.includes(p));
    if (rawWa.length > 0) {
      result.secondary_contact = rawWa[0];
    }
  }

  // Fallbacks if not matched by label
  if (!result.contact && allPhones.length > 0) {
    result.contact = allPhones[0];
  }
  if (!result.secondary_contact && allPhones.length > 1) {
    const remaining = allPhones.find(p => p !== result.contact);
    if (remaining) result.secondary_contact = remaining;
  }

  // 5. Student Name
  const nameMatch = bodyText.match(/(?:Name\s*of\s*Student|Student\s*Name)[\s:\-_]+([^\n\r]+?)(?=(?:\r?\n|Father|Religion|N\.?I|D\.?O|Batch|Date|$))/i);
  if (nameMatch) {
    const clean = cleanFieldValue(nameMatch[1], ['father', 'religion', 'batch', 'date', 'd.o.b', 'n.i.c']);
    if (clean && !isLabelOrEmpty(clean)) {
      result.name = clean;
    }
  }

  // 6. Father's Name
  const fatherMatch = bodyText.match(/(?:Father(?:[\'’]s)?\s*Name)[\s:\-_]+([^\n\r]+?)(?=(?:\r?\n|Religion|N\.?I|CNIC|D\.?O|Gender|Address|$))/i);
  if (fatherMatch) {
    const clean = cleanFieldValue(fatherMatch[1], ['religion', 'n.i.c', 'nic', 'cnic', 'd.o.b', 'gender', 'residential']);
    if (clean && !isLabelOrEmpty(clean)) {
      result.father_name = clean;
    }
  }

  // 7. Religion
  const relMatch = bodyText.match(/Religion[\s:\-_]+([^\n\r]+?)(?=(?:\r?\n|N\.?I|CNIC|D\.?O|Gender|$))/i);
  if (relMatch) {
    const clean = cleanFieldValue(relMatch[1], ['n.i.c', 'nic', 'cnic', 'd.o.b', 'gender']);
    if (clean && !isLabelOrEmpty(clean)) {
      result.religion = clean;
    }
  }

  // 8. Gender
  const genderSection = bodyText.match(/Gender[\s:\-_]*([^\n\r]+)/i);
  if (genderSection) {
    const gText = genderSection[1];
    if (/\bFemale\b/i.test(gText) && !/\bMale\b/i.test(gText.replace(/Female/gi, ''))) {
      result.gender = 'Female';
    } else if (/\bMale\b/i.test(gText) && !/\bFemale\b/i.test(gText)) {
      result.gender = 'Male';
    }
  }

  // 9. Residential Address
  const addrMatch = bodyText.match(/(?:Residential\s*Address|Address)[\s:\-_]+([^\n\r]+?)(?=(?:\r?\n|Contact|WhatsApp|Phone|Course|$))/i);
  if (addrMatch) {
    const clean = cleanFieldValue(addrMatch[1], ['contact', 'whatsapp', 'phone', 'course']);
    if (clean && !isLabelOrEmpty(clean)) {
      result.address = clean;
    }
  }

  // 10. Course / Class
  const courseMatch = bodyText.match(/(?:Course\s*\/?\s*Class)[\s:\-_]+([^\n\r]+?)(?=(?:\r?\n|Timimg|Timing|Time|Last|Email|$))/i);
  if (courseMatch) {
    const clean = cleanFieldValue(courseMatch[1], ['timimg', 'timing', 'time', 'last', 'email']);
    if (clean && !isLabelOrEmpty(clean)) {
      result.course_or_class = clean;
    }
  }

  // Match course & grade
  const { matchedCourseId, matchedGrade } = matchCourseAndGrade(result.course_or_class, bodyText, courses, coachingGrades);
  result.matchedCourseId = matchedCourseId;
  result.matchedGrade = matchedGrade;

  // 11. Timing / Timeslot
  const timingMatch = bodyText.match(/(?:Timimg|Timing|Time)[\s:\-_]+([0-9:\sAPMapm\-a-z]+)/i);
  if (timingMatch) {
    const clean = cleanFieldValue(timingMatch[1], ['last', 'qualification', 'email']);
    if (clean && !isLabelOrEmpty(clean)) {
      result.timeslot = clean;
      result.class_type = /\b(?:2\s*hours?|alternate)\b/i.test(bodyText)
        ? 'Alternate (2 Hours)'
        : 'Regular (1 Hour)';
    }
  }

  // 12. Last Qualification
  const qualMatch = bodyText.match(/(?:Last\s*Qualification|Qualification)[\s:\-_]+([^\n\r]+?)(?=(?:\r?\n|Email|Contact|Signature|$))/i);
  if (qualMatch) {
    const clean = cleanFieldValue(qualMatch[1], ['email', 'contact', 'signature']);
    if (clean && !isLabelOrEmpty(clean)) {
      result.qualification = clean;
    }
  }

  // 13. Batch Code
  const batchMatch = bodyText.match(/Batch\s*Code[\s:\-_]+([A-Za-z0-9\-_]+)/i);
  if (batchMatch) {
    const clean = cleanFieldValue(batchMatch[1], ['date', 'name']);
    if (clean && !isLabelOrEmpty(clean)) {
      result.batch_code = clean;
    }
  }

  // 14. Reg / Roll Number (Office Use)
  const regMatch = bodyText.match(/(?:Reg\s*No|Roll\s*No)[\s:\-_]+([A-Za-z0-9\-_]+)/i);
  if (regMatch) {
    const clean = cleanFieldValue(regMatch[1], ['name', 'course', 'date']);
    if (clean && !isLabelOrEmpty(clean)) {
      result.reg_no = clean;
    }
  }

  // 15. Admission Date
  const dateMatch = bodyText.match(/(?:Date)[\s:\-_]+(\d{1,2}[\/\-\.\s]\d{1,2}[\/\-\.\s](?:202[0-9]|20[0-9]{2}))/i);
  if (dateMatch) {
    const dStr = dateMatch[1].trim();
    const parts = dStr.split(/[\/\-\.\s]+/);
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      let year = parts[2];
      if (year.length === 2) year = `20${year}`;
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
        result.admission_date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }

  return result;
};

/**
 * Fast AI LLM Parser using Groq API (openai/gpt-oss-120b)
 * Parses messy OCR raw text or PDF text into clean, typed student admission data.
 */
export const parseAdmissionFormWithGroqAI = async (rawOcrText, apiKey, courses = [], coachingGrades = COACHING_GRADES) => {
  if (!apiKey) {
    throw new Error('Groq API Key is required for AI parsing.');
  }

  const prompt = `You are an automated document data parser for TechFlex Institute's Student Admission Form.
You are given the raw OCR text extracted from an admission form.
Carefully parse out the filled student details into a single valid JSON object.

CRITICAL RULES:
1. ONLY extract user-filled data! If a field is blank/empty in the form (i.e. only the label exists), return an empty string ""!
2. NEVER return a label name as a value (e.g. if Father's Name is blank, do NOT return "Religion" or "NIC")!
3. The phone number in the institute header "03403002715" belongs to TechFlex Institute. DO NOT extract it as the student contact!
4. Extract student's primary phone into "contact" and secondary / WhatsApp phone into "whatsapp".
5. For gender, return "Male" or "Female". If unsure or unspecified, return "Male".
6. Output MUST be strictly valid JSON without any markdown code fences or comments.

JSON Schema:
{
  "student_name": "string",
  "father_name": "string",
  "gender": "Male" or "Female",
  "dob": "string",
  "cnic": "string (XXXXX-XXXXXXX-X)",
  "religion": "string",
  "address": "string",
  "contact": "string",
  "whatsapp": "string",
  "course_or_class": "string",
  "timing": "string",
  "qualification": "string",
  "email": "string",
  "batch_code": "string",
  "reg_no": "string",
  "admission_date": "YYYY-MM-DD"
}`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: `Raw OCR Text:\n${rawOcrText}` }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq AI Error (${response.status}): ${errorText}`);
  }

  const jsonResponse = await response.json();
  const content = jsonResponse.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Groq AI returned an empty response.');
  }

  const data = JSON.parse(content);

  const parsed = {
    name: data.student_name || '',
    father_name: data.father_name || '',
    gender: data.gender === 'Female' ? 'Female' : 'Male',
    dob: data.dob || '',
    cnic: data.cnic || '',
    religion: data.religion || 'Islam',
    address: data.address || '',
    contact: data.contact || '',
    secondary_contact: data.whatsapp || '',
    course_or_class: data.course_or_class || '',
    matchedCourseId: '',
    matchedGrade: '',
    timeslot: data.timing || '',
    timing: data.timing || '',
    class_type: data.timing?.includes('2') ? 'Alternate (2 Hours)' : 'Regular (1 Hour)',
    qualification: data.qualification || '',
    email: data.email || '',
    batch_code: data.batch_code || '',
    reg_no: data.reg_no || '',
    admission_date: data.admission_date || new Date().toISOString().split('T')[0],
    rawText: rawOcrText
  };

  // Match Course & Grade
  const { matchedCourseId, matchedGrade } = matchCourseAndGrade(parsed.course_or_class, rawOcrText, courses, coachingGrades);
  parsed.matchedCourseId = matchedCourseId;
  parsed.matchedGrade = matchedGrade;

  return parsed;
};

/**
 * Gemini AI Multimodal Vision Parser
 * Directly reads handwritten camera snapshots and image files
 * Implements dynamic model discovery and automatic fallback to prevent 404 errors
 */
export const parseAdmissionFormWithGeminiAI = async (base64Image, apiKey, courses = [], coachingGrades = COACHING_GRADES) => {
  if (!apiKey) {
    throw new Error('Gemini API key is required for AI Vision extraction.');
  }

  const cleanB64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

  // Determine mimeType
  let mimeType = 'image/jpeg';
  if (base64Image.startsWith('data:image/png')) {
    mimeType = 'image/png';
  } else if (base64Image.startsWith('data:image/webp')) {
    mimeType = 'image/webp';
  }

  // 1. Dynamic Model Discovery for the user's specific API key
  let candidateModels = [
    'gemini-1.5-flash-latest',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-2.5-flash',
    'gemini-1.5-pro',
    'gemini-1.5-flash-8b',
    'gemini-2.0-flash-exp'
  ];

  try {
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (listRes.ok) {
      const listData = await listRes.json();
      const validModels = (listData.models || [])
        .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
        .map(m => m.name.replace(/^models\//, ''));
      
      const prioritized = validModels.filter(m => m.includes('flash') || m.includes('gemini'));
      if (prioritized.length > 0) {
        // Prepend discovered working models
        candidateModels = [...new Set([...prioritized, ...candidateModels])];
      }
    }
  } catch (err) {
    console.warn('Gemini model discovery error, using candidate sequence:', err);
  }

  const prompt = `You are an expert document OCR data extractor for TechFlex Institute's handwritten student admission form.
Examine this photo or scan of a filled admission form carefully. The form is filled by hand with pen ink (in English or Urdu).

Form Layout & Field Extraction Details:
1. "Name of Student": Handwritten student full name (e.g. "Abdul Rehman", "Muhammad Ahmad", "Mohammad Shaayan", "Qasim Muhammad Hassan", "Sakina Ashiq", "Rehan Sajid", "عمران اللہ").
2. "Father's Name": Handwritten father's name (e.g. "M. Owais Ajmeri", "Hussain Ahmad", "Abdul Aleem", "Ghulam Mujtaba", "Ashiq Hussain", "عبد اللہ").
3. "Religion": Handwritten religion (e.g. "Islam", "Muslim", "اسلام").
4. "N.I.C": 13-digit Pakistani CNIC or B-Form written inside the individual digit boxes (e.g. 42301-0195991-5). Format as XXXXX-XXXXXXX-X.
5. "D.O.B": Date of birth written inside the D.O.B box (e.g. "4-11-2010", "3rd Jan 2013", "17-1-10", "10/6/2009").
6. "Gender": Look for a checkmark (✓), tick, circle, or underline near "Male" or "Female". If checked on Female, return "Female"; if checked on Male or unchecked boy photo, return "Male".
7. "Residential Address": Full street / apartment address written in English or Urdu (e.g. "Haji Suleiman Abdullah bldg 3rd floor Gari Khata Karachi", "Mustafa Masjid Arambagh", "بلال چائنا سینٹر...").
8. "Contact": Primary phone number (e.g. "0331-2118429", "0343-8075590", "0324 2607407"). DO NOT extract the institute header number 03403002715!
9. "WhatsApp": Secondary / WhatsApp phone number. If multiple numbers are written on Contact (e.g. 0331-2118429 / 0332-3363793), put the second number in whatsapp.
10. "Course / Class": Coaching grade or course written on the form (e.g. "01 Commerce", "07", "VI", "9th", "IX - commerce", "8th", "Five").
11. "Timing": Batch class timing (e.g. "6-8", "5:30 till 7:30", "5 onwards", "6pm till").
12. "Last Qualification": Last class/school attended (e.g. "8 class", "06", "5 Class", "8th", "Four").
13. "Email": Student email address (if filled, else "").
14. "Batch Code": Batch code if filled (e.g. "2" or "").
15. "Date": Admission / form date written on top left (e.g. "18-9-2024", "23/Sep/2021", "04/10/24") converted to YYYY-MM-DD.

Output MUST be strictly valid JSON without any markdown formatting, backticks, or commentary:
{
  "student_name": "string",
  "father_name": "string",
  "gender": "Male" or "Female",
  "dob": "string",
  "cnic": "string",
  "religion": "string",
  "address": "string",
  "contact": "string",
  "whatsapp": "string",
  "course_or_class": "string",
  "timing": "string",
  "qualification": "string",
  "email": "string",
  "batch_code": "string",
  "admission_date": "YYYY-MM-DD"
}`;

  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError = null;
  let textResponse = '';

  for (const modelName of candidateModels) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const imagePart = {
        inlineData: {
          data: cleanB64,
          mimeType: mimeType
        }
      };

      const response = await model.generateContent([prompt, imagePart]);
      textResponse = response.response.text();
      if (textResponse) {
        break; // Successfully got response!
      }
    } catch (modelErr) {
      lastError = modelErr;
      const errMsg = (modelErr.message || '').toLowerCase();
      // If 404 or model not supported, try the next candidate model
      if (errMsg.includes('404') || errMsg.includes('not found') || errMsg.includes('is not supported')) {
        console.warn(`Model ${modelName} not available (404), trying next candidate...`);
        continue;
      }
      // If it's another error (e.g. quota or invalid key), rethrow
      throw modelErr;
    }
  }

  if (!textResponse && lastError) {
    throw lastError;
  }

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
    gender: aiData.gender === 'Female' ? 'Female' : 'Male',
    dob: aiData.dob || '',
    cnic: aiData.cnic || '',
    religion: aiData.religion || 'Islam',
    address: aiData.address || '',
    contact: aiData.contact || '',
    secondary_contact: aiData.whatsapp || '',
    course_or_class: aiData.course_or_class || '',
    matchedCourseId: '',
    matchedGrade: '',
    timeslot: aiData.timing || '',
    timing: aiData.timing || '',
    class_type: aiData.timing?.includes('2') ? 'Alternate (2 Hours)' : 'Regular (1 Hour)',
    qualification: aiData.qualification || '',
    email: aiData.email || '',
    batch_code: aiData.batch_code || '',
    reg_no: aiData.reg_no || '',
    admission_date: aiData.admission_date || new Date().toISOString().split('T')[0],
    rawText: textResponse
  };

  // Match Course & Grade
  const { matchedCourseId, matchedGrade } = matchCourseAndGrade(parsed.course_or_class, textResponse, courses, coachingGrades);
  parsed.matchedCourseId = matchedCourseId;
  parsed.matchedGrade = matchedGrade;

  return parsed;
};
