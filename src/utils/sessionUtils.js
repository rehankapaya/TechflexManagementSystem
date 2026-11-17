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
 * Returns the current academic session string (e.g. '2024-2025').
 * Coaching academy sessions in Pakistan typically run from June/August through May.
 * We treat June (month index 5) onwards as the start of year-(year+1).
 */
export const getCurrentAcademicSession = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  const validDate = isNaN(d.getTime()) ? new Date() : d;
  const year = validDate.getFullYear();
  const month = validDate.getMonth();
  return month >= 5 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
};

/**
 * Gets the next academic session given a session name.
 * e.g. '2024-2025' -> '2025-2026'
 */
export const getNextAcademicSession = (sessionName = '') => {
  if (!sessionName) return getCurrentAcademicSession();
  const parts = sessionName.split(/[-/]/);
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
  for (const sess of sessionEntries) {
    if (!sess?.session_name) continue;
    const parts = sess.session_name.split(/[-/]/);
    if (parts.length === 2) {
      const y1 = parseInt(parts[0], 10);
      const y2 = parseInt(parts[1], 10);
      // Session 2024-2025 spans June 2024 to May 2025
      const sStart = new Date(y1, 5, 1);
      const sEnd = new Date(y2, 5, 0); // End of May y2
      if (targetDate >= sStart && targetDate <= sEnd) {
        return {
          session_name: sess.session_name,
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
