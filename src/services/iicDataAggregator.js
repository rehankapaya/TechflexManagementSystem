import { get, ref } from 'firebase/database';
import { normalizeMonthKey, getCanonicalShortMonth, resolveFeeRecord } from '../utils/monthUtils';
import { db } from '../firebase';

// Memory cache for Instant Navigation
let cachedIICData = null;
let lastFetchTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

export const getCachedIICData = () => {
  if (cachedIICData && (Date.now() - lastFetchTimestamp < CACHE_TTL_MS)) {
    return cachedIICData;
  }
  try {
    const stored = sessionStorage.getItem('IIC_CACHED_DATA');
    const storedTime = Number(sessionStorage.getItem('IIC_CACHED_TIME') || 0);
    if (stored && (Date.now() - storedTime < CACHE_TTL_MS)) {
      cachedIICData = JSON.parse(stored);
      lastFetchTimestamp = storedTime;
      return cachedIICData;
    }
  } catch (e) {
    // ignore
  }
  return null;
};

export const clearIICCache = () => {
  cachedIICData = null;
  lastFetchTimestamp = 0;
  try {
    sessionStorage.removeItem('IIC_CACHED_DATA');
    sessionStorage.removeItem('IIC_CACHED_TIME');
  } catch (e) {}
};

// Helper to fetch entire collections securely with caching
export const fetchIICData = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const existing = getCachedIICData();
    if (existing) {
      return existing;
    }
  }

  const [
    studentsSnap,
    coursesSnap,
    feesSnap,
    expensesSnap,
    salarySnap
  ] = await Promise.all([
    get(ref(db, 'students')),
    get(ref(db, 'courses')),
    get(ref(db, 'fee_transactions')),
    get(ref(db, 'expenses')),
    get(ref(db, 'staff_salary'))
  ]);

  const rawData = {
    students: studentsSnap.val() || {},
    courses: coursesSnap.val() || {},
    fees: feesSnap.val() || {},
    expenses: expensesSnap.val() || {},
    salaries: salarySnap.val() || {}
  };

  const processed = processData(rawData);
  cachedIICData = processed;
  lastFetchTimestamp = Date.now();

  try {
    sessionStorage.setItem('IIC_CACHED_DATA', JSON.stringify(processed));
    sessionStorage.setItem('IIC_CACHED_TIME', String(lastFetchTimestamp));
  } catch (e) {
    // sessionStorage quota
  }

  return processed;
};

