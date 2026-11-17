// Centralized month & date normalization utilities for Techflex Management System
// Ensures consistent month handling, robust alias resolution, and timezone-safe date parsing.

export const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export const MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const MONTH_ORDER = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12
};

export const MONTH_ALIASES = {
  jan: 'Jan', january: 'Jan', '01': 'Jan', '1': 'Jan',
  feb: 'Feb', february: 'Feb', '02': 'Feb', '2': 'Feb',
  mar: 'Mar', march: 'Mar', '03': 'Mar', '3': 'Mar',
  apr: 'Apr', april: 'Apr', '04': 'Apr', '4': 'Apr',
  may: 'May', '05': 'May', '5': 'May',
  jun: 'Jun', june: 'Jun', '06': 'Jun', '6': 'Jun',
  jul: 'Jul', july: 'Jul', '07': 'Jul', '7': 'Jul',
  aug: 'Aug', august: 'Aug', '08': 'Aug', '8': 'Aug',
  sep: 'Sep', sept: 'Sep', september: 'Sep', '09': 'Sep', '9': 'Sep',
  oct: 'Oct', october: 'Oct', '10': 'Oct',
  nov: 'Nov', november: 'Nov', '11': 'Nov',
  dec: 'Dec', december: 'Dec', '12': 'Dec'
};

/**
 * Normalizes any month representation (string, number, alias, full name, abbreviation)
 * to standard 3-letter English short month: 'Jan', 'Feb', ... 'Dec'.
 */
export const normalizeMonth = (value) => {
  if (value === undefined || value === null) return '';
  
  if (typeof value === 'number') {
    if (value >= 1 && value <= 12) return MONTHS_SHORT[value - 1];
    if (value >= 0 && value <= 11) return MONTHS_SHORT[value];
    return '';
  }

  const str = String(value).trim().toLowerCase();
  if (!str) return '';

  if (MONTH_ALIASES[str]) return MONTH_ALIASES[str];

  // Try matching first 3 characters if length >= 3
  const prefix = str.slice(0, 3);
  if (MONTH_ALIASES[prefix]) return MONTH_ALIASES[prefix];

  // Try numeric string
  const num = parseInt(str, 10);
  if (!isNaN(num) && num >= 1 && num <= 12) {
    return MONTHS_SHORT[num - 1];
  }

  return String(value).trim();
};

/**
 * Normalizes keys like "Sept_2024", "September-2024", "June/2024", "09_2024"
 * into standard format: "Sep_2024", "Jun_2024"
 */
export const normalizeMonthKey = (value = '') => {
  if (!value) return '';

  const str = String(value).trim();
  const parts = str.split(/[_\-\s/]+/).filter(Boolean);
  if (parts.length < 2) return str;

  const monthPart = parts[0];
  const yearPart = parts[parts.length - 1];
  const normalizedMonth = normalizeMonth(monthPart) || monthPart;

  return `${normalizedMonth}_${yearPart}`;
};

/**
 * Gets month index (0-11) safely for any input (Date, string, number).
 */
export const getMonthIndex = (value) => {
  if (value instanceof Date) return value.getMonth();
  const norm = normalizeMonth(value);
  const idx = MONTHS_SHORT.indexOf(norm);
  return idx !== -1 ? idx : 0;
};

/**
 * Returns clean standard 3-letter English short month for a Date object,
 * avoiding locale-dependent variations like "Sept" in en-GB.
 */
export const getCanonicalShortMonth = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return MONTHS_SHORT[new Date().getMonth()];
  return MONTHS_SHORT[d.getMonth()];
};

/**
 * Resolves a fee record from student course fees data regardless of key variation
 * (e.g. looks for "Sep_2024", "Sept_2024", "September_2024", "09_2024").
 */
export const resolveFeeRecord = (studentId, courseId, monthKey, feesData) => {
  const courseMap = feesData?.[studentId]?.[courseId];
  if (!courseMap) return null;

  // Direct match first (fastest)
  if (courseMap[monthKey]) return courseMap[monthKey];

  const targetNormalized = normalizeMonthKey(monthKey);
  for (const [key, record] of Object.entries(courseMap)) {
    if (!key) continue;
    if (normalizeMonthKey(key) === targetNormalized) return record;
    if (record?.month_key && normalizeMonthKey(record.month_key) === targetNormalized) return record;
  }

  return null;
};

/**
 * Parses YYYY-MM-DD safely at midday (12:00:00) so local timezone conversion
 * never rolls over into the previous month/day when converted to UTC.
 */
export const parseLocalDateMidday = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  const str = String(dateStr).trim();
  
  // If YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  }

  // If already ISO with time
  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date() : d;
};

/**
 * Safely parses an enrollment or admission date into a Date normalized to the
 * 1st day of that month (00:00:00 local time).
 * Supports Date objects, Firestore timestamps, ISO strings, YYYY-MM-DD, DD-MM-YYYY, etc.
 * Returns null if invalid or missing.
 */
export const parseEnrollmentMonthDate = (val) => {
  if (!val) return null;
  if (typeof val?.toDate === 'function') {
    val = val.toDate();
  } else if (val && typeof val.seconds === 'number') {
    val = new Date(val.seconds * 1000);
  }

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return new Date(val.getFullYear(), val.getMonth(), 1);
  }

  if (typeof val === 'number') {
    const d = new Date(val > 1e11 ? val : val * 1000);
    return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), 1);
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;

    // YYYY-MM or YYYY-MM-DD or YYYY/MM/DD
    const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})/);
    if (isoMatch) {
      const y = parseInt(isoMatch[1], 10);
      const m = parseInt(isoMatch[2], 10) - 1;
      if (!isNaN(y) && !isNaN(m) && m >= 0 && m <= 11) {
        return new Date(y, m, 1);
      }
    }

    // DD-MM-YYYY or DD/MM/YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmyMatch) {
      const y = parseInt(dmyMatch[3], 10);
      const m = parseInt(dmyMatch[2], 10) - 1;
      if (!isNaN(y) && !isNaN(m) && m >= 0 && m <= 11) {
        return new Date(y, m, 1);
      }
    }

    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return new Date(d.getFullYear(), d.getMonth(), 1);
    }
  }

  return null;
};

/**
 * Extracts and normalizes the enrollment month Date for a coaching student.
 * Checks joined_date, admission_date, createdAt, enrolledAt, and timestamp.
 */
export const getCoachingStudentEnrollmentMonthDate = (student) => {
  if (!student) return null;
  const raw = student.joined_date || student.admission_date || student.createdAt || student.enrolledAt || student.timestamp;
  return parseEnrollmentMonthDate(raw);
};


