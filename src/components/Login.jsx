import React, { useState } from 'react';
import { auth, db } from '../firebase.js';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { useAuth } from '../contexts/AuthContext.jsx';

const Login = () => {
  const { setCurrentUser } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

const handleLogin = async (e) => {
  e.preventDefault();
  setIsSubmitting(true);
  setError(null);

  try {
    const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
    const user = userCredential.user;

    const userRef = ref(db, `users/${user.uid}`);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
      const userData = snapshot.val();
      const combinedData = { ...user, ...userData };
      
      // Update LocalStorage immediately
      localStorage.setItem('app_user', JSON.stringify(combinedData));
      
      // Navigate to dashboard
      window.location.href = '/dashboard'; 
    }
  } catch (err) {
    setError("Invalid email or password.");
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo}>🔐</div>
          <h2 style={styles.title}>Welcome Back</h2>
          <p style={styles.subtitle}>Enter your credentials to access your account</p>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              name="email"
              placeholder="admin@school.com"
              value={formData.email}
              onChange={handleChange}
              required
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
              style={styles.input}
            />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting} 
            style={styles.loginButton}
          >
            {isSubmitting ? 'Verifying...' : 'Login Now'}
          </button>
        </form>

        <div style={styles.footer}>
          <p>Forgot password? Contact your Administrator</p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f4f7fe',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    background: '#ffffff',
    padding: '40px',
    borderRadius: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
  },
  header: { textAlign: 'center', marginBottom: '30px' },
  logo: { fontSize: '40px', marginBottom: '10px' },
  title: { fontSize: '24px', fontWeight: '700', color: '#1b2559', margin: '0' },
  subtitle: { fontSize: '14px', color: '#a3aed0', marginTop: '8px' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '14px', fontWeight: '600', color: '#1b2559', marginLeft: '4px' },
  input: {
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid #e0e5f2',
    outline: 'none',
    fontSize: '15px',
    transition: '0.2s',
    '&:focus': { borderColor: '#4318ff' }
  },
  loginButton: {
    padding: '14px',
    borderRadius: '12px',
    border: 'none',
    background: '#4318ff',
    color: '#fff',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '10px',
    transition: '0.3s'
  },
  errorBox: {
    padding: '12px',
    background: '#fff5f5',
    color: '#e53e3e',
    borderRadius: '10px',
    fontSize: '13px',
    marginBottom: '20px',
    textAlign: 'center',
    border: '1px solid #feb2b2'
  },
  footer: { textAlign: 'center', marginTop: '25px', color: '#a3aed0', fontSize: '12px' }
};

export default Login;