const processData = (raw) => {
  const students = Object.entries(raw.students || {}).map(([key, val]) => {
    const hasActiveCourse = Object.values(val.enrolled_courses || {}).some(c => (c.course_status || 'active') === 'active');
    const computedStatus = hasActiveCourse ? 'active' : val.status;
    return { id: key, ...val, status: computedStatus };
  });
  const courses = Object.entries(raw.courses || {}).map(([key, val]) => ({ id: key, ...val }));
  const coursesMap = {};
  courses.forEach(c => {
    coursesMap[c.id] = c;
  });

  // 1. Executive KPIs
  const totalAdmissions = students.length;
  const activeStudents = students.filter(s => s.status !== 'inactive').length;
  
  // Basic financial aggregation
  let totalRevenue = 0;
  let totalOutstanding = 0;
  
  // Aggregate fees
  const feeTransactions = [];
  Object.values(raw.fees || {}).forEach(studentCourses => {
    Object.values(studentCourses || {}).forEach(courseMonths => {
      Object.values(courseMonths || {}).forEach(tx => {
        feeTransactions.push(tx);
        totalRevenue += parseFloat(tx.paid || 0);
        totalOutstanding += parseFloat(tx.balance || 0);
      });
    });
  });

  // Calculate expenses and salaries for total outflow
  let totalExpenses = 0;
  Object.values(raw.expenses || {}).forEach(ex => totalExpenses += parseFloat(ex.amount || 0));
  Object.values(raw.salaries || {}).forEach(sal => totalExpenses += parseFloat(sal.amount || sal.net_salary || 0));

  const retentionRate = totalAdmissions > 0 ? ((activeStudents / totalAdmissions) * 100).toFixed(1) : 0;
  const dropoutRate = (100 - parseFloat(retentionRate)).toFixed(1);

  // 2. Monthly Trend Data (Last 6 Months)
  const monthlyTrendsMap = {};
  const monthlyTrends = [];
  const currentDate = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const monthStr = getCanonicalShortMonth(d);
    const yearStr = d.getFullYear();
    const key = `${monthStr}_${yearStr}`;
    monthlyTrendsMap[key] = { name: monthStr, revenue: 0, admissions: 0 };
    monthlyTrends.push(monthlyTrendsMap[key]);
  }

  // Calculate actual revenue per month
  Object.values(raw.fees || {}).forEach(studentCourses => {
    Object.values(studentCourses || {}).forEach(courseMonths => {
      Object.entries(courseMonths || {}).forEach(([monthKey, tx]) => {
        const normKey = normalizeMonthKey(monthKey);
        if (monthlyTrendsMap[normKey]) {
          monthlyTrendsMap[normKey].revenue += parseFloat(tx.paid || 0);
        }
      });
    });
  });

  // Calculate actual admissions per month
  students.forEach(s => {
    if (s.createdAt) {
      const d = new Date(s.createdAt);
      if (!isNaN(d.getTime())) {
        const monthStr = getCanonicalShortMonth(d);
        const yearStr = d.getFullYear();
        const key = `${monthStr}_${yearStr}`;
        if (monthlyTrendsMap[key]) {
          monthlyTrendsMap[key].admissions += 1;
        }
      }
    }
  });

  // 3. Course Analytics
  const courseAnalytics = courses.map(c => {
    const enrolledCount = students.filter(s => {
      if (!s.enrolled_courses) return false;
      return Object.keys(s.enrolled_courses).includes(c.id);
    }).length;
    return {
      name: c.name,
      enrolled: enrolledCount,
      fee: c.fee
    };
  });

  // 4. Student Risk Scoring
  // Only evaluate Active students for risk of dropping out
  const activeStudentsList = students.filter(s => s.status !== 'inactive');
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const currentMonthBoundary = new Date(today.getFullYear(), today.getMonth(), 1);

  const highRiskAlerts = activeStudentsList.map(s => {
    let riskScore = 0;
    const reasons = [];
    const unpaidBreakdown = [];

    // Rule 1: No Course Enrolled
    const enrolledCourses = s.enrolled_courses || {};
    const enrolledCourseEntries = Object.entries(enrolledCourses);
    if (enrolledCourseEntries.length === 0) {
      riskScore += 30;
      reasons.push("No Active Course");
    }

    // Rule 2: Unpaid fees (Evaluated respecting course duration, completion dates & 10-day grace period)
    let studentUnpaid = 0;
    let unpaidCount = 0;

    enrolledCourseEntries.forEach(([courseId, courseInfo]) => {
      if (!courseInfo || !courseInfo.enrolledAt) return;

      const enrollDate = new Date(courseInfo.enrolledAt);
      if (isNaN(enrollDate.getTime())) return;

      const matchedCourse = coursesMap[courseId];
      const durationVal = courseInfo.duration || matchedCourse?.duration || 0;
      const durationMonths = parseInt(durationVal, 10) || 0;

      const startBoundary = new Date(enrollDate.getFullYear(), enrollDate.getMonth(), 1);

      // Max allowed end boundary from duration (e.g. 3-month course enrolled in July ends in September)
      let maxDurationBoundary = null;
      if (durationMonths > 0) {
        maxDurationBoundary = new Date(enrollDate.getFullYear(), enrollDate.getMonth() + durationMonths - 1, 1);
      }

      // Status date boundary (e.g. course complete or dropped)
      let statusBoundary = null;
      if (courseInfo.course_status_date) {
        const statusDate = new Date(courseInfo.course_status_date);
        if (!isNaN(statusDate.getTime())) {
          let sBoundary = new Date(statusDate.getFullYear(), statusDate.getMonth(), 1);
          const cycleStartThisMonth = new Date(statusDate.getFullYear(), statusDate.getMonth(), enrollDate.getDate());
          if (statusDate <= cycleStartThisMonth) {
            sBoundary.setMonth(sBoundary.getMonth() - 1);
          }
          statusBoundary = sBoundary;
        }
      }

      // Effective end boundary: never bill beyond the current calendar month
      let endBoundary = new Date(currentMonthBoundary);
      if (maxDurationBoundary && maxDurationBoundary < endBoundary) {
        endBoundary = new Date(maxDurationBoundary);
      }
      if (statusBoundary && statusBoundary < endBoundary) {
        endBoundary = new Date(statusBoundary);
      }

      if (endBoundary < startBoundary) return;

      let current = new Date(startBoundary);
      while (current <= endBoundary) {
        const m = getCanonicalShortMonth(current);
        const y = current.getFullYear();
        const monthKey = `${m}_${y}`;

        // Due date calculation with 10 days grace period from enrollment day (matching OverdueFees)
        const enrollmentDay = enrollDate.getDate();
        const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
        const dueDateDay = Math.min(enrollmentDay + 10, daysInMonth);
        const dueDate = new Date(current.getFullYear(), current.getMonth(), dueDateDay);
        dueDate.setHours(23, 59, 59, 999);

        // Only count as overdue if today's date has passed the due date
        if (todayMidnight > dueDate) {
          const agreedFee = Number(courseInfo.agreed_monthly_fee || 0);
          const record = resolveFeeRecord(s.id, courseId, monthKey, raw.fees);

          if (!record) {
            if (agreedFee > 0) {
              unpaidCount++;
              studentUnpaid += agreedFee;
              unpaidBreakdown.push({
                courseId,
                courseName: courseInfo.course_name || matchedCourse?.name || 'Course',
                monthKey,
                monthLabel: `${m} ${y}`,
                dueDateStr: dueDate.toLocaleDateString('en-GB'),
                agreedFee,
                paid: 0,
                waived: 0,
                balance: agreedFee,
                status: 'Unpaid'
              });
            }
          } else {
            const paid = Number(record.paid ?? record.amount_paid ?? record.amount ?? 0);
            const waived = Number(record.waived ?? record.discount ?? 0);
            const totalSettled = paid + waived;
            const storedBalance = Number(record.balance);
            const computedBalance = Number.isFinite(storedBalance) && storedBalance >= 0
              ? storedBalance
              : Math.max(0, agreedFee - totalSettled);

            if (computedBalance > 0 && totalSettled < agreedFee) {
              unpaidCount++;
              studentUnpaid += computedBalance;
              unpaidBreakdown.push({
                courseId,
                courseName: courseInfo.course_name || matchedCourse?.name || 'Course',
                monthKey,
                monthLabel: `${m} ${y}`,
                dueDateStr: dueDate.toLocaleDateString('en-GB'),
                agreedFee,
                paid,
                waived,
                balance: computedBalance,
                status: totalSettled > 0 ? 'Partial' : 'Unpaid'
              });
            }
          }
        }

        current.setMonth(current.getMonth() + 1);
      }
    });

    if (unpaidCount > 0) {
       riskScore += (20 * unpaidCount); // 20 points per unpaid month
       reasons.push(`${unpaidCount} Unpaid Fee(s)`);
    }

    // Assign Categories
    let category = "Low";
    if (riskScore >= 70) category = "Critical";
    else if (riskScore >= 40) category = "High";
    else if (riskScore >= 20) category = "Medium";

    const courseNames = s.enrolled_courses 
      ? Object.values(s.enrolled_courses).map(c => c.course_name).join(', ') 
      : 'None';

    return {
      id: s.id,
      student_id: s.student_id || s.id,
      name: s.name,
      contact: s.contact || '',
      gender: s.gender || '',
      admission_fee: s.admission_fee || 0,
      laptop_status: s.laptop_status || '',
      createdAt: s.createdAt || '',
      course: courseNames,
      enrolledCourses,
      riskScore,
      category,
      unpaidCount,
      studentUnpaid,
      unpaidBreakdown,
      reasons: [...new Set(reasons)].join(', ') || "None"
    };
  }).filter(s => s.riskScore >= 20).sort((a,b) => b.riskScore - a.riskScore);


  // AI Context Data - We create a stripped down version of data for LLM context to avoid huge token usage
  const aiContext = {
    kpis: {
      totalAdmissions,
      activeStudents,
      retentionRate,
      dropoutRate,
      totalRevenue,
      totalOutstanding,
      totalExpenses
    },
    topRisks: highRiskAlerts.slice(0, 5),
    courses: courseAnalytics
  };

  return {
    kpis: {
      totalAdmissions,
      activeStudents,
      retentionRate,
      dropoutRate,
      totalRevenue,
      totalOutstanding,
      totalExpenses
    },
    monthlyTrends,
    courseAnalytics,
    highRiskAlerts,
    aiContext
  };
};
