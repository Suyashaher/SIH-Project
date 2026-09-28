/**
 * Document type to regex pattern mapping.
 * Each entry maps a documentType keyword to an array of { fieldName, patterns } objects.
 * patterns are arrays of RegExp that try to capture the field value.
 */
const documentPatterns = {
  'ST Certificate': [
    {
      fieldName: 'name',
      patterns: [
        /(?:name|certified that|certify that)\s*[:\-]?\s*(?:Sri\.?|Smt\.?|Mr\.?|Mrs\.?|Ms\.?)?\s*([A-Z][a-zA-Z\s.]{2,40})/i,
        /(?:Shri|Smt|Mr|Mrs|Ms)\.?\s+([A-Z][a-zA-Z\s.]{2,40})/i,
      ],
    },
    {
      fieldName: 'certificateNumber',
      patterns: [
        /(?:certificate|cert)\.?\s*(?:no|number|#)\s*[:\-]?\s*([A-Z0-9\-\/]{3,20})/i,
        /(?:no|number|#)\s*[:\-]?\s*([A-Z]{1,3}[\-\/]?\d{3,10})/i,
      ],
    },
    {
      fieldName: 'category',
      patterns: [
        /(?:belongs? to|category|caste|tribe)\s*[:\-]?\s*(?:the\s+)?([A-Za-z\s]{2,30})\s*(?:tribe|caste|community|category)/i,
        /(?:Scheduled Tribe|Scheduled Caste|ST|SC|OBC)/i,
      ],
    },
    {
      fieldName: 'issueDate',
      patterns: [
        /(?:date|dated|issued on)\s*[:\-]?\s*(\d{1,2}[\-\/.]\d{1,2}[\-\/.]\d{2,4})/i,
        /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i,
      ],
    },
  ],
  'Income Certificate': [
    {
      fieldName: 'name',
      patterns: [
        /(?:name|certified that|certify that)\s*[:\-]?\s*(?:Sri\.?|Smt\.?|Mr\.?|Mrs\.?|Ms\.?)?\s*([A-Z][a-zA-Z\s.]{2,40})/i,
        /(?:Shri|Smt|Mr|Mrs|Ms)\.?\s+([A-Z][a-zA-Z\s.]{2,40})/i,
      ],
    },
    {
      fieldName: 'income',
      patterns: [
        /(?:annual|yearly|total)\s*(?:family\s*)?(?:income)\s*[:\-]?\s*(?:Rs\.?|INR|\u20B9)?\s*([\d,]+)/i,
        /(?:income)\s*[:\-]?\s*(?:Rs\.?|INR|\u20B9)?\s*([\d,]+)/i,
        /(?:Rs\.?|INR|\u20B9)\s*([\d,]+(?:\.\d{2})?)/i,
      ],
    },
    {
      fieldName: 'issueDate',
      patterns: [
        /(?:date|dated|issued on)\s*[:\-]?\s*(\d{1,2}[\-\/.]\d{1,2}[\-\/.]\d{2,4})/i,
        /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i,
      ],
    },
  ],
  'Admission Letter': [
    {
      fieldName: 'name',
      patterns: [
        /(?:name|dear|admitted|student)\s*[:\-]?\s*(?:Sri\.?|Smt\.?|Mr\.?|Mrs\.?|Ms\.?)?\s*([A-Z][a-zA-Z\s.]{2,40})/i,
      ],
    },
    {
      fieldName: 'university',
      patterns: [
        /(?:university|institute|college)\s*(?:of)?\s*[:\-]?\s*([A-Z][a-zA-Z\s,]{3,60})/i,
      ],
    },
    {
      fieldName: 'course',
      patterns: [
        /(?:course|programme|program|degree)\s*[:\-]?\s*([A-Za-z.\s]{2,40})/i,
        /(?:M\.?A\.?|B\.?A\.?|M\.?Sc|B\.?Sc|Ph\.?D|M\.?Tech|B\.?Tech|MBA|MCA)/i,
      ],
    },
  ],
  'Marksheet': [
    {
      fieldName: 'name',
      patterns: [
        /(?:name|student)\s*[:\-]?\s*([A-Z][a-zA-Z\s.]{2,40})/i,
      ],
    },
    {
      fieldName: 'marks',
      patterns: [
        /(?:percentage|percent|%)\s*[:\-]?\s*(\d{1,3}(?:\.\d{1,2})?)/i,
        /(?:total|aggregate|overall)\s*[:\-]?\s*(\d{1,3}(?:\.\d{1,2})?)/i,
        /(\d{2,3}\.?\d{0,2})\s*%/i,
      ],
    },
  ],
  // Generic fallback
  'default': [
    {
      fieldName: 'name',
      patterns: [
        /(?:name)\s*[:\-]?\s*([A-Z][a-zA-Z\s.]{2,40})/i,
      ],
    },
    {
      fieldName: 'date',
      patterns: [
        /(?:date|dated)\s*[:\-]?\s*(\d{1,2}[\-\/.]\d{1,2}[\-\/.]\d{2,4})/i,
      ],
    },
  ],
};

/**
 * Extract structured fields from OCR text based on document type.
 * @param {string} extractedText - Raw OCR text
 * @param {string} documentType - Type of document (e.g., "ST Certificate")
 * @returns {Object} - Key-value pairs of extracted fields
 */
const extractFields = (extractedText, documentType) => {
  if (!extractedText || extractedText.trim().length === 0) {
    return {};
  }

  // Find matching patterns - try exact match first, then partial match, then default
  let patterns = documentPatterns[documentType];
  if (!patterns) {
    // Try partial match
    const key = Object.keys(documentPatterns).find(
      k => documentType.toLowerCase().includes(k.toLowerCase()) ||
           k.toLowerCase().includes(documentType.toLowerCase())
    );
    patterns = key ? documentPatterns[key] : documentPatterns['default'];
  }

  const extracted = {};

  for (const { fieldName, patterns: regexList } of patterns) {
    for (const regex of regexList) {
      const match = extractedText.match(regex);
      if (match) {
        // Use first capturing group if available, otherwise full match
        let value = (match[1] || match[0]).trim();
        // Clean up common OCR artifacts
        value = value.replace(/\s+/g, ' ').replace(/[|\\]/g, '').trim();
        if (value.length > 0) {
          extracted[fieldName] = value;
          break; // Found a match, move to next field
        }
      }
    }
  }

  return extracted;
};

module.exports = { extractFields, documentPatterns };
