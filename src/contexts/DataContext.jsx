import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  const { currentUser } = useAuth();

  const [students, setStudents] = useState([]);
  const [studentsRaw, setStudentsRaw] = useState({});
  const [courses, setCourses] = useState([]);
  const [coursesRaw, setCoursesRaw] = useState({});
  const [feeTransactions, setFeeTransactions] = useState({});
  const [pendingFees, setPendingFees] = useState([]);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [expensesRaw, setExpensesRaw] = useState({});
  const [staffSalary, setStaffSalary] = useState({});
  const [salariesList, setSalariesList] = useState([]);
  const [staffDirectory, setStaffDirectory] = useState([]);
  const [users, setUsers] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [coachingStudents, setCoachingStudents] = useState([]);
  const [coachingStudentsRaw, setCoachingStudentsRaw] = useState({});
  const [coachingFeeTransactions, setCoachingFeeTransactions] = useState({});

  const [activeInstitute, setActiveInstituteState] = useState(() => {
    return localStorage.getItem('techflex_active_institute') || 'computer';
  });

  const setActiveInstitute = (institute) => {
    setActiveInstituteState(institute);
    localStorage.setItem('techflex_active_institute', institute);
  };

  const [loading, setLoading] = useState({
    students: true,
    courses: true,
    fees: true,
    pending: true,
    expenses: true,
    users: true,
  });

  useEffect(() => {
    if (!currentUser) {
      setStudents([]);
      setStudentsRaw({});
      setCourses([]);
      setCoursesRaw({});
      setFeeTransactions({});
      setPendingFees([]);
      setPendingStudents([]);
      setExpenses([]);
      setExpensesRaw({});
      setStaffSalary({});
      setSalariesList([]);
      setStaffDirectory([]);
      setUsers([]);
      setCertificates([]);
      setCoachingStudents([]);
      setCoachingStudentsRaw({});
      setCoachingFeeTransactions({});
      setLoading({
        students: true,
        courses: true,
        fees: true,
        pending: true,
        expenses: true,
        users: true,
      });
      return;
    }

    // Set up persistent realtime listeners ONCE for the entire session
    const unsubStudents = onValue(ref(db, 'students'), (snap) => {
      const data = snap.val();
      setStudentsRaw(data || {});
      setStudents(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
      setLoading(prev => ({ ...prev, students: false }));
    });

    const unsubCourses = onValue(ref(db, 'courses'), (snap) => {
      const data = snap.val();
      setCoursesRaw(data || {});
      setCourses(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
      setLoading(prev => ({ ...prev, courses: false }));
    });

    const unsubFees = onValue(ref(db, 'fee_transactions'), (snap) => {
      setFeeTransactions(snap.val() || {});
      setLoading(prev => ({ ...prev, fees: false }));
    });

    const unsubPending = onValue(ref(db, 'pending_fee_approvals'), (snap) => {
      const data = snap.val();
      setPendingFees(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
      setLoading(prev => ({ ...prev, pending: false }));
    });

    const unsubPendingStudents = onValue(ref(db, 'pending_approvals'), (snap) => {
      const data = snap.val();
      setPendingStudents(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
      setLoading(prev => ({ ...prev, pendingStudents: false }));
    });

    const unsubExpenses = onValue(ref(db, 'expenses'), (snap) => {
      const data = snap.val();
      setExpensesRaw(data || {});
      setExpenses(data ? Object.keys(data).map(id => {
        const exp = { id, ...data[id] };
        if (exp.courseName && typeof exp.courseName === 'object') {
          exp.courseName = exp.courseName.name || 'General Institute';
        }
        return exp;
      }) : []);
      setLoading(prev => ({ ...prev, expenses: false }));
    });

    const unsubSalary = onValue(ref(db, 'staff_salary'), (snap) => {
      const data = snap.val() || {};
      setStaffSalary(data);
      setSalariesList(Object.keys(data).map(id => ({ id, ...data[id] })));
      setLoading(prev => ({ ...prev, salary: false }));
    });

    const unsubStaffDir = onValue(ref(db, 'staff_directory'), (snap) => {
      const data = snap.val();
      setStaffDirectory(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });

    const unsubUsers = onValue(ref(db, 'users'), (snap) => {
      const data = snap.val();
      setUsers(data ? Object.values(data).reverse() : []);
      setLoading(prev => ({ ...prev, users: false }));
    });

    const unsubCerts = onValue(ref(db, 'generated_certificates'), (snap) => {
      const data = snap.val();
      setCertificates(data ? Object.keys(data).map(id => ({ id, ...data[id] })).reverse() : []);
    });

    const unsubCoachingStudents = onValue(ref(db, 'coaching_students'), (snap) => {
      const data = snap.val();
      setCoachingStudentsRaw(data || {});
      setCoachingStudents(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });

    const unsubCoachingFees = onValue(ref(db, 'coaching_fees'), (snap) => {
      setCoachingFeeTransactions(snap.val() || {});
    });

    return () => {
      unsubStudents();
      unsubCourses();
      unsubFees();
      unsubPending();
      unsubPendingStudents();
      unsubExpenses();
      unsubSalary();
      unsubStaffDir();
      unsubUsers();
      unsubCerts();
      unsubCoachingStudents();
      unsubCoachingFees();
    };
  }, [currentUser]);

  const isInitialLoading = loading.students || loading.courses;

  const value = {
    students,
    studentsRaw,
    courses,
    coursesRaw,
    feeTransactions,
    pendingFees,
    pendingStudents,
    expenses,
    expensesRaw,
    staffSalary,
    salariesList,
    staffDirectory,
    users,
    certificates,
    coachingStudents,
    coachingStudentsRaw,
    coachingFeeTransactions,
    activeInstitute,
    setActiveInstitute,
    loading,
    isInitialLoading,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
