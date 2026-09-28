const Tesseract = require('tesseract.js');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Downloads a file from URL and saves to temp directory
 */
const downloadFile = async (fileUrl) => {
  const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
  const ext = path.extname(new URL(fileUrl).pathname) || '.png';
  const tempPath = path.join(os.tmpdir(), `ocr_${Date.now()}${ext}`);
  fs.writeFileSync(tempPath, response.data);
  return tempPath;
};

/**
 * Process a document image/PDF with Tesseract OCR
 * @param {string} fileUrl - Cloudinary URL of the document
 * @returns {{ extractedText: string, confidenceScore: number }}
 */
const processDocument = async (fileUrl) => {
  let tempPath = null;
  try {
    // Download file from Cloudinary
    tempPath = await downloadFile(fileUrl);
    
    const ext = path.extname(tempPath).toLowerCase();
    
    // For PDFs, convert first page to image using Cloudinary transformation
    let imageUrl = fileUrl;
    if (ext === '.pdf') {
      // Cloudinary can serve PDF pages as images by appending .png
      imageUrl = fileUrl.replace(/\.pdf$/i, '.png');
      // Re-download the image version
      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      tempPath = await downloadFile(imageUrl);
    }
    
    // Run Tesseract OCR
    const result = await Tesseract.recognize(tempPath, 'eng', {
      logger: () => {}, // Suppress progress logs
    });
    
    const extractedText = result.data.text || '';
    const confidenceScore = result.data.confidence || 0;
    
    return { extractedText, confidenceScore };
  } catch (error) {
    console.error('OCR processing error:', error.message);
    return { extractedText: '', confidenceScore: 0, error: error.message };
  } finally {
    // Cleanup temp file
    if (tempPath && fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch (e) { /* ignore */ }
    }
  }
};

module.exports = { processDocument };
