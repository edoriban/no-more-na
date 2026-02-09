/**
 * Color replacement utilities for No More NA extension.
 * Detects and replaces guinda/marrón colors with Mexican greens and red accents.
 */

// Lookup map keyed by "r,g,b" for O(1) RGB matching
const COLOR_RGB_MAP = new Map([
  ['155,34,71',  { replaceR: 0, replaceG: 135, replaceB: 62 }],   // #9B2247 → #00873E
  ['97,18,50',   { replaceR: 0, replaceG: 104, replaceB: 71 }],   // #611232 → #006847
  ['78,14,40',   { replaceR: 0, replaceG: 92,  replaceB: 58 }],   // #4E0E28 → #005c3a
  ['58,11,30',   { replaceR: 0, replaceG: 77,  replaceB: 52 }],   // #3A0B1E → #004d34
  ['58,11,31',   { replaceR: 0, replaceG: 77,  replaceB: 52 }]    // #3A0B1F → #004d34
]);

// Lookup map for hex → hex replacement
const COLOR_HEX_MAP = {
  '#9b2247': '#00873e',
  '#611232': '#006847',
  '#4e0e28': '#005c3a',
  '#3a0b1e': '#004d34',
  '#3a0b1f': '#004d34'
};

// Pre-compiled regexes — only used with .replace(), never .test()/.exec()

// Hex patterns for all target colors (case-insensitive)
const HEX_REGEX = /#(?:9b2247|611232|4e0e28|3a0b1[ef])\b/gi;

// rgb()/rgba() with comma syntax: rgb(97, 18, 50) or rgba(97, 18, 50, 0.5)
const RGB_COMMA_REGEX = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([^)]+))?\s*\)/gi;

// Modern CSS syntax: rgb(97 18 50) or rgb(97 18 50 / 0.5)
const RGB_SPACE_REGEX = /rgba?\(\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})(?:\s*\/\s*([^)]+))?\s*\)/gi;

function hexForRGB(r, g, b) {
  return COLOR_RGB_MAP.get(`${r},${g},${b}`) || null;
}

function replaceHex(match) {
  return COLOR_HEX_MAP[match.toLowerCase()] || match;
}

function replaceRGBComma(match, r, g, b, alpha) {
  const entry = hexForRGB(parseInt(r, 10), parseInt(g, 10), parseInt(b, 10));
  if (!entry) return match;
  if (alpha !== undefined) {
    return `rgba(${entry.replaceR}, ${entry.replaceG}, ${entry.replaceB}, ${alpha})`;
  }
  return `rgb(${entry.replaceR}, ${entry.replaceG}, ${entry.replaceB})`;
}

function replaceRGBSpace(match, r, g, b, alpha) {
  const entry = hexForRGB(parseInt(r, 10), parseInt(g, 10), parseInt(b, 10));
  if (!entry) return match;
  if (alpha !== undefined) {
    return `rgb(${entry.replaceR} ${entry.replaceG} ${entry.replaceB} / ${alpha})`;
  }
  return `rgb(${entry.replaceR} ${entry.replaceG} ${entry.replaceB})`;
}

/**
 * Replace target colors in a single CSS value string.
 * @param {string} value
 * @returns {string}
 */
function replaceColorInValue(value) {
  if (!value) return value;

  let result = value;
  result = result.replace(HEX_REGEX, replaceHex);
  result = result.replace(RGB_COMMA_REGEX, replaceRGBComma);
  result = result.replace(RGB_SPACE_REGEX, replaceRGBSpace);
  return result;
}

/**
 * Replace target colors in a full CSS text block.
 * @param {string} cssText
 * @returns {string}
 */
function replaceColorsInCSSText(cssText) {
  if (!cssText) return cssText;
  return replaceColorInValue(cssText);
}

// Quick check: does a string potentially contain target colors?
// Uses hex substring detection first (most reliable), then rgb() context-aware checks.
const QUICK_HEX_REGEX = /9b2247|611232|4e0e28|3a0b1[ef]/i;
// Matches rgb/rgba calls containing any of the specific target RGB triplets
const QUICK_RGB_REGEX = /rgba?\(\s*(?:155\s*[,\s]\s*34\s*[,\s]\s*71|97\s*[,\s]\s*18\s*[,\s]\s*50|78\s*[,\s]\s*14\s*[,\s]\s*40|58\s*[,\s]\s*11\s*[,\s]\s*3[01])\b/i;

function mayContainTargetColor(str) {
  if (!str) return false;
  if (QUICK_HEX_REGEX.test(str)) return true;
  if (QUICK_RGB_REGEX.test(str)) return true;
  return false;
}
