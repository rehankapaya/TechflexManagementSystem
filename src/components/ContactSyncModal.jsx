import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  Download,
  X,
  ShieldCheck,
  Zap,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getContactSyncConfig,
  saveContactSyncConfig,
  testWebhookConnection,
  syncStudentToGoogleContacts,
  downloadVCardFile,
  GOOGLE_APPS_SCRIPT_CODE,
  DEFAULT_SECRET_TOKEN
} from '../services/contactSyncService';

const ContactSyncModal = ({ isOpen, onClose, students = [] }) => {
  const [config, setConfig] = useState({
    enabled: true,
    webhook_url: '',
    secret_key: DEFAULT_SECRET_TOKEN,
    auto_sync_on_enroll: true
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showScript, setShowScript] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    if (isOpen) {
      getContactSyncConfig().then(cfg => {
        if (cfg) setConfig(cfg);
      });
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      await saveContactSyncConfig(config);
      toast.success('Contact sync settings saved!');
    } catch (err) {
      toast.error('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!config.webhook_url) {
      toast.error('Please enter your Google Apps Script Webhook URL first');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testWebhookConnection(config.webhook_url, config.secret_key);
      setTestResult({
        success: true,
        message: 'Test successful! Test contact "STU-000 Test Student TECHFLEX" sent to Google Contacts.'
      });
      toast.success('Connection confirmed! Check your Google Contacts / Phone in 10s.');
    } catch (err) {
      setTestResult({
        success: false,
        message: err.message || 'Connection test failed. Verify Webhook URL and permissions.'
      });
      toast.error('Test failed: ' + err.message);
    } finally {
      setTesting(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    toast.success('Google Apps Script copied to clipboard!');
  };

  const handleSyncAllStudents = async (onlyActive = false) => {
    if (!config.webhook_url) {
      toast.error('Please configure and save your Google Apps Script Webhook URL first');
      return;
    }

    const studentsToSync = onlyActive
      ? students.filter(s => s.status !== 'inactive')
      : students;

    if (studentsToSync.length === 0) {
      toast.error('No students available to sync');
      return;
    }

    const confirmSync = window.confirm(
      `Sync all ${studentsToSync.length} students ${onlyActive ? '(Active only)' : '(ALL records from the start)'} to your Google Contacts in format "STU-XXX Name TECHFLEX"?`
    );
    if (!confirmSync) return;

    setSyncingAll(true);
    setSyncProgress({ current: 0, total: studentsToSync.length });

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < studentsToSync.length; i++) {
      const student = studentsToSync[i];
      setSyncProgress({ current: i + 1, total: studentsToSync.length });
      try {
        const res = await syncStudentToGoogleContacts(student, config);
        if (res?.success) {
          successCount++;
        } else {
          failedCount++;
          console.warn('Sync warning for student:', student.student_id, res?.message);
        }
      } catch (e) {
        failedCount++;
        console.error('Failed to sync student:', student.student_id, e);
      }
      // Small 150ms delay between requests to be gentle on Google API
      await new Promise(res => setTimeout(res, 150));
    }

    setSyncingAll(false);
    toast.success(`Successfully sent ${successCount} contacts to Google Contacts!${failedCount > 0 ? ` (${failedCount} skipped)` : ''}`);
  };

  const handleExportVCard = (onlyActive = false) => {
    const studentsToExport = onlyActive
      ? students.filter(s => s.status !== 'inactive')
      : students;

    if (studentsToExport.length === 0) {
      toast.error('No students to export');
      return;
    }
    const label = onlyActive ? 'Active' : 'All_From_Start';
    downloadVCardFile(studentsToExport, `Techflex_Students_${label}_${new Date().toISOString().split('T')[0]}.vcf`);
    toast.success(`Downloaded ${studentsToExport.length} contacts (.vcf)`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl space-y-6 p-6">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-xs">
              <Smartphone size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Mobile & WhatsApp Contact Sync
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                  100% Free
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically saves newly added students into your phone contacts & WhatsApp as{' '}
                <span className="font-mono font-bold text-slate-800">STU-012 Name TECHFLEX</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Naming Format Banner */}
        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
            <span className="text-slate-600 font-medium">Standard Phone Contact Format:</span>
          </div>
          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60">
            STU-012 Name TECHFLEX
          </span>
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                Google Apps Script Webhook URL
              </label>
              {config.webhook_url ? (
                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 size={13} /> URL Configured
                </span>
              ) : (
                <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
                  <AlertCircle size={13} /> Not Connected
                </span>
              )}
            </div>
            <input
              type="url"
              placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
              value={config.webhook_url}
              onChange={(e) => setConfig({ ...config, webhook_url: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              The Web app URL from your Google Apps Script project deployed under your phone's Google account.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Security Secret Key
              </label>
              <input
                type="text"
                value={config.secret_key}
                onChange={(e) => setConfig({ ...config, secret_key: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
              <div>
                <div className="text-xs font-bold text-slate-800">Auto-Sync on Enroll</div>
                <div className="text-[10px] text-slate-500">Sync contact immediately when added</div>
              </div>
              <input
                type="checkbox"
                checked={config.auto_sync_on_enroll}
                onChange={(e) => setConfig({ ...config, auto_sync_on_enroll: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Test Connection Button & Status */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !config.webhook_url}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all disabled:opacity-50"
            >
              <Zap size={14} className={testing ? "animate-spin" : ""} />
              <span>{testing ? "Sending Test Contact..." : "Test Sync to Phone (STU-000)"}</span>
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
            >
              <CheckCircle2 size={14} />
              <span>{saving ? "Saving Settings..." : "Save Configuration"}</span>
            </button>
          </div>

          {/* Test Result Message */}
          {testResult && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span className="font-medium">{testResult.message}</span>
            </div>
          )}
        </form>

        {/* Bulk Sync & Export Actions */}
        <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Sync Student Database to Phone
              </h3>
              <p className="text-[11px] text-slate-500">
                Total records: <strong className="text-slate-800">{students.length} students from the start</strong> ({students.filter(s => s.status !== 'inactive').length} active, {students.filter(s => s.status === 'inactive').length} graduated/inactive)
              </p>
            </div>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md self-start sm:self-auto flex items-center gap-1">
              ☁️ Cloud Synced
            </span>
          </div>

          {syncingAll && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-blue-800">
                <span>Syncing contacts to Google & Phone...</span>
                <span>{syncProgress.current} / {syncProgress.total}</span>
              </div>
              <div className="w-full bg-blue-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-200"
                  style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleSyncAllStudents(false)}
              disabled={syncingAll || !config.webhook_url}
              className="flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
              title="Sync ALL students from start (active, completed & inactive)"
            >
              <RefreshCw size={14} className={syncingAll ? "animate-spin" : ""} />
              <span>{syncingAll ? `Syncing (${syncProgress.current}/${syncProgress.total})...` : `Sync ALL Students (${students.length} from start)`}</span>
            </button>
            <button
              type="button"
              onClick={() => handleExportVCard(false)}
              className="flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs"
              title="Download entire phonebook as .vcf file"
            >
              <Download size={14} />
              <span>Download All .vcf ({students.length})</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px] text-slate-500">
            <span>Or sync active only:</span>
            <div className="space-x-3">
              <button
                type="button"
                onClick={() => handleSyncAllStudents(true)}
                disabled={syncingAll || !config.webhook_url}
                className="text-blue-600 hover:underline font-bold disabled:opacity-50"
              >
                Sync Active Only ({students.filter(s => s.status !== 'inactive').length})
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => handleExportVCard(true)}
                className="text-slate-600 hover:underline font-medium"
              >
                Download Active .vcf
              </button>
            </div>
          </div>
        </div>

        {/* 3-Minute Setup Instructions Collapsible */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowScript(!showScript)}
            className="w-full p-4 flex items-center justify-between text-left bg-slate-50/80 hover:bg-slate-100/80 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Info size={16} className="text-blue-600" />
              <span className="text-xs font-bold text-slate-800">
                Setup Guide & Google Apps Script Code (3-Minute Setup)
              </span>
            </div>
            {showScript ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </button>

          {showScript && (
            <div className="p-4 border-t border-slate-200 space-y-4 text-xs text-slate-600 bg-white">
              <ol className="list-decimal pl-5 space-y-2 leading-relaxed">
                <li>
                  Open{' '}
                  <a
                    href="https://script.google.com/home/start"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 font-bold hover:underline inline-flex items-center gap-0.5"
                  >
                    script.google.com <ExternalLink size={11} />
                  </a>{' '}
                  using the <strong>same Gmail account</strong> logged into your Android phone or iPhone.
                </li>
                <li>Click <strong>+ New project</strong> (or open your project), delete existing code and paste the updated script below.</li>
                <li className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-amber-900 font-medium">
                  <strong>CRITICAL REQUIRED STEP:</strong> On the left sidebar, click the <strong>+</strong> icon next to <strong>Services</strong>, select <strong>People API</strong>, and click <strong>Add</strong>.
                </li>
                <li>
                  In the top toolbar, select <strong>authorizeAndTest</strong> from the dropdown and click <strong>Run</strong>. Click <em>Review permissions &gt; Advanced &gt; Go to project &gt; Allow</em>. (A test contact will be created in your Google Contacts immediately!)
                </li>
                <li>
                  Click <strong>Deploy &gt; Manage deployments</strong>. Click the pencil icon (edit) &gt; select Version: <strong>New version</strong> &gt; click <strong>Deploy</strong>. (Or click <em>Deploy &gt; New deployment &gt; Web app &gt; Execute as: Me &gt; Who has access: Anyone</em>).
                </li>
                <li>Copy the <strong>Web app URL</strong>, paste it into the field above, and click <strong>Save Configuration</strong>!</li>
              </ol>

              <div className="relative">
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48">
                  {GOOGLE_APPS_SCRIPT_CODE}
                </pre>
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-bold backdrop-blur-xs transition-colors"
                >
                  <Copy size={12} />
                  <span>Copy Script</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactSyncModal;

