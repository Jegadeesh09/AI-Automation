import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings as SettingsIcon, Upload, CheckCircle, X, ChevronDown, Activity, 
  FileText, BarChart3, Database, Info, Clock, RefreshCw, HelpCircle, 
  ShieldCheck, AlertTriangle, Terminal, Layers
} from 'lucide-react';

const SidebarItem = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${active?'bg-white text-black shadow-lg shadow-white/20':'text-gray-500 hover:text-white hover:bg-white/5'}`}>
    {icon} <span className="font-bold tracking-tight">{label}</span>
  </button>
);

const StatCard = ({ label, val, color }) => (
  <div className="bg-[#25282C] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl flex-1 hover:scale-105 transition-all">
     <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">{label}</span>
     <div className={`text-4xl font-bold mt-3 tracking-tighter ${color==='emerald'?'text-emerald-400':color==='blue'?'text-blue-400':color==='teal'?'text-teal-400':'text-red-400'}`}>{val}</div>
  </div>
);

const ToastIcon = ({ type }) => {
  const baseClass = 'h-10 w-10 flex items-center justify-center rounded-2xl';
  switch (type) {
    case 'error':
      return (
        <div className={`${baseClass} bg-red-500/10 border border-red-500/20`}>
          <AlertTriangle size={18} aria-label="Error notification" className="text-red-400" />
        </div>
      );
    case 'success':
      return (
        <div className={`${baseClass} bg-sky-500/10 border border-sky-500/20`}>
          <CheckCircle size={18} aria-label="Success notification" className="text-sky-400" />
        </div>
      );
    case 'warning':
      return (
        <div className={`${baseClass} bg-yellow-500/10 border border-yellow-500/20`}>
          <AlertTriangle size={18} aria-label="Warning notification" className="text-yellow-400" />
        </div>
      );
    default:
      return (
        <div className={`${baseClass} bg-white/10 border border-white/10`}>
          <Info size={18} aria-label="Information notification" className="text-sky-400" />
        </div>
      );
  }
};

const HelpContent = () => (
  <div className="max-w-5xl mx-auto space-y-16 animate-in fade-in py-10">
     <div className="space-y-6">
        <h3 className="text-6xl font-bold tracking-tighter text-white">Technical Guide</h3>
        <p className="text-gray-500 text-xl leading-relaxed max-w-4xl font-light">TruthCheck AI utilizes a sophisticated "Expert AI Judge" mechanism. Instead of running individual metrics, it leverages high-level reasoning to evaluate semantic fidelity, grounding, and safety in a single coherent pass.</p>
     </div>

     <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <section className="bg-[#25282C] p-12 rounded-[3.5rem] border border-white/10 space-y-10 shadow-2xl">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-2xl text-white"><CheckCircle size={24}/></div>
              <h4 className="text-lg font-bold text-white uppercase tracking-widest">Accuracy Thresholds</h4>
           </div>
           <div className="space-y-10">
              <div className="relative pl-8 border-l border-white/20">
                 <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 bg-white rounded-full" />
                 <p className="text-white font-bold text-lg mb-2">90% - 100% : Perfect Match</p>
                 <p className="text-sm text-gray-500 leading-relaxed">The AI response is semantically identical or technically equivalent to the ground truth. Factual consistency is 100% and no hallucinations are detected.</p>
              </div>
              <div className="relative pl-8 border-l border-yellow-500/20">
                 <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 bg-yellow-500 rounded-full" />
                 <p className="text-yellow-500 font-bold text-lg mb-2">60% - 89% : Partial Alignment</p>
                 <p className="text-sm text-gray-500 leading-relaxed">The response covers the core intent but may deviate in non-critical technical phrasing or missing supplementary details that were present in the expected output.</p>
              </div>
              <div className="relative pl-8 border-l border-red-500/20">
                 <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 bg-red-500 rounded-full" />
                 <p className="text-red-500 font-bold text-lg mb-2">0% - 59% : Critical Mismatch</p>
                 <p className="text-sm text-gray-500 leading-relaxed">Significant factual errors, technical hallucinations, or failure to address critical prompt constraints. High probability of misinformation or total instruction failure.</p>
              </div>
           </div>
        </section>

        <section className="bg-[#25282C] p-12 rounded-[3.5rem] border border-white/10 space-y-10 shadow-2xl">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500"><Layers size={24}/></div>
              <h4 className="text-lg font-bold text-white uppercase tracking-widest">Evaluation Strategy</h4>
           </div>
           <div className="space-y-6">
              <div className="p-8 bg-black/30 rounded-[2.5rem] border border-white/5 space-y-3">
                 <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-white">Light Mode</p>
                    <span className="text-[9px] bg-white/5 px-2 py-1 rounded-lg text-gray-500">SPEED OPTIMIZED</span>
                 </div>
                 <p className="text-xs text-gray-500 leading-relaxed">Fastest evaluation. Focuses exclusively on <span className="text-white">Semantic Correctness</span> and <span className="text-white">Query Relevancy</span>. Recommended for initial testing phases.</p>
              </div>
              <div className="p-8 bg-black/30 rounded-[2.5rem] border border-white/5 space-y-3">
                 <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-white">Standard Mode</p>
                    <span className="text-[9px] bg-white/10 px-2 py-1 rounded-lg text-white">BALANCED</span>
                 </div>
                 <p className="text-xs text-gray-500 leading-relaxed">Deep factual validation. Adds <span className="text-white">Faithfulness</span> and <span className="text-white">Hallucination</span> checks to ensure every claim is grounded in provided context.</p>
              </div>
              <div className="p-8 bg-black/30 rounded-[2.5rem] border border-white/5 space-y-3">
                 <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-500">Full Mode</p>
                    <span className="text-[9px] bg-purple-500/10 px-2 py-1 rounded-lg text-purple-500">COMPREHENSIVE</span>
                 </div>
                 <p className="text-xs text-gray-500 leading-relaxed">Production-ready audit. Includes <span className="text-white">Context Precision/Recall</span>, <span className="text-white">Toxicity</span>, and <span className="text-white">Bias</span> detection for high-stakes AI applications.</p>
              </div>
           </div>
        </section>
     </div>

     <section className="bg-[#25282C] p-16 rounded-[4rem] border border-white/10 shadow-3xl space-y-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5"><Database size={200}/></div>
        <div className="relative z-10 space-y-8">
           <h4 className="text-2xl font-bold text-white flex items-center gap-4"><Database size={24} className="text-purple-500"/> Data Mapping Intelligence</h4>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="space-y-3">
                 <p className="text-white font-bold uppercase tracking-widest text-[10px]">Auto-Detection</p>
                 <p className="text-xs text-gray-500 leading-relaxed">Framework automatically identifies columns named "Prompt", "Expected Response", and "Category" using fuzzy matching.</p>
              </div>
              <div className="space-y-3">
                 <p className="text-white font-bold uppercase tracking-widest text-[10px]">Excel Sheet Logic</p>
                 <p className="text-xs text-gray-500 leading-relaxed">If multiple sheets are detected in a workbook, each sheet is treated as a separate "Category" for analytics purposes.</p>
              </div>
              <div className="space-y-3">
                 <p className="text-white font-bold uppercase tracking-widest text-[10px]">Root Cause Detection</p>
                 <p className="text-xs text-gray-500 leading-relaxed">When scores are low, the judge identifies if the failure stems from retrieval quality, logical reasoning, or safety blocks.</p>
              </div>
           </div>
        </div>
     </section>

     <section className="py-20 text-center border-t border-white/5 space-y-6">
        <h4 className="text-xl font-bold text-gray-400">System Information</h4>
        <div className="flex justify-center gap-12 text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em]">
           <span>Viking Engine v2.4</span>
           <span>TruthCheck AI Protocol 1.0</span>
           <span>DeepEval Integration</span>
        </div>
     </section>
  </div>
);

const metricDisplayName = (metric) => {
  return metric
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatMetricValue = (value) => {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) {
    return 'N/A';
  }
  const numeric = Number(value);
  const percent = numeric >= 0 && numeric <= 1 ? numeric * 100 : numeric;
  return `${Math.round(percent)}%`;
};

const getActiveMetrics = (metrics = {}) => {
  return Object.entries(metrics)
    .filter(([_, active]) => active)
    .map(([metric]) => metric);
};

const sortResults = (results, sortConfig) => {
  if (!sortConfig?.key) return results;
  const direction = sortConfig.direction === 'desc' ? -1 : 1;
  return [...results].sort((a, b) => {
    const getValue = (row) => {
      if (sortConfig.key in row) {
        return row[sortConfig.key];
      }
      if (row.metrics && sortConfig.key in row.metrics) {
        return row.metrics[sortConfig.key];
      }
      return '';
    };
    const aValue = getValue(a);
    const bValue = getValue(b);
    if (aValue === null || aValue === undefined) return 1 * direction;
    if (bValue === null || bValue === undefined) return -1 * direction;
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return aValue.localeCompare(bValue) * direction;
    }
    if (aValue < bValue) return -1 * direction;
    if (aValue > bValue) return 1 * direction;
    return 0;
  });
};

const VikingGenAIApp = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [showAddModel, setShowAddModel] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [toasts, setToasts] = useState([]);
  
  const [config, setConfig] = useState({
    viking_base_url: 'https://dev.select.vikingpump.com',
    viking_bearer_token: '',
    viking_api_endpoint: 'https://dev.select.vikingpump.com/api/proxy?endpoint=/api/v1/query/stream/async&method=POST',
    viking_api_key: '',
    auth_endpoint: '/api/auth/session',
    token_json_path: 'accessToken',
    expiry_json_path: 'expires',
    request_mapping: { query: 'query', session_id: 'session_id', request_type: 'request_type' },
    response_mapping: { content: ['content'], message_id: ['message_id'], retrieval_context: [] },
    llm_provider: 'Gemini',
    llm_model: 'gemini-1.5-flash',
    google_api_key: '',
    eval_mode: 'Standard',
    custom_models: [],
    eval_metrics: {
      relevancy: true,
      faithfulness: true,
      precision: false,
      recall: false,
      hallucination: true,
      toxicity: false,
      bias: false,
      similarity: true
    }
  });

  const [activeTab, setActiveTab] = useState('setup');
  const [promptFile, setPromptFile] = useState(null);
  const [expectedFile, setExpectedFile] = useState(null);
  const [mode, setMode] = useState('doc');
  const [evalMode, setEvalMode] = useState('Standard');
  const [vikingApiKey, setVikingApiKey] = useState('');
  
  const [ragConfig, setRagConfig] = useState({
    name: '',
    description: '',
    provider: 'PostgreSQL',
    endpoint: '',
    index_name: '',
    namespace: '',
    top_k: 3,
    similarity_threshold: 0
  });

  const [results, setResults] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'prompt', direction: 'asc' });

  const activeMetrics = useMemo(() => getActiveMetrics(config.eval_metrics), [config.eval_metrics]);
  const settingsInvalid = activeMetrics.length === 0;
  const sortedResults = useMemo(() => sortResults(results, sortConfig), [results, sortConfig]);

  useEffect(() => {
    fetchConfig();
    const ws = connectWebSocket();
    return () => { if (ws) ws.close(); };
  }, []);

  const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/logs`;
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setLogs(prev => [...prev, data].slice(-50));
        addToast(data.message, data.type || 'info');
      } catch (err) { console.error("WS parse error", err); }
    };
    return ws;
  };

  const addToast = (message, type = 'info') => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 5000);
  };
  const removeToast = id => setToasts(prev => prev.filter(t => t.id !== id));

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(prev => ({...prev, ...data}));
        setEvalMode(data.eval_mode || 'Standard');
      }
    } catch (e) { console.error(e); }
  };

  const saveConfig = async (newConfig) => {
    const activeSelection = getActiveMetrics(newConfig.eval_metrics);
    if (activeSelection.length === 0) {
      addToast("At least one evaluation metric must be selected.", "warning");
      return;
    }

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Unable to save configuration.');
      }
      setConfig(newConfig);
      setShowSettings(false);
      addToast("Configuration saved successfully", "success");
    } catch (e) {
      addToast(e.message || "Save failed", "error");
    }
  };

  const testConnection = async () => {
    const targetKey = vikingApiKey || config.viking_bearer_token;
    if (!targetKey) {
      addToast("Bearer Token or API Key required to test connection.", "error");
      return;
    }
    setTestingConnection(true);
    try {
      let url = `/api/test-connection?api_key=${targetKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
          addToast(data.detail || "Connection successful!", "success");
      } else {
        throw new Error(data.detail || "Connection failed");
      }
    } catch (e) {
      addToast(e.message, "error");
    } finally {
      setTestingConnection(false);
    }
  };

  const [testingRag, setTestingRag] = useState(false);

  const testRagConnection = async () => {
    if (!ragConfig.endpoint || !ragConfig.index_name) {
      addToast("Endpoint and Index Name are required to test RAG.", "error");
      return;
    }
    setTestingRag(true);
    try {
      const res = await fetch('/api/test-rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ragConfig)
      });
      const data = await res.json();
      if (res.ok) {
        addToast(data.status === 'connected' ? "RAG is connected" : "RAG test completed", "success");
      } else {
        addToast(data.detail || "RAG is not connected", "error");
      }
    } catch (e) {
      addToast(e.message || "RAG is not connected", "error");
    } finally {
      setTestingRag(false);
    }
  };

  const handleRun = async () => {
    if (!promptFile) return;
    setLoading(true); setResults([]); setActiveTab('report');
    const formData = new FormData();
    formData.append('prompt_file', promptFile);
    if (expectedFile) formData.append('expected_file', expectedFile);
    formData.append('mode', mode);
    formData.append('eval_mode', evalMode);
    formData.append('viking_api_key', vikingApiKey);
    formData.append('rag_config', JSON.stringify(ragConfig));

    try {
      const res = await fetch('/api/evaluate', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed');
      setResults(data);
      addToast("TruthCheck sequence complete", "success");
    } catch (e) { addToast(e.message, "error"); setActiveTab('setup'); }
    finally { setLoading(false); }
  };

  const handleExport = async (format = 'xlsx') => {
    if (results.length === 0) {
      addToast("The report is empty and unable to download", "error");
      return;
    }
    setExporting(true);
    try {
      const payload = { results, metrics: activeMetrics };
      const response = await fetch(`/api/export?format=${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Export request failed.');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = format === 'csv' ? 'TruthCheck_Report.csv' : format === 'xlsx' ? 'TruthCheck_Report.xlsx' : 'TruthCheck_Report.pdf';
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      addToast('Export started successfully', 'success');
    } catch (e) {
      addToast(e.message || 'Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  const analytics = (() => {
    const evalRes = results.filter(r => r.status !== 'SKIPPED');
    const scores = evalRes.map(r => Number(r.score) || 0);
    const latencies = results.map(r => Number(r.performance) || 0).sort((a,b)=>a-b);
    
    const avg = scores.length ? (scores.reduce((a,b)=>a+b,0)/scores.length) : 0;
    const pass = evalRes.filter(r => r.status === 'PASS').length;
    const fail = evalRes.filter(r => r.status === 'FAIL').length;
    const passRate = evalRes.length ? ((pass/evalRes.length)*100) : 0;
    
    const getP = p => latencies.length ? latencies[Math.floor(latencies.length * (p/100))] : 0;

    return {
      avg: avg.toFixed(1),
      passRate: passRate.toFixed(1),
      pass, fail,
      dist: [
        { l: '90-100%', c: scores.filter(s=>s>=90).length },
        { l: '70-89%', c: scores.filter(s=>s>=70&&s<90).length },
        { l: '40-69%', c: scores.filter(s=>s>=40&&s<70).length },
        { l: '<40%', c: scores.filter(s=>s<40).length }
      ],
      latencies: results.map(r=>r.performance || 0),
      percentiles: { p50: getP(50), p90: getP(90), p95: getP(95), p99: getP(99) }
    };
  })();

  return (
    <div className="flex h-screen bg-[#1A1C1E] text-white font-['Calibri',sans-serif] overflow-hidden text-sm">
      {/* Toast Overlay */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-4 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto bg-[#25282C] border border-white/10 rounded-xl p-4 shadow-2xl flex items-center gap-4 animate-in slide-in-from-right-8 min-w-[320px]">
            <ToastIcon type={t.type} />
            <p className="flex-1 text-xs font-medium text-gray-200">{t.message}</p>
            <button onClick={()=>removeToast(t.id)} aria-label="Dismiss notification" className="text-gray-600 hover:text-white"><X size={14}/></button>
          </div>
        ))}
      </div>

      {/* Sidebar */}
      <aside className="w-64 bg-[#111315] border-r border-white/5 flex flex-col p-6 shrink-0">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-white p-2 rounded-xl"><ShieldCheck size={24} className="text-black"/></div>
            <h1 className="text-xl font-bold tracking-tight text-white">TruthCheck AI</h1>
          </div>
          <nav className="flex-1 space-y-2">
            <SidebarItem icon={<Upload size={18}/>} label="Prompt Upload" active={activeTab==='setup'} onClick={()=>setActiveTab('setup')}/>
            <SidebarItem icon={<FileText size={18}/>} label="Execution Report" active={activeTab==='report'} onClick={()=>setActiveTab('report')}/>
            <SidebarItem icon={<BarChart3 size={18}/>} label="Dashboard" active={activeTab==='results'} onClick={()=>setActiveTab('results')}/>
          </nav>
          <div className="mt-auto space-y-2 pt-6 border-t border-white/5">
             <SidebarItem icon={<SettingsIcon size={18}/>} label="Settings" active={showSettings} onClick={()=>setShowSettings(true)}/>
             <SidebarItem icon={<HelpCircle size={18}/>} label="Help Center" active={activeTab==='help'} onClick={()=>setActiveTab('help')}/>
          </div>
      </aside>

      {/* Main Body */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-white/5 flex items-center px-10 justify-between bg-[#1A1C1E] shrink-0">
          <h2 className="text-base font-bold tracking-tight">
            {activeTab === 'setup' ? 'PROMPT UPLOAD' : activeTab === 'report' ? 'EXECUTION REPORT' : activeTab === 'help' ? 'HELP CENTER' : 'DASHBOARD'}
          </h2>
          <div className="flex items-center gap-6">
              <button 
                onClick={handleRun} 
                disabled={!promptFile || loading || (mode === 'doc' && !expectedFile) || (mode === 'rag' && (!ragConfig.endpoint || !ragConfig.index_name))} 
                className={`px-10 py-3 rounded-2xl font-bold transition-all shadow-xl ${promptFile && !loading && ((mode === 'doc' && expectedFile) || (mode === 'rag' && ragConfig.endpoint && ragConfig.index_name)) ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:brightness-110' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
              >
                {loading ? 'EXECUTING...' : 'RUN'}
              </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-[#1A1C1E]">
          {activeTab === 'help' ? (
            <HelpContent />
          ) : activeTab === 'report' ? (
            <div className="space-y-8 animate-in fade-in duration-500">
               <div className="flex justify-between items-center flex-wrap gap-3">
                 <div className="flex gap-4 flex-wrap">
                   <button onClick={()=>handleExport('xlsx')} className="px-6 py-2.5 bg-emerald-500 border border-emerald-500/30 rounded-xl text-[10px] font-bold uppercase tracking-widest text-black hover:bg-emerald-400 transition-all flex items-center gap-2">
                      <FileText size={14} className="text-black" />
                      XLSX
                   </button>
                   <button onClick={()=>handleExport('csv')} className="px-6 py-2.5 bg-emerald-500 border border-emerald-500/30 rounded-xl text-[10px] font-bold uppercase tracking-widest text-black hover:bg-emerald-400 transition-all flex items-center gap-2">
                      <FileText size={14} className="text-black" />
                      CSV
                   </button>
                   <button onClick={()=>handleExport('pdf')} className="px-6 py-2.5 bg-emerald-500 border border-emerald-500/30 rounded-xl text-[10px] font-bold uppercase tracking-widest text-black hover:bg-emerald-400 transition-all flex items-center gap-2">
                      <FileText size={14} className="text-black" />
                      PDF
                   </button>
                 </div>
               </div>
               <div className="bg-[#25282C] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl min-h-[420px]">
                 <div className="overflow-auto custom-scrollbar">
                   {results.length === 0 ? (
                     <div className="flex h-[420px] w-full items-center justify-center">
                       <div className="text-center text-gray-400">
                         <p className="text-sm font-semibold uppercase tracking-[0.24em]">No records found</p>
                         <p className="text-xs text-gray-500 mt-2">Run a prompt upload to populate the execution report.</p>
                       </div>
                     </div>
                   ) : (
                     <table className="w-full text-left border-collapse min-w-[2400px]">
                       <thead className="bg-[#111315]">
                         <tr className="border-b border-white/5">
                           {['status','prompt','response','expected','score','performance'].map((key) => {
                             const label = key === 'status' ? 'Status' : key === 'prompt' ? 'Question' : key === 'response' ? 'Response' : key === 'expected' ? 'Expected' : key === 'score' ? 'Score' : 'Execution Time';
                             const center = ['score','performance'].includes(key);
                             return (
                               <th key={key} onClick={() => setSortConfig(prev => prev.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' })} className={`p-6 font-bold text-gray-500 text-[10px] uppercase tracking-widest ${center ? 'text-center' : ''} cursor-pointer`}>{label} {sortConfig.key === key ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                             );
                           })}
                           {activeMetrics.map(metric => (
                             <th key={metric} onClick={() => setSortConfig(prev => prev.key === metric ? { key: metric, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key: metric, direction: 'asc' })} className="p-6 font-bold text-gray-500 text-[10px] uppercase tracking-widest text-center cursor-pointer">
                               {metricDisplayName(metric)} {sortConfig.key === metric ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                             </th>
                           ))}
                           <th className="p-6 font-bold text-gray-500 text-[10px] uppercase tracking-widest w-[150px] text-center">Semantic Match</th>
                           <th className="p-6 font-bold text-gray-500 text-[10px] uppercase tracking-widest w-[150px]">Root Cause</th>
                           <th className="p-6 font-bold text-gray-500 text-[10px] uppercase tracking-widest w-[250px]">Judge Reasoning</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5 text-gray-400">
                         {sortedResults.map((r,i) => (
                           <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                             <td className="p-6 align-top">
                               <div className={`text-[8px] font-bold uppercase p-1 rounded text-center border ${r.status==='PASS'?'text-white border-white/20':'text-red-500 border-red-500/20'}`}>{r.status}</div>
                             </td>
                             <td className="p-6 align-top text-xs text-gray-300">{r.prompt}</td>
                             <td className="p-6 align-top text-xs text-white/90 whitespace-pre-wrap leading-relaxed">{r.response}</td>
                             <td className="p-6 align-top text-xs italic text-gray-500">{r.expected}</td>
                             <td className="p-6 align-top text-center font-bold text-white text-lg">{r.score}%</td>
                             <td className="p-6 align-top text-center text-xs text-gray-400">{r.performance ? `${Number(r.performance).toFixed(2)}s` : 'N/A'}</td>
                             {activeMetrics.map(metric => (
                               <td key={metric} className="p-6 align-top text-center text-sm font-bold text-white">{formatMetricValue(r.metrics?.[metric])}</td>
                             ))}
                             <td className="p-6 align-top text-center text-[10px] uppercase tracking-wider">{r.semantic_comparison?.match_status || 'N/A'}</td>
                             <td className="p-6 align-top text-xs text-red-400 font-bold">{r.root_cause || 'N/A'}</td>
                             <td className="p-6 align-top text-[10px] leading-relaxed whitespace-pre-wrap">{r.judge_reasoning || r.reason}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   )}
                 </div>
               </div>
            </div>
          ) : activeTab === 'setup' ? (
            <div className="w-full h-full max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
               <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-10 h-[520px]">
                    {/* LEFT SIDE: EXPECTED / RAG */}
                    <div className="bg-[#25282C] border border-white/5 rounded-[2.5rem] p-10 flex flex-col shadow-2xl overflow-hidden relative">
                       <div className="flex items-center justify-between mb-10">
                          <label className="text-xs uppercase font-bold text-gray-500 tracking-widest">Target Source</label>
                          <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/5">
                             <button onClick={()=>setMode('doc')} className={`px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${mode==='doc'?'bg-[#1A1C1E] text-white shadow-lg':'text-gray-600 hover:text-gray-400'}`}>Expected Response Document</button>
                             <button onClick={()=>setMode('rag')} className={`px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${mode==='rag'?'bg-[#1A1C1E] text-white shadow-lg':'text-gray-600 hover:text-gray-400'}`}>RAG Connection</button>
                          </div>
                       </div>

                       <div className="flex-1 flex flex-col min-h-0">
                          {mode === 'doc' ? (
                             <div key="doc-mode" className={`group border border-dashed rounded-[2rem] p-8 text-center transition-all duration-300 h-full flex flex-col items-center justify-center ${expectedFile ? 'border-white/40 bg-white/5 shadow-xl' : 'border-white/10 hover:bg-white/[0.02]'}`}>
                                <input type="file" id="e" accept=".xlsx,.xls,.csv" className="hidden" onChange={e=>setExpectedFile(e.target.files[0])}/>
                                <label htmlFor="e" className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                                   {expectedFile ? (
                                     <div className="flex flex-col items-center animate-in zoom-in-95 duration-300">
                                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-xl"><CheckCircle size={28} className="text-black"/></div>
                                        <div className="text-base font-bold text-white truncate max-w-full px-4">{expectedFile.name}</div>
                                        <div className="text-xs text-white uppercase font-bold mt-1 tracking-widest">Ground Truth Loaded</div>
                                     </div>
                                   ) : (
                                     <div className="flex flex-col items-center">
                                        <div className="w-16 h-16 bg-[#1A1C1E] rounded-2xl flex items-center justify-center mb-4 border border-white/5 group-hover:border-white/40 transition-colors"><Upload size={32} className="text-gray-600 group-hover:text-white/60"/></div>
                                        <div className="text-lg font-bold text-gray-400 mb-1">Expected Response Document</div>
                                        <div className="text-xs text-gray-600 uppercase tracking-widest mb-10">Select XLSX/CSV</div>
                                        <div className="px-8 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest group-hover:bg-white/10 transition-all">Select File</div>
                                     </div>
                                   )}
                                </label>
                             </div>
                          ) : (
                             <div key="rag-mode" className="space-y-8 animate-in slide-in-from-left-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                                <div className="space-y-5">
                                   <p className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">Basic Config</p>
                                   <div className="grid grid-cols-2 gap-6">
                                      <div className="space-y-2">
                                         <label className="text-[10px] uppercase font-bold text-gray-600 tracking-widest">RAG Name</label>
                                         <input value={ragConfig.name} onChange={e=>setRagConfig({...ragConfig, name: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs outline-none focus:border-white/30 transition-all font-normal" placeholder="e.g. Production RAG"/>
                                      </div>
                                      <div className="space-y-2">
                                         <label className="text-[10px] uppercase font-bold text-gray-600 tracking-widest">Description</label>
                                         <input value={ragConfig.description} onChange={e=>setRagConfig({...ragConfig, description: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs outline-none focus:border-white/30 transition-all font-normal" placeholder="Optional notes..."/>
                                      </div>
                                   </div>
                                </div>

                                <div className="space-y-5">
                                   <div className="flex justify-between items-center">
                                      <p className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">Connection Config</p>
                                      <button onClick={testRagConnection} disabled={testingRag} className="text-[10px] font-bold text-white hover:text-white/80 uppercase tracking-widest transition-all flex items-center gap-2">
                                         {testingRag ? <RefreshCw size={12} className="animate-spin"/> : <Activity size={12}/>}
                                         Test Endpoint
                                      </button>
                                   </div>
                                   <div className="grid grid-cols-2 gap-6">
                                      <div className="space-y-2">
                                         <label className="text-[10px] uppercase font-bold text-gray-600 tracking-widest">Provider Type</label>
                                         <select value={ragConfig.provider} onChange={e=>setRagConfig({...ragConfig, provider: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs outline-none focus:border-white/30 transition-all appearance-none">
                                            {['PostgreSQL','Azure AI Search','AWS (OpenSearch)','Fabric / Custom API'].map(p=><option key={p} value={p} className="bg-[#1A1C1E]">{p}</option>)}
                                         </select>
                                      </div>
                                      <div className="space-y-2">
                                         <label className="text-[10px] uppercase font-bold text-gray-600 tracking-widest">Endpoint / Host URL</label>
                                         <input value={ragConfig.endpoint} onChange={e=>setRagConfig({...ragConfig, endpoint: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs outline-none focus:border-white/30 transition-all font-normal" placeholder="https://..."/>
                                      </div>
                                   </div>
                                </div>

                                <div className="space-y-5">
                                   <p className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">Index Config</p>
                                   <div className="grid grid-cols-2 gap-6">
                                      <div className="space-y-2">
                                         <label className="text-[10px] uppercase font-bold text-gray-600 tracking-widest">Index / Collection</label>
                                         <input value={ragConfig.index_name} onChange={e=>setRagConfig({...ragConfig, index_name: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs outline-none focus:border-white/30 transition-all font-normal" placeholder="Required..."/>
                                      </div>
                                      <div className="space-y-2">
                                         <label className="text-[10px] uppercase font-bold text-gray-600 tracking-widest">Namespace / Schema</label>
                                         <input value={ragConfig.namespace} onChange={e=>setRagConfig({...ragConfig, namespace: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs outline-none focus:border-white/30 transition-all font-normal" placeholder="Optional..."/>
                                      </div>
                                   </div>
                                </div>

                                <div className="space-y-5">
                                   <p className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">Query Config</p>
                                   <div className="grid grid-cols-2 gap-6">
                                      <div className="space-y-2">
                                         <label className="text-[10px] uppercase font-bold text-gray-600 tracking-widest">Top K</label>
                                         <input type="number" value={ragConfig.top_k} onChange={e=>setRagConfig({...ragConfig, top_k: parseInt(e.target.value)})} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs outline-none focus:border-white/30 transition-all font-normal"/>
                                      </div>
                                      <div className="space-y-2">
                                         <label className="text-[10px] uppercase font-bold text-gray-600 tracking-widest">Similarity Threshold</label>
                                         <input type="number" step="0.01" value={ragConfig.similarity_threshold} onChange={e=>setRagConfig({...ragConfig, similarity_threshold: parseFloat(e.target.value)})} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs outline-none focus:border-white/30 transition-all font-normal" placeholder="0.0"/>
                                      </div>
                                   </div>
                                </div>
                             </div>
                          )}
                       </div>
                    </div>

                    {/* RIGHT SIDE: PROMPT DOCUMENT */}
                    <div className="bg-[#25282C] border border-white/5 rounded-[2.5rem] p-10 flex flex-col shadow-2xl">
                       <div className="mb-6 flex justify-between items-center">
                          <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Primary Source</label>
                          <span className="text-[8px] bg-white/10 text-white px-2 py-0.5 rounded uppercase font-bold">Required</span>
                       </div>
                       <div className="flex-1 flex flex-col justify-center">
                       <div className={`group border border-dashed rounded-[2rem] p-8 text-center transition-all duration-300 h-full flex flex-col items-center justify-center ${expectedFile ? 'border-white/40 bg-white/5 shadow-xl' : 'border-white/10 hover:bg-white/[0.02]'}`}>
                             <input type="file" id="p" accept=".xlsx,.xls,.csv" className="hidden" onChange={e=>setPromptFile(e.target.files[0])}/>
                             <label htmlFor="p" className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                                {promptFile ? (
                                  <div className="flex flex-col items-center animate-in zoom-in-95 duration-300">
                                     <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-xl"><CheckCircle size={28} className="text-black"/></div>
                                        <div className="text-base font-bold text-white truncate max-w-full px-4">{promptFile.name}</div>
                                        <div className="text-xs text-white uppercase font-bold mt-1 tracking-widest">Prompt Dataset Loaded</div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center">
                                        <div className="w-16 h-16 bg-[#1A1C1E] rounded-2xl flex items-center justify-center mb-4 border border-white/5 group-hover:border-white/40 transition-colors"><Upload size={32} className="text-gray-600 group-hover:text-white/60"/></div>
                                        <div className="text-lg font-bold text-gray-400 mb-1">Prompt Document</div>
                                        <div className="text-xs text-gray-600 uppercase tracking-widest mb-10">Select XLSX/CSV</div>
                                        <div className="px-8 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest group-hover:bg-white/10 transition-all">Select File</div>
                                  </div>
                                )}
                             </label>
                          </div>
                       </div>
                    </div>
                  </div>
               </div>
            </div>
          ) : (
            <div className="space-y-12 animate-in fade-in duration-700">
               <div className="flex justify-end gap-4">
                     <button onClick={()=>handleExport('pdf')} className="px-6 py-2.5 bg-emerald-500 border border-emerald-500/30 rounded-xl text-[10px] font-bold uppercase tracking-widest text-black hover:bg-emerald-400 transition-all flex items-center gap-2">
                        <FileText size={14} className="text-black"/>
                        PDF REPORT
                     </button>
                  </div>

               <div className="grid grid-cols-4 gap-8">
                  <StatCard label="Accuracy Avg" val={`${analytics.avg}%`} color="white"/>
                  <StatCard label="Pass Rate" val={`${analytics.passRate}%`} color="blue"/>
                  <StatCard label="Success" val={analytics.pass} color="teal"/>
                  <StatCard label="Failure" val={analytics.fail} color="red"/>
               </div>
               
               <div className="grid grid-cols-2 gap-10">
                  <div className="bg-[#25282C] p-12 rounded-[3.5rem] border border-white/5 flex flex-col items-center shadow-2xl">
                     <h4 className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-12">System Success Rate</h4>
                     <div className="relative w-56 h-56">
                        <svg className="w-full h-full rotate-[-90deg]" viewBox="0 0 36 36">
                           <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="3" />
                           <circle cx="18" cy="18" r="16" fill="none" stroke="#10B981" strokeWidth="3" strokeDasharray={`${analytics.passRate} 100`} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                           <span className="text-5xl font-bold tracking-tighter">{analytics.passRate}%</span>
                           <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">PASS RATE</span>
                        </div>
                     </div>
                  </div>
                  <div className="bg-[#25282C] p-12 rounded-[3.5rem] border border-white/5 flex flex-col shadow-2xl">
                     <h4 className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-12 text-center">Score Distribution</h4>
                     <div className="flex items-end h-48 gap-8 px-4">
                        {analytics.dist.map(d=>(
                          <div key={d.l} className="flex-1 flex flex-col items-center group">
                             <div className="w-full bg-white/10 border-t border-x border-white/20 rounded-t-xl group-hover:bg-white/30 transition-all duration-500" style={{height:`${(d.c/(results.length||1))*100}%`, minHeight:'6px'}} />
                             <span className="text-[9px] text-gray-500 mt-5 font-bold uppercase tracking-tighter">{d.l}</span>
                             <span className="text-[10px] text-white font-bold mt-1">{d.c}</span>
                          </div>
                        ))}
                     </div>
                  </div>
               </div>

               <div className="bg-[#25282C] p-12 rounded-[3.5rem] border border-white/5 shadow-2xl">
                  <h4 className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-10">Response Latency Trend (Seconds)</h4>
                  <div className="h-44 flex items-end gap-1 px-4 border-l border-b border-white/5 pb-2">
                     {analytics.latencies.slice(-100).map((l,i) => (
                       <div key={i} className="flex-1 bg-white/30 rounded-t-sm hover:bg-white transition-colors" style={{height: `${Math.min(100, (l/5)*100)}%`, minHeight: '2px'}} title={`${l}s`} />
                     ))}
                  </div>
                  <div className="flex justify-between mt-4 text-[9px] text-gray-600 font-bold uppercase tracking-widest px-2">
                    <span>Older Results</span>
                    <span>Latest (Last 100)</span>
                  </div>
               </div>

               <div className="bg-[#25282C] p-12 rounded-[3.5rem] border border-white/5 shadow-2xl">
                  <h4 className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-10 flex items-center gap-2"><Clock size={12}/> Performance Percentiles</h4>
                  <div className="space-y-10">
                     {Object.entries(analytics.percentiles).map(([p,v]) => (
                       <div key={p} className="space-y-3">
                          <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-gray-500">
                             <span className="flex items-center gap-2"><div className={`w-1.5 h-1.5 rounded-full ${p==='p99'?'bg-red-500':p==='p95'?'bg-orange-500':'bg-white'}`}/>{p} latency</span>
                             <span className="text-white font-mono">{v.toFixed(3)}s</span>
                          </div>
                          <div className="h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                             <div className={`h-full transition-all duration-1000 ${p==='p99'?'bg-red-500':p==='p95'?'bg-orange-500':'bg-white'}`} style={{width: `${Math.min(100, (v/5)*100)}%`}} />
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[110] p-6 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-[#25282C] w-full max-w-2xl max-h-[88vh] overflow-hidden rounded-[24px] border border-white/10 shadow-3xl flex flex-col animate-in zoom-in-95">
              <div className="sticky top-0 z-20 bg-[#25282C] px-6 py-4 border-b border-white/5 flex justify-between items-center gap-4 shrink-0">
                 <div>
                    <h2 className="text-lg font-bold uppercase tracking-tight text-white">System Settings</h2>
                    <p className="text-[10px] text-gray-400 uppercase tracking-[0.26em] font-medium mt-0.5">Core Engine & Model Configuration</p>
                 </div>
                 <button onClick={()=>setShowSettings(false)} className="text-gray-400 hover:text-white transition-all hover:rotate-90 duration-300"><X size={20}/></button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 custom-scrollbar">
                 <div className="space-y-4">
                    <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">AI Judge Model</label>
                    <div className="flex gap-4">
                       <div className="relative flex-1">
                          <select value={config.llm_model} onChange={e=>setConfig({...config, llm_model: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-[5px] px-6 py-5 text-sm outline-none appearance-none focus:border-white/30 transition-all">
                             {['gemini-1.5-flash','gemini-1.5-pro',...(config.custom_models || [])].map(m=><option key={m} value={m} className="bg-[#1A1C1E]">{m}</option>)}
                          </select>
                          <ChevronDown size={16} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                       </div>
                       <button onClick={()=>setShowAddModel(!showAddModel)} className="px-8 bg-white/10 border border-white/20 text-white rounded-[5px] font-bold text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all">+ Add Model</button>
                    </div>
                    {showAddModel && (
                       <div className="flex gap-2 p-2 bg-white/5 rounded-[5px] border border-white/20 animate-in slide-in-from-top-2">
                          <input value={newModelName} onChange={e=>setNewModelName(e.target.value)} className="flex-1 bg-transparent px-4 py-2 outline-none text-xs text-white" placeholder="Enter Model ID (e.g. gpt-4o)" autoFocus onKeyDown={e=>{if(e.key==='Enter'&&newModelName.trim()){setConfig({...config, custom_models:[...config.custom_models, newModelName.trim()]}); setNewModelName(''); setShowAddModel(false);}}}/>
                          <button onClick={()=>{if(newModelName.trim()){setConfig({...config, custom_models:[...config.custom_models, newModelName.trim()]}); setNewModelName(''); setShowAddModel(false);}}} className="bg-white text-black px-6 py-2 rounded-[5px] text-[10px] font-bold">ADD</button>
                       </div>
                    )}
                 </div>

                 <div className="space-y-4">
                    <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Google Gemini API Key</label>
                    <div className="relative group">
                       <Terminal size={14} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-white transition-colors" />
                       <input type="password" value={config.google_api_key} onChange={e=>setConfig({...config, google_api_key:e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-[5px] pl-14 pr-6 py-5 text-sm outline-none focus:border-white/30 transition-all" placeholder="Enter API Key..."/>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">API / Proxy Endpoint</label>
                    <div className="relative group">
                       <Database size={14} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-white transition-colors" />
                       <input value={config.viking_api_endpoint} onChange={e=>setConfig({...config, viking_api_endpoint:e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-[5px] pl-14 pr-6 py-5 text-sm outline-none focus:border-white/30 transition-all" placeholder="https://dev.select.vikingpump.com/api/proxy?endpoint=/api/v1/query/stream/async&method=POST"/>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Viking Session Token (Bearer)</label>
                    <div className="relative group">
                       <ShieldCheck size={14} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-white transition-colors" />
                       <input type="password" value={config.viking_bearer_token} onChange={e=>setConfig({...config, viking_bearer_token:e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-[5px] pl-14 pr-6 py-5 text-sm outline-none focus:border-white/30 transition-all" placeholder="Enter Bearer Token..."/>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Active Evaluation Metrics</label>
                    <div className="grid grid-cols-2 gap-3 bg-black/20 p-3 rounded-[5px] border border-white/5">
                       {Object.entries(config.eval_metrics || {}).map(([m, active]) => (
                          <button key={m} onClick={()=>setConfig({...config, eval_metrics: {...config.eval_metrics, [m]: !active}})} className={`flex items-center justify-between px-3 py-2 rounded-[5px] border transition-all text-[10px] font-bold uppercase tracking-widest ${active?'bg-white/10 border-white/30 text-white':'bg-white/5 border-white/5 text-gray-600'}`}>
                             <span>{metricDisplayName(m)}</span>
                             {active ? <CheckCircle size={12}/> : <div className="w-3 h-3 rounded-full border border-gray-800"/>}
                          </button>
                       ))}
                    </div>
                    {settingsInvalid && (
                      <div className="flex items-center gap-2 text-yellow-300 text-[11px] font-semibold">
                        <AlertTriangle size={16} />
                        <span>At least one evaluation metric must be selected.</span>
                      </div>
                    )}
                 </div>
              </div>

              <div className="px-6 py-3 border-t border-white/5 bg-[#25282C] sticky bottom-0 z-20 flex flex-wrap justify-end gap-3 items-center shrink-0">
                 <button onClick={()=>setShowSettings(false)} className="text-xs uppercase font-bold text-gray-500 hover:text-white transition-colors">Cancel</button>
                 <button onClick={()=>saveConfig(config)} disabled={settingsInvalid} className={`bg-white text-black px-8 py-3 rounded-[5px] font-bold shadow-2xl shadow-white/40 transition-all ${settingsInvalid ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}>
                   Save All Changes
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default VikingGenAIApp;
