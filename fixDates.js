import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, update } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDnrD2V19sce_FXgOEZkbUgl-4lZErRzzs",
  authDomain: "techflexmanagementsystem.firebaseapp.com",
  projectId: "techflexmanagementsystem",
  storageBucket: "techflexmanagementsystem.firebasestorage.app",
  messagingSenderId: "1039417411226",
  appId: "1:1039417411226:web:f60708d495893d06238123"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function fixDates() {
  console.log("Fetching students...");
  const snap = await get(ref(db, 'students'));
  const students = snap.val();
  if (!students) {
    console.log("No students found.");
    process.exit(0);
  }

  const updates = {};
  let count = 0;

  for (const [studentId, studentData] of Object.entries(students)) {
    if (studentData.enrolled_courses) {
      for (const [courseId, courseData] of Object.entries(studentData.enrolled_courses)) {
        if (courseData.enrolledAt) {
          const d = new Date(courseData.enrolledAt);
          // Check if day is 30 or 31
          const day = d.getDate();
          if (day === 30 || day === 31) {
            console.log(`Found ${studentData.name} - Course: ${courseData.course_name} - Date: ${d.toISOString()}`);
            // Move to 1st of next month
            // If it's Oct 31, we want Nov 1. 
            // d.getMonth() is 0-indexed.
            const nextMonthDate = new Date(d.getFullYear(), d.getMonth() + 1, 1);
            // Note: Since this script runs in local timezone, creating a new Date like this will create it at midnight local time.
            // Which is exactly what we want.
            updates[`students/${studentId}/enrolled_courses/${courseId}/enrolledAt`] = nextMonthDate.toISOString();
            count++;
            console.log(`  -> Updating to: ${nextMonthDate.toISOString()}`);
          }
        }
      }
    }
  }

  if (count > 0) {
    console.log(`Updating ${count} records...`);
    await update(ref(db), updates);
    console.log("Done.");
  } else {
    console.log("No dates needed fixing.");
  }
  process.exit(0);
}

fixDates().catch(err => {
  console.error(err);
  process.exit(1);
});
