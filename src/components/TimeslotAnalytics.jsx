import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';

const TimeslotAnalytics = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);

  useEffect(() => {
    const studentsRef = ref(db, 'students');
    const unsub = onValue(studentsRef, (snap) => {
      const data = snap.val();
      if (data) {
        setStudents(Object.keys(data).map(id => ({ id, ...data[id] })));
      } else {
        setStudents([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const regularSlots = [
    "3:00 PM - 4:00 PM", "4:00 PM - 5:00 PM", "5:00 PM - 6:00 PM",
    "6:00 PM - 7:00 PM", "7:00 PM - 8:00 PM", "8:00 PM - 9:00 PM",
    "9:00 PM - 10:00 PM"
  ];
  
  const alternateSlots = [
    "3:00 PM - 5:00 PM", "4:00 PM - 6:00 PM", "5:00 PM - 7:00 PM",
    "6:00 PM - 8:00 PM", "7:00 PM - 9:00 PM", "8:00 PM - 10:00 PM"
  ];

  const slotData = {};
  
  regularSlots.forEach(s => slotData[`Regular_${s}`] = { label: s, type: 'Regular', students: [] });
  alternateSlots.forEach(s => slotData[`Alternate_${s}`] = { label: s, type: 'Alternate', students: [] });

  students.forEach(student => {
    if (student.status === 'active' && student.enrolled_courses) {
      Object.values(student.enrolled_courses).forEach(course => {
        if (course.course_status === 'active' && course.class_type && course.timeslot) {
           const typePrefix = course.class_type.startsWith('Regular') ? 'Regular' : 'Alternate';
           const key = `${typePrefix}_${course.timeslot}`;
           if (slotData[key]) {
             slotData[key].students.push({ 
                 name: student.name, 
                 course: course.course_name, 
                 id: student.student_id,
                 phone: student.contact || 'N/A'
             });
           }
        }
      });
    }
  });

  const renderSlotCards = (slotsArray, typePrefix) => {
    return slotsArray.map(slotLabel => {
      const key = `${typePrefix}_${slotLabel}`;
      const data = slotData[key];
      const count = data.students.length;
      
      let colorClass = '#3B82F6';
      let bgClass = '#EFF6FF';
      if (count >= 15) { colorClass = '#EF4444'; bgClass = '#FEF2F2'; }
      else if (count >= 10) { colorClass = '#F59E0B'; bgClass = '#FFFBEB'; }
      
      return (
        <div key={key} style={{...styles.slotCard, borderColor: colorClass, backgroundColor: bgClass}} onClick={() => setSelectedSlot(data)}>
            <div style={styles.slotTime}>{slotLabel}</div>
            <div style={{...styles.slotCount, color: colorClass}}>{count} <span style={{fontSize:'12px', fontWeight:'normal'}}>Students</span></div>
            <button style={{...styles.viewBtn, color: colorClass, borderColor: colorClass}}>View Details</button>
        </div>
      );
    });
  };

  if (loading) {
      return <div style={{padding: '20px'}}>Loading analytics...</div>;
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2 style={styles.title}>Timeslot Analytics ⏱️</h2>
        <p style={styles.subtitle}>Track class capacities and student distributions across different timeslots.</p>
      </header>

      <div style={styles.content}>
          <div style={styles.column}>
              <h3 style={styles.colTitle}>Regular Classes (1 Hour)</h3>
              <div style={styles.grid}>
                  {renderSlotCards(regularSlots, 'Regular')}
              </div>
          </div>
          
          <div style={styles.column}>
              <h3 style={styles.colTitle}>Alternate Classes (2 Hours)</h3>
              <div style={styles.grid}>
                  {renderSlotCards(alternateSlots, 'Alternate')}
              </div>
          </div>
      </div>

      {selectedSlot && (
        <div style={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setSelectedSlot(null); }}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
                <h3 style={{ margin: 0, color: '#1E293B' }}>{selectedSlot.type} Class: {selectedSlot.label}</h3>
                <button onClick={() => setSelectedSlot(null)} style={styles.closeBtn}>✕</button>
            </div>
            
            <div style={styles.modalBody}>
                <div style={styles.summaryBadge}>Total Enrolled: {selectedSlot.students.length}</div>
                
                {selectedSlot.students.length > 0 ? (
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>ID</th>
                                <th style={styles.th}>Name</th>
                                <th style={styles.th}>Course</th>
                                <th style={styles.th}>Contact</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedSlot.students.map((stu, idx) => (
                                <tr key={idx} style={styles.tr}>
                                    <td style={{...styles.td, color: '#3B82F6', fontWeight:'500'}}>{stu.id}</td>
                                    <td style={{...styles.td, fontWeight:'500'}}>{stu.name}</td>
                                    <td style={styles.td}>{stu.course}</td>
                                    <td style={styles.td}>{stu.phone}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div style={{textAlign: 'center', color: '#64748B', padding: '30px 0'}}>
                        No students are currently assigned to this timeslot.
                    </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { width: '100%' },
  header: { marginBottom: '30px' },
  title: { fontSize: '24px', fontWeight: '700', color: '#1E293B', margin: '0 0 8px 0' },
  subtitle: { color: '#64748B', fontSize: '14px' },
  content: { display: 'flex', gap: '30px', flexWrap: 'wrap' },
  column: { flex: '1 1 45%', minWidth: '300px', backgroundColor: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0' },
  colTitle: { fontSize: '18px', fontWeight: '600', color: '#1E293B', marginBottom: '20px', borderBottom: '2px solid #F1F5F9', paddingBottom: '10px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' },
  slotCard: { border: '1px solid', padding: '15px', borderRadius: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'transform 0.2s, box-shadow 0.2s' },
  slotTime: { fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '10px', textAlign: 'center' },
  slotCount: { fontSize: '24px', fontWeight: '700', marginBottom: '15px' },
  viewBtn: { background: 'transparent', border: '1px solid', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' },
  
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
  modalContent: { backgroundColor: '#fff', borderRadius: '16px', width: '100%', maxWidth: '700px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #E2E8F0' },
  closeBtn: { background: 'none', border: 'none', fontSize: '20px', color: '#64748B', cursor: 'pointer' },
  modalBody: { padding: '24px', overflowY: 'auto' },
  summaryBadge: { display: 'inline-block', backgroundColor: '#F1F5F9', color: '#334155', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', marginBottom: '20px' },
  
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px 16px', borderBottom: '2px solid #E2E8F0', color: '#475569', fontSize: '13px', fontWeight: '600' },
  tr: { borderBottom: '1px solid #F1F5F9' },
  td: { padding: '12px 16px', fontSize: '14px', color: '#1E293B' }
};

export default TimeslotAnalytics;
