import React, { useState, useEffect, useCallback } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { db } from '../firebase.js';
import { ref, push, set, onValue, remove } from 'firebase/database';

const CertificateGenerator = () => {
  const [view, setView] = useState('list'); 
  const [formData, setFormData] = useState({
    name: '',
    course: '',
    duration: '',
    certID: ''
  });
  
  const [pdfPreview, setPdfPreview] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch History
  useEffect(() => {
    const certsRef = ref(db, 'generated_certificates');
    const unsubscribe = onValue(certsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(id => ({ id, ...data[id] }));
        setHistory(list.reverse());
      } else {
        setHistory([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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

      const courseText = `FOR COMPLETION OF ${(data.course || '').toUpperCase()} COURSE WITH IN ${(data.duration || '').toUpperCase()}`;
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
      const certRef = ref(db, 'generated_certificates');
      await set(push(certRef), { ...formData, generatedAt: new Date().toISOString() });

      const blob = new Blob([bytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Cert_${formData.certID}.pdf`;
      link.click();
      
      // Reset form and view
      setFormData({ name: '', course: '', duration: '', certID: '' });
      setView('list');
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const reDownload = async (record) => {
    const bytes = await createPdfBytes(record);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ReIssue_${record.certID}.pdf`;
    link.click();
  };

  const deleteRecord = async (id) => {
    if (window.confirm("Are you sure you want to delete this certificate record? This cannot be undone.")) {
      try {
        await remove(ref(db, `generated_certificates/${id}`));
      } catch (error) {
        alert("Failed to delete: " + error.message);
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
    <div className="w-full min-h-screen bg-[#0f172a] p-8 text-white font-sans">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Certificate Hub 🎓</h1>
          <p className="text-slate-400 text-sm">Issue and manage student credentials.</p>
        </div>
        {view === 'list' ? (
          <button 
            onClick={() => setView('create')}
            className="bg-yellow-600 hover:bg-yellow-500 px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
          >
            <span>+</span> Create New Certificate
          </button>
        ) : (
          <button 
            onClick={() => setView('list')}
            className="text-slate-400 hover:text-white px-6 py-3 rounded-xl font-bold transition-all"
          >
            ← Back to Log
          </button>
        )}
      </div>

      {view === 'list' ? (
        <div className="bg-[#1e293b] rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
          {/* Search Bar */}
          <div className="p-4 border-b border-slate-800 bg-slate-800/30">
            <input 
              type="text" 
              placeholder="Search by student name or Certificate ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0f172a] border border-slate-700 p-3 rounded-xl outline-none focus:border-yellow-600 transition-all text-sm"
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[11px] uppercase tracking-widest text-slate-500 bg-slate-800/50">
                  <th className="p-4">ID</th>
                  <th className="p-4">Student Name</th>
                  <th className="p-4">Course</th>
                  <th className="p-4">Issue Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-mono text-yellow-600 font-bold text-sm">{item.certID}</td>
                    <td className="p-4 font-bold text-slate-200">{item.name}</td>
                    <td className="p-4 text-slate-400 text-sm">{item.course}</td>
                    <td className="p-4 text-slate-500 text-sm">{new Date(item.generatedAt).toLocaleDateString()}</td>
                    <td className="p-4 text-right space-x-2">
                      <button 
                        onClick={() => reDownload(item)}
                        className="text-[11px] bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg font-bold transition-all"
                      >
                        ⬇ DOWNLOAD
                      </button>
                      <button 
                        onClick={() => deleteRecord(item.id)}
                        className="text-[11px] bg-red-900/40 text-red-400 hover:bg-red-800 hover:text-white px-3 py-1.5 rounded-lg font-bold transition-all"
                      >
                        DELETE
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredHistory.length === 0 && (
                  <tr><td colSpan="5" className="p-20 text-center text-slate-600 font-bold">No records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-500">
          {/* Create Form */}
          <div className="flex-1 bg-[#1e293b] p-8 rounded-2xl border border-slate-800 shadow-2xl space-y-6">
            <h2 className="text-xl font-bold border-b border-slate-800 pb-4">Certificate Details</h2>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">Student Name</label>
                <input name="name" value={formData.name} onChange={handleChange} className="bg-[#0f172a] border border-slate-700 p-4 rounded-xl text-white outline-none focus:ring-2 focus:ring-yellow-600/50" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">Course</label>
                <input name="course" value={formData.course} onChange={handleChange} className="bg-[#0f172a] border border-slate-700 p-4 rounded-xl text-white outline-none focus:ring-2 focus:ring-yellow-600/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Duration</label>
                  <input name="duration" value={formData.duration} onChange={handleChange} className="bg-[#0f172a] border border-slate-700 p-4 rounded-xl text-white outline-none focus:ring-2 focus:ring-yellow-600/50" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">ID No</label>
                  <input name="certID" value={formData.certID} onChange={handleChange} className="bg-[#0f172a] border border-slate-700 p-4 rounded-xl text-white outline-none focus:ring-2 focus:ring-yellow-600/50" />
                </div>
              </div>
            </div>
            <button
              onClick={handleDownloadAndSave}
              disabled={isSaving || !formData.name}
              className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:bg-slate-700 text-white font-black py-4 rounded-xl transition-all shadow-xl shadow-yellow-900/10"
            >
              {isSaving ? 'Issuing Certificate...' : 'FINALIZE & DOWNLOAD'}
            </button>
          </div>

          {/* Preview Panel */}
          <div className="flex-1 bg-black/40 rounded-2xl border border-slate-800 p-4 h-[650px] flex items-center justify-center">
            {pdfPreview ? (
              <iframe src={`${pdfPreview}#toolbar=0&view=Fit`} title="Preview" className="w-full h-full rounded-lg" style={{ border: 'none' }} />
            ) : (
              <div className="text-slate-600 font-bold">Waiting for input...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificateGenerator;