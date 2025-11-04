(function(){
  const qs = (s, el=document) => el.querySelector(s);
  const $ = (id) => document.getElementById(id);
  const statusEl = $('status');
  const ratioEl = $('ratio');
  const inputEl = $('input');
  const outputEl = $('output');
  const fileInput = $('file-input');
  const dropZone = $('drop-zone');
  const toasts = $('toasts');

  function showToast(message, type = 'success'){
    if(!toasts) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const icon = document.createElement('span');
    icon.className = 'icon';
    icon.textContent = type === 'success' ? '✅' : '⚠️';
    const text = document.createElement('span');
    text.textContent = message;
    el.appendChild(icon);
    el.appendChild(text);
    toasts.appendChild(el);
    const ttl = 2200;
    setTimeout(()=>{
      el.style.animation = 'toast-out .18s ease forwards';
      el.addEventListener('animationend', ()=> el.remove(), {once:true});
    }, ttl);
  }

  const defaultOptions = {
    compact: true,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    stringArray: true,
    stringArrayThreshold: 0.75,
    rotateStringArray: true,
    simplify: true,
    numbersToExpressions: false,
    renameGlobals: false,
    identifierNamesGenerator: 'hexadecimal',
    splitStrings: false,
    splitStringsChunkLength: 10,
    unicodeEscapeSequence: false,
    target: 'browser'
  };

  const optionMap = [
    ['opt-compact', 'compact', 'checkbox'],
    ['opt-controlFlowFlattening', 'controlFlowFlattening', 'checkbox'],
    ['opt-deadCodeInjection', 'deadCodeInjection', 'checkbox'],
    ['opt-stringArray', 'stringArray', 'checkbox'],
    ['opt-stringArrayThreshold', 'stringArrayThreshold', 'number'],
    ['opt-rotateStringArray', 'rotateStringArray', 'checkbox'],
    ['opt-simplify', 'simplify', 'checkbox'],
    ['opt-numbersToExpressions', 'numbersToExpressions', 'checkbox'],
    ['opt-renameGlobals', 'renameGlobals', 'checkbox'],
    ['opt-identifierNamesGenerator', 'identifierNamesGenerator', 'select'],
    ['opt-splitStrings', 'splitStrings', 'checkbox'],
    ['opt-splitStringsChunkLength', 'splitStringsChunkLength', 'number'],
    ['opt-unicodeEscapeSequence', 'unicodeEscapeSequence', 'checkbox'],
    ['opt-target', 'target', 'select']
  ];

  function getSavedOptions(){
    try{ return JSON.parse(localStorage.getItem('obfOptions')||'null') || {...defaultOptions}; }catch{ return {...defaultOptions}; }
  }
  function saveOptions(opts){
    try{ localStorage.setItem('obfOptions', JSON.stringify(opts)); }catch{}
  }

  let options = getSavedOptions();

  function syncUIFromOptions(){
    for(const [id,key,type] of optionMap){
      const el = $(id);
      if(!el) continue;
      if(type==='checkbox') el.checked = !!options[key];
      else if(type==='number') el.value = options[key];
      else el.value = options[key];
    }
  }

  function readOptionsFromUI(){
    const opts = {...options};
    for(const [id,key,type] of optionMap){
      const el = $(id);
      if(!el) continue;
      if(type==='checkbox') opts[key] = !!el.checked;
      else if(type==='number') opts[key] = Number(el.value);
      else opts[key] = el.value;
    }
    options = opts;
    saveOptions(opts);
    return opts;
  }

  function setStatus(msg, ok=true){
    statusEl.textContent = msg;
    statusEl.style.color = ok ? '#9bb0c8' : '#ff8f8f';
  }

  function fmtBytes(n){
    if(n < 1024) return n + ' bytes';
    if(n < 1024*1024) return (n/1024).toFixed(1) + ' KB';
    return (n/1024/1024).toFixed(2) + ' MB';
  }
  function updateStats(){
    const inSize = (inputEl.value||'').length;
    const outSize = (outputEl.value||'').length;
    $('stats-in').textContent = fmtBytes(inSize);
    $('stats-out').textContent = fmtBytes(outSize);
    if(inSize>0 && outSize>0){
      const pct = ((outSize/inSize)*100).toFixed(1);
      ratioEl.textContent = `Size ratio: ${pct}%`;
    } else {
      ratioEl.textContent = '';
    }
  }

  function doObfuscate(){
    const code = inputEl.value || '';
    if(!code.trim()){
      outputEl.value = '';
      updateStats();
      setStatus('Nothing to obfuscate. Paste or upload JS.');
      return;
    }
    const opts = readOptionsFromUI();
    try{
      if(!window.JavaScriptObfuscator){
        setStatus('Obfuscator library not loaded', false);
        return;
      }
      setStatus('Obfuscating...');
      const result = window.JavaScriptObfuscator.obfuscate(code, opts);
      const obf = result.getObfuscatedCode();
      outputEl.value = obf;
      setStatus('Done');
      updateStats();
    }catch(err){
      console.error(err);
      setStatus('Error: ' + (err && err.message ? err.message : String(err)), false);
    }
  }

  function handleFile(file){
    if(!file) return;
    const reader = new FileReader();
    reader.onload = () => { inputEl.value = String(reader.result||''); updateStats(); setStatus('File loaded'); };
    reader.onerror = () => setStatus('Failed to read file', false);
    reader.readAsText(file);
  }

  function copyOutput(){
    const txt = outputEl.value||'';
    if(!txt){ setStatus('Nothing to copy'); showToast('Nothing to copy', 'error'); return; }
    navigator.clipboard.writeText(txt)
      .then(()=>{ setStatus('Copied'); showToast('Copied to clipboard', 'success'); })
      .catch(()=>{ setStatus('Copy failed', false); showToast('Copy failed', 'error'); });
  }
  function downloadOutput(){
    const txt = outputEl.value||'';
    if(!txt){ setStatus('Nothing to download'); return; }
    const blob = new Blob([txt], {type:'text/javascript'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'obfuscated.js';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    setStatus('Downloaded');
  }
  function clearAll(){
    inputEl.value = '';
    outputEl.value = '';
    updateStats();
    setStatus('Cleared');
  }

  function bindEvents(){
    $('btn-obfuscate').addEventListener('click', doObfuscate);
    $('btn-copy').addEventListener('click', copyOutput);
    $('btn-download').addEventListener('click', downloadOutput);
    $('btn-clear').addEventListener('click', clearAll);
    $('btn-reset-options').addEventListener('click', ()=>{ options = {...defaultOptions}; syncUIFromOptions(); saveOptions(options); setStatus('Options reset'); });

    inputEl.addEventListener('input', updateStats);

    fileInput.addEventListener('change', (e)=> handleFile(e.target.files[0]));

    // Drag and drop
    ;['dragenter','dragover'].forEach(evt=> dropZone.addEventListener(evt, (e)=>{ e.preventDefault(); dropZone.classList.add('drag'); }));
    ;['dragleave','drop'].forEach(evt=> dropZone.addEventListener(evt, (e)=>{ e.preventDefault(); dropZone.classList.remove('drag'); }));
    dropZone.addEventListener('drop', (e)=>{ const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if(f) handleFile(f); });
  }

  // Init
  document.addEventListener('DOMContentLoaded', ()=>{
    syncUIFromOptions();
    updateStats();
    bindEvents();
    setStatus('Ready');
  });
})();
