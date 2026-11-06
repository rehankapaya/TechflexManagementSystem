import React, { useState, useEffect, useCallback } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { db } from '../firebase.js';
import { ref, push, set, onValue, remove, update } from 'firebase/database';
import toast from 'react-hot-toast';
import {
  Award,
  Plus,
  ArrowLeft,
  Search,
  Download,
  Pencil,
  Trash2,
  FileText,
  Clock,
  CheckCircle2,
  Calendar
} from 'lucide-react';

const CertificateGenerator = () => {
  const [view, setView] = useState('list');
  const [isEditing, setIsEditing] = useState(null);
  const [courses, setCourses] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    course: '',
    durationNum: '',
    durationUnit: 'Months',
    certID: ''
  });

  const [pdfPreview, setPdfPreview] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Auto-increment Cert ID
  useEffect(() => {
    if (view === 'create' && !isEditing) {
      let nextNumber = 1;

      if (history.length > 0) {
        const numericIds = history.map(item => {
          const match = item.certID?.match(/\d+$/);
          return match ? parseInt(match[0], 10) : 0;
        });
        nextNumber = Math.max(...numericIds) + 1;
      }

      const generatedID = `TF-${String(nextNumber).padStart(4, '0')}`;
      setFormData(prev => ({ ...prev, certID: generatedID }));
    }
  }, [view, isEditing, history]);

  // Fetch History & Courses
  useEffect(() => {
    const certsRef = ref(db, 'generated_certificates');
    const historyUnsub = onValue(certsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(id => ({ id, ...data[id] }));
        setHistory(list.reverse());
      } else {
        setHistory([]);
      }
    });

    const coursesRef = ref(db, 'courses');
    const coursesUnsub = onValue(coursesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(id => ({ id, ...data[id] }));
        setCourses(list);
      }
    });

    return () => {
      historyUnsub();
      coursesUnsub();
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };

      if (name === 'course' && !isEditing) {
        const selectedCourse = courses.find(c => c.name === value);
        if (selectedCourse && selectedCourse.duration !== undefined) {
          const durStr = String(selectedCourse.duration);
          if (durStr.includes(' ')) {
            const [num, unit] = durStr.split(' ');
            newData.durationNum = num || '';
            newData.durationUnit = unit || 'Months';
          } else {
            newData.durationNum = durStr;
            newData.durationUnit = 'Months';
          }
        }
      }
      return newData;
    });
  };

  const createPdfBytes = useCallback(async (data = formData) => {
    try {
      const url = '/certificate.pdf';
      const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();

      const boldFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const italicFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

      firstPage.drawText(`${data.certID || ''}`, { x: width - 265, y: height - 130, size: 18, font: boldFont, color: rgb(0.1, 0.18, 0.36) });

      const nameSize = 70;
      const nameWidth = italicFont.widthOfTextAtSize(data.name || ' ', nameSize);
      firstPage.drawText(data.name || '', { x: (width / 2) - (nameWidth / 2), y: height / 2 - 35, size: nameSize, font: italicFont, color: rgb(0.1, 0.18, 0.36) });

      const fullDuration = `${data.durationNum} ${data.durationUnit}`;
      const courseText = `FOR COMPLETION OF ${(data.course || '').toUpperCase()} COURSE WITHIN ${(fullDuration || '').toUpperCase()}`;
      const courseSize = 20;
      const courseWidth = boldFont.widthOfTextAtSize(courseText, courseSize);
      firstPage.drawText(courseText, { x: (width / 2) - (courseWidth / 2), y: height / 2 - 108, size: courseSize, font: boldFont, color: rgb(0, 0, 0) });

      return await pdfDoc.save();
    } catch (error) {
      console.error("PDF Generation failed", error);
    }
  }, [formData]);

  const handleDownloadAndSave = async () => {
    setIsSaving(true);
    try {
      const bytes = await createPdfBytes();
      const payload = {
        ...formData,
        duration: `${formData.durationNum} ${formData.durationUnit}`,
        generatedAt: new Date().toISOString()
      };

      if (isEditing) {
        await update(ref(db, `generated_certificates/${isEditing}`), payload);
        toast.success("Certificate updated successfully");
      } else {
        const certRef = ref(db, 'generated_certificates');
        await set(push(certRef), payload);
        toast.success("Certificate created successfully");
      }

      const blob = new Blob([bytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Cert_${formData.certID}.pdf`;
      link.click();

      setFormData({ name: '', course: '', durationNum: '', durationUnit: 'Months', certID: '' });
      setIsEditing(null);
      setView('list');
    } catch (error) {
      toast.error("Error: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (record) => {
    const durStr = String(record.duration || '');
    const [num, unit] = durStr.includes(' ') ? durStr.split(' ') : [durStr, 'Months'];

    setFormData({
      name: record.name,
      course: record.course,
      durationNum: num || '',
      durationUnit: unit || 'Months',
      certID: record.certID
    });
    setIsEditing(record.id);
    setView('create');
  };

  const reDownload = async (record) => {
    const [num, unit] = String(record.duration || '').split(' ');
    const dataForPdf = { ...record, durationNum: num, durationUnit: unit };
    const bytes = await createPdfBytes(dataForPdf);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ReIssue_${record.certID}.pdf`;
    link.click();
  };

  const deleteRecord = async (id) => {
    if (window.confirm("Delete this certificate record permanently?")) {
      try {
        await remove(ref(db, `generated_certificates/${id}`));
        toast.success("Certificate record deleted");
      } catch (error) {
        toast.error("Failed to delete: " + error.message);
      }
    }
  };

  useEffect(() => {
    if (view === 'create') {
      const updatePreview = async () => {
        const pdfBytes = await createPdfBytes();
        if (pdfBytes) {
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          if (pdfPreview) URL.revokeObjectURL(pdfPreview);
          setPdfPreview(URL.createObjectURL(blob));
        }
      };
      const timeoutId = setTimeout(updatePreview, 400);
      return () => clearTimeout(timeoutId);
    }
  }, [formData, createPdfBytes, view]);

  const filteredHistory = history.filter(item =>
    (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.certID || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans animate-fade-in">
      {/* HEADER */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <Award className="text-blue-600" size={24} />
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Certificate Hub</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1 font-medium">Issue, render and archive official student completion certificates</p>
        </div>

        {view === 'list' ? (
          <button
            onClick={() => {
              setIsEditing(null);
              setFormData({ name: '', course: '', durationNum: '', durationUnit: 'Months', certID: '' });
              setView('create');
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs w-fit"
          >
            <Plus size={16} />
            <span>Create New Certificate</span>
          </button>
        ) : (
          <button
            onClick={() => setView('list')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-all shadow-xs w-fit"
          >
            <ArrowLeft size={14} />
            <span>Back to Issued Log</span>
          </button>
        )}
      </header>

      {view === 'list' ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Search bar */}
          <div className="p-4 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between gap-4">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Search recipient name or Cert ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
              {filteredHistory.length} Issued
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[11px]">
                  <th className="py-3 px-4">Certificate ID</th>
                  <th className="py-3 px-4">Student Recipient</th>
                  <th className="py-3 px-4">Course Program</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600 text-xs">
                        {item.certID}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {item.name}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {item.course}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {item.duration}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => reDownload(item)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[11px] transition-colors"
                            title="Re-download PDF"
                          >
                            <Download size={12} />
                            <span>PDF</span>
                          </button>
                          <button
                            onClick={() => startEdit(item)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit Certificate"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => deleteRecord(item.id)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Record"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-slate-400 text-xs">
                      No issued certificates found in the archive.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* FORM (5 cols) */}
          <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                {isEditing ? 'Edit Certificate Details' : 'Issue Certificate'}
              </h2>
              <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                {formData.certID}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Student Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. John Doe"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Course Program
                </label>
                <select
                  name="course"
                  value={formData.course}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  <option value="">-- Select Course --</option>
                  {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Duration
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      name="durationNum"
                      value={formData.durationNum}
                      onChange={handleChange}
                      placeholder="3"
                      className="w-16 px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-medium focus:bg-white focus:outline-none"
                    />
                    <select
                      name="durationUnit"
                      value={formData.durationUnit}
                      onChange={handleChange}
                      className="flex-1 px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none"
                    >
                      <option value="Months">Months</option>
                      <option value="Years">Years</option>
                      <option value="Weeks">Weeks</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Certificate ID
                  </label>
                  <input
                    type="text"
                    name="certID"
                    value={formData.certID}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-bold text-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleDownloadAndSave}
                disabled={isSaving || !formData.name}
                className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 mt-4"
              >
                <CheckCircle2 size={16} />
                <span>
                  {isSaving ? 'Generating & Archiving...' : isEditing ? 'Update & Download PDF' : 'Finalize & Download PDF'}
                </span>
              </button>
            </div>
          </div>

          {/* PDF LIVE PREVIEW (7 cols) */}
          <div className="lg:col-span-7 bg-slate-900 rounded-2xl border border-slate-800 p-4 min-h-[500px] h-[640px] flex items-center justify-center shadow-xl">
            {pdfPreview ? (
              <iframe
                src={`${pdfPreview}#toolbar=0&view=Fit`}
                title="Certificate Live Preview"
                className="w-full h-full rounded-xl"
                style={{ border: 'none' }}
              />
            ) : (
              <div className="text-slate-500 text-xs font-medium flex items-center gap-2">
                <FileText size={18} />
                <span>Generating live PDF preview...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificateGenerator;
