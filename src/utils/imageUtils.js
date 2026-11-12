/**
 * Utility functions for handling student profile image uploads and Base64 compression.
 * Resizes and center-crops images to a square JPEG format before saving to Firebase Realtime Database,
 * keeping string sizes lightweight (~25KB-45KB) while maintaining high visual clarity.
 */

/**
 * Resizes and crops an image file to a square Base64 JPEG data URL.
 * @param {File} file - The image file from input[type="file"]
 * @param {number} size - Output width & height in pixels (default: 360px)
 * @param {number} quality - JPEG quality from 0.1 to 1.0 (default: 0.82)
 * @returns {Promise<string>} Base64 data URL string (e.g. "data:image/jpeg;base64,...")
 */
export const processProfileImage = (file, size = 360, quality = 0.82) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No file provided'));
    }

    if (!file.type.startsWith('image/')) {
      return reject(new Error('Please select a valid image file (JPG, PNG, WEBP, etc.)'));
    }

    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read image file'));

    reader.onload = (e) => {
      const img = new Image();

      img.onerror = () => reject(new Error('Failed to load image'));

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            return reject(new Error('Canvas context not available'));
          }

          // Center-crop calculation (fill square)
          const srcWidth = img.naturalWidth || img.width;
          const srcHeight = img.naturalHeight || img.height;

          let cropX = 0;
          let cropY = 0;
          let cropWidth = srcWidth;
          let cropHeight = srcHeight;

          if (srcWidth > srcHeight) {
            cropWidth = srcHeight;
            cropX = (srcWidth - srcHeight) / 2;
          } else if (srcHeight > srcWidth) {
            cropHeight = srcWidth;
            cropY = (srcHeight - srcWidth) / 2;
          }

          // Draw white background in case source has transparency (e.g. PNG)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, size, size);

          // Enable high-quality image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          ctx.drawImage(
            img,
            cropX,
            cropY,
            cropWidth,
            cropHeight,
            0,
            0,
            size,
            size
          );

          const base64 = canvas.toDataURL('image/jpeg', quality);
          resolve(base64);
        } catch (err) {
          reject(err);
        }
      };

      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  });
};

