import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
  Users,
  Loader2,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ref, push, set } from 'firebase/database';
import { db } from '../firebase';
import {
  downloadCoachingStudentSample,
  parseCoachingStudentUpload
} from '../utils/bulkUpload';

const CoachingBulkUploadModal = ({
  isOpen,
  onClose,
  existingStudents = [],
  onSuccess
}) => {
  const [file, setFile] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState(null); // { validRows, invalidRows, totalRows }
  const [isImporting, setIsImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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
      const result = await parseCoachingStudentUpload(selectedFile, existingStudents);
      setParsedData(result);
      if (result.validRows.length === 0) {
        toast.error('No valid student entries found in the file. Please check required columns.');
      } else {
        toast.success(`Parsed ${result.validRows.length} student(s) ready for import!`);
      }
    } catch (err) {
      console.error('File parsing error:', err);
      toast.error(err.message || 'Failed to read file. Please verify it is a valid Excel or CSV file.');
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmImport = async () => {
    if (!parsedData || parsedData.validRows.length === 0) return;

    setIsImporting(true);
    try {
      const timestamp = new Date().toISOString();
      let importedCount = 0;

      for (const row of parsedData.validRows) {
        const studentPayload = {
          roll_no: row.roll_no,
          name: row.name,
          contact: row.contact || '',
          contact_number: row.contact_number || '',
          secondary_contact: row.secondary_contact || '',
          guardian_contact: row.guardian_contact || '',
          gender: row.gender || 'Male',
          grade: row.grade,
          field: row.field || '',
          class_type: 'Regular',
          timeslot: '',
          timing: '',
          admission_fee: Number(row.admission_fee) || 0,
          monthly_fee: Number(row.monthly_fee) || 0,
          joined_date: row.joined_date || timestamp.split('T')[0],
          status: row.status || 'active',
          profile_image: '',
          photo: '',
          createdAt: timestamp
        };

        const newStudentRef = push(ref(db, 'coaching_students'));
        await set(newStudentRef, studentPayload);
        importedCount++;
      }

      toast.success(`Successfully enrolled ${importedCount} coaching student(s)!`);
      if (onSuccess) onSuccess();
      handleClear();
      onClose();
    } catch (err) {
      console.error('Bulk import error:', err);
      toast.error('Failed to import students: ' + (err.message || 'Database error'));
    } finally {
      setIsImporting(false);
    }
  };

  const filteredPreview = (parsedData?.validRows || []).filter(row => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      (row.name && row.name.toLowerCase().includes(q)) ||
      (row.roll_no && row.roll_no.toLowerCase().includes(q)) ||
      (row.grade && row.grade.toLowerCase().includes(q)) ||
      (row.field && row.field.toLowerCase().includes(q)) ||
      (row.contact && row.contact.includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                  Bulk Upload Coaching Students
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                  Excel / CSV
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Import multiple student records with auto-sequential roll numbers (TFC-00X)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadCoachingStudentSample}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Download Excel sample with column headers and instructions"
            >
              <Download size={13} className="text-emerald-600" />
              <span className="hidden sm:inline">Download Template</span>
              <span className="sm:hidden">Template</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isImporting}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* TEMPLATE PROMPT BANNER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <FileText size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950">
                  Need the Excel format for coaching student entries?
                </h4>
                <p className="text-[11px] text-emerald-800/80 mt-0.5">
                  Includes sample student rows, valid classes (Playgroup – A-Levels), and groups (Commerce, Science, etc.).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={downloadCoachingStudentSample}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            >
              <Download size={13} />
              <span>Download Excel Template</span>
            </button>
          </div>

          {/* UPLOAD DROPZONE */}
          {!parsedData && (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="p-8 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-3xl bg-slate-50/50 hover:bg-emerald-50/30 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFileSelect(e.target.files?.[0])}
                accept=".xlsx, .xls, .csv"
                className="hidden"
              />

              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 group-hover:border-emerald-300 flex items-center justify-center text-slate-400 group-hover:text-emerald-600 shadow-sm transition-all mb-3">
                {isParsing ? (
                  <Loader2 size={24} className="animate-spin text-emerald-600" />
                ) : (
                  <Upload size={24} />
                )}
              </div>

              <h4 className="text-sm font-bold text-slate-900 mb-1">
                {isParsing ? 'Parsing spreadsheet data...' : 'Click or drag and drop your spreadsheet here'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm">
                Supports Excel (<span className="font-mono font-semibold text-slate-700">.xlsx</span>, <span className="font-mono font-semibold text-slate-700">.xls</span>) or CSV (<span className="font-mono font-semibold text-slate-700">.csv</span>) files.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/60 px-3 py-1 rounded-full">
                Leave Roll Number blank in file to auto-assign sequential TFC-00X
              </span>
            </div>
          )}

          {/* PARSED DATA PREVIEW */}
          {parsedData && (
            <div className="space-y-4 animate-in fade-in">
              
              {/* FILE & STATS SUMMARY BAR */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileSpreadsheet className="text-emerald-600 shrink-0" size={18} />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 block truncate">
                      {file?.name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {(file?.size ? (file.size / 1024).toFixed(1) : 0)} KB • {parsedData.totalRows} row(s) processed
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 size={12} />
                    <span>{parsedData.validRows.length} Valid</span>
                  </span>
                  {parsedData.invalidRows.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      <AlertTriangle size={12} />
                      <span>{parsedData.invalidRows.length} Skipped</span>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors"
                    title="Clear and choose a different file"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* WARNING BOX FOR SKIPPED ROWS */}
              {parsedData.invalidRows.length > 0 && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-amber-600" />
                    <span>{parsedData.invalidRows.length} row(s) could not be parsed:</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-amber-800 max-h-24 overflow-y-auto pl-1">
                    {parsedData.invalidRows.map((inv, idx) => (
                      <li key={idx}>
                        Row {inv.rowNumber}: {inv.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* SEARCH & PREVIEW TABLE */}
              {parsedData.validRows.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <Users size={14} className="text-emerald-600" />
                      <span>Students Ready for Enrollment ({parsedData.validRows.length})</span>
                    </div>

                    <div className="relative w-48 sm:w-64">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                      <input
                        type="text"
                        placeholder="Filter preview list..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white max-h-64 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 sticky top-0 z-10">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Roll No</th>
                          <th className="py-2.5 px-3">Full Name</th>
                          <th className="py-2.5 px-3">Class / Grade</th>
                          <th className="py-2.5 px-3">Field / Group</th>
                          <th className="py-2.5 px-3 text-right">Monthly Fee</th>
                          <th className="py-2.5 px-3">Contact</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                        {filteredPreview.map((st, i) => (
                          <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2 px-3 text-[11px] text-slate-400 font-mono">
                              {i + 1}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-emerald-700 text-xs">
                              {st.roll_no}
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-900">
                              {st.name}
                            </td>
                            <td className="py-2 px-3 text-xs">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-semibold border border-slate-200 text-[10px]">
                                {st.grade}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-xs">
                              {st.field ? (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200 text-[10px]">
                                  {st.field}
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                              PKR {Number(st.monthly_fee || 0).toLocaleString()}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-600 text-[11px]">
                              {st.contact || <span className="text-slate-300">—</span>}
                            </td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800">
                                {st.status || 'active'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 font-bold text-xs transition-all cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {parsedData && (
              <button
                type="button"
                onClick={handleClear}
                disabled={isImporting}
                className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-xs transition-all cursor-pointer"
              >
                Change File
              </button>
            )}

            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={isImporting || !parsedData || parsedData.validRows.length === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Importing Students...</span>
                </>
              ) : (
                <>
                  <Upload size={14} />
                  <span>
                    Confirm & Enroll {parsedData?.validRows?.length ? `(${parsedData.validRows.length})` : ''}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CoachingBulkUploadModal;
