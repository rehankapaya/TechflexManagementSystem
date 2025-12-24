import React, { useState } from 'react';
import { auth, db } from '../firebase.js'; 
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, set } from 'firebase/database';

const CreateUser = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'teacher'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [error, setError] = useState(null); // Added missing error state

  const roles = [
    { value: 'admin', label: 'Admin', icon: '👑' },
    { value: 'teacher', label: 'Teacher', icon: '📚' },
    { value: 'feescashier', label: 'Fees Cashier', icon: '💰' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: name === "email" ? value.toLowerCase() : value
    }));
    // Clear error when user starts typing
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
      console.error("Signup Error:", err);
      setIsSubmitting(false);
      if (err.code === 'auth/email-already-in-use') setError("This email is already registered.");
      else if (err.code === 'auth/weak-password') setError("Password should be at least 6 characters.");
      else if (err.code === 'auth/invalid-email') setError("Please enter a valid email address.");
      else setError("Failed to create user. Please try again.");
    }
  };

  const getPasswordStrength = () => {
    const { password } = formData;
    if (password.length === 0) return { strength: 0, label: '', color: '#E5E7EB' };
    if (password.length < 6) return { strength: 25, label: 'Weak', color: '#EF4444' };
    if (password.length < 8) return { strength: 50, label: 'Fair', color: '#F59E0B' };
    if (password.length < 12) return { strength: 75, label: 'Good', color: '#3B82F6' };
    return { strength: 100, label: 'Strong', color: '#10B981' };
  };

  const passwordStrength = getPasswordStrength();

  const getInputWrapperStyle = (fieldName) => ({
    ...styles.inputWrapper,
    borderColor: focusedField === fieldName ? '#667eea' : '#E5E7EB',
    backgroundColor: focusedField === fieldName ? '#fff' : '#F9FAFB',
    boxShadow: focusedField === fieldName ? '0 0 0 4px rgba(102, 126, 234, 0.1)' : 'none'
  });

  // Get selected role info for display
  const getSelectedRole = () => {
    return roles.find(r => r.value === formData.role) || roles[1];
  };

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
            <span style={styles.headerIcon}>✨</span>
          </div>
          <h1 style={styles.title}>Create New User</h1>
          <p style={styles.subtitle}>Add a new team member to your organization</p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={styles.errorContainer}>
            <span style={styles.errorIcon}>⚠️</span>
            <span style={styles.errorText}>{error}</span>
          </div>
        )}

        {/* Success State */}
        {isSuccess ? (
          <div style={styles.successContainer}>
            <div style={styles.successIcon}>✓</div>
            <h2 style={styles.successTitle}>User Created!</h2>
            <p style={styles.successText}>The new user has been added successfully</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            {/* Name Field */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                <span style={styles.labelIcon}>👤</span>
                Full Name
              </label>
              <div style={getInputWrapperStyle('name')}>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter full name"
                  required
                  style={styles.input}
                />
              </div>
            </div>

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
                  value={formData.email}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="user@example.com"
                  required
                  style={styles.input}
                />
              </div>
            </div>

            {/* Password Field */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                <span style={styles.labelIcon}>🔐</span>
                Password
              </label>
              <div style={getInputWrapperStyle('password')}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Create a strong password"
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
              {/* Password Strength Indicator */}
              {formData.password && (
                <div style={styles.strengthContainer}>
                  <div style={styles.strengthBar}>
                    <div style={{
                      ...styles.strengthFill,
                      width: `${passwordStrength.strength}%`,
                      backgroundColor: passwordStrength.color
                    }}></div>
                  </div>
                  <span style={{ ...styles.strengthLabel, color: passwordStrength.color }}>
                    {passwordStrength.label}
                  </span>
                </div>
              )}
            </div>

            {/* Role Selection - Using Select Dropdown */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                <span style={styles.labelIcon}>🎭</span>
                Select Role
              </label>
              <div style={getInputWrapperStyle('role')}>
                <div style={styles.selectContainer}>
                  <span style={styles.selectIcon}>{getSelectedRole().icon}</span>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('role')}
                    onBlur={() => setFocusedField(null)}
                    style={styles.select}
                  >
                    {roles.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.icon} {role.label}
                      </option>
                    ))}
                  </select>
                  <span style={styles.selectArrow}>▼</span>
                </div>
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
                  <span>Creating User...</span>
                </div>
              ) : (
                <div style={styles.buttonContent}>
                  <span>Create User</span>
                  <span style={styles.buttonArrow}>→</span>
                </div>
              )}
            </button>
          </form>
        )}
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
        @keyframes successPop {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
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
    maxWidth: '480px',
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
    width: '70px',
    height: '70px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    boxShadow: '0 10px 30px -10px rgba(102, 126, 234, 0.5)'
  },
  headerIcon: {
    fontSize: '32px'
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
    marginBottom: '20px',
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
  strengthContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '4px'
  },
  strengthBar: {
    flex: 1,
    height: '4px',
    background: '#E5E7EB',
    borderRadius: '2px',
    overflow: 'hidden'
  },
  strengthFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'all 0.3s ease'
  },
  strengthLabel: {
    fontSize: '12px',
    fontWeight: '600',
    minWidth: '50px'
  },
  // Select dropdown styles
  selectContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  selectIcon: {
    position: 'absolute',
    left: '16px',
    fontSize: '20px',
    pointerEvents: 'none',
    zIndex: 1
  },
  select: {
    width: '100%',
    padding: '14px 40px 14px 48px',
    fontSize: '15px',
    border: 'none',
    background: 'transparent',
    outline: 'none',
    color: '#1F2937',
    boxSizing: 'border-box',
    cursor: 'pointer',
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none'
  },
  selectArrow: {
    position: 'absolute',
    right: '16px',
    fontSize: '12px',
    color: '#6B7280',
    pointerEvents: 'none'
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
    transition: 'transform 0.3s ease',
    fontSize: '18px'
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
  successContainer: {
    textAlign: 'center',
    padding: '40px 20px',
    animation: 'successPop 0.5s ease-out'
  },
  successIcon: {
    width: '80px',
    height: '80px',
    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
    fontSize: '40px',
    color: '#fff',
    fontWeight: 'bold'
  },
  successTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1F2937',
    margin: '0 0 8px'
  },
  successText: {
    fontSize: '14px',
    color: '#6B7280',
    margin: 0
  }
};

export default CreateUser;