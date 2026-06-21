import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase.js'; 
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { ref, set, onValue, remove, update } from 'firebase/database';
import toast from 'react-hot-toast';

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
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState(null);

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

      toast.success(`User ${formData.name} created successfully!`);
      setFormData({ name: '', email: '', password: '', role: 'teacher' });

    } catch (err) {
      if (err.code === 'auth/email-already-in-use') toast.error("Email already exists.");
      else toast.error("Failed to create user. Check permissions.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (uid, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}? Existing records associated with this user will not be affected.`)) {
      try {
        await remove(ref(db, `users/${uid}`));
        toast.success(`${name} has been deleted from the directory.`);
      } catch (err) {
        toast.error("Failed to delete user.");
      }
    }
  };

  const handleResetPassword = async (email) => {
    if (window.confirm(`Send a password reset email to ${email}?`)) {
      try {
        await sendPasswordResetEmail(auth, email);
        toast.success(`Password reset email sent to ${email}`);
      } catch (err) {
        toast.error("Failed to send reset email.");
      }
    }
  };

  const handleEditUser = (user) => {
    setEditFormData({
      uid: user.uid,
      name: user.name,
      role: user.role,
      email: user.email // Readonly in edit
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await update(ref(db, `users/${editFormData.uid}`), {
        name: editFormData.name,
        role: editFormData.role
      });
      toast.success("User profile updated successfully");
      setShowEditModal(false);
      setEditFormData(null);
    } catch (err) {
      toast.error("Failed to update user profile");
    }
  };

  return (
    <>
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
                <div style={styles.actionRow}>
                  <button onClick={() => handleEditUser(user)} style={{...styles.btnAction, color: '#3B82F6', background: '#DBEAFE'}} title="Edit Profile">✏️</button>
                  <button onClick={() => handleResetPassword(user.email)} style={{...styles.btnAction, color: '#F59E0B', background: '#FEF3C7'}} title="Reset Password">🔑</button>
                  <button onClick={() => handleDeleteUser(user.uid, user.name)} style={{...styles.btnAction, color: '#EF4444', background: '#FEE2E2'}} title="Delete User">🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>

    {showEditModal && editFormData && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.title}>Edit User Profile</h3>
              <button onClick={() => setShowEditModal(false)} style={styles.btnClose}>✕</button>
            </div>
            <form onSubmit={handleUpdateUser} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Full Name</label>
                <input 
                  type="text" value={editFormData.name} 
                  onChange={e => setEditFormData({...editFormData, name: e.target.value})} 
                  required style={styles.input} 
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Email Address (Cannot be changed)</label>
                <input 
                  type="email" value={editFormData.email} 
                  disabled style={{...styles.input, backgroundColor: '#E2E8F0', color: '#64748B'}} 
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>System Role</label>
                <select value={editFormData.role} onChange={e => setEditFormData({...editFormData, role: e.target.value})} style={styles.input}>
                  {roles.map(r => (
                    <option key={r.value} value={r.value}>
                      {r.icon} {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" style={styles.button}>
                Update User
              </button>
            </form>
          </div>
        </div>
      )}
    </>
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
  },
  actionRow: { display: 'flex', gap: '8px', alignItems: 'center' },
  btnAction: { border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', transition: '0.2s' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { background: '#fff', padding: '25px', borderRadius: '16px', width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  btnClose: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748B' }
};

export default CreateUser;