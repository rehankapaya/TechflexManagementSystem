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
        alert("Student Updated!");
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
          addedBy: currentUser.name,
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
          alert(`Enrolled as: ${customId}`);
        } else {
          await set(push(ref(db, 'pending_approvals')), { ...payloadWithMeta, status: 'pending' });
          alert(`Requested as: ${customId}`);
        }
      }
      setFormData({ name: '', contact: '', courseId: '', agreed_monthly_fee: '' });
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (tempId, studentData) => {
    const now = new Date().toISOString();
    const updatedCourses = {};
    Object.keys(studentData.enrolled_courses).forEach(courseId => {
      updatedCourses[courseId] = {
        ...studentData.enrolled_courses[courseId],
        enrolledAt: studentData.enrolled_courses[courseId].enrolledAt || now,
        course_status: studentData.enrolled_courses[courseId].course_status || "active"
      };
    });

    const approvedStudent = {
      ...studentData,
      enrolled_courses: updatedCourses,
      status: 'active',
      approvedBy: currentUser.name,
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

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this student record?")) {
      await remove(ref(db, `students/${id}`));
    }
  };

  const handleReject = async (id) => {
    if (window.confirm("Are you sure you want to reject this enrollment request?")) {
      await remove(ref(db, `pending_approvals/${id}`));
      alert("Request Rejected.");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('en-GB', { month: 'long' });
    const year = date.getFullYear();
    return `${day}/ ${month} /${year}`;
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (s.contact && s.contact.includes(searchTerm)); 
    const matchesCourse = filterCourse === '' || Object.keys(s.enrolled_courses).includes(filterCourse);
    return matchesSearch && matchesCourse;
  });

  return (
    <div style={styles.container}>
      <div style={styles.topSection}>
        <div>
          <h2>{isEditing ? "📝 Editing Student" : "Student Enrollment Registry"}</h2>
          <p style={{ color: '#64748b' }}>Manage active students and pending approvals</p>
        </div>

        <form onSubmit={handleSubmit} style={{ ...styles.quickForm, border: isEditing ? '2px solid #4318ff' : 'none' }}>
          <input type="text" name="name" placeholder="Student Name" value={formData.name} onChange={handleChange} required style={styles.input} />
          <input type="text" name="contact" placeholder="Contact Number" value={formData.contact} onChange={handleChange} required style={{...styles.input, width: '150px'}} />
          
          <select name="courseId" value={formData.courseId} onChange={handleChange} required style={styles.input}>
            <option value="">Course</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="number" name="agreed_monthly_fee" placeholder="Fee" value={formData.agreed_monthly_fee} onChange={handleChange} required style={{ ...styles.input, width: '100px' }} />

          <button type="submit" disabled={loading} style={styles.btnPrimary}>
            {loading ? "Processing..." : isEditing ? "Update" : (isAdmin ? "Add" : "Request")}
          </button>
          
          {isEditing && (
            <button type="button" onClick={() => {setIsEditing(null); setFormData({name:'', contact: '', courseId:'', agreed_monthly_fee:''})}} style={styles.btnCancel}>
              Cancel
            </button>
          )}
        </form>
      </div>

      {/* Pending Section for Admin */}
      {isAdmin && pendingStudents.length > 0 && (
        <div style={styles.pendingSection}>
          <h4 style={{ color: '#b45309', marginBottom: '15px' }}>⏳ Pending Approvals</h4>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th>S.ID</th>
                <th>Name</th>
                <th>Contact</th>
                <th>Course(s)</th>
                <th>Fee(s)</th>
                <th>Requested On</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingStudents.map((s) => (
                <tr key={s.id} style={styles.tr}>
                  <td style={{ fontWeight: 'bold', color: '#4318ff' }}>{s.student_id || 'N/A'}</td>
                  <td>{s.name}</td>
                  <td>{s.contact || 'N/A'}</td>
                  <td>
                    {Object.values(s.enrolled_courses).map((course, idx) => (
                      <div key={idx} style={styles.courseBadge}>{course.course_name}</div>
                    ))}
                  </td>
                  <td>
                    {Object.values(s.enrolled_courses).map((course, idx) => (
                      <div key={idx}>PKR {course.agreed_monthly_fee}</div>
                    ))}
                  </td>
                  <td style={{ fontWeight: '600', color: '#b45309' }}>{formatDate(s.createdAt)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button onClick={() => handleApprove(s.id, s)} style={styles.btnApprove}>Approve</button>
                      <button onClick={() => handleReject(s.id)} style={styles.btnDelete}>Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={styles.card}>
        <div style={styles.filterBar}>
          <h3>Active Students</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="text" placeholder="🔍 Name or Phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={styles.filterInput} />
            <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)} style={styles.filterInput}>
              <option value="">All Courses</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <table style={styles.table}>
          <thead>
            <tr style={styles.thRow}>
              <th>S.ID</th>
              <th>Full Name</th>
              <th>Contact</th>
              <th>Enrolled Courses</th>
              <th>Duration</th>
              <th>Fee Info</th>
              <th>Joined Date</th>
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length > 0 ? filteredStudents.map((s) => (
              <tr key={s.id} style={styles.tr}>
                <td style={{ fontWeight: 'bold', color: '#4318ff' }}>{s.student_id || 'N/A'}</td>
                <td style={{ fontWeight: '600' }}>{s.name}</td>
                <td>{s.contact || 'N/A'}</td>
                <td>
                  {Object.values(s.enrolled_courses).map((course, idx) => (
                    <div key={idx} style={{...styles.courseBadge, color: course.course_status === 'active' ? '#10b981' : '#64748b'}}>
                      {course.course_name} 
                    </div>
                  ))}
                </td>
                <td>
                  {Object.values(s.enrolled_courses).map((course, idx) => (
                    <div key={idx}>{course.duration} Months</div>
                  ))}
                </td>
                <td>
                  {Object.values(s.enrolled_courses).map((course, idx) => (
                    <div key={idx}>PKR {course.agreed_monthly_fee}</div>
                  ))}
                </td>
                <td>{formatDate(s.createdAt)}</td>
                {isAdmin && (
                  <td>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button onClick={() => startEdit(s)} style={styles.btnEdit}>Edit</button>
                      <button onClick={() => handleDelete(s.id)} style={styles.btnDelete}>Delete</button>
                    </div>
                  </td>
                )}
              </tr>
            )) : (
              <tr><td colSpan={isAdmin ? "8" : "7"} style={{ textAlign: 'center', padding: '20px' }}>No students found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '30px', background: '#f1f5f9', minHeight: '100vh' },
  topSection: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  quickForm: { display: 'flex', flexWrap: "wrap", gap: '10px', background: '#fff', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  input: { padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' },
  btnPrimary: { background: '#4318ff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  btnCancel: { background: '#e2e8f0', color: '#475569', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer' },
  card: { background: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
  filterBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  filterInput: { padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
  thRow: { textAlign: 'left', borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '13px' },
  tr: { borderBottom: '1px solid #f1f5f9', fontSize: '14px', transition: '0.2s' },
  btnApprove: { background: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  btnEdit: { background: '#eef2ff', color: '#4318ff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  btnDelete: { background: '#fff5f5', color: '#ef4444', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  pendingSection: { background: '#fffbeb', padding: '20px', borderRadius: '16px', border: '1px solid #fef3c7', marginBottom: '20px' },
  courseBadge: { fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }
};

const globalStyles = `th, td { padding: 12px; }`;
const styleTag = document.createElement("style");
styleTag.innerText = globalStyles;
document.head.appendChild(styleTag);

export default Students;