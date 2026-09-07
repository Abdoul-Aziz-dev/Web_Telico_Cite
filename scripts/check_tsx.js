const fs = require('fs');
const path = process.argv[2] || 'src/app/(admin)/chambres/page.tsx';
const s = fs.readFileSync(path,'utf8');
console.log('File:', path);
const counts = {
  '(': 0, ')':0, '{':0, '}':0, '[':0, ']':0, '`':0,'"':0,"'":0
};
for (let i=0;i<s.length;i++){
  const c = s[i];
  if (counts.hasOwnProperty(c)) counts[c]++;
}
console.log('counts',counts);

// naive stack-based check for braces/paren/brackets ignoring strings/comments
const pairs = { '(':')','{':'}','[':']' };
const open = Object.keys(pairs);
const close = Object.values(pairs);
let stack = [];
let inSingle=false, inDouble=false, inBack=false, inLineComment=false, inBlockComment=false;
let stringStart = null;
for (let i=0;i<s.length;i++){
  const c = s[i];
  const next = s[i+1]||'';
  if (inLineComment){ if (c==='\n') inLineComment=false; continue; }
  if (inBlockComment){ if (c==='*' && next === '/') { inBlockComment=false; i++; } continue; }
  if (inSingle){ if (c==='\\') { i++; continue; } if (c==="'") { inSingle=false; stringStart=null; } continue; }
  if (inDouble){ if (c==='\\') { i++; continue; } if (c==='"') { inDouble=false; stringStart=null; } continue; }
  if (inBack){ if (c==='\\') { i++; continue; } if (c==='`') { inBack=false; stringStart=null; } continue; }
  if (c==='/' && next === '/') { inLineComment=true; i++; continue; }
  if (c==='/' && next === '*') { inBlockComment=true; i++; continue; }
  if (c==="'") { inSingle=true; stringStart=i; continue; }
  if (c==='"') { inDouble=true; stringStart=i; continue; }
  if (c==='`') { inBack=true; stringStart=i; continue; }
  if (open.includes(c)) { stack.push({ch:c, i}); continue; }
  if (close.includes(c)) {
    const expected = stack.length? pairs[stack[stack.length-1].ch]:null;
    if (expected===c) {
      stack.pop();
    } else {
      console.warn('Warning: Unmatched closing', c, 'at', i);
      // continue scanning to gather additional context instead of exiting
    }
  }
}
if (inBack) { console.warn('Warning: Unclosed backtick detected at', stringStart); console.warn('Context:', s.slice(Math.max(0,stringStart-80), Math.min(s.length,stringStart+80))); }
if (inSingle||inDouble) { console.warn('Warning: Unclosed string detected at', stringStart); console.warn('Context:', s.slice(Math.max(0,stringStart-80), Math.min(s.length,stringStart+80))); }
if (stack.length) { console.warn('Warning: Unclosed opener at', stack[stack.length-1]); }
console.log('Scan complete. Review warnings above if any.');
