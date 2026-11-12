import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Check,
  RotateCw,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Crop,
  Move
} from 'lucide-react';

const VIEWPORT_SIZE = 280; // Size of square crop viewport in pixels
const OUTPUT_SIZE = 360;   // Final output image dimensions (360x360)
const JPEG_QUALITY = 0.82; // Compression quality

const ImageCropModal = ({ isOpen, imageSrc, onClose, onCropComplete }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [baseScale, setBaseScale] = useState(1);
  const [previewUrl, setPreviewUrl] = useState('');

  const imgRef = useRef(null);
  const viewportRef = useRef(null);

  // Load natural dimensions of source image
  useEffect(() => {
    if (!imageSrc || !isOpen) return;

    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      setNaturalSize({ width: w, height: h });

      // Base scale: ensure the image covers the entire viewport square
      const scale = Math.max(VIEWPORT_SIZE / w, VIEWPORT_SIZE / h);
      setBaseScale(scale);
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [imageSrc, isOpen]);

  // Generate live circular/square thumbnail preview
  useEffect(() => {
    if (!isOpen || !naturalSize.width || !imgRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = 72;
    canvas.height = 72;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 72, 72);

    const factor = 72 / VIEWPORT_SIZE;
    ctx.save();
    ctx.translate(36, 36);
    ctx.translate(offset.x * factor, offset.y * factor);
    ctx.rotate((rotation * Math.PI) / 180);
    const scale = baseScale * zoom * factor;
    ctx.scale(scale, scale);
    ctx.drawImage(
      imgRef.current,
      -naturalSize.width / 2,
      -naturalSize.height / 2,
      naturalSize.width,
      naturalSize.height
    );
    ctx.restore();

    setPreviewUrl(canvas.toDataURL('image/jpeg', 0.8));
  }, [offset, zoom, rotation, baseScale, naturalSize, isOpen]);

  // Handle Dragging / Pan
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - offset.x,
      y: e.clientY - offset.y
    });
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch support for mobile devices
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - offset.x,
        y: e.touches[0].clientY - offset.y
      });
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    setOffset({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    setZoom((prev) => {
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      return Math.min(Math.max(1, +(prev + delta).toFixed(2)), 3.5);
    });
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  // Perform Final Crop
  const handleConfirmCrop = () => {
    if (!imgRef.current || !naturalSize.width) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas rendering context not available');
      }

      // Draw white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      // Enable high-quality smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const factor = OUTPUT_SIZE / VIEWPORT_SIZE;

      ctx.save();
      // Move origin to canvas center
      ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);

      // User translation
      ctx.translate(offset.x * factor, offset.y * factor);

      // User rotation
      ctx.rotate((rotation * Math.PI) / 180);

      // Scale
      const scale = baseScale * zoom * factor;
      ctx.scale(scale, scale);

      // Draw image centered
      ctx.drawImage(
        imgRef.current,
        -naturalSize.width / 2,
        -naturalSize.height / 2,
        naturalSize.width,
        naturalSize.height
      );

      ctx.restore();

      const base64 = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
      onCropComplete(base64);
      onClose();
    } catch (err) {
      console.error('Cropping error:', err);
    }
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Hidden preloaded image element for canvas source */}
      <img
        ref={imgRef}
        src={imageSrc}
        alt="Crop Source"
        className="hidden"
        crossOrigin="anonymous"
      />

      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Crop size={16} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Crop Square Profile Picture</h3>
              <p className="text-[11px] text-slate-400">Drag to reposition • Adjust zoom & rotation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="p-6 bg-slate-950/95 flex flex-col items-center select-none">
          <div
            ref={viewportRef}
            style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
            className="relative overflow-hidden cursor-grab active:cursor-grabbing rounded-2xl border-2 border-blue-500/80 shadow-2xl bg-black"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
          >
            {/* The Image inside centered container */}
            <div
              style={{
                position: 'absolute',
                left: VIEWPORT_SIZE / 2,
                top: VIEWPORT_SIZE / 2,
                transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${baseScale * zoom})`,
                transformOrigin: '0 0',
                width: 0,
                height: 0
              }}
            >
              <img
                src={imageSrc}
                alt="Crop Viewport"
                draggable={false}
                style={{
                  position: 'absolute',
                  left: -naturalSize.width / 2,
                  top: -naturalSize.height / 2,
                  width: naturalSize.width,
                  height: naturalSize.height,
                  maxWidth: 'none',
                  userSelect: 'none',
                  pointerEvents: 'none'
                }}
              />
            </div>

            {/* Rule of Thirds Guide Grid */}
            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
              <div className="border-r border-b border-white/25"></div>
              <div className="border-r border-b border-white/25"></div>
              <div className="border-b border-white/25"></div>
              <div className="border-r border-b border-white/25"></div>
              <div className="border-r border-b border-white/25"></div>
              <div className="border-b border-white/25"></div>
              <div className="border-r border-white/25"></div>
              <div className="border-r border-white/25"></div>
              <div></div>
            </div>

            {/* Drag helper hint */}
            <div className="absolute bottom-2 left-2 pointer-events-none bg-black/60 backdrop-blur-xs text-white/80 text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 font-medium">
              <Move size={10} /> Drag to adjust
            </div>
          </div>
        </div>

        {/* Controls & Mini Preview */}
        <div className="p-5 space-y-4 bg-white">
          {/* Zoom Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
              <span className="flex items-center gap-1"><ZoomIn size={14} className="text-blue-600" /> Zoom</span>
              <span className="font-mono text-slate-500">{zoom.toFixed(1)}x</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(2)))}
                className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
                className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
            </div>
          </div>

          {/* Tools & Preview row */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRotate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                title="Rotate 90 degrees"
              >
                <RotateCw size={13} />
                <span>Rotate</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                title="Reset position & zoom"
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            </div>

            {/* Live circular preview */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Avatar Preview</span>
              <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-blue-500 shadow-sm bg-slate-100">
                {previewUrl && (
                  <img src={previewUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmCrop}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <Check size={14} />
            <span>Crop & Apply Photo</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;

