import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js';
import { useAuth } from '../contexts/AuthContext';
import { ref, set, push, onValue, remove, update } from 'firebase/database';

const Students = () => {
  const { currentUser, isAdmin } = useAuth();
  const [students, setStudents] = useState([]);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [courses, setCourses] = useState([]);

  const [isEditing, setIsEditing] = useState(null); 
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });

  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    courseId: '',
    agreed_monthly_fee: ''
  });

  useEffect(() => {
    onValue(ref(db, 'courses'), (snap) => {
      const data = snap.val();
      setCourses(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });

    onValue(ref(db, 'students'), (snap) => {
      const data = snap.val();
      setStudents(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });

    onValue(ref(db, 'pending_approvals'), (snap) => {
      const data = snap.val();
      setPendingStudents(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'courseId' && !isEditing) {
      const selectedCourse = courses.find(c => c.id === value);
      if (selectedCourse) setFormData(prev => ({ ...prev, agreed_monthly_fee: selectedCourse.base_fee }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const selectedCourse = courses.find(c => c.id === formData.courseId);
    const courseDuration = selectedCourse?.duration || "N/A";
    const now = new Date().toISOString();

    try {
      if (isEditing) {
        const currentStudent = students.find(s => s.id === isEditing);
        const existingCourseData = currentStudent?.enrolled_courses?.[formData.courseId] || {};

        const studentPayload = {
          name: formData.name,
          contact: formData.contact,
          courseId: formData.courseId,
          status: currentStudent?.status || 'active',
          enrolled_courses: {
            ...currentStudent?.enrolled_courses,
            [formData.courseId]: {
              course_name: selectedCourse?.name || 'Unknown',
              duration: courseDuration,
              agreed_monthly_fee: Number(formData.agreed_monthly_fee),
              enrolledAt: existingCourseData.enrolledAt || now,
              course_status: existingCourseData.course_status || "active"
            }
          }
        };
        await update(ref(db, `students/${isEditing}`), studentPayload);
        setStatus({ type: 'success', msg: 'Student profile updated!' });
        setIsEditing(null);
      } else {
        const allExistingIds = [...students.map(s => s.student_id), ...pendingStudents.map(s => s.student_id)];
        let nextNumber = 1;
        if (allExistingIds.length > 0) {
          const numbers = allExistingIds.map(id => {
            if (!id) return 0;
            const parts = id.split('-');
            return parseInt(parts[parts.length - 1]);
          });
          nextNumber = Math.max(...numbers) + 1;
        }

        const customId = `STU-2025-${String(nextNumber).padStart(3, '0')}`;

        const payloadWithMeta = {
          student_id: customId,
          name: formData.name,
          contact: formData.contact,
          courseId: formData.courseId,
          addedBy: currentUser.name || currentUser.email,
          createdAt: now,
          status: 'active',
          enrolled_courses: {
            [formData.courseId]: {
              course_name: selectedCourse?.name || 'Unknown',
              duration: courseDuration,
              agreed_monthly_fee: Number(formData.agreed_monthly_fee),
              enrolledAt: now,
              course_status: "active"
            }
          }
        };

        if (isAdmin) {
          await set(push(ref(db, 'students')), payloadWithMeta);
          setStatus({ type: 'success', msg: `Enrolled: ${customId}` });
        } else {
          await set(push(ref(db, 'pending_approvals')), { ...payloadWithMeta, status: 'pending' });
          setStatus({ type: 'success', msg: `Request Sent: ${customId}` });
        }
      }
      setFormData({ name: '', contact: '', courseId: '', agreed_monthly_fee: '' });
    } catch (err) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (tempId, studentData) => {
    const now = new Date().toISOString();
    const approvedStudent = {
      ...studentData,
      status: 'active',
      approvedBy: currentUser.name || currentUser.email,
      approvedAt: now,
    };
    await set(ref(db, `students/${tempId}`), approvedStudent);
    await remove(ref(db, `pending_approvals/${tempId}`));
  };

  const startEdit = (student) => {
    const courseKey = Object.keys(student.enrolled_courses)[0];
    const courseData = student.enrolled_courses[courseKey];
    setIsEditing(student.id);
    setFormData({
      name: student.name,
      contact: student.contact || '', 
      courseId: courseKey,
      agreed_monthly_fee: courseData.agreed_monthly_fee
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (s.contact && s.contact.includes(searchTerm)); 
    const matchesCourse = filterCourse === '' || Object.keys(s.enrolled_courses).includes(filterCourse);
    return matchesSearch && matchesCourse;
  });

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.titleArea}>
          <h2 style={styles.title}>{isEditing ? "Edit Student Profile 👤" : "Student Directory 👨‍🎓"}</h2>
          <p style={styles.subtitle}>Registration and Course Enrollment Management</p>
        </div>

        <form onSubmit={handleSubmit} style={{ ...styles.quickForm, borderColor: isEditing ? '#3B82F6' : '#E2E8F0' }}>
          <input type="text" name="name" placeholder="Full Name" value={formData.name} onChange={handleChange} required style={styles.input} />
          <input type="text" name="contact" placeholder="Phone" value={formData.contact} onChange={handleChange} required style={styles.inputSmall} />
          
          <select name="courseId" value={formData.courseId} onChange={handleChange} required style={styles.select}>
            <option value="">Course</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="number" name="agreed_monthly_fee" placeholder="Fee" value={formData.agreed_monthly_fee} onChange={handleChange} required style={styles.inputTiny} />

          <button type="submit" disabled={loading} style={styles.btnPrimary}>
            {loading ? "..." : isEditing ? "Update" : (isAdmin ? "Enroll" : "Request")}
          </button>
          
          {isEditing && (
            <button type="button" onClick={() => {setIsEditing(null); setFormData({name:'', contact: '', courseId:'', agreed_monthly_fee:''})}} style={styles.btnCancel}>
              ✕
            </button>
          )}
        </form>
      </header>

      {isAdmin && pendingStudents.length > 0 && (
        <div style={styles.pendingCard}>
          <h4 style={styles.pendingTitle}>⏳ Pending Enrollment Approvals</h4>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Course Info</th>
                  <th style={styles.th}>Monthly Fee</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingStudents.map((s) => (
                  <tr key={s.id} style={styles.tr}>
                    <td style={styles.idCell}>{s.student_id}</td>
                    <td style={styles.nameCell}>{s.name}</td>
                    <td>
                      {Object.values(s.enrolled_courses).map((course, idx) => (
                        <div key={idx} style={styles.courseBadge}>{course.course_name}</div>
                      ))}
                    </td>
                    <td style={styles.feeCell}>
                      {Object.values(s.enrolled_courses).map((course, idx) => (
                        <div key={idx}>PKR {course.agreed_monthly_fee.toLocaleString()}</div>
                      ))}
                    </td>
                    <td>
                      <div style={styles.actionGroup}>
                        <button onClick={() => handleApprove(s.id, s)} style={styles.btnApprove}>Approve</button>
                        <button onClick={() => remove(ref(db, `pending_approvals/${s.id}`))} style={styles.btnReject}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={styles.mainCard}>
        <div style={styles.filterBar}>
          <div style={styles.searchBox}>
            <span style={styles.searchIcon}>🔍</span>
            <input type="text" placeholder="Search by name or phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={styles.filterInput} />
          </div>
          <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)} style={styles.filterSelect}>
            <option value="">All Courses</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>S.ID</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Courses</th>
                <th style={styles.th}>Fee Detail</th>
                <th style={styles.th}>Joined</th>
                {isAdmin && <th style={styles.th}>Manage</th>}
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length > 0 ? filteredStudents.map((s) => (
                <tr key={s.id} style={styles.tr}>
                  <td style={styles.idCell}>{s.student_id}</td>
                  <td style={styles.nameCell}>
                    <div>{s.name}</div>
                    <div style={styles.contactSub}>{s.contact}</div>
                  </td>
                  <td>
                    {Object.values(s.enrolled_courses).map((course, idx) => (
                      <div key={idx} style={styles.courseTag}>{course.course_name}</div>
                    ))}
                  </td>
                  <td style={styles.feeCell}>
                    {Object.values(s.enrolled_courses).map((course, idx) => (
                      <div key={idx}>PKR {course.agreed_monthly_fee.toLocaleString()}</div>
                    ))}
                  </td>
                  <td style={styles.dateCell}>{formatDate(s.createdAt)}</td>
                  {isAdmin && (
                    <td>
                      <div style={styles.actionGroup}>
                        <button onClick={() => startEdit(s)} style={styles.btnEdit}>Edit</button>
                        <button onClick={() => { if(window.confirm("Delete record?")) remove(ref(db, `students/${s.id}`))}} style={styles.btnDelete}>🗑️</button>
                      </div>
                    </td>
                  )}
                </tr>
              )) : (
                <tr><td colSpan="6" style={styles.emptyState}>No student records found.</td></tr>
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
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' },
  titleArea: { flex: 1 },
  title: { fontSize: '24px', fontWeight: '800', color: '#1E293B', margin: 0 },
  subtitle: { color: '#64748B', fontSize: '14px', marginTop: '4px' },
  
  quickForm: { background: '#fff', padding: '12px', borderRadius: '14px', display: 'flex', gap: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  input: { padding: '10px 14px', borderRadius: '10px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px', width: '200px' },
  inputSmall: { padding: '10px 14px', borderRadius: '10px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px', width: '120px' },
  inputTiny: { padding: '10px 14px', borderRadius: '10px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px', width: '80px' },
  select: { padding: '10px', borderRadius: '10px', border: '1px solid #E2E8F0', outline: 'none', background: '#F8FAFC', fontSize: '14px' },
  btnPrimary: { background: '#3B82F6', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' },
  btnCancel: { background: '#F1F5F9', color: '#64748B', border: 'none', width: '38px', borderRadius: '10px', cursor: 'pointer' },

  pendingCard: { background: '#FFFBEB', padding: '24px', borderRadius: '16px', border: '1px solid #FEF3C7', marginBottom: '30px' },
  pendingTitle: { margin: '0 0 15px 0', color: '#92400E', fontSize: '16px' },
  
  mainCard: { background: '#fff', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' },
  filterBar: { padding: '20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' },
  searchBox: { position: 'relative' },
  searchIcon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 },
  filterInput: { padding: '10px 12px 10px 35px', borderRadius: '10px', border: '1px solid #E2E8F0', width: '250px', outline: 'none' },
  filterSelect: { padding: '10px', borderRadius: '10px', border: '1px solid #E2E8F0', background: '#fff', outline: 'none' },

  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  thRow: { background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' },
  th: { padding: '15px 20px', color: '#64748B', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s' },
  
  idCell: { padding: '16px 20px', fontWeight: '700', color: '#3B82F6', fontSize: '13px' },
  nameCell: { padding: '16px 20px', fontSize: '14px' },
  contactSub: { fontSize: '11px', color: '#94A3B8', marginTop: '2px' },
  courseTag: { fontSize: '12px', fontWeight: '600', color: '#475569', background: '#F1F5F9', padding: '2px 8px', borderRadius: '6px', marginBottom: '4px', display: 'inline-block' },
  courseBadge: { fontSize: '11px', fontWeight: '700', color: '#B45309', background: '#FEF3C7', padding: '2px 8px', borderRadius: '6px', marginBottom: '4px' },
  feeCell: { padding: '16px 20px', fontSize: '13px', fontWeight: '600', color: '#1E293B' },
  dateCell: { padding: '16px 20px', color: '#64748B', fontSize: '12px' },
  
  actionGroup: { display: 'flex', gap: '8px' },
  btnApprove: { background: '#10B981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' },
  btnReject: { background: '#EF4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' },
  btnEdit: { background: '#EFF6FF', color: '#3B82F6', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' },
  btnDelete: { background: '#fff', border: '1px solid #FEE2E2', padding: '6px', borderRadius: '8px', cursor: 'pointer' },
  emptyState: { padding: '50px', textAlign: 'center', color: '#94A3B8' }
};

export default Students;