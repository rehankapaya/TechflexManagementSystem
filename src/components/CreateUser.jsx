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
  const [users, setUsers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });

  const roles = [
    { value: 'admin', label: 'Admin', icon: '👑', color: '#8B5CF6' },
    { value: 'teacher', label: 'Teacher', icon: '📚', color: '#3B82F6' },
    { value: 'feescashier', label: 'Cashier', icon: '💰', color: '#10B981' }
  ];

  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const userList = Object.values(data).reverse();
        setUsers(userList);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (status.msg) {
      const timer = setTimeout(() => setStatus({ type: '', msg: '' }), 5000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "email" ? value.toLowerCase().trim() : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: '', msg: '' });

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

      setStatus({ type: 'success', msg: `User ${formData.name} created successfully!` });
      setFormData({ name: '', email: '', password: '', role: 'teacher' });

    } catch (err) {
      if (err.code === 'auth/email-already-in-use') setStatus({ type: 'error', msg: "Email already exists." });
      else setStatus({ type: 'error', msg: "Failed to create user. Check permissions." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.pageLayout}>
      {/* LEFT: FORM SECTION */}
      <div style={styles.formCard}>
        <div style={styles.header}>
          <h2 style={styles.title}>Register Staff 👤</h2>
          <p style={styles.subtitle}>Provide account credentials and system role.</p>
        </div>

        {status.msg && (
          <div style={{
            ...styles.statusBanner,
            backgroundColor: status.type === 'success' ? '#F0FDF4' : '#FEF2F2',
            color: status.type === 'success' ? '#166534' : '#991B1B',
            borderColor: status.type === 'success' ? '#BBF7D0' : '#FCA5A5'
          }}>
            {status.type === 'success' ? '✅ ' : '⚠️ '} {status.msg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Full Name</label>
            <input 
              type="text" name="name" placeholder="John Doe"
              value={formData.name} onChange={handleChange} 
              required style={styles.input} 
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input 
              type="email" name="email" placeholder="staff@edu.com"
              value={formData.email} onChange={handleChange} 
              required style={styles.input} 
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input 
              type="password" name="password" placeholder="Min. 6 characters"
              value={formData.password} onChange={handleChange} 
              required style={styles.input} 
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>System Role</label>
            <select name="role" value={formData.role} onChange={handleChange} style={styles.input}>
              {roles.map(r => (
                <option key={r.value} value={r.value}>
                  {r.icon} {r.label}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" disabled={isSubmitting} style={styles.button}>
            {isSubmitting ? 'Creating Profile...' : 'Register User'}
          </button>
        </form>
      </div>

      {/* RIGHT: DIRECTORY SECTION */}
      <div style={styles.listCard}>
        <div style={styles.tableHeader}>
          <div>
            <h2 style={styles.title}>Staff Directory</h2>
            <p style={styles.subtitle}>{users.length} active team members</p>
          </div>
          <span style={styles.liveBadge}>LIVE</span>
        </div>
        
        <div style={styles.scrollArea}>
          {users.map((user) => {
            const roleInfo = roles.find(r => r.value === user.role) || roles[1];
            return (
              <div key={user.uid} style={styles.userCard}>
                <div style={{ ...styles.avatar, backgroundColor: roleInfo.color }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div style={styles.userInfo}>
                  <div style={styles.nameRow}>
                    <h4 style={styles.userName}>{user.name}</h4>
                    <span style={{ ...styles.roleTag, color: roleInfo.color, borderColor: roleInfo.color }}>
                      {roleInfo.label}
                    </span>
                  </div>
                  <p style={styles.userEmail}>{user.email}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const styles = {
  pageLayout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(350px, 450px) 1fr',
    gap: '30px',
    maxWidth: '1200px',
    margin: '0 auto',
    animation: 'fadeIn 0.5s ease-out'
  },
  formCard: { 
    background: '#fff', 
    padding: '30px', 
    borderRadius: '16px', 
    border: '1px solid #E2E8F0', 
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
    height: 'fit-content'
  },
  listCard: { 
    background: '#fff', 
    padding: '30px', 
    borderRadius: '16px', 
    border: '1px solid #E2E8F0', 
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
    maxHeight: '85vh', 
    display: 'flex', 
    flexDirection: 'column' 
  },
  header: { marginBottom: '25px' },
  title: { fontSize: '20px', fontWeight: '700', color: '#1E293B', margin: 0 },
  subtitle: { fontSize: '13px', color: '#64748B', marginTop: '4px' },
  
  statusBanner: { padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', border: '1px solid', fontSize: '13px' },
  
  form: { display: 'flex', flexDirection: 'column', gap: '18px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '600', color: '#475569' },
  input: { 
    padding: '12px 15px', 
    borderRadius: '10px', 
    border: '1px solid #E2E8F0', 
    backgroundColor: '#F8FAFC', 
    outline: 'none',
    fontSize: '14px',
    transition: '0.2s'
  },
  button: { 
    padding: '14px', 
    background: '#3B82F6', 
    color: '#fff', 
    border: 'none', 
    borderRadius: '10px', 
    fontWeight: '700', 
    cursor: 'pointer', 
    marginTop: '10px',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)' 
  },

  tableHeader: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: '25px',
    borderBottom: '1px solid #F1F5F9',
    paddingBottom: '15px'
  },
  liveBadge: { fontSize: '9px', fontWeight: '800', color: '#10B981', background: '#DCFCE7', padding: '2px 8px', borderRadius: '20px' },
  
  scrollArea: { overflowY: 'auto', flex: 1, paddingRight: '10px' },
  userCard: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '15px', 
    padding: '15px', 
    borderRadius: '12px', 
    marginBottom: '10px', 
    border: '1px solid #F1F5F9',
    transition: '0.2s'
  },
  avatar: { 
    width: '42px', 
    height: '42px', 
    borderRadius: '12px', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    fontSize: '16px', 
    fontWeight: 'bold', 
    color: '#fff' 
  },
  userInfo: { flex: 1 },
  nameRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  userName: { margin: 0, fontSize: '15px', fontWeight: '600', color: '#1E293B' },
  userEmail: { margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' },
  roleTag: { 
    fontSize: '10px', 
    fontWeight: '700', 
    textTransform: 'uppercase', 
    padding: '2px 8px', 
    borderRadius: '6px', 
    border: '1px solid' 
  }
};

export default CreateUser;