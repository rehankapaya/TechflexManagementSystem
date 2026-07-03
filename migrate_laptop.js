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

async function migrate() {
  const updates = {};
  
  // 1. Update students
  const studentsSnap = await get(ref(db, 'students'));
  if (studentsSnap.exists()) {
    const studentsData = studentsSnap.val();
    for (const [id, student] of Object.entries(studentsData)) {
      if (student.laptop_status === "No Laptop" || student.laptop_status === "Provided By Ins.") {
        updates[`students/${id}/laptop_status`] = "No! Provided By ins";
      }
    }
  }

  // 2. Update pending_approvals
  const pendingSnap = await get(ref(db, 'pending_approvals'));
  if (pendingSnap.exists()) {
    const pendingData = pendingSnap.val();
    for (const [id, req] of Object.entries(pendingData)) {
      if (req.laptop_status === "No Laptop" || req.laptop_status === "Provided By Ins.") {
        updates[`pending_approvals/${id}/laptop_status`] = "No! Provided By ins";
      }
    }
  }

  if (Object.keys(updates).length > 0) {
    console.log("Applying updates:", Object.keys(updates).length, "fields");
    await update(ref(db), updates);
    console.log("Migration complete.");
  } else {
    console.log("No records needed updating.");
  }
  process.exit(0);
}

migrate().catch(console.error);
