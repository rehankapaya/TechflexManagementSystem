import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js';
import { ref, onValue, update } from 'firebase/database';

const StudentStatus = () => {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCourseStatus, setSelectedCourseStatus] = useState({});

  useEffect(() => {
    onValue(ref(db, 'students'), (snap) => {
      const data = snap.val();
      setStudents(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });
  }, []);

  const handleStatusUpdate = async (studentId, courseId) => {
    const newCourseStatus = selectedCourseStatus[`${studentId}_${courseId}`];
    if (!newCourseStatus) return alert("Select a status first.");

    setLoading(true);
    try {
      const student = students.find(s => s.id === studentId);
      
      // 1. Prepare the updated course object
      const updatedEnrolledCourses = {
        ...student.enrolled_courses,
        [courseId]: {
          ...student.enrolled_courses[courseId],
          course_status: newCourseStatus
        }
      };

      // 2. Logic: Check if all courses are now finished (completed or dropped)
      const allCoursesFinished = Object.values(updatedEnrolledCourses).every(
        c => c.course_status === 'coursecomplete' || c.course_status === 'dropout'
      );

      // 3. Prepare Master Update
      const masterUpdate = {
        [`students/${studentId}/enrolled_courses/${courseId}/course_status`]: newCourseStatus,
        [`students/${studentId}/status`]: allCoursesFinished ? 'inactive' : 'active',
        [`students/${studentId}/statusUpdatedAt`]: new Date().toISOString()
      };

      await update(ref(db), masterUpdate);
      alert("Status Sync Successful!");
      
    } catch (err) {
      alert("Update failed: " + err.message);
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
        <h2>Course-Wise Status Sync 🔄</h2>
        <input 
          type="text" 
          placeholder="Search Student ID or Name..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
      </header>

      

      <div style={styles.card}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thRow}>
              <th>Student ID</th>
              <th>Name</th>
              <th>Overall Status</th>
              <th>Courses & Individual Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map(s => (
              <tr key={s.id} style={styles.tr}>
                <td style={{fontWeight: 'bold', color: '#4318ff'}}>{s.student_id}</td>
                <td>{s.name}</td>
                <td>
                  <span style={{
                    ...styles.badge, 
                    backgroundColor: s.status === 'active' ? '#dcfce7' : '#f1f5f9',
                    color: s.status === 'active' ? '#15803d' : '#64748b'
                  }}>
                    {s.status?.toUpperCase()}
                  </span>
                </td>
                <td>
                  {Object.entries(s.enrolled_courses || {}).map(([cId, cData]) => (
                    <div key={cId} style={styles.courseRow}>
                      <span style={{flex: 1, fontSize: '13px'}}>{cData.course_name}</span>
                      <span style={{...styles.miniBadge, color: cData.course_status === 'active' ? '#10b981' : '#ef4444'}}>
                        ({cData.course_status})
                      </span>
                      <select 
                        onChange={(e) => setSelectedCourseStatus(prev => ({...prev, [`${s.id}_${cId}`]: e.target.value}))}
                        style={styles.select}
                      >
                        <option value="">Change Status</option>
                        <option value="active">Active</option>
                        <option value="coursecomplete">Complete</option>
                        <option value="dropout">Dropout</option>
                      </select>
                      <button 
                        onClick={() => handleStatusUpdate(s.id, cId)}
                        disabled={loading}
                        style={styles.btnSync}
                      >Update</button>
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '30px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui' },
  header: { display: 'flex', justifyContent: 'space-between', marginBottom: '25px', alignItems: 'center' },
  searchInput: { padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', width: '280px' },
  card: { background: '#fff', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thRow: { textAlign: 'left', background: '#f1f5f9', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  badge: { padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' },
  courseRow: { display: 'flex', alignItems: 'center', gap: '10px', padding: '5px 0', borderBottom: '1px dashed #eee' },
  miniBadge: { fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' },
  select: { padding: '5px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' },
  btnSync: { background: '#4318ff', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }
};

const globalStyles = `th, td { padding: 15px 20px; }`;
const styleTag = document.createElement("style");
styleTag.innerText = globalStyles;
document.head.appendChild(styleTag);

export default StudentStatus;