import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js';
import { ref, onValue, update } from 'firebase/database';

const StudentStatus = () => {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCourseStatus, setSelectedCourseStatus] = useState({});
  const [status, setStatus] = useState({ type: '', msg: '' });

  useEffect(() => {
    const studentsRef = ref(db, 'students');
    const unsubscribe = onValue(studentsRef, (snap) => {
      const data = snap.val();
      setStudents(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });
    return () => unsubscribe();
  }, []);

  const handleStatusUpdate = async (studentId, courseId) => {
    const newCourseStatus = selectedCourseStatus[`${studentId}_${courseId}`];
    if (!newCourseStatus) {
      setStatus({ type: 'error', msg: "Please select a new status first." });
      return;
    }

    setLoading(true);
    try {
      const student = students.find(s => s.id === studentId);
      const updatedEnrolledCourses = {
        ...student.enrolled_courses,
        [courseId]: {
          ...student.enrolled_courses[courseId],
          course_status: newCourseStatus
        }
      };

      const allCoursesFinished = Object.values(updatedEnrolledCourses).every(
        c => c.course_status === 'coursecomplete' || c.course_status === 'dropout'
      );

      const masterUpdate = {
        [`students/${studentId}/enrolled_courses/${courseId}/course_status`]: newCourseStatus,
        [`students/${studentId}/status`]: allCoursesFinished ? 'inactive' : 'active',
        [`students/${studentId}/statusUpdatedAt`]: new Date().toISOString()
      };

      await update(ref(db), masterUpdate);
      setStatus({ type: 'success', msg: "Status synchronized successfully!" });
      
    } catch (err) {
      setStatus({ type: 'error', msg: "Update failed: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.student_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.titleArea}>
          <h2 style={styles.title}>Student Status Sync 🔄</h2>
          <p style={styles.subtitle}>Manage individual course completions and overall student lifecycle.</p>
        </div>
        <div style={styles.searchWrapper}>
          <span style={styles.searchIcon}>🔍</span>
          <input 
            type="text" 
            placeholder="Search by ID or Name..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>
      </header>

      {status.msg && (
        <div style={{
          ...styles.statusBanner, 
          backgroundColor: status.type === 'success' ? '#F0FDF4' : '#FEF2F2',
          color: status.type === 'success' ? '#166534' : '#991B1B',
          borderColor: status.type === 'success' ? '#BBF7D0' : '#FCA5A5'
        }}>
          {status.type === 'success' ? '✅ ' : '⚠️ '} {status.msg}
          <button onClick={() => setStatus({type:'', msg:''})} style={styles.closeStatus}>×</button>
        </div>
      )}

      <div style={styles.card}>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>Student Identity</th>
                <th style={styles.th}>Account Status</th>
                <th style={styles.th}>Enrolled Courses & Lifecycle</th>
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
                    <span style={{
                      ...styles.badge, 
                      backgroundColor: s.status === 'active' ? '#DCFCE7' : '#F1F5F9',
                      color: s.status === 'active' ? '#15803D' : '#64748B',
                      border: `1px solid ${s.status === 'active' ? '#BBF7D0' : '#E2E8F0'}`
                    }}>
                      {s.status?.toUpperCase()}
                    </span>
                  </td>
                  <td style={styles.coursesCell}>
                    {Object.entries(s.enrolled_courses || {}).map(([cId, cData]) => (
                      <div key={cId} style={styles.courseRow}>
                        <div style={styles.courseMainInfo}>
                          <span style={styles.courseName}>{cData.course_name}</span>
                          <span style={{
                            ...styles.miniBadge, 
                            color: cData.course_status === 'active' ? '#10B981' : '#EF4444'
                          }}>
                            ● {cData.course_status}
                          </span>
                        </div>
                        <div style={styles.actionGroup}>
                          <select 
                            onChange={(e) => setSelectedCourseStatus(prev => ({...prev, [`${s.id}_${cId}`]: e.target.value}))}
                            style={styles.select}
                          >
                            <option value="">Update Lifecycle</option>
                            <option value="active">Active</option>
                            <option value="coursecomplete">Graduated/Complete</option>
                            <option value="dropout">Dropout</option>
                          </select>
                          <button 
                            onClick={() => handleStatusUpdate(s.id, cId)}
                            disabled={loading}
                            style={styles.btnSync}
                          >
                            Sync
                          </button>
                        </div>
                      </div>
                    ))}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="3" style={styles.emptyState}>No students found matching your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', marginBottom: '30px', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' },
  titleArea: { flex: 1 },
  title: { fontSize: '24px', fontWeight: '800', color: '#1E293B', margin: 0 },
  subtitle: { color: '#64748B', fontSize: '14px', marginTop: '4px' },
  
  searchWrapper: { position: 'relative' },
  searchIcon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 },
  searchInput: { padding: '10px 15px 10px 35px', borderRadius: '10px', border: '1px solid #E2E8F0', width: '280px', outline: 'none', backgroundColor: '#fff' },

  statusBanner: { padding: '12px 20px', borderRadius: '10px', marginBottom: '20px', border: '1px solid', fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  closeStatus: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', opacity: 0.5 },

  card: { background: '#fff', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' },
  thRow: { background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' },
  th: { padding: '15px 20px', color: '#64748B', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' },
  tr: { borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s' },
  
  identityCell: { padding: '20px' },
  studentId: { fontWeight: '700', color: '#3B82F6', fontSize: '13px' },
  studentName: { fontSize: '15px', fontWeight: '600', color: '#1E293B', marginTop: '2px' },
  
  badge: { padding: '4px 12px', borderRadius: '20px', fontSize: '10px', fontWeight: '800', letterSpacing: '0.5px' },
  
  coursesCell: { padding: '10px 20px' },
  courseRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', padding: '12px 0', borderBottom: '1px solid #F8FAFC' },
  courseMainInfo: { display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 },
  courseName: { fontSize: '14px', fontWeight: '600', color: '#334155' },
  miniBadge: { fontSize: '11px', fontWeight: '700', textTransform: 'capitalize' },
  
  actionGroup: { display: 'flex', alignItems: 'center', gap: '8px' },
  select: { padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px', backgroundColor: '#F8FAFC', outline: 'none' },
  btnSync: { background: '#3B82F6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', transition: 'background 0.2s' },
  
  emptyState: { padding: '60px', textAlign: 'center', color: '#94A3B8' }
};

export default StudentStatus;