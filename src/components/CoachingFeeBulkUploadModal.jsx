import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Search,
  Loader2,
  CreditCard,
  Trash2,
  RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ref, update } from 'firebase/database';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  downloadCoachingFeeSample,
  parseCoachingFeeUpload
} from '../utils/bulkUpload';

const CoachingFeeBulkUploadModal = ({
  isOpen,
  onClose,
  existingStudents = [],
  onSuccess
}) => {
  const { currentUser } = useAuth();
  const [file, setFile] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState(null); // { validRows, invalidRows, totalRows }
  const [isImporting, setIsImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'valid' | 'invalid'
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileSelect = async (selectedFile) => {
    if (!selectedFile) return;

    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const hasValidExt = validExtensions.some(ext => selectedFile.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      toast.error('Please upload an Excel file (.xlsx, .xls) or CSV file (.csv)');
      return;
    }

    setFile(selectedFile);
    setIsParsing(true);
    setParsedData(null);

    try {
      const result = await parseCoachingFeeUpload(selectedFile, existingStudents);
      setParsedData(result);
      if (result.validRows.length === 0) {
        toast.error('No valid fee entries found. Please verify student roll numbers and columns.');
        setActiveTab('invalid');
      } else {
        toast.success(`Found ${result.validRows.length} valid fee record(s) ready to import!`);
        setActiveTab('all');
      }
    } catch (err) {
      console.error('Fee parsing error:', err);
      toast.error(err.message || 'Failed to read file. Please ensure it is a valid Excel or CSV sheet.');
      setFile(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleClear = () => {
    setFile(null);
    setParsedData(null);
    setSearchTerm('');
    setActiveTab('all');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmImport = async () => {
    if (!parsedData || parsedData.validRows.length === 0) return;

    setIsImporting(true);
    try {
      const updates = {};
      const nowIso = new Date().toISOString();
      const adminName = currentUser?.displayName || currentUser?.name || 'Admin Bulk Upload';

      for (const row of parsedData.validRows) {
        const payload = {
          id: row.month_key,
          studentId: row.studentId,
          studentName: row.studentName,
          rollNo: row.rollNo,
          grade: row.grade,
          month: row.month,
          year: row.year,
          month_key: row.month_key,
          payable: Number(row.payable) || 0,
          paid: Number(row.paid) || 0,
          waived: Number(row.waived) || 0,
          balance: Number(row.balance) || 0,
          pay_date: row.pay_date,
          payment_method: row.payment_method === 'Online' ? 'Online' : 'Cash',
          serial_no: row.serial_no || '',
          note: row.note ? `${row.note} (Bulk Imported)` : 'Bulk Imported',
          collectedBy: adminName,
          timestamp: nowIso,
          record_added_date: nowIso
        };

        updates[`coaching_fees/${row.studentId}/${row.month_key}`] = payload;
      }

      if (Object.keys(updates).length > 0) {
        await update(ref(db), updates);
        toast.success(`Successfully imported ${parsedData.validRows.length} coaching fee records!`);
        if (onSuccess) onSuccess();
        handleClose();
      }
    } catch (err) {
      console.error('Coaching fee bulk upload error:', err);
      toast.error(err.message || 'Failed to save fee records to database');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    handleClear();
    onClose();
  };

  // Filter preview list
  const displayRows = () => {
    if (!parsedData) return [];
    let list = [];
    if (activeTab === 'all') {
      list = [
        ...parsedData.validRows.map(r => ({ ...r, isValid: true })),
        ...parsedData.invalidRows.map(r => ({ ...r, isValid: false }))
      ];
    } else if (activeTab === 'valid') {
      list = parsedData.validRows.map(r => ({ ...r, isValid: true }));
    } else {
      list = parsedData.invalidRows.map(r => ({ ...r, isValid: false }));
    }

    if (!searchTerm) return list;
    const q = searchTerm.toLowerCase();
    return list.filter(r =>
      (r.studentName && r.studentName.toLowerCase().includes(q)) ||
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.rollNo && r.rollNo.toLowerCase().includes(q)) ||
      (r.roll_no && r.roll_no.toLowerCase().includes(q)) ||
      (r.month && r.month.toLowerCase().includes(q)) ||
      (r.grade && r.grade.toLowerCase().includes(q)) ||
      (r.serial_no && String(r.serial_no).toLowerCase().includes(q))
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl flex flex-col max-h-[92vh] my-auto overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* MODAL HEADER */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Bulk Upload Coaching Fees
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                  Excel / CSV
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Batch import monthly coaching fee collections for multiple students at once
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadCoachingFeeSample}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Download Excel sample with sample fee entries"
            >
              <Download size={14} className="text-emerald-600" />
              <span>Download Template</span>
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Mobile Download Template Link */}
          <div className="sm:hidden flex justify-end">
            <button
              type="button"
              onClick={downloadCoachingFeeSample}
              className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl"
            >
              <Download size={14} />
              <span>Download Sample Excel</span>
            </button>
          </div>

          {/* UPLOAD / DROPZONE */}
          {!parsedData && (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 sm:p-10 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                file
                  ? 'border-emerald-400 bg-emerald-50/30'
                  : 'border-slate-300 hover:border-emerald-500 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={(e) => handleFileSelect(e.target.files[0])}
                className="hidden"
              />

              {isParsing ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={36} className="text-emerald-600 animate-spin" />
                  <p className="text-sm font-bold text-slate-700">Analyzing coaching fee sheet...</p>
                  <p className="text-xs text-slate-400">Validating roll numbers and amounts</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 max-w-sm">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shadow-inner">
                    <Upload size={26} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Click to choose or drag & drop fee spreadsheet
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Supports Excel (<span className="font-mono text-emerald-700">.xlsx</span>, <span className="font-mono text-emerald-700">.xls</span>) or <span className="font-mono text-emerald-700">.csv</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-2 text-[11px] text-slate-500 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Matched by Roll Number (TFC-001) or Student Name</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PARSED SUMMARY AND PREVIEW */}
          {parsedData && (
            <div className="space-y-4">
              {/* METRIC CHIPS & ACTIONS */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-mono font-bold text-slate-700 shadow-2xs">
                    File: <span className="text-slate-900">{file?.name}</span>
                  </div>

                  <div className="px-3 py-1.5 rounded-xl bg-emerald-100/70 border border-emerald-300 text-xs font-mono font-bold text-emerald-800 shadow-2xs flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-700" />
                    <span>{parsedData.validRows.length} Ready to Import</span>
                  </div>

                  {parsedData.invalidRows.length > 0 && (
                    <div className="px-3 py-1.5 rounded-xl bg-rose-100/70 border border-rose-300 text-xs font-mono font-bold text-rose-800 shadow-2xs flex items-center gap-1.5">
                      <AlertTriangle size={14} className="text-rose-700" />
                      <span>{parsedData.invalidRows.length} Skipped / Issues</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleClear}
                  className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Choose Another File</span>
                </button>
              </div>

              {/* SEARCH & FILTER TABS */}
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      activeTab === 'all'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    All Entries ({parsedData.totalRows})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('valid')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      activeTab === 'valid'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Valid Only ({parsedData.validRows.length})
                  </button>
                  {parsedData.invalidRows.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('invalid')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        activeTab === 'invalid'
                          ? 'bg-white text-rose-700 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Issues ({parsedData.invalidRows.length})
                    </button>
                  )}
                </div>

                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    placeholder="Search in preview..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* PREVIEW TABLE */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-xs">
                <div className="overflow-x-auto max-h-[46vh]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Row</th>
                        <th className="py-2.5 px-3">Roll No</th>
                        <th className="py-2.5 px-3">Student Name</th>
                        <th className="py-2.5 px-3">Class / Grade</th>
                        <th className="py-2.5 px-3">Period</th>
                        <th className="py-2.5 px-3 text-center">Method</th>
                        <th className="py-2.5 px-3 text-right">Payable</th>
                        <th className="py-2.5 px-3 text-right">Paid</th>
                        <th className="py-2.5 px-3 text-right">Waived</th>
                        <th className="py-2.5 px-3 text-right">Balance</th>
                        <th className="py-2.5 px-3">Pay Date</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {displayRows().map((row, idx) => (
                        <tr
                          key={`row_${idx}`}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            !row.isValid ? 'bg-rose-50/40' : ''
                          }`}
                        >
                          <td className="py-2 px-3 text-[11px] font-mono text-slate-400">
                            #{row.rowNumber}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-emerald-800 whitespace-nowrap">
                            {row.rollNo || row.roll_no || '—'}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-900 whitespace-nowrap">
                            {row.studentName || row.name || '—'}
                          </td>
                          <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                            {row.grade || '—'}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                            {row.month} {row.year}
                          </td>
                          <td className="py-2 px-3 text-center whitespace-nowrap">
                            {row.payment_method === 'Online' ? (
                              <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                Online
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                Cash
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                            {row.payable !== undefined ? `PKR ${Number(row.payable).toLocaleString()}` : '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                            {row.paid !== undefined ? `PKR ${Number(row.paid).toLocaleString()}` : '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-400 whitespace-nowrap">
                            {row.waived > 0 ? `PKR ${Number(row.waived).toLocaleString()}` : '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-black whitespace-nowrap">
                            {row.balance !== undefined ? (
                              row.balance > 0 ? (
                                <span className="text-rose-600">PKR {Number(row.balance).toLocaleString()}</span>
                              ) : (
                                <span className="text-emerald-700">Cleared</span>
                              )
                            ) : '—'}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {row.pay_date || '—'}
                          </td>
                          <td className="py-2 px-3 text-center whitespace-nowrap">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 size={11} />
                                <span>Valid</span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 max-w-[160px] truncate"
                                title={row.errorReason}
                              >
                                <AlertTriangle size={11} className="shrink-0" />
                                <span className="truncate">{row.errorReason || 'Invalid Entry'}</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
          <div className="text-xs text-slate-500 font-medium">
            {parsedData && (
              <span>
                Ready to commit: <strong className="text-emerald-700 font-bold">{parsedData.validRows.length}</strong> records
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isImporting}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>

            {parsedData && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isImporting || parsedData.validRows.length === 0}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isImporting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Importing Fees...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Confirm & Import ({parsedData.validRows.length} Fees)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoachingFeeBulkUploadModal;
