import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import {
  Clock,
  Users,
  Phone,
  BookOpen,
  X,
  ChevronRight,
  AlertCircle,
  Calendar
} from 'lucide-react';

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

      let badgeClass = "bg-blue-50 text-blue-700 border-blue-200";
      let countColor = "text-blue-600";
      if (count >= 15) {
        badgeClass = "bg-rose-50 text-rose-700 border-rose-200";
        countColor = "text-rose-600";
      } else if (count >= 10) {
        badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
        countColor = "text-amber-600";
      }

      return (
        <div
          key={key}
          onClick={() => setSelectedSlot(data)}
          className={`p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md flex flex-col justify-between ${badgeClass}`}
        >
          <div>
            <div className="flex items-center justify-between text-xs font-bold mb-2">
              <span className="flex items-center gap-1.5 text-slate-700">
                <Clock size={13} />
                <span>{slotLabel}</span>
              </span>
            </div>
            <div className={`text-2xl font-black font-mono my-1 ${countColor}`}>
              {count} <span className="text-xs font-sans font-medium text-slate-500">enrolled</span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-bold text-slate-600">
            <span>View Roster</span>
            <ChevronRight size={13} />
          </div>
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 font-sans text-xs">
        Loading timeslot analytics...
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans animate-fade-in">
      {/* HEADER */}
      <header className="pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-2">
          <Clock className="text-blue-600" size={24} />
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Timeslot & Capacity Analytics</h1>
        </div>
        <p className="text-sm text-slate-500 mt-1 font-medium">Track studio capacities, classroom occupancy & scheduling distributions</p>
      </header>

      {/* TWO COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Regular Classes */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Regular Classes (1 Hour Daily)</h2>
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
              7 Slots
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {renderSlotCards(regularSlots, 'Regular')}
          </div>
        </div>

        {/* Alternate Classes */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Alternate Classes (2 Hours)</h2>
            <span className="text-[11px] font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-md">
              6 Slots
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {renderSlotCards(alternateSlots, 'Alternate')}
          </div>
        </div>
      </div>

      {/* ROSTER MODAL */}
      {selectedSlot && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedSlot(null); }}
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-xl max-h-[85vh] flex flex-col space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
                  {selectedSlot.type} Schedule
                </span>
                <h3 className="text-base font-bold text-slate-900 tracking-tight mt-0.5">
                  {selectedSlot.label} Roster
                </h3>
              </div>
              <button
                onClick={() => setSelectedSlot(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span>Total Students Assigned</span>
              <span className="font-mono text-sm text-blue-600">{selectedSlot.students.length}</span>
            </div>

            <div className="overflow-y-auto max-h-96 rounded-xl border border-slate-200">
              {selectedSlot.students.length > 0 ? (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[11px]">
                      <th className="py-2.5 px-3">ID</th>
                      <th className="py-2.5 px-3">Student</th>
                      <th className="py-2.5 px-3">Course</th>
                      <th className="py-2.5 px-3">Contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedSlot.students.map((stu, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-600">{stu.id}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{stu.name}</td>
                        <td className="py-2.5 px-3 text-slate-600">{stu.course}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{stu.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No students are currently scheduled in this timeslot.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeslotAnalytics;
