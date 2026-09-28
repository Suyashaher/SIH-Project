const stringSimilarity = require('string-similarity');

const SIMILARITY_THRESHOLD = 0.80; // 80% similarity

/**
 * Compare extracted fields from OCR against application's submitted form values.
 * @param {Object} extractedFields - { name: "John Doe", income: "200000" }
 * @param {Array} applicationFieldValues - [{ field: { fieldLabel }, value }]
 * @returns {Object} matchResult - Per-field comparison result
 */
const compareFields = (extractedFields, applicationFieldValues) => {
  const matchResult = {};

  if (!extractedFields || Object.keys(extractedFields).length === 0) {
    return matchResult;
  }

  // Build a lookup from field labels/names (lowercased) to their values
  const appFieldMap = {};
  for (const fv of applicationFieldValues) {
    if (fv.field && fv.value) {
      const label = fv.field.fieldLabel.toLowerCase().trim();
      appFieldMap[label] = fv.value;
      // Also try common short names
      if (label.includes('name')) appFieldMap['name'] = fv.value;
      if (label.includes('income')) appFieldMap['income'] = fv.value;
      if (label.includes('course')) appFieldMap['course'] = fv.value;
      if (label.includes('university')) appFieldMap['university'] = fv.value;
      if (label.includes('marks') || label.includes('percentage')) appFieldMap['marks'] = fv.value;
    }
  }

  for (const [fieldName, extractedValue] of Object.entries(extractedFields)) {
    const expectedValue = appFieldMap[fieldName.toLowerCase()];

    if (!expectedValue) {
      // No matching application field found \u2014 skip, don't flag
      matchResult[fieldName] = {
        match: null,
        note: 'No corresponding application field found',
        found: extractedValue,
      };
      continue;
    }

    // Normalize for comparison
    const normalizedExtracted = extractedValue.toLowerCase().replace(/[^a-z0-9\s.]/g, '').trim();
    const normalizedExpected = expectedValue.toLowerCase().replace(/[^a-z0-9\s.]/g, '').trim();

    // Check for numeric comparison (income, marks)
    const numExtracted = parseFloat(normalizedExtracted.replace(/,/g, ''));
    const numExpected = parseFloat(normalizedExpected.replace(/,/g, ''));

    if (!isNaN(numExtracted) && !isNaN(numExpected)) {
      // Numeric comparison \u2014 allow 5% tolerance
      const tolerance = numExpected * 0.05;
      const isMatch = Math.abs(numExtracted - numExpected) <= tolerance;
      matchResult[fieldName] = {
        match: isMatch,
        expected: expectedValue,
        found: extractedValue,
        similarityScore: isMatch ? 1.0 : 0.0,
      };
    } else {
      // String comparison using fuzzy matching
      const similarity = stringSimilarity.compareTwoStrings(normalizedExtracted, normalizedExpected);
      matchResult[fieldName] = {
        match: similarity >= SIMILARITY_THRESHOLD,
        expected: expectedValue,
        found: extractedValue,
        similarityScore: parseFloat(similarity.toFixed(3)),
      };
    }
  }

  return matchResult;
};

module.exports = { compareFields };
