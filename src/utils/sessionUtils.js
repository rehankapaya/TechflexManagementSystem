import { getMonthIndex, parseEnrollmentMonthDate } from './monthUtils.js';
import { COACHING_GRADES, COACHING_FIELDS, isClassAboveEight } from './admissionFormOcrParser.js';

export const DEFAULT_ACADEMIC_SESSIONS = [
  '2023-2024',
  '2024-2025',
  '2025-2026',
  '2026-2027',
  '2027-2028'
];

/**
 * Normalizes academic session string into 4-digit canonical format.
 * e.g. '2024-25' -> '2024-2025'
 *      '2024-2025' -> '2024-2025'
 *      '2025/26' -> '2025-2026'
 */
export const normalizeAcademicSession = (sessionStr = '') => {
  if (!sessionStr) return '';
  const s = String(sessionStr).trim();
  const parts = s.split(/[-/]/);
  if (parts.length === 2) {
    let y1 = parts[0].trim();
    let y2 = parts[1].trim();
    if (y1.length === 2) y1 = `20${y1}`;
    if (y2.length === 2) y2 = `20${y2}`;
    if (y1.length === 4 && y2.length === 4) {
      return `${y1}-${y2}`;
    }
  }
  return s;
};

/**
 * Checks if two academic session representations match (ignoring 2-digit vs 4-digit formats).
 */
export const isSessionMatch = (sessionA, sessionB) => {
  if (!sessionA || !sessionB) return false;
  if (sessionA === sessionB) return true;
  return normalizeAcademicSession(sessionA) === normalizeAcademicSession(sessionB);
};

/**
 * Formats academic session display label, showing both 4-digit and 2-digit short formats.
 * e.g. '2024-2025' -> '2024-2025 (2024-25)'
 */
export const formatSessionDisplay = (sessionStr = '') => {
  if (!sessionStr) return '';
  const norm = normalizeAcademicSession(sessionStr);
  const parts = norm.split('-');
  if (parts.length === 2 && parts[0].length === 4 && parts[1].length === 4) {
    return `${norm} (${parts[0]}-${parts[1].slice(2)})`;
  }
  return sessionStr;
};

/**
 * Returns the academic session string (e.g. '2024-2025') for a given date.
 * Strictly defined on a May-to-May academic cycle:
 * May (month index 4) through December -> year-(year+1)  [e.g. May 2024 -> '2024-2025']
 * January through April (month index 0-3) -> (year-1)-year [e.g. April 2025 -> '2024-2025']
 */
export const getAcademicSessionForDate = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  const validDate = isNaN(d.getTime()) ? new Date() : d;
  const year = validDate.getFullYear();
  const month = validDate.getMonth(); // 0 = Jan, 4 = May, 11 = Dec
  return month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
};

/**
 * Returns current academic session based on May-to-May cycle.
 */
export const getCurrentAcademicSession = (date = new Date()) => {
  return getAcademicSessionForDate(date);
};

/**
 * Gets the next academic session given a session name.
 * e.g. '2024-2025' -> '2025-2026' or '2024-25' -> '2025-2026'
 */
export const getNextAcademicSession = (sessionName = '') => {
  if (!sessionName) return getCurrentAcademicSession();
  const norm = normalizeAcademicSession(sessionName);
  const parts = norm.split(/[-/]/);
  if (parts.length === 2) {
    const y1 = parseInt(parts[0], 10);
    const y2 = parseInt(parts[1], 10);
    if (!isNaN(y1) && !isNaN(y2)) {
      return `${y1 + 1}-${y2 + 1}`;
    }
  }
  return sessionName;
};

/**
 * Suggests the next academic grade when a student is promoted/re-enrolled.
 */
