import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js';
import { useAuth } from '../contexts/AuthContext';
import { ref, set, push, onValue, remove, update } from 'firebase/database';
import * as XLSX from 'xlsx'; // Import the library
import toast from 'react-hot-toast';

const Students = () => {
  // ... existing states ...
  const { currentUser, isAdmin } = useAuth();
  const [students, setStudents] = useState([]);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [isEditing, setIsEditing] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });
  const [sortOrder, setSortOrder] = useState('desc');

  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    name: '', contact: '', gender: '', courseId: '', laptop_status: '',
    agreed_monthly_fee: '', admission_fee: '', createdAt: today,
    class_type: '', timeslot: ''
  });

  const getTimeslotOptions = (classType) => {
    if (classType === 'Regular (1 Hour)') {
      return [
        "3:00 PM - 4:00 PM", "4:00 PM - 5:00 PM", "5:00 PM - 6:00 PM",
        "6:00 PM - 7:00 PM", "7:00 PM - 8:00 PM", "8:00 PM - 9:00 PM",
        "9:00 PM - 10:00 PM"
      ];
    } else if (classType === 'Alternate (2 Hours)') {
      return [
        "3:00 PM - 5:00 PM", "4:00 PM - 6:00 PM", "5:00 PM - 7:00 PM",
        "6:00 PM - 8:00 PM", "7:00 PM - 9:00 PM", "8:00 PM - 10:00 PM"
      ];
    }
    return [];
  };

  // --- NEW: Export to Excel Function ---
  const downloadExcel = () => {
    if (filteredStudents.length === 0) {
      toast.error("No data available to export");
      return;
    }

    // Prepare the data specifically for Excel columns
    const excelData = filteredStudents.map(s => {
      // Get course details (taking the first course as primary)

      return {
        "Student ID": s.student_id,
        "Name": s.name,
        "Gender": s.gender,
        "Contact": s.contact,
        "Admission Fee": s.admission_fee || 0,
        "Admission Date": s.createdAt ? s.createdAt.split('T')[0] : "N/A",
        "Added By": s.addedBy || "N/A"
      };
    });

    // Create worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

    // Download the file
    XLSX.writeFile(workbook, `Student_Directory_${new Date().toLocaleDateString()}.xlsx`);
  };

  // ... (keep all your existing useEffect, handleChange, handleSubmit, startEdit, and formatDate functions) ...

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
    
    if (name === 'class_type') {
      setFormData(prev => ({ ...prev, class_type: value, timeslot: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (name === 'courseId' && !isEditing) {
      const selectedCourse = courses.find(c => c.id === value);
      if (selectedCourse) {
        setFormData(prev => ({
          ...prev,
          agreed_monthly_fee: selectedCourse.base_fee,
          admission_fee: selectedCourse.admission_fee || ''
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const admissionDateTime = new Date(formData.createdAt).toISOString();

    try {
      if (isEditing) {
        const currentStudent = students.find(s => s.id === isEditing);
        const courseId = formData.courseId;

        const updatedStudent = {
          ...currentStudent,
          name: formData.name,
          contact: formData.contact,
          gender: formData.gender,
          laptop_status: formData.laptop_status,
          createdAt: admissionDateTime,
          enrolled_courses: {
            ...currentStudent.enrolled_courses,
            [courseId]: {
              ...currentStudent.enrolled_courses[courseId],
              agreed_monthly_fee: Number(formData.agreed_monthly_fee),
              class_type: formData.class_type,
              timeslot: formData.timeslot,
            }
          }
        };

        await set(ref(db, `students/${isEditing}`), updatedStudent);
        toast.success('Student profile updated!');
        setIsEditing(null);
      } else {
        const selectedCourse = courses.find(c => c.id === formData.courseId);
        const courseDuration = selectedCourse?.duration || "N/A";
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

        const customId = `STU-${String(nextNumber).padStart(3, '0')}`;

        const payloadWithMeta = {
          student_id: customId,
          name: formData.name,
          contact: formData.contact,
          gender: formData.gender,
          laptop_status: formData.laptop_status,
          admission_fee: Number(formData.admission_fee),
          addedBy: currentUser.name || currentUser.email,
          createdAt: admissionDateTime,
          status: 'active',
          enrolled_courses: {
            [formData.courseId]: {
              course_name: selectedCourse?.name || 'Unknown',
              duration: courseDuration,
              agreed_monthly_fee: Number(formData.agreed_monthly_fee),
              enrolledAt: admissionDateTime,
              course_status: "active",
              class_type: formData.class_type,
              timeslot: formData.timeslot
            }
          }
        };

        if (isAdmin) {
          await set(push(ref(db, 'students')), payloadWithMeta);
          toast.success(`Enrolled: ${customId}`);
        } else {
          await set(push(ref(db, 'pending_approvals')), { ...payloadWithMeta, status: 'pending' });
          toast.success(`Request Sent: ${customId}`);
        }
      }
      setFormData({ name: '', contact: '', gender: '', courseId: '', laptop_status: '', agreed_monthly_fee: '', admission_fee: '', createdAt: today, class_type: '', timeslot: '' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const approveStudent = async (reqId, studentData) => {
    try {
      const { id, status, ...cleanData } = studentData;
      cleanData.status = 'active';
      cleanData.approvedBy = currentUser.name || currentUser.email || 'Admin';
      
      await set(push(ref(db, 'students')), cleanData);
      await remove(ref(db, `pending_approvals/${reqId}`));
      toast.success(`Approved: ${cleanData.student_id}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const rejectStudent = async (reqId) => {
    if (window.confirm("Reject this student enrollment request?")) {
      try {
        await remove(ref(db, `pending_approvals/${reqId}`));
        toast.success("Request Rejected.");
      } catch (err) {
        toast.error(err.message);
      }
    }
  };

  const startEdit = (student) => {
    const courseKey = Object.keys(student.enrolled_courses || {})[0];
    const courseData = student.enrolled_courses ? student.enrolled_courses[courseKey] : null;
    setIsEditing(student.id);
    setFormData({
      name: student.name,
      contact: student.contact || '',
      gender: student.gender || '',
      laptop_status: student.laptop_status || '',
      courseId: courseKey || '',
      agreed_monthly_fee: courseData ? courseData.agreed_monthly_fee : '',
      admission_fee: student.admission_fee || '',
      createdAt: student.createdAt ? student.createdAt.split('T')[0] : today,
      class_type: courseData ? (courseData.class_type || '') : '',
      timeslot: courseData ? (courseData.timeslot || '') : ''
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.contact && s.contact.includes(searchTerm)) ||
      (s.student_id && s.student_id.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCourse = filterCourse === '' || Object.keys(s.enrolled_courses || {}).includes(filterCourse);
    return matchesSearch && matchesCourse;
  }).sort((a, b) => {
    const idA = a.student_id || "";
    const idB = b.student_id || "";
    return sortOrder === 'asc' ? idA.localeCompare(idB) : idB.localeCompare(idA);
  });

  const formContent = (
    <form onSubmit={handleSubmit} style={{ ...styles.quickForm, borderColor: isEditing ? '#3B82F6' : '#E2E8F0' }}>
      <input type="text" name="name" placeholder="Full Name" value={formData.name} onChange={handleChange} required style={styles.input} />
      <input type="text" name="contact" placeholder="Phone" value={formData.contact} onChange={handleChange} required style={styles.inputSmall} />

      <select name="gender" value={formData.gender} onChange={handleChange} required style={styles.select}>
        <option value="">Gender</option>
        <option value="Male">Male</option>
        <option value="Female">Female</option>
        <option value="Other">Other</option>
      </select>

      <select name="laptop_status" value={formData.laptop_status} onChange={handleChange} required style={styles.select}>
        <option value="">Laptop</option>
        <option value="Has Laptop">Has Laptop</option>
        <option value="No! Provided By ins">No! Provided By ins</option>
      </select>

      {!isEditing && (
        <select name="courseId" value={formData.courseId} onChange={handleChange} required style={styles.select}>
          <option value="">Select Course</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}

      <select name="class_type" value={formData.class_type} onChange={handleChange} required style={styles.select}>
        <option value="">Class Type</option>
        <option value="Regular (1 Hour)">Regular (1 Hour)</option>
        <option value="Alternate (2 Hours)">Alternate (2 Hours)</option>
      </select>

      <select name="timeslot" value={formData.timeslot} onChange={handleChange} required style={styles.select} disabled={!formData.class_type}>
        <option value="">Timeslot</option>
        {getTimeslotOptions(formData.class_type).map(slot => (
          <option key={slot} value={slot}>{slot}</option>
        ))}
      </select>

      <input type="date" name="createdAt" value={formData.createdAt} onChange={handleChange} required style={styles.inputSmall} title="Admission Date" />

      {!isEditing && (
        <input type="number" name="admission_fee" placeholder="Adm. Fee" value={formData.admission_fee} onChange={handleChange} required style={styles.inputTiny} />
      )}

      <input type="number" name="agreed_monthly_fee" placeholder="Monthly Fee" value={formData.agreed_monthly_fee} onChange={handleChange} required style={styles.inputTiny} />

      <button type="submit" disabled={loading} style={styles.btnPrimary}>
        {loading ? "..." : isEditing ? "Update" : (isAdmin ? "Enroll" : "Request")}
      </button>

      {isEditing && (
        <button type="button" onClick={() => { setIsEditing(null); setFormData({ name: '', contact: '', gender: '', laptop_status: '', courseId: '', agreed_monthly_fee: '', admission_fee: '', createdAt: today, class_type: '', timeslot: '' }) }} style={styles.btnCancel}>
          ✕
        </button>
      )}
    </form>
  );

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.titleArea}>
          <h2 style={styles.title}>Student Directory 👨‍🎓</h2>
          <p style={styles.subtitle}>Registration and Course Enrollment Management</p>
        </div>

        {!isEditing && formContent}
      </header>

      {isEditing && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{ marginTop: 0, color: '#1E293B', marginBottom: '20px' }}>Edit Student Profile 👤</h3>
            {formContent}
          </div>
        </div>
      )}

      {isAdmin && pendingStudents.length > 0 && (
        <div style={styles.pendingCard}>
          <h3 style={styles.pendingTitle}>⏳ Pending Approvals ({pendingStudents.length})</h3>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Contact</th>
                  <th style={styles.th}>Course</th>
                  <th style={styles.th}>Added By</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingStudents.map(s => (
                  <tr key={s.id} style={styles.tr}>
                    <td style={styles.nameCell}>{s.name}</td>
                    <td style={styles.nameCell}>{s.contact}</td>
                    <td>
                      {Object.values(s.enrolled_courses || {}).map((c, i) => (
                        <div key={i} style={styles.courseTag}>{c.course_name}</div>
                      ))}
                    </td>
                    <td style={styles.nameCell}>{s.addedBy}</td>
                    <td>
                      <div style={styles.actionGroup}>
                        <button onClick={() => approveStudent(s.id, s)} style={styles.btnApprove}>Approve</button>
                        <button onClick={() => rejectStudent(s.id)} style={styles.btnReject}>Reject</button>
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
            <input type="text" placeholder="Search students..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={styles.filterInput} />
          </div>

          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={styles.filterSelect}>
            <option value="asc">Sort: ID (Asc)</option>
            <option value="desc">Sort: ID (Desc)</option>
          </select>

          {/* ADDED EXCEL BUTTON HERE */}
          <button onClick={downloadExcel} style={styles.btnExport}>
            📥 Download Excel
          </button>
        </div>
        <div style={styles.tableWrapper}>
          {/* ... keep existing table ... */}
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>S.ID</th>
                <th style={styles.th}>Name / Gender</th>
                <th style={styles.th}>Courses</th>
                <th style={styles.th}>Adm. Fee</th>
                <th style={styles.th}>Monthly Fee</th>
                <th style={styles.th}>Adm. Date</th>
                {isAdmin && <th style={styles.th}>Manage</th>}
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s) => (
                <tr key={s.id} style={styles.tr}>
                  <td style={styles.idCell}>{s.student_id}</td>
                  <td style={styles.nameCell}>
                    <div>{s.name} <span style={{ fontSize: '10px', color: '#94A3B8' }}>({s.gender})</span></div>
                    <div style={styles.contactSub}>{s.contact}</div>
                  </td>
                  <td>
                    {Object.values(s.enrolled_courses || {}).map((course, idx) => (
                      <div key={idx} style={styles.courseTag}>{course.course_name}</div>
                    ))}
                  </td>
                  <td style={styles.feeCell}>PKR {s.admission_fee?.toLocaleString() || 0}</td>
                  <td style={styles.feeCell}>
                    {Object.values(s.enrolled_courses || {}).map((course, idx) => (
                      <div key={idx}>PKR {course.agreed_monthly_fee.toLocaleString()}</div>
                    ))}
                  </td>
                  <td style={styles.dateCell}>{formatDate(s.createdAt)}</td>
                  {isAdmin && (
                    <td>
                      <div style={styles.actionGroup}>
                        <button onClick={() => startEdit(s)} style={styles.btnEdit}>Edit</button>
                        <button onClick={() => { if (window.confirm("Delete record?")) remove(ref(db, `students/${s.id}`)) }} style={styles.btnDelete}>🗑️</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
const styles = {

  btnExport: {
    background: '#10B981',
    color: '#fff',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '10px',
    fontWeight: '700',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { background: '#fff', padding: '30px', borderRadius: '20px', width: '90%', maxWidth: '900px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' },
  container: { width: '100%' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' },
  titleArea: { flex: 1 },
  title: { fontSize: '24px', fontWeight: '800', color: '#1E293B', margin: 0 },
  subtitle: { color: '#64748B', fontSize: '14px', marginTop: '4px' },

  quickForm: { background: '#fff', padding: '12px', borderRadius: '14px', display: 'flex', flexWrap: "wrap", gap: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
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