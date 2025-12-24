import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase.js'; 
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, set, onValue } from 'firebase/database';

const CreateUser = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'teacher'
  });
  const [users, setUsers] = useState([]); // State to hold the list of users
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [error, setError] = useState(null);

  const roles = [
    { value: 'admin', label: 'Admin', icon: '👑', color: '#8B5CF6' },
    { value: 'teacher', label: 'Teacher', icon: '📚', color: '#3B82F6' },
    { value: 'feescashier', label: 'Cashier', icon: '💰', color: '#10B981' }
  ];

  // --- 1. Realtime Listener for Users ---
  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convert object into array and sort by newest
        const userList = Object.values(data).reverse();
        setUsers(userList);
      }
    });

    return () => unsubscribe(); // Cleanup listener on unmount
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: name === "email" ? value.toLowerCase() : value
    }));
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;

      await set(ref(db, 'users/' + user.uid), {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        createdAt: new Date().toISOString(),
        uid: user.uid
      });

      setIsSubmitting(false);
      setIsSuccess(true);
      
      setTimeout(() => {
        setIsSuccess(false);
        setFormData({ name: '', email: '', password: '', role: 'teacher' });
      }, 2500);

    } catch (err) {
      setIsSubmitting(false);
      if (err.code === 'auth/email-already-in-use') setError("Email already exists.");
      else setError("Failed to create user.");
    }
  };

  const getSelectedRole = () => roles.find(r => r.value === formData.role) || roles[1];

  return (
    <div style={styles.pageLayout}>
      {/* LEFT COLUMN: FORM */}
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Create New User</h1>
          <p style={styles.subtitle}>Fill details to register staff</p>
        </div>

        {error && <div style={styles.errorContainer}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Full Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required style={styles.input} />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required style={styles.input} />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} required style={styles.input} />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Role</label>
            <select name="role" value={formData.role} onChange={handleChange} style={styles.input}>
              {roles.map(r => <option key={r.value} value={r.value}>{r.icon} {r.label}</option>)}
            </select>
          </div>

          <button type="submit" disabled={isSubmitting} style={styles.button}>
            {isSubmitting ? 'Processing...' : 'Create User'}
          </button>
        </form>
      </div>

      {/* RIGHT COLUMN: USER LIST */}
      <div style={styles.listContainer}>
        <div style={styles.header}>
          <h1 style={styles.title}>Existing Users</h1>
          <p style={styles.subtitle}>Total registered: {users.length}</p>
        </div>
        
        <div style={styles.scrollArea}>
          {users.map((user) => (
            <div key={user.uid} style={styles.userCard}>
              <div style={{...styles.roleIcon, backgroundColor: roles.find(r=>r.value === user.role)?.color}}>
                {roles.find(r=>r.value === user.role)?.icon}
              </div>
              <div style={styles.userInfo}>
                <h4 style={styles.userName}>{user.name}</h4>
                <p style={styles.userEmail}>{user.email}</p>
                <span style={styles.roleBadge}>{user.role}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles = {
  pageLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '40px',
    padding: '40px',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: 'system-ui'
  },
  container: { background: '#fff', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
  listContainer: { background: '#f8fafc', padding: '30px', borderRadius: '20px', border: '1px solid #e2e8f0', maxHeight: '80vh', display: 'flex', flexDirection: 'column' },
  header: { marginBottom: '20px' },
  title: { fontSize: '22px', margin: 0, color: '#1e293b' },
  subtitle: { fontSize: '14px', color: '#64748b' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#475569' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' },
  button: { padding: '14px', background: '#4318ff', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' },
  scrollArea: { overflowY: 'auto', flex: 1, paddingRight: '10px' },
  userCard: { display: 'flex', alignItems: 'center', gap: '15px', background: '#fff', padding: '15px', borderRadius: '12px', marginBottom: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.03)' },
  roleIcon: { width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' },
  userInfo: { flex: 1 },
  userName: { margin: 0, fontSize: '15px', color: '#1e293b' },
  userEmail: { margin: 0, fontSize: '12px', color: '#64748b' },
  roleBadge: { fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#4318ff', background: '#eef2ff', padding: '2px 6px', borderRadius: '4px', marginTop: '4px', display: 'inline-block' },
  errorContainer: { padding: '10px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '15px', fontSize: '13px' }
};

export default CreateUser;