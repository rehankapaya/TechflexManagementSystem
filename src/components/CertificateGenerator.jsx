import React, { useState, useEffect, useCallback } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const CertificateGenerator = () => {
  const [formData, setFormData] = useState({
    name: 'Student Name',
    course: 'Graphic Designing',
    duration: '1 Month',
    certID: 'TF-GD-B219'
  });
  const [pdfPreview, setPdfPreview] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const createPdfBytes = useCallback(async () => {
    try {
      const url = '/certificate.pdf'; 
      const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize(); // A4: ~841 x 595 

      const boldFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const italicFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

      // --- DYNAMIC ALIGNMENT ---
      // Certificate ID [cite: 1]
      firstPage.drawText(`${formData.certID}`, {
        x: width - 265, 
        y: height - 130, 
        size: 18,
        font: boldFont,
        color: rgb(0.1, 0.18, 0.36),
      });

      // Centered Student Name [cite: 5]
      const nameSize = 60;
      const nameWidth = italicFont.widthOfTextAtSize(formData.name, nameSize);
      firstPage.drawText(formData.name, {
        x: (width / 2) - (nameWidth / 2),
        y: height / 2 - 35, 
        size: nameSize,
        font: italicFont,
        color: rgb(0.1, 0.18, 0.36),
      });

      // Centered Course & Duration [cite: 6]
      const courseText = `FOR COMPLETION OF ${formData.course.toUpperCase()} COURSE WITH IN ${formData.duration.toUpperCase()}`;
      const courseSize = 20;
      const courseWidth = boldFont.widthOfTextAtSize(courseText, courseSize);
      firstPage.drawText(courseText, {
        x: (width / 2) - (courseWidth / 2),
        y: height / 2 - 108,
        size: courseSize,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      return await pdfDoc.save();
    } catch (error) {
      console.error("PDF Generation failed", error);
    }
  }, [formData]);

  useEffect(() => {
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
  }, [formData, createPdfBytes]);

 return (
  <div className="flex  w-full bg-[#0f172a] overflow-hidden">
    
    {/* Sidebar: Fixed Width */}
    <aside className="w-80 bg-[#1e293b] p-6 flex flex-col border-r border-slate-700 shadow-2xl z-10">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-yellow-500 italic leading-none">TECHFLEX</h1>
        <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] mt-1">Management System</p>
      </div>

      <div className="space-y-5 flex-1 overflow-y-auto pr-2">
        <div className="group">
          <label className="text-[11px] font-bold text-slate-500 uppercase mb-1 block group-focus-within:text-yellow-500 transition-colors">Student Name</label>
          <input name="name" value={formData.name} onChange={handleChange} className="w-full bg-[#0f172a] border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-yellow-500 transition-all" />
        </div>

        <div className="group">
          <label className="text-[11px] font-bold text-slate-500 uppercase mb-1 block group-focus-within:text-yellow-500 transition-colors">Course</label>
          <input name="course" value={formData.course} onChange={handleChange} className="w-full bg-[#0f172a] border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-yellow-500 transition-all" />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-1 block">Duration</label>
            <input name="duration" value={formData.duration} onChange={handleChange} className="w-full bg-[#0f172a] border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-yellow-500" />
          </div>
          <div className="flex-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-1 block">ID No</label>
            <input name="certID" value={formData.certID} onChange={handleChange} className="w-full bg-[#0f172a] border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-yellow-500" />
          </div>
        </div>
      </div>

      <button 
        onClick={async () => {
          const bytes = await createPdfBytes();
          const blob = new Blob([bytes], { type: 'application/pdf' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `Certificate_${formData.name}.pdf`;
          link.click();
        }}
        className="mt-6 w-full bg-yellow-600 hover:bg-yellow-500 text-white font-black py-4 rounded-xl transition-all shadow-lg active:scale-95"
      >
        DOWNLOAD PDF
      </button>
    </aside>

    {/* Updated Preview Area: Filling the remaining space */}
    <main className="flex-1  bg-[#0f172a] relative flex items-center justify-center p-4">
      {pdfPreview ? (
        <iframe 
          src={`${pdfPreview}#toolbar=0&navpanes=0&view=Fit`} 
          className="w-full  rounded-lg shadow-2xl"
          style={{ border: 'none',width:"842px",height:'595px' }}
          title="Full Screen Preview"
        />
      ) : (
        <div className="text-slate-500 font-bold animate-pulse">
          Generating Certificate...
        </div>
      )}
    </main>

  </div>
);
};

export default CertificateGenerator;