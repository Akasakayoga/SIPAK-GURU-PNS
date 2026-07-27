const fs = require('fs');
const path = require('path');

function oklchToRgb(l, c, h, a = 1) {
  const hRad = (h * Math.PI) / 180;
  const a_lab = c * Math.cos(hRad);
  const b_lab = c * Math.sin(hRad);
  
  const l_lms = l + 0.3963377774 * a_lab + 0.2158037573 * b_lab;
  const m_lms = l - 0.1055613458 * a_lab - 0.0638541728 * b_lab;
  const s_lms = l - 0.0894841775 * a_lab - 1.2914855480 * b_lab;
  
  const l_lms3 = l_lms * l_lms * l_lms;
  const m_lms3 = m_lms * m_lms * m_lms;
  const s_lms3 = s_lms * s_lms * s_lms;
  
  const r_lin = +4.0767416621 * l_lms3 - 3.3077115913 * m_lms3 + 0.2309699292 * s_lms3;
  const g_lin = -1.2684380046 * l_lms3 + 2.6097574011 * m_lms3 - 0.3413193965 * s_lms3;
  const b_lin = -0.0041960863 * l_lms3 - 0.7034186147 * m_lms3 + 1.7076147010 * s_lms3;
  
  const toSRGB = (c_lin) => {
    if (c_lin <= 0.0031308) {
      return Math.max(0, 12.92 * c_lin);
    }
    return Math.pow(Math.max(0, c_lin), 1 / 2.4) * 1.055 - 0.055;
  };
  
  const r = Math.min(255, Math.max(0, Math.round(toSRGB(r_lin) * 255)));
  const g = Math.min(255, Math.max(0, Math.round(toSRGB(g_lin) * 255)));
  const b = Math.min(255, Math.max(0, Math.round(toSRGB(b_lin) * 255)));
  
  if (a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

function replaceOklchInString(cssText) {
  if (!cssText || typeof cssText !== 'string') return cssText;
  let result = cssText;

  // 1. Remove all @supports blocks containing modern color spaces that html2canvas cannot parse
  result = result.replace(/@supports\s*\(\s*color\s*:\s*(?:color-mix|oklch|oklab|lch|lab|light-dark)[^)]*\)\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/gi, '');

  // 2. Remove color space keywords from gradients and color-mix
  result = result.replace(/\bin\s+(?:oklch|oklab|lch|lab|srgb|srgb-linear|hwb|xyz|xyz-d50|xyz-d65)\b/gi, '');

  // 3. Balanced parenthesis replacer for color functions
  const colorFunctions = ['color-mix', 'light-dark', 'oklch', 'oklab', 'lch', 'lab', 'hwb', 'color'];
  
  for (const funcName of colorFunctions) {
    let searchIndex = 0;
    const lowerFuncName = funcName.toLowerCase();
    
    while (true) {
      const lowerStr = result.toLowerCase();
      const idx = lowerStr.indexOf(lowerFuncName + '(', searchIndex);
      if (idx === -1) break;
      
      let depth = 0;
      let endIdx = -1;
      const startIdx = idx + funcName.length + 1;
      for (let i = idx + funcName.length; i < result.length; i++) {
        if (result[i] === '(') depth++;
        else if (result[i] === ')') {
          depth--;
          if (depth === 0) {
            endIdx = i;
            break;
          }
        }
      }
      
      if (endIdx !== -1) {
        const innerContent = result.substring(startIdx, endIdx);
        let replacement = '#808080';
        
        if (lowerFuncName === 'oklch') {
          try {
            const cleanedText = innerContent.replace(/\//g, ' / ');
            const parts = cleanedText.trim().split(/[\s,]+/).filter(p => p !== '/' && p !== '');
            if (parts.length >= 3) {
              const lVal = parts[0];
              const cVal = parts[1];
              const hVal = parts[2];
              const aVal = parts[3] || '1';
              
              let l = lVal.endsWith('%') ? parseFloat(lVal) / 100 : parseFloat(lVal);
              let c = cVal.endsWith('%') ? (parseFloat(cVal) / 100) * 0.4 : parseFloat(cVal);
              let h = 0;
              if (hVal.toLowerCase().endsWith('deg')) h = parseFloat(hVal);
              else if (hVal.toLowerCase().endsWith('rad')) h = (parseFloat(hVal) * 180) / Math.PI;
              else if (hVal.toLowerCase().endsWith('turn')) h = parseFloat(hVal) * 360;
              else if (hVal.endsWith('%')) h = (parseFloat(hVal) / 100) * 360;
              else h = parseFloat(hVal);
              
              let a = aVal.endsWith('%') ? parseFloat(aVal) / 100 : parseFloat(aVal);
              if (!isNaN(l) && !isNaN(c) && !isNaN(h)) {
                l = Math.min(1, Math.max(0, l));
                c = Math.min(1, Math.max(0, c));
                a = isNaN(a) ? 1 : Math.min(1, Math.max(0, a));
                replacement = oklchToRgb(l, c, h, a);
              }
            }
          } catch (e) {
            replacement = '#808080';
          }
        }
        
        result = result.substring(0, idx) + replacement + result.substring(endIdx + 1);
        searchIndex = idx + replacement.length;
      } else {
        break;
      }
    }
  }

  result = result.replace(/oklch\s*\([^;}]*/gi, '#808080');
  result = result.replace(/oklab\s*\([^;}]*/gi, '#808080');
  result = result.replace(/lch\s*\([^;}]*/gi, '#808080');
  result = result.replace(/lab\s*\([^;}]*/gi, '#808080');
  result = result.replace(/color-mix\s*\([^;}]*/gi, '#808080');

  return result;
}

function sanitizeDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      sanitizeDirectory(fullPath);
    } else if (file.endsWith('.css')) {
      console.log(`[Sanitize CSS] Processing: ${fullPath}`);
      const content = fs.readFileSync(fullPath, 'utf8');
      const sanitized = replaceOklchInString(content);
      fs.writeFileSync(fullPath, sanitized, 'utf8');
      console.log(`[Sanitize CSS] Saved sanitized CSS (${sanitized.length} bytes).`);
    }
  }
}

const assetsDir = path.join(__dirname, '..', 'dist', 'assets');
if (fs.existsSync(assetsDir)) {
  sanitizeDirectory(assetsDir);
  console.log('[Sanitize CSS] Build CSS sanitization complete.');
} else {
  console.log('[Sanitize CSS] Directory not found:', assetsDir);
}
