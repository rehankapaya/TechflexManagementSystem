import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase.js';
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { ref, set, onValue, remove, update } from 'firebase/database';
import toast from 'react-hot-toast';
import {
  UserPlus,
  Users,
  Crown,
  BookOpen,
  Wallet,
  Key,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  Mail,
  Lock,
  UserCheck
} from 'lucide-react';

const CreateUser = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'teacher'
  });
  const [users, setUsers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState(null);

  const roles = [
    { value: 'admin', label: 'Admin', icon: Crown, color: 'text-purple-600 bg-purple-50 border-purple-200' },
    { value: 'teacher', label: 'Teacher', icon: BookOpen, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { value: 'feescashier', label: 'Cashier', icon: Wallet, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' }
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
      email: user.email
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
    <div className="space-y-6 font-sans animate-fade-in">
      {/* HEADER */}
      <header className="pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-2">
          <UserPlus className="text-blue-600" size={24} />
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Staff & User Management</h1>
        </div>
        <p className="text-sm text-slate-500 mt-1 font-medium">Provision user credentials, configure system roles and manage login access</p>
      </header>

      {/* TWO COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* REGISTER USER FORM (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <h2 className="text-base font-bold text-slate-900 tracking-tight pb-3 border-b border-slate-100 flex items-center gap-2">
            <UserPlus size={18} className="text-blue-600" />
            <span>Register New User</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. John Doe"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@institute.com"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                Temporary Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                Assign System Role
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {roles.map(r => {
                  const Icon = r.icon;
                  const isSelected = formData.role === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, role: r.value })}
                      className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 text-blue-700 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <Icon size={18} className={isSelected ? 'text-blue-600' : 'text-slate-400'} />
                      <span className="text-xs font-bold">{r.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <CheckCircle2 size={16} />
              <span>{isSubmitting ? "Provisioning..." : "Create User Account"}</span>
            </button>
          </form>
        </div>

        {/* ACTIVE USERS DIRECTORY (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Registered Team Accounts ({users.length})</span>
            <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
              Active Directory
            </span>
          </div>

          <div className="p-4 space-y-2.5 max-h-[600px] overflow-y-auto">
            {users.length > 0 ? (
              users.map((user) => {
                let roleColor = "bg-blue-50 text-blue-700 border-blue-200";
                if (user.role === 'admin') roleColor = "bg-purple-50 text-purple-700 border-purple-200";
                if (user.role === 'feescashier') roleColor = "bg-emerald-50 text-emerald-700 border-emerald-200";

                return (
                  <div
                    key={user.uid}
                    className="p-3.5 rounded-xl border border-slate-100 bg-white hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {user.name?.charAt(0) || 'U'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 truncate">{user.name}</h4>
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border uppercase tracking-wider ${roleColor}`}>
                            {user.role}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono truncate">{user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleResetPassword(user.email)}
                        className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                        title="Send Password Reset Email"
                      >
                        <Key size={14} />
                      </button>
                      <button
                        onClick={() => handleEditUser(user)}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit User Role"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.uid, user.name)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete User"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs">
                No user accounts found in the directory.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* EDIT USER MODAL */}
      {showEditModal && editFormData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Edit User Profile</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Email (Read-Only)
                </label>
                <input
                  type="text"
                  value={editFormData.email}
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-xs font-mono text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Role
                </label>
                <select
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold"
                >
                  <option value="admin">Administrator</option>
                  <option value="teacher">Teacher</option>
                  <option value="feescashier">Cashier</option>
                </select>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateUser;
