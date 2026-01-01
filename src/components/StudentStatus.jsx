import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js';
import { ref, onValue, update } from 'firebase/database';

const StudentStatus = () => {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCourseStatus, setSelectedCourseStatus] = useState({});
  const [selectedCustomDates, setSelectedCustomDates] = useState({});
  // NEW: State for manually changing Start Date
  const [selectedStartDates, setSelectedStartDates] = useState({});
  const [status, setStatus] = useState({ type: '', msg: '' });
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState('');

  const months = [
    { val: '01', label: 'January' }, { val: '02', label: 'February' },
    { val: '03', label: 'March' }, { val: '04', label: 'April' },
    { val: '05', label: 'May' }, { val: '06', label: 'June' },
    { val: '07', label: 'July' }, { val: '08', label: 'August' },
    { val: '09', label: 'September' }, { val: '10', label: 'October' },
    { val: '11', label: 'November' }, { val: '12', label: 'December' }
  ];

  const allUniqueCourses = Array.from(new Set(
    students.flatMap(s => Object.values(s.enrolled_courses || {}).map(c => c.course_name))
  )).sort();

  useEffect(() => {
    const studentsRef = ref(db, 'students');
    const unsubscribe = onValue(studentsRef, (snap) => {
      const data = snap.val();
      setStudents(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });
    return () => unsubscribe();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const handleStatusUpdate = async (studentId, courseId) => {
    const newCourseStatus = selectedCourseStatus[`${studentId}_${courseId}`];
    const customStatusDate = selectedCustomDates[`${studentId}_${courseId}`];
    const customStartDate = selectedStartDates[`${studentId}_${courseId}`];

    // We only force a status selection if they are trying to change lifecycle
    // If they only change start date, we let it pass
    if (!newCourseStatus && !customStartDate) {
      setStatus({ type: 'error', msg: "Please select a new status or change start date first." });
      return;
    }

    setLoading(true);
    try {
      const student = students.find(s => s.id === studentId);
      const updateDate = customStatusDate ? new Date(customStatusDate).toISOString() : new Date().toISOString();

      const currentCourseData = student.enrolled_courses[courseId];

      const masterUpdate = {
        [`students/${studentId}/statusUpdatedAt`]: new Date().toISOString()
      };

      // If status changed
      if (newCourseStatus) {
        masterUpdate[`students/${studentId}/enrolled_courses/${courseId}/course_status`] = newCourseStatus;
        masterUpdate[`students/${studentId}/enrolled_courses/${courseId}/course_status_date`] = updateDate;

        // Recalculate global student status
        const updatedEnrolledCourses = {
          ...student.enrolled_courses,
          [courseId]: { ...currentCourseData, course_status: newCourseStatus }
        };
        const allFinished = Object.values(updatedEnrolledCourses).every(
          c => c.course_status === 'coursecomplete' || c.course_status === 'dropout'
        );
        masterUpdate[`students/${studentId}/status`] = allFinished ? 'inactive' : 'active';
      }

      // If Start Date changed
      if (customStartDate) {
        masterUpdate[`students/${studentId}/enrolled_courses/${courseId}/enrolledAt`] = new Date(customStartDate).toISOString();
      }

      await update(ref(db), masterUpdate);
      setStatus({ type: 'success', msg: `Records updated successfully!` });

      // Clear specific temp states
      setSelectedStartDates(prev => { delete prev[`${studentId}_${courseId}`]; return { ...prev }; });
    } catch (err) {
      setStatus({ type: 'error', msg: "Update failed: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.map(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.student_id?.toLowerCase().includes(searchTerm.toLowerCase());

    const filteredEnrolledCourses = Object.entries(s.enrolled_courses || {}).filter(([cId, cData]) => {
      const matchesCourseFilter = selectedCourseFilter === '' || cData.course_name === selectedCourseFilter;
      const matchesStatusFilter = selectedStatusFilter === '' || cData.course_status === selectedStatusFilter;
      let matchesMonthFilter = true;
      if (selectedMonthFilter !== '' && cData.enrolledAt) {
        const enrollmentMonth = cData.enrolledAt.split('-')[1];
        matchesMonthFilter = enrollmentMonth === selectedMonthFilter;
      }
      return matchesCourseFilter && matchesStatusFilter && matchesMonthFilter;
    });

    return { ...s, filteredCourses: filteredEnrolledCourses, matchesSearch };
  }).filter(s => s.matchesSearch && s.filteredCourses.length > 0);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.titleArea}>
          <h2 style={styles.title}>Student Status Sync 🔄</h2>
          <p style={styles.subtitle}>Manage start dates and lifecycles.</p>
        </div>
        <div style={styles.filterGroup}>
          <div style={styles.searchWrapper}>
            <select value={selectedMonthFilter} onChange={(e) => setSelectedMonthFilter(e.target.value)} style={{ ...styles.searchInput, paddingLeft: '10px', width: '130px' }}>
              <option value="">All Months</option>
              {months.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
            </select>
          </div>
          <div style={styles.searchWrapper}>
            <select value={selectedStatusFilter} onChange={(e) => setSelectedStatusFilter(e.target.value)} style={{ ...styles.searchInput, paddingLeft: '15px', width: '130px' }}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="coursecomplete">Course Complete</option>
              <option value="dropout">Dropout</option>
            </select>
          </div>
          <div style={styles.searchWrapper}>
            <select value={selectedCourseFilter} onChange={(e) => setSelectedCourseFilter(e.target.value)} style={{ ...styles.searchInput, paddingLeft: '15px', width: '160px' }}>
              <option value="">All Courses</option>
              {allUniqueCourses.map(course => <option key={course} value={course}>{course}</option>)}
            </select>
          </div>
          <div style={styles.searchWrapper}>
            <span style={styles.searchIcon}>🔍</span>
            <input type="text" placeholder="Search student..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ ...styles.searchInput, width: '180px' }} />
          </div>
        </div>
      </header>

      {status.msg && (
        <div style={{ ...styles.statusBanner, backgroundColor: status.type === 'success' ? '#F0FDF4' : '#FEF2F2', color: status.type === 'success' ? '#166534' : '#991B1B', borderColor: status.type === 'success' ? '#BBF7D0' : '#FCA5A5' }}>
          {status.msg}
          <button onClick={() => setStatus({ type: '', msg: '' })} style={styles.closeStatus}>×</button>
        </div>
      )}

      <div style={styles.card}>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>Student Identity</th>
                <th style={styles.th}>Account Status</th>
                <th style={styles.th}>Enrollment & Status Control</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length > 0 ? filteredStudents.map(s => (
                <tr key={s.id} style={styles.tr}>
                  <td style={styles.identityCell}>
                    <div style={styles.studentId}>{s.student_id}</div>
                    <div style={styles.studentName}>{s.name}</div>
                  </td>
                  <td>
                    <span style={{ ...styles.badge, backgroundColor: s.status === 'active' ? '#DCFCE7' : '#F1F5F9', color: s.status === 'active' ? '#15803D' : '#64748B', border: `1px solid ${s.status === 'active' ? '#BBF7D0' : '#E2E8F0'}` }}>
                      {s.status?.toUpperCase()}
                    </span>
                  </td>
                  <td style={styles.coursesCell}>
                    {s.filteredCourses.map(([cId, cData]) => (
                      <div key={cId} style={styles.courseRow}>
                        <div style={styles.courseMainInfo}>
                          <span style={styles.courseName}>{cData.course_name}</span>
                          <span style={{ ...styles.miniBadge, color: cData.course_status === 'active' ? '#10B981' : '#EF4444' }}>
                            ● {cData.course_status}
                          </span>
                          <div style={styles.dateTimeline}>
                            <span>📅 <b>Start:</b> {formatDate(cData.enrolledAt) || "N/A"}</span>
                            <span style={{ marginLeft: '10px' }}>
                              🏁 <b>End:</b> {cData.course_status === 'active' ?
                                <span style={{ color: '#3B82F6', fontWeight: 'bold' }}>In Progress</span> :
                                formatDate(cData.course_status_date)}
                            </span>
                          </div>
                        </div>

                        <div style={styles.actionGroup}>
                          {/* START DATE CONTROL */}
                          <div style={styles.inputContainer}>
                            <label style={styles.tinyLabel}>Change Start Date</label>
                            <input
                              type="date"
                              style={styles.dateInput}
                              onChange={(e) => setSelectedStartDates(prev => ({ ...prev, [`${s.id}_${cId}`]: e.target.value }))}
                            />
                          </div>

                          {/* END/STATUS DATE CONTROL */}
                          <div style={styles.inputContainer}>
                            <label style={styles.tinyLabel}>Change Status Date</label>
                            <input
                              type="date"
                              style={styles.dateInput}
                              onChange={(e) => setSelectedCustomDates(prev => ({ ...prev, [`${s.id}_${cId}`]: e.target.value }))}
                            />
                          </div>

                          <div style={styles.inputContainer}>
                            <label style={styles.tinyLabel}>Update Status</label>
                            <select
                              onChange={(e) => setSelectedCourseStatus(prev => ({ ...prev, [`${s.id}_${cId}`]: e.target.value }))}
                              style={styles.select}
                            >
                              <option value="">No Change</option>
                              <option value="active">Active</option>
                              <option value="coursecomplete">Graduated</option>
                              <option value="dropout">Dropout</option>
                            </select>
                          </div>

                          <button onClick={() => handleStatusUpdate(s.id, cId)} disabled={loading} style={styles.btnSync}>
                            Sync
                          </button>
                        </div>
                      </div>
                    ))}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="3" style={styles.emptyState}>No matching records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', marginBottom: '30px', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' },
  titleArea: { flex: 1 },
  title: { fontSize: '24px', fontWeight: '800', color: '#1E293B', margin: 0 },
  subtitle: { color: '#64748B', fontSize: '14px', marginTop: '4px' },
  filterGroup: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' },
  searchWrapper: { position: 'relative' },
  searchIcon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 },
  searchInput: { padding: '10px 15px 10px 35px', borderRadius: '10px', border: '1px solid #E2E8F0', outline: 'none', backgroundColor: '#fff' },
  statusBanner: { padding: '12px 20px', borderRadius: '10px', marginBottom: '20px', border: '1px solid', fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  closeStatus: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', opacity: 0.5 },
  card: { background: '#fff', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' },
  thRow: { background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' },
  th: { padding: '15px 20px', color: '#64748B', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' },
  tr: { borderBottom: '1px solid #F1F5F9' },
  identityCell: { padding: '20px' },
  studentId: { fontWeight: '700', color: '#3B82F6', fontSize: '13px' },
  studentName: { fontSize: '15px', fontWeight: '600', color: '#1E293B', marginTop: '2px' },
  badge: { padding: '4px 12px', borderRadius: '20px', fontSize: '10px', fontWeight: '800' },
  coursesCell: { padding: '10px 20px' },
  courseRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '30px', padding: '12px 0', borderBottom: '1px solid #F8FAFC' },
  courseMainInfo: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 },
  courseName: { fontSize: '14px', fontWeight: '600', color: '#334155' },
  dateTimeline: { fontSize: '12px', color: '#64748B', display: 'flex', gap: '5px', marginTop: '2px' },
  actionGroup: { display: 'flex', alignItems: 'flex-end', gap: '12px' },
  inputContainer: { display: 'flex', flexDirection: 'column', gap: '4px' },
  miniBadge: { fontSize: '11px', fontWeight: '700', marginTop: '2px' },
  tinyLabel: { fontSize: '9px', fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase' },
  dateInput: { padding: '6px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '11px', backgroundColor: '#F8FAFC' },
  select: { padding: '7px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', backgroundColor: '#F8FAFC' },
  btnSync: { background: '#3B82F6', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '12px' },
  emptyState: { padding: '60px', textAlign: 'center', color: '#94A3B8' }
};

export default StudentStatus;