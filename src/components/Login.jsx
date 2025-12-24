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
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(null);
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

  // Helper function to get input wrapper styles
  const getInputWrapperStyle = (fieldName) => ({
    ...styles.inputWrapper,
    borderColor: focusedField === fieldName ? '#667eea' : '#E5E7EB',
    backgroundColor: focusedField === fieldName ? '#fff' : '#F9FAFB',
    boxShadow: focusedField === fieldName ? '0 0 0 4px rgba(102, 126, 234, 0.1)' : 'none'
  });

  return (
    <div style={styles.wrapper}>
      {/* Animated background shapes */}
      <div style={styles.bgShape1}></div>
      <div style={styles.bgShape2}></div>
      <div style={styles.bgShape3}></div>

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.iconContainer}>
            <span style={styles.headerIcon}>🔐</span>
          </div>
          <h1 style={styles.title}>Welcome Back</h1>
          <p style={styles.subtitle}>Enter your credentials to access your account</p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={styles.errorContainer}>
            <span style={styles.errorIcon}>⚠️</span>
            <span style={styles.errorText}>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={styles.form}>
          {/* Email Field */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              <span style={styles.labelIcon}>📧</span>
              Email Address
            </label>
            <div style={getInputWrapperStyle('email')}>
              <input
                type="email"
                name="email"
                placeholder="admin@school.com"
                value={formData.email}
                onChange={handleChange}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                required
                style={styles.input}
              />
            </div>
          </div>

          {/* Password Field */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              <span style={styles.labelIcon}>🔑</span>
              Password
            </label>
            <div style={getInputWrapperStyle('password')}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                required
                style={{ ...styles.input, paddingRight: '50px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={isSubmitting} 
            style={{
              ...styles.button,
              opacity: isSubmitting ? 0.8 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting ? (
              <div style={styles.buttonContent}>
                <div style={styles.spinner}></div>
                <span>Verifying...</span>
              </div>
            ) : (
              <div style={styles.buttonContent}>
                <span>Login Now</span>
                <span style={styles.buttonArrow}>→</span>
              </div>
            )}
          </button>
        </form>

        {/* Footer */}
        <div style={styles.footer}>
          <div style={styles.footerIcon}>💡</div>
          <p style={styles.footerText}>Forgot password? Contact your Administrator</p>
        </div>

        {/* Security Badge */}
        <div style={styles.securityBadge}>
          <span style={styles.securityIcon}>🔒</span>
          <span style={styles.securityText}>Secured with encryption</span>
        </div>
      </div>

      <style>{`
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(30px, -30px) rotate(180deg); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(-20px, 20px) rotate(-180deg); }
        }
        @keyframes float3 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(15px, -15px); }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
};

const styles = {
  wrapper: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  },
  bgShape1: {
    position: 'absolute',
    width: '300px',
    height: '300px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '50%',
    top: '-100px',
    right: '-100px',
    animation: 'float1 8s ease-in-out infinite'
  },
  bgShape2: {
    position: 'absolute',
    width: '200px',
    height: '200px',
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
    bottom: '-50px',
    left: '-50px',
    animation: 'float2 10s ease-in-out infinite'
  },
  bgShape3: {
    position: 'absolute',
    width: '150px',
    height: '150px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '50%',
    top: '50%',
    left: '10%',
    animation: 'float3 6s ease-in-out infinite'
  },
  container: {
    width: '100%',
    maxWidth: '440px',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '24px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    padding: '40px',
    position: 'relative',
    zIndex: 1
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px'
  },
  iconContainer: {
    width: '80px',
    height: '80px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
    boxShadow: '0 15px 35px -10px rgba(102, 126, 234, 0.5)'
  },
  headerIcon: {
    fontSize: '36px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1F2937',
    margin: '0 0 8px'
  },
  subtitle: {
    fontSize: '14px',
    color: '#6B7280',
    margin: 0
  },
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 16px',
    backgroundColor: '#FEF2F2',
    borderRadius: '12px',
    marginBottom: '24px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#FECACA',
    animation: 'shake 0.5s ease-in-out'
  },
  errorIcon: {
    fontSize: '18px'
  },
  errorText: {
    fontSize: '14px',
    color: '#DC2626',
    fontWeight: '500'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  labelIcon: {
    fontSize: '16px'
  },
  inputWrapper: {
    position: 'relative',
    borderRadius: '12px',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    transition: 'all 0.3s ease'
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    fontSize: '15px',
    border: 'none',
    background: 'transparent',
    outline: 'none',
    color: '#1F2937',
    boxSizing: 'border-box'
  },
  eyeButton: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px'
  },
  button: {
    padding: '16px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 10px 30px -10px rgba(102, 126, 234, 0.5)',
    marginTop: '8px'
  },
  buttonContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  buttonArrow: {
    fontSize: '18px',
    transition: 'transform 0.3s ease'
  },
  spinner: {
    width: '20px',
    height: '20px',
    borderWidth: '3px',
    borderStyle: 'solid',
    borderColor: 'rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '28px',
    padding: '16px',
    backgroundColor: '#F3F4F6',
    borderRadius: '12px'
  },
  footerIcon: {
    fontSize: '16px'
  },
  footerText: {
    fontSize: '13px',
    color: '#6B7280',
    margin: 0
  },
  securityBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    marginTop: '20px'
  },
  securityIcon: {
    fontSize: '14px'
  },
  securityText: {
    fontSize: '12px',
    color: '#059669',
    fontWeight: '500'
  }
};

export default Login;