export const getNextGradeSuggestion = (currentGrade = '') => {
  if (!currentGrade) return 'Class 9 (Matric I)';
  const g = currentGrade.trim();

  const progression = [
    { from: /playgroup|nursery/i, to: 'KG / Prep' },
    { from: /kg|prep/i, to: 'Class 1' },
    { from: /class\s*1\b|\b1st\b/i, to: 'Class 2' },
    { from: /class\s*2\b|\b2nd\b/i, to: 'Class 3' },
    { from: /class\s*3\b|\b3rd\b/i, to: 'Class 4' },
    { from: /class\s*4\b|\b4th\b|primary/i, to: 'Class 5' },
    { from: /class\s*5\b|\b5th\b/i, to: 'Class 6' },
    { from: /class\s*6\b|\b6th\b/i, to: 'Class 7' },
    { from: /class\s*7\b|\b7th\b/i, to: 'Class 8' },
    { from: /class\s*8\b|\b8th\b/i, to: 'Class 9 (Matric I)' },
    { from: /class\s*9\b|matric\s*i\b/i, to: 'Class 10 (Matric II)' },
    { from: /class\s*10\b|matric\s*ii\b/i, to: '1st Year (Inter I)' },
    { from: /1st\s*year|inter\s*i\b/i, to: '2nd Year (Inter II)' },
    { from: /o[-\s]?level/i, to: 'A-Levels' }
  ];

  for (const step of progression) {
    if (step.from.test(g)) {
      return step.to;
    }
  }

  return currentGrade;
};

/**
 * Resolves the active session, grade, field, and monthly fee for a student
 * during a specific month and year (e.g. month: 'Sep', year: '2024').
 *
 * This guarantees historical fee integrity:
 * If fee was 2000 in 2024-2025 and 2500 in 2025-2026, checking March 2025 returns 2000,
 * and checking July 2026 returns 2500. Zero false balances!
 */
export const getStudentSessionForDate = (student, monthInput, yearInput) => {
  if (!student) {
    return {
      session_name: '2024-2025',
      grade: '—',
      field: '',
      monthly_fee: 0,
      status: 'active'
    };
  }

  const fallback = {
    session_name: student.current_session || student.session || '2024-2025',
    grade: student.grade || '—',
    field: student.field || '',
    monthly_fee: Number(student.monthly_fee) || 0,
    status: student.status || 'active'
  };

  const sessions = student.sessions;
  if (!sessions || typeof sessions !== 'object' || Object.keys(sessions).length === 0) {
    return fallback;
  }

  const monthIdx = getMonthIndex(monthInput);
  const yearNum = parseInt(yearInput, 10) || new Date().getFullYear();
  const targetDate = new Date(yearNum, monthIdx, 1);

  // 1. Direct date range match (start_date <= targetDate <= end_date)
  const sessionEntries = Object.values(sessions);
  for (const sess of sessionEntries) {
    if (!sess) continue;
    const startDate = parseEnrollmentMonthDate(sess.start_date);
    const endDate = parseEnrollmentMonthDate(sess.end_date);

    if (startDate && targetDate >= startDate) {
      if (!endDate || targetDate <= endDate) {
        return {
          session_name: sess.session_name || sess.name || fallback.session_name,
          grade: sess.grade || fallback.grade,
          field: sess.field || fallback.field,
          monthly_fee: Number(sess.monthly_fee) || fallback.monthly_fee,
          status: sess.status || fallback.status,
          start_date: sess.start_date,
          end_date: sess.end_date
        };
      }
    }
  }

  // 2. Session name year-span fallback match (e.g. target date is Sep 2024 -> session '2024-2025')
  // Strictly defined as May-to-May: Session 2024-2025 spans May 1, 2024 to April 30, 2025
  for (const sess of sessionEntries) {
    if (!sess?.session_name) continue;
    const norm = normalizeAcademicSession(sess.session_name);
    const parts = norm.split(/[-/]/);
    if (parts.length === 2) {
      const y1 = parseInt(parts[0], 10);
      const y2 = parseInt(parts[1], 10);
      // May 1st of y1 to April 30th of y2
      const sStart = new Date(y1, 4, 1);
      const sEnd = new Date(y2, 4, 0, 23, 59, 59);
      if (targetDate >= sStart && targetDate <= sEnd) {
        return {
          session_name: norm,
          grade: sess.grade || fallback.grade,
          field: sess.field || fallback.field,
          monthly_fee: Number(sess.monthly_fee) || fallback.monthly_fee,
          status: sess.status || fallback.status,
          start_date: sess.start_date,
          end_date: sess.end_date
        };
      }
    }
  }

  // 3. Fallback to current session if exists
  if (student.current_session && sessions[student.current_session]) {
    const curr = sessions[student.current_session];
    return {
      session_name: student.current_session,
      grade: curr.grade || fallback.grade,
      field: curr.field || fallback.field,
      monthly_fee: Number(curr.monthly_fee) || fallback.monthly_fee,
      status: curr.status || fallback.status,
      start_date: curr.start_date,
      end_date: curr.end_date
    };
  }

  return fallback;
};
