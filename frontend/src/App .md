import React, { useState, useEffect } from 'react';
import {
Settings as SettingsIcon,
Play,
Upload,
CheckCircle,
X,
ChevronDown,
ChevronLeft,
ChevronRight,
Activity,
Terminal,
FileText,
History,
BarChart3,
Search,
Database,
Cpu,
Info,
Clock,
Trash2,
RefreshCw
} from 'lucide-react';

const VikingGenAIApp = () => {
const [activeTab, setActiveTab] = useState('setup');
const [resultsSubTab, setResultsSubTab] = useState('table');
const [showSettings, setShowSettings] = useState(false);
const [showAddModel, setShowAddModel] = useState(false);
const [newModelName, setNewModelName] = useState('');
const [loading, setLoading] = useState(false);
const [logs, setLogs] = useState([]);
const [sessions, setSessions] = useState([]);
const [selectedSessionId, setSelectedSessionId] = useState(null);
const [testingConnection, setTestingConnection] = useState(false);

// App Config
const [config, setConfig] = useState({
viking_base_url: 'https://dev.select.vikingpump.com',
viking_bearer_token: '',
viking_cookie: '',
viking_api_endpoint: '/api/v1/query/stream/async',
llm_provider: 'Gemini',
llm_model: 'gemini-1.5-flash',
google_api_key: '',
headless_mode: true
});

// Setup state
const [promptFile, setPromptFile] = useState(null);
const [expectedFile, setExpectedFile] = useState(null);
const [mode, setMode] = useState('doc');
const [vikingApiKey, setVikingApiKey] = useState('');
const [ragApi, setRagApi] = useState('');
const [indexName, setIndexName] = useState('');
const [results, setResults] = useState([]);
const [exporting, setExporting] = useState(false);

useEffect(() => {
fetchConfig();
const ws = connectWebSocket();
fetchSessions();

    // Session Heartbeat to keep Viking session alive
    const heartbeat = setInterval(() => {
      if (config.viking_base_url) {
        // We try to hit the auth session endpoint on the viking domain
        // This only works if the browser has the session cookies for that domain
        // and CORS allows it (or if we hit a proxy that forwards it, but
        // usually this is meant to be a direct hit to refresh the cookie in the browser)
        fetch(`${config.viking_base_url}/api/auth/session`, {
          mode: 'no-cors',
          credentials: 'include'
        })
          .catch(() => { /* ignore - no-cors will opaque the response anyway */ });
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      if (ws) ws.close();
      clearInterval(heartbeat);
    };

}, [config.viking_base_url]);

const connectWebSocket = () => {
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${protocol}//${window.location.host}/ws/logs`;
const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setLogs(prev => [...prev, data].slice(-50)); // Keep last 50 logs
    };

    ws.onclose = (e) => {
      if (e.code !== 1000) { // Normal closure
        setTimeout(connectWebSocket, 3000); // Reconnect
      }
    };
    return ws;

};

const fetchSessions = async () => {
try {
// This endpoint needs to be implemented in main.py
const res = await fetch(`/api/sessions?api_key=${vikingApiKey}`);
if (res.ok) {
const data = await res.json();
setSessions(data.sessions || []);
}
} catch (e) {
console.error("Failed to fetch sessions", e);
}
};

const testConnection = async () => {
// If we're in RAG mode, we also want to test retrieval if index_name is provided
const targetKey = vikingApiKey || config.viking_bearer_token;
if (!targetKey) {
alert("Bearer Token or API Key required to test connection.");
return;
}
setTestingConnection(true);
try {
let url = `/api/test-connection?api_key=${targetKey}`;
if (mode === 'rag' && indexName) {
url += `&index_name=${encodeURIComponent(indexName)}`;
}
const res = await fetch(url);
const data = await res.json();
if (res.ok) {
if (data.status === 'partial') {
alert(`Partial Success: ${data.detail}`);
} else {
alert(data.detail || "Connection successful!");
}
} else {
throw new Error(data.detail || "Connection failed");
}
} catch (e) {
alert(e.message);
} finally {
setTestingConnection(false);
}
};

const fetchConfig = async () => {
try {
const res = await fetch('/api/config');
const data = await res.json();
// Ensure custom_models is initialized if not in config
if (!data.custom_models) data.custom_models = [];
setConfig(data);
} catch (e) {
console.error("Failed to fetch config", e);
}
};

const saveConfig = async (newConfig) => {
try {
await fetch('/api/config', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(newConfig)
});
setConfig(newConfig);
setShowSettings(false);
} catch (e) {
console.error("Failed to save config", e);
}
};

const handleRun = async () => {
if (!promptFile) return;
setLoading(true);
setResults([]);
setActiveTab('results');

    const formData = new FormData();
    formData.append('prompt_file', promptFile);
    if (expectedFile) {
      formData.append('expected_file', expectedFile);
    }
    formData.append('mode', mode);
    formData.append('viking_api_key', vikingApiKey);
    formData.append('rag_api', ragApi);
    formData.append('index_name', indexName);

    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Evaluation failed');
      }
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error("Error during evaluation:", error);
      alert(error.message);
      setActiveTab('setup');
    } finally {
      setLoading(false);
    }

};

const isRunEnabled = promptFile && (mode === 'doc' ? (expectedFile || promptFile) : true) && (config.viking_bearer_token || vikingApiKey);

const handleExport = async (format = 'xlsx') => {
if (results.length === 0) return;
setExporting(true);
try {
const response = await fetch(`/api/export?format=${format}`, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(results),
});
if (response.ok) {
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = format === 'xlsx' ? 'Viking_AI_Match_Score.xlsx' : 'Viking_AI_Evaluation_Report.pdf';
document.body.appendChild(a);
a.click();
a.remove();
}
} catch (e) {
console.error("Export failed", e);
} finally {
setExporting(false);
}
};

const handleRefreshSessions = () => {
setResults([]);
setLogs([]);
fetchSessions();
};

const getAnalytics = () => {
if (results.length === 0) return {
avg: 0, high: 0, low: 0, pass: 0, passedCount: 0, failedCount: 0, skippedCount: 0,
avgLatency: 0, minLatency: 0, maxLatency: 0,
distribution: [], latencyTrend: [], categorySummary: []
};

    // Filter out SKIPPED results for success metrics
    const evaluatedResults = results.filter(r => r.status !== 'SKIPPED');
    const skippedCount = results.length - evaluatedResults.length;

    const scores = evaluatedResults.map(r => Number(r.score) || 0);
    const latencies = results.map(r => Number(r.performance) || 0);

    const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const passedCount = evaluatedResults.filter(r => r.status === 'PASS').length;
    const failedCount = evaluatedResults.length - passedCount;

    // Non-cumulative buckets for distribution
    const distribution = [
      { label: '90-100% Perfect', count: scores.filter(s => s >= 90).length },
      { label: '70-89% High', count: scores.filter(s => s >= 70 && s < 90).length },
      { label: '40-69% Moderate', count: scores.filter(s => s >= 40 && s < 70).length },
      { label: '0-39% Low', count: scores.filter(s => s < 40).length }
    ];

    // Category mapping
    const categories = {};
    results.forEach(r => {
        const cat = r.category || 'General';
        if (!categories[cat]) categories[cat] = { name: cat, total: 0, pass: 0, fail: 0 };
        // Success rate calculation: exclude SKIPPED from total and calculation
        if (r.status !== 'SKIPPED') {
            categories[cat].total++;
            if (r.status === 'PASS') categories[cat].pass++;
            else categories[cat].fail++;
        }
    });
    const categorySummary = Object.values(categories).map(c => ({
        ...c,
        rate: c.total > 0 ? Math.round((c.pass / c.total) * 100) : 0
    }));

    return {
      avg: Number(avg.toFixed(1)),
      high: scores.length > 0 ? Math.max(...scores) : 0,
      low: scores.length > 0 ? Math.min(...scores) : 0,
      pass: evaluatedResults.length > 0 ? Number(((passedCount / evaluatedResults.length) * 100).toFixed(1)) : 0,
      passedCount,
      failedCount,
      skippedCount,
      avgLatency: latencies.length > 0 ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2) : 0,
      minLatency: latencies.length > 0 ? Math.min(...latencies).toFixed(2) : 0,
      maxLatency: latencies.length > 0 ? Math.max(...latencies).toFixed(2) : 0,
      distribution,
      latencyTrend: latencies,
      categorySummary
    };

};

const analytics = getAnalytics();

const getPerformanceInsight = () => {
if (results.length === 0) return "No dataset detected. Initiate run sequence to populate results.";
if (analytics.pass >= 90) return "Exceptional performance. The model is highly aligned with technical expectations across the dataset.";
if (analytics.pass >= 75) return "Strong performance. Minor semantic discrepancies detected, but core technical alignment remains high.";
if (analytics.pass >= 50) return "Moderate alignment. System requires refinement in handling specific technical nuances or edge cases.";
return "Significant misalignment detected. Review 'Judge Reasoning' to identify systematic failures in prompt-response mapping.";
};

return (

<div className="flex h-screen bg-[#0D0D0D] text-white font-sans overflow-hidden text-sm">
{/_ Main Content _/}
<div className="flex-1 flex flex-col overflow-hidden">
{/_ Top Header _/}
<header className="h-16 border-b border-gray-800 flex items-center px-8 justify-between bg-[#0F0F0F] shrink-0">
<div className="flex items-center gap-2.5">
<div className="bg-white/10 p-1.5 rounded-lg border border-white/20">
<Activity size={18} className="text-white" />
</div>
<div>
<h1 className="text-base font-normal tracking-tight text-white">Viking GenAI Automation</h1>
<p className="text-[7px] uppercase tracking-[0.2em] text-white/60 font-normal">Enterprise Engine V2.0</p>
</div>
</div>

        <div className="flex items-center gap-12 h-full">
           <nav className="flex gap-12 h-full">
            <TabItem
              label="Setup"
              active={activeTab === 'setup'}
              onClick={() => setActiveTab('setup')}
            />
            <TabItem
              label="Results"
              active={activeTab === 'results'}
              onClick={() => setActiveTab('results')}
            />
          </nav>

          <div className="flex items-center gap-6 border-l border-gray-800 pl-8">
            <button
                onClick={() => setShowSettings(true)}
                className="p-2.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
                title="Settings"
            >
                <SettingsIcon size={22} />
            </button>

            <button
                onClick={handleRun}
                disabled={!isRunEnabled || loading}
                className={`flex items-center gap-2 px-8 py-2.5 rounded-lg font-normal transition-all shadow-lg ${
                isRunEnabled && !loading
                ? 'bg-white text-black hover:bg-gray-100 active:scale-95'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                }`}
            >
                <Play size={16} fill="currentColor" />
                {loading ? 'EXECUTING...' : 'RUN'}
            </button>
          </div>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-10 bg-[#0A0A0A]">
        {activeTab === 'setup' ? (
            <div className="w-full h-full max-w-[1400px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Left Column: Data Upload */}
            <div className="xl:col-span-7 space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-normal flex items-center gap-2.5">
                        <Upload size={18} className="text-emerald-500" />
                        Prompt Document
                    </h3>
                    {promptFile && (
                        <button onClick={() => setPromptFile(null)} className="text-xs text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1">
                            <X size={14} /> Clear
                        </button>
                    )}
                </div>

                <div
                className={`group relative border-2 border-dashed rounded-3xl p-16 text-center transition-all duration-300 min-h-[350px] flex flex-col items-center justify-center ${
                    promptFile ? 'border-white/40 bg-white/5 shadow-[0_0_50px_-12px_rgba(255,255,255,0.15)]' : 'border-gray-800 hover:border-white/30 hover:bg-white/[0.02]'
                }`}
                >
                    <input
                        type="file"
                        id="promptUpload"
                        className="hidden"
                        onChange={(e) => setPromptFile(e.target.files[0])}
                    />
                    <label htmlFor="promptUpload" className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                        {promptFile ? (
                        <div className="flex flex-col items-center animate-in zoom-in-95 duration-300">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-6 shadow-lg shadow-white/20">
                                <CheckCircle size={32} className="text-white" />
                            </div>
                            <span className="text-lg font-normal text-white mb-2 tracking-tight">{promptFile.name}</span>
                            <div className="flex items-center gap-2 text-white/80 bg-white/10 px-4 py-1.5 rounded-full text-xs font-normal">
                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                Prompt source loaded
                            </div>
                        </div>
                        ) : (
                        <div className="flex flex-col items-center group-hover:scale-105 transition-transform duration-500">
                            <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mb-6 border border-gray-800 group-hover:border-emerald-500/40 transition-colors">
                                <FileText size={36} className="text-gray-600 group-hover:text-emerald-500/60" />
                            </div>
                            <span className="text-lg font-normal text-gray-400 mb-2 tracking-tight">Upload Prompt File</span>
                            <span className="text-xs text-gray-600 max-w-xs leading-relaxed">Select XLSX or CSV containing your prompt list.</span>

                            <div className="mt-8 px-8 py-3 bg-white text-black font-normal rounded-xl hover:bg-gray-200 transition-all shadow-xl active:scale-95">
                                Browse
                            </div>
                        </div>
                        )}
                    </label>
                </div>

            </div>

            {/* Right Column: Configuration */}
            <div className="xl:col-span-5 space-y-6 h-full flex flex-col">
                <h3 className="text-base font-normal">Execution Configuration</h3>

                <div className="flex-1 bg-[#111111] border border-gray-800 rounded-3xl p-10 space-y-8 overflow-y-auto custom-scrollbar">
                    <div className="space-y-6">
                        <label className="block">
                            <span className="text-xs uppercase tracking-widest font-normal text-gray-500 mb-4 block">Comparison Mode</span>
                            <div className="flex bg-black rounded-2xl p-1.5 border border-gray-800 shadow-inner">
                                <button
                                onClick={() => setMode('doc')}
                                className={`flex-1 py-4 rounded-xl text-sm font-normal transition-all ${
                                    mode === 'doc' ? 'bg-[#1A1A1A] text-emerald-500 shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-gray-800' : 'text-gray-600 hover:text-gray-400'
                                }`}
                                >
                                Document Based
                                </button>
                                <button
                                onClick={() => setMode('rag')}
                                className={`flex-1 py-4 rounded-xl text-sm font-normal transition-all ${
                                    mode === 'rag' ? 'bg-[#1A1A1A] text-emerald-500 shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-gray-800' : 'text-gray-600 hover:text-gray-400'
                                }`}
                                >
                                RAG Based
                                </button>
                            </div>
                        </label>
                    </div>

                    <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                        {mode === 'rag' ? (
                        <div className="space-y-6">
                            <div className="flex justify-end">
                                <button
                                    onClick={testConnection}
                                    disabled={testingConnection || !(config.viking_bearer_token || vikingApiKey)}
                                    className="text-[10px] uppercase tracking-widest text-emerald-500 hover:text-emerald-400 disabled:text-gray-800 transition-colors flex items-center gap-2"
                                >
                                    {testingConnection ? <RefreshCw size={10} className="animate-spin" /> : <Activity size={10} />}
                                    {testingConnection ? 'Verifying...' : 'Test Viking Connection'}
                                </button>
                            </div>

                            <div className="space-y-2 group">
                                <label className="text-[10px] uppercase tracking-widest font-normal text-gray-500 group-focus-within:text-emerald-500 transition-colors">RAG API</label>
                                <input
                                    type="text"
                                    placeholder="Enter RAG source URL..."
                                    value={ragApi}
                                    onChange={(e) => setRagApi(e.target.value)}
                                    className="w-full bg-black border border-gray-800 rounded-2xl px-6 py-5 focus:border-emerald-500/50 outline-none transition-all font-normal text-white placeholder:text-gray-800"
                                />
                            </div>

                            <div className="space-y-2 group">
                                <label className="text-[10px] uppercase tracking-widest font-normal text-gray-500 group-focus-within:text-emerald-500 transition-colors">Target Index Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. viking-pump-knowledge"
                                    value={indexName}
                                    onChange={(e) => setIndexName(e.target.value)}
                                    className="w-full bg-black border border-gray-800 rounded-2xl px-6 py-5 focus:border-emerald-500/50 outline-none transition-all font-normal text-white placeholder:text-gray-800"
                                />
                            </div>
                        </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] uppercase tracking-widest font-normal text-gray-500">Expected Response Document</label>
                                    {expectedFile && (
                                        <button onClick={() => setExpectedFile(null)} className="text-[10px] text-gray-500 hover:text-red-400 transition-colors">
                                            Use prompt file columns
                                        </button>
                                    )}
                                </div>
                                <div
                                className={`group relative border-2 border-dashed rounded-3xl p-8 text-center transition-all duration-300 min-h-[120px] flex flex-col items-center justify-center ${
                                    expectedFile ? 'border-white/40 bg-white/5 shadow-[0_0_30px_-10px_rgba(255,255,255,0.15)]' : 'border-gray-800 hover:border-white/20'
                                }`}
                                >
                                    <input
                                        type="file"
                                        id="expectedUpload"
                                        className="hidden"
                                        onChange={(e) => setExpectedFile(e.target.files[0])}
                                    />
                                    <label htmlFor="expectedUpload" className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                                        {expectedFile ? (
                                            <div className="flex flex-col items-center animate-in zoom-in-95 duration-300">
                                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mb-3 shadow-lg shadow-white/20">
                                                    <CheckCircle size={20} className="text-white" />
                                                </div>
                                                <span className="text-sm font-normal text-white truncate max-w-[250px] mb-1">{expectedFile.name}</span>
                                                <div className="flex items-center gap-1.5 text-white/80 bg-white/10 px-3 py-1 rounded-full text-[9px] font-normal">
                                                    <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
                                                    Expected data loaded
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center group-hover:scale-105 transition-transform duration-500">
                                                <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center mb-3 border border-gray-800 group-hover:border-emerald-500/40 transition-colors">
                                                    <Upload size={20} className="text-gray-600 group-hover:text-emerald-500/60" />
                                                </div>
                                                <span className="text-sm font-normal text-gray-500">Load Expected Responses</span>
                                                <p className="text-[10px] text-gray-600 mt-1 italic">(Optional if in prompt file)</p>
                                            </div>
                                        )}
                                    </label>
                                </div>
                                <div className="opacity-40 italic text-gray-500 text-center text-xs">
                                    <p>If no file is loaded, we look for 'Expected Response' column in your prompt file.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            </div>
        ) : (
            <div className="w-full h-full flex flex-col animate-in fade-in duration-500">
                <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-2">
                  <div className="flex items-center gap-8 h-full">
                    <button
                        onClick={() => setResultsSubTab('table')}
                        className={`pb-4 px-2 text-sm font-normal uppercase tracking-widest transition-all relative ${
                            resultsSubTab === 'table' ? 'text-emerald-500' : 'text-gray-600 hover:text-gray-400'
                        }`}
                    >
                        Report Table
                        {resultsSubTab === 'table' && <div className="absolute bottom-0 left-0 w-full h-1 bg-white" />}
                    </button>
                    <button
                        onClick={() => setResultsSubTab('analytics')}
                        className={`pb-4 px-2 text-sm font-normal uppercase tracking-widest transition-all relative ${
                            resultsSubTab === 'analytics' ? 'text-emerald-500' : 'text-gray-600 hover:text-gray-400'
                        }`}
                    >
                        Analytics
                        {resultsSubTab === 'analytics' && <div className="absolute bottom-0 left-0 w-full h-1 bg-white" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-[#111111] border border-gray-800 rounded-xl p-1">
                            <button
                                onClick={() => handleExport('xlsx')}
                                disabled={exporting || results.length === 0}
                                className="p-2 bg-emerald-500 text-black hover:bg-emerald-400 rounded-lg transition-all disabled:opacity-60 flex items-center gap-2"
                                title="Download Excel"
                            >
                                <Upload size={16} className="rotate-180" />
                                <span className="text-[10px] font-bold uppercase tracking-widest pr-1">XLSX</span>
                            </button>
                            <div className="w-px h-4 bg-gray-800" />
                            <button
                                onClick={() => handleExport('pdf')}
                                disabled={exporting || results.length === 0}
                                className="p-2 bg-emerald-500 text-black hover:bg-emerald-400 rounded-lg transition-all disabled:opacity-60 flex items-center gap-2"
                                title="Download PDF"
                            >
                                <FileText size={16} />
                                <span className="text-[10px] font-bold uppercase tracking-widest pr-1">PDF</span>
                            </button>
                        </div>
                        <div className="bg-[#111111] px-6 py-2 rounded-xl border border-gray-800 flex items-center gap-4">
                            <div className="text-right border-r border-gray-800 pr-4">
                                <p className="text-[8px] uppercase tracking-widest text-gray-600">Avg Match</p>
                                <p className="text-xs font-mono text-white">{analytics.avg}%</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[8px] uppercase tracking-widest text-gray-600">Success Rate</p>
                                <p className="text-xs font-mono text-emerald-500">{analytics.pass}%</p>
                            </div>
                        </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 bg-[#0F0F0F] border border-gray-800 rounded-[0.9rem] overflow-hidden shadow-2xl flex flex-col relative">
                   {resultsSubTab === 'table' ? (
                   <div className="overflow-auto custom-scrollbar h-full">
                        {!loading && results.length === 0 && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center mt-30 pointer-events-none">
                            <span className="text-sm font-normal text-gray-400 tracking-tight font-[Calibri]">No dataset detected</span>
                            {/* <span className="text-xs text-gray-800/60 uppercase tracking-[0.2em] mt-2">Initiate run sequence to populate results</span> */}
                          </div>
                        )}
                   <table className="w-full text-left border-collapse table-fixed min-w-[2200px]">
                     <thead className="sticky top-0 z-20 shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                       <tr className="bg-[#151515] border-b border-gray-800">
                         <th className="p-6 font-bold text-gray-500 text-[10px] uppercase tracking-widest w-[8%] border-r border-gray-800/30">Category</th>
                         <th className="p-6 font-bold text-gray-500 text-[10px] uppercase tracking-widest w-[8%] border-r border-gray-800/30">Feature</th>
                         <th className="p-6 font-bold text-gray-500 text-[10px] uppercase tracking-widest w-[12%] border-r border-gray-800/30">Prompt</th>
                         <th className="p-6 font-bold text-gray-500 text-[10px] uppercase tracking-widest text-center w-[6%] border-r border-gray-800/30">Mode</th>
                         <th className="p-6 font-bold text-gray-500 text-[10px] uppercase tracking-widest w-[12%] border-r border-gray-800/30">Response</th>
                         <th className="p-6 font-bold text-gray-500 text-[10px] uppercase tracking-widest w-[12%] border-r border-gray-800/30">Expected / Context</th>
                         <th className="p-6 font-bold text-gray-500 text-[10px] uppercase tracking-widest text-center w-[8%] border-r border-gray-800/30">Score (%)</th>
                         <th className="p-6 font-bold text-gray-500 text-[10px] uppercase tracking-widest text-center w-[8%] border-r border-gray-800/30">Status</th>
                         <th className="p-6 font-bold text-gray-500 text-[10px] uppercase tracking-widest text-center w-[8%] border-r border-gray-800/30">Response Time</th>
                         <th className="p-6 font-bold text-gray-500 text-[10px] uppercase tracking-widest w-[18%]">Judge Reasoning</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-800/40">
                        {loading && results.length === 0 && (
                          <tr>
                            <td colSpan="10" className="p-32 text-center text-gray-700 italic">
                               <div className="flex flex-col items-center gap-6">
                                  <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                                  <span className="text-lg font-normal">Synchronizing with Viking Engine...</span>
                               </div>
                            </td>
                          </tr>
                        )}
                        {results.map((res, i) => (
                          <tr key={i} className="hover:bg-white/[0.02] transition-colors group border-b border-gray-800/40">
                            <td className="p-6 text-xs align-top leading-relaxed text-gray-400 font-normal border-r border-gray-800/30">
                                <div className="bg-gray-800/50 px-3 py-1 rounded-lg inline-block">{res.category}</div>
                            </td>
                            <td className="p-6 text-xs align-top leading-relaxed text-gray-300 font-normal border-r border-gray-800/30">
                                {res.feature}
                            </td>
                            <td className="p-6 text-sm align-top leading-relaxed text-gray-300 font-normal border-r border-gray-800/30">
                                {res.prompt}
                            </td>
                            <td className="p-6 text-center align-top border-r border-gray-800/30">
                                <div className={`inline-flex px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-widest border ${
                                    res.mode === 'document' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                                }`}>
                                    {res.mode}
                                </div>
                            </td>
                            <td className="p-6 text-sm align-top border-r border-gray-800/30">
                              <div className="max-h-[300px] overflow-y-auto pr-4 custom-scrollbar text-white/90 leading-relaxed whitespace-pre-wrap">
                                {res.response || <span className="text-red-500/60 italic">Error: Empty response from Viking AI</span>}
                              </div>
                            </td>
                            <td className="p-6 text-sm align-top border-r border-gray-800/30 italic">
                                <div className="max-h-[300px] overflow-y-auto pr-4 custom-scrollbar whitespace-pre-wrap">
                                    {res.mode === 'document' ? (
                                        res.expected || <span className="text-gray-600">No expected response provided</span>
                                    ) : (
                                        (res.context && res.context.length > 0) ? (
                                            <ul className="list-disc pl-4 space-y-2 not-italic text-xs text-gray-500">
                                                {res.context.map((c, idx) => <li key={idx}>{c}</li>)}
                                            </ul>
                                        ) : <span className="text-gray-600">No retrieval context available</span>
                                    )}
                                </div>
                            </td>
                            <td className="p-6 text-center align-top border-r border-gray-800/30">
                              <ScoreBadge score={res.score} status={res.status} />
                            </td>
                            <td className="p-6 text-center align-top border-r border-gray-800/30">
                                <div className={`inline-flex px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${
                                    res.status === 'PASS' ? 'bg-white/10 border-white/20 text-white' :
                                    res.status === 'SKIPPED' ? 'bg-gray-500/10 border-gray-500/20 text-gray-500' :
                                    'bg-red-500/10 border-red-500/20 text-red-500'
                                }`}>
                                    {res.status}
                                </div>
                            </td>
                            <td className="p-6 text-center align-top border-r border-gray-800/30">
                                <div className="inline-flex flex-col items-center justify-center p-3 rounded-xl border border-gray-800 bg-black/40 text-gray-400 min-w-[80px]">
                                    <span className="text-base font-normal font-mono leading-none tracking-tighter">{res.performance || 0}s</span>
                                </div>
                            </td>
                             <td className="p-6 text-[11px] text-gray-500 align-top leading-relaxed group-hover:text-gray-400 transition-colors">
                               <div className="max-h-[350px] overflow-y-auto pr-4 custom-scrollbar whitespace-pre-wrap font-mono text-[10px]">
                                {res.reason}
                              </div>
                            </td>
                          </tr>
                        ))}
                     </tbody>
                   </table>
                   </div>
                   ) : (
                    <div className="p-16 h-full overflow-y-auto custom-scrollbar bg-black/30">
                        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 mb-16">
                            <div className="flex flex-col gap-6">
                                <AnalyticsCard label="Average Semantic Match" value={`${analytics.avg}%`} icon={<Activity />} color="white" />
                                <div className="bg-[#111111] border border-gray-800 rounded-3xl p-6 flex flex-col justify-center">
                                    <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-2">Skipped Test Cases</p>
                                    <p className="text-2xl font-mono text-gray-400">{analytics.skippedCount}</p>
                                    <p className="text-[8px] text-gray-700 italic mt-1">(Missing data/context)</p>
                                </div>
                            </div>

                            <div className="xl:col-span-2 bg-[#111111] border border-gray-800 rounded-3xl p-10 flex flex-col items-center justify-center relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <CheckCircle size={80} className="text-white" />
                                </div>
                                <span className="text-[10px] uppercase tracking-widest text-gray-500 mb-6 font-bold">Comprehensive System Pass Rate</span>
                                <div className="flex items-center gap-12">
                                    <div className="relative w-32 h-32 flex items-center justify-center">
                                        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                                            {/* Background Circle (Red for failure portion) */}
                                            <circle cx="50" cy="50" r="45" className="fill-none stroke-red-500/20" strokeWidth="10" />
                                            {/* Progress Circle (Emerald for success portion) */}
                                            {results.length > 0 && analytics.pass > 0 && (
                                                <circle
                                                    cx="50" cy="50" r="45"
                                                    className="fill-none stroke-emerald-500 transition-all duration-1000"
                                                    strokeWidth="10"
                                                    strokeDasharray="283"
                                                    strokeDashoffset={283 - (283 * (Number(analytics.pass) || 0)) / 100}
                                                    strokeLinecap="round"
                                                />
                                            )}
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-3xl font-mono text-white">{Math.round(analytics.pass)}%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 bg-white rounded-full" />
                                            <span className="text-xs text-gray-400">Passed ({analytics.passedCount} prompts)</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 bg-red-500 rounded-full" />
                                            <span className="text-xs text-gray-400">Failed ({analytics.failedCount} prompts)</span>
                                        </div>
                                        <p className="text-[10px] text-gray-600 italic mt-2">Pass: Avg F+R ≥ 80% & Hallucination ≤ 0.2</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-6">
                                <div className="flex-1 bg-[#111111] border border-gray-800 rounded-3xl p-6 flex items-center justify-between">
                                    <div>
                                        <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-1">Peak Score</p>
                                        <p className="text-2xl font-mono text-white">{analytics.high}%</p>
                                    </div>
                                    <div className="p-2 bg-white/5 rounded-lg border border-white/10 text-white">
                                        <BarChart3 size={16} />
                                    </div>
                                </div>
                                <div className="flex-1 bg-[#111111] border border-gray-800 rounded-3xl p-6 flex items-center justify-between">
                                    <div>
                                        <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-1">Floor Score</p>
                                        <p className={`text-2xl font-mono ${analytics.low >= 80 ? 'text-emerald-500' : analytics.low >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>{analytics.low}%</p>
                                    </div>
                                    <div className={`p-2 rounded-lg border ${analytics.low >= 80 ? 'bg-white/10 border-white/20 text-white' : analytics.low >= 50 ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                                        <Trash2 size={16} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[350px]">
                            <div className="lg:col-span-1 bg-[#111111] border border-gray-800 rounded-3xl p-8 flex flex-col">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-6 flex items-center gap-2">
                                    <Cpu size={14} className="text-white" />
                                    Model Score Distribution
                                </h3>
                                <div className="flex-1 flex flex-col justify-end space-y-4">
                                    {analytics.distribution.map(bucket => {
                                        const percent = results.length > 0 ? (bucket.count / results.length) * 100 : 0;
                                        return (
                                            <div key={bucket.label} className="space-y-1">
                                                <div className="flex justify-between text-[10px] text-gray-600 uppercase tracking-widest">
                                                    <span>{bucket.label}</span>
                                                    <span>{bucket.count} ({Math.round(percent)}%)</span>
                                                </div>
                                                <div className="h-1.5 bg-black rounded-full overflow-hidden border border-gray-800/50">
                                                    <div
                                                        className={`h-full transition-all duration-1000 ${
                                                            bucket.label.includes('Perfect') ? 'bg-white' :
                                                            bucket.label.includes('High') ? 'bg-gray-300' :
                                                            bucket.label.includes('Moderate') ? 'bg-yellow-500' : 'bg-red-500'
                                                        }`}
                                                        style={{ width: `${percent}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="lg:col-span-2 bg-[#111111] border border-gray-800 rounded-3xl p-8 flex flex-col">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                        <Clock size={14} className="text-emerald-500" />
                                        Performance Overview
                                    </h3>
                                    <div className="flex items-center gap-4 text-[9px] uppercase tracking-widest text-gray-600">
                                        <span>Avg: <span className="text-white font-mono">{analytics.avgLatency}s</span></span>
                                        <span className="w-px h-2 bg-gray-800" />
                                        <span>Min: <span className="text-emerald-500 font-mono">{analytics.minLatency}s</span></span>
                                        <span className="w-px h-2 bg-gray-800" />
                                        <span>Max: <span className="text-red-500 font-mono">{analytics.maxLatency}s</span></span>
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col relative overflow-hidden">
                                    {/* Simple latency trend visualization */}
                                    <div className="absolute inset-0 flex items-end justify-between gap-1 pb-4">
                                        {analytics.latencyTrend.map((lat, i) => (
                                            <div
                                                key={i}
                                                className="bg-white/20 hover:bg-white/40 transition-all border-t border-white/30 group relative flex-1"
                                                style={{ height: `${Math.min(100, (lat / (analytics.maxLatency || 1)) * 100)}%` }}
                                            >
                                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-[8px] px-2 py-1 rounded border border-gray-800 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                                                    Prompt {i+1}: {lat}s
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="absolute inset-x-0 bottom-0 h-px bg-gray-800" />
                                    {results.length === 0 && (
                                        <div className="absolute inset-0 flex items-center justify-center text-gray-700 italic text-xs">
                                            No performance data available.
                                        </div>
                                    )}
                                </div>
                                <div className="mt-4 p-4 bg-black/40 border border-gray-800 rounded-xl">
                                    <p className="text-[11px] text-gray-400 leading-relaxed font-normal">
                                        <span className="text-emerald-500 font-bold mr-2 uppercase tracking-widest">Insight:</span>
                                        {getPerformanceInsight()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#111111] border border-gray-800 rounded-3xl p-8 flex flex-col">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-6 flex items-center gap-2">
                                <Database size={14} className="text-emerald-500" />
                                Summary by Category
                            </h3>
                            <div className="overflow-hidden border border-gray-800 rounded-2xl">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-black/40 border-b border-gray-800">
                                            <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-500 font-bold">Category</th>
                                            <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-500 font-bold text-center">Total</th>
                                            <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-500 font-bold text-center text-emerald-500/60">PASS</th>
                                            <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-500 font-bold text-center text-red-500/60">FAIL</th>
                                            <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-500 font-bold text-right">Success Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800/40">
                                        {analytics.categorySummary.map((cat, i) => (
                                            <tr key={i} className="hover:bg-white/[0.01] transition-colors">
                                                <td className="px-6 py-4 text-sm font-normal text-gray-300">{cat.name}</td>
                                                <td className="px-6 py-4 text-sm font-mono text-center text-gray-500">{cat.total}</td>
                                                <td className="px-6 py-4 text-sm font-mono text-center text-emerald-500/80">{cat.pass}</td>
                                                <td className="px-6 py-4 text-sm font-mono text-center text-red-500/80">{cat.fail}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`text-sm font-bold ${cat.rate >= 80 ? 'text-emerald-500' : cat.rate >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                                                        {cat.rate}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {analytics.categorySummary.length === 0 && (
                                            <tr>
                                                <td colSpan="5" className="px-6 py-10 text-center text-gray-600 italic text-xs">No categorical data available.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                   )}
                </div>
            </div>
        )}
      </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-6 animate-in fade-in duration-300">
          <div className="bg-[#0F0F0F] border border-white/10 rounded-[2.5rem] w-full max-w-xl overflow-hidden shadow-[0_0_100px_-20px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-800 flex justify-between items-center bg-black">
              <div>
                <h2 className="text-lg font-normal tracking-tighter">System Settings</h2>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-normal mt-1">Core Engine Controls</p>
              </div>
              <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-white transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar bg-[#0A0A0A]">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-normal">LLM Provider</label>
                  <div className="relative">
                    <select
                      value={config.llm_provider}
                      onChange={(e) => setConfig({...config, llm_provider: e.target.value})}
                      className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 appearance-none focus:border-emerald-500/50 outline-none transition-all font-normal"
                    >
                      <option>Gemini</option>
                      <option>OpenAI</option>
                      <option>Anthropic</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-normal">Gemini API Key</label>
                  <input
                    type="password"
                    value={config.google_api_key}
                    onChange={(e) => setConfig({...config, google_api_key: e.target.value})}
                    placeholder="Enter key to authorize scoring..."
                    className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 focus:border-emerald-500/50 outline-none transition-all font-normal"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-normal">Viking Cookies</label>
                  <textarea
                    value={config.viking_cookie}
                    onChange={(e) => setConfig({...config, viking_cookie: e.target.value})}
                    placeholder="Paste cookie string..."
                    className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 focus:border-emerald-500/50 outline-none transition-all font-normal h-24 resize-none text-[10px] custom-scrollbar"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-normal">Viking Bearer Key</label>
                  <input
                    type="password"
                    value={config.viking_bearer_token}
                    onChange={(e) => setConfig({...config, viking_bearer_token: e.target.value})}
                    placeholder="Enter authorization bearer key..."
                    className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 focus:border-emerald-500/50 outline-none transition-all font-normal"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-normal">API Endpoint</label>
                  <input
                    type="text"
                    value={config.viking_api_endpoint}
                    onChange={(e) => setConfig({...config, viking_api_endpoint: e.target.value})}
                    placeholder="/api/v1/query/stream/async"
                    className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 focus:border-emerald-500/50 outline-none transition-all font-normal"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-normal">LLM Model</label>
                    <button
                      onClick={() => setShowAddModel(!showAddModel)}
                      className="text-[9px] uppercase tracking-widest text-emerald-500 hover:text-emerald-400 font-bold"
                    >
                      + Add model
                    </button>
                  </div>

                  {showAddModel && (
                    <div className="flex gap-2 mb-2 animate-in slide-in-from-top-2 duration-200">
                      <input
                        type="text"
                        placeholder="Model name (e.g. gpt-4o)..."
                        value={newModelName}
                        onChange={(e) => setNewModelName(e.target.value)}
                        className="flex-1 bg-black border border-gray-800 rounded-lg px-3 py-2 focus:border-emerald-500/50 outline-none text-xs font-normal"
                      />
                      <button
                        onClick={() => {
                          if (newModelName.trim()) {
                            const updatedCustom = [...new Set([...(config.custom_models || []), newModelName.trim()])];
                            setConfig({...config, custom_models: updatedCustom, llm_model: newModelName.trim()});
                            setNewModelName('');
                            setShowAddModel(false);
                          }
                        }}
                        className="bg-white text-black px-4 py-2 rounded-lg text-[10px] uppercase font-bold hover:bg-gray-200"
                      >
                        Add
                      </button>
                    </div>
                  )}

                  <div className="relative">
                    <select
                       value={config.llm_model}
                       onChange={(e) => setConfig({...config, llm_model: e.target.value})}
                       className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 appearance-none focus:border-emerald-500/50 outline-none transition-all font-normal"
                    >
                      <option>gemini-1.5-flash</option>
                      <option>gemini-1.5-pro</option>
                      <option>gemini-2.0-flash</option>
                      {(config.custom_models || []).map(m => <option key={m}>{m}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-10 bg-black/40 border-t border-gray-800 flex justify-end gap-6 items-center">
               <button
                 onClick={() => setShowSettings(false)}
                 className="text-xs uppercase tracking-widest font-normal text-gray-600 hover:text-white transition-colors"
               >
                 Cancel Changes
               </button>
               <button
                 onClick={() => saveConfig(config)}
                 className="bg-white text-black px-12 py-4 rounded-2xl font-normal text-sm hover:bg-gray-200 transition-all shadow-xl active:scale-95"
               >
                 Commit Configuration
               </button>
            </div>
          </div>
        </div>
      )}
    </div>

);
};

const AnalyticsCard = ({ label, value, icon, color }) => (

  <div className="bg-[#111111] border border-gray-800 rounded-3xl p-8 space-y-4">
    <div className="flex justify-between items-start">
        <span className="text-[10px] uppercase tracking-widest text-gray-600">{label}</span>
        <div className={`p-2 rounded-lg bg-black border border-gray-800 ${color === 'emerald' ? 'text-emerald-500' : color === 'red' ? 'text-red-500' : 'text-white'}`}>
            {React.cloneElement(icon, { size: 16 })}
        </div>
    </div>
    <div className={`text-4xl font-mono ${color === 'emerald' ? 'text-emerald-500' : color === 'red' ? 'text-red-500' : 'text-white'}`}>
        {value}
    </div>
  </div>
);

const TabItem = ({ label, active, onClick }) => (
<button
onClick={onClick}
className={`relative h-full flex items-center px-4 transition-all duration-300 ${
      active ? 'text-emerald-500' : 'text-gray-600 hover:text-gray-400'
    }`}

>

      <span className={`text-sm font-normal uppercase tracking-[0.2em] ${active ? 'scale-110' : ''}`}>{label}</span>
    {active && (
      <div className="absolute bottom-0 left-0 w-full h-1 bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)] animate-in fade-in zoom-in-x-50 duration-500" />
    )}

  </button>
);

const ScoreBadge = ({ score, status }) => {
const isSkipped = status === 'SKIPPED';

// Requirement: Score column color coding: Green (>=80%), Yellow (60–79%), Red (<60%)
let colorClass = score >= 80 ? 'text-emerald-500' : score >= 60 ? 'text-yellow-500' : 'text-red-500';
let bgClass = score >= 80 ? 'bg-white/10 border-white/20' : score >= 60 ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-red-500/10 border-red-500/20';

if (isSkipped) {
colorClass = 'text-gray-500';
bgClass = 'bg-gray-500/10 border-gray-500/20';
}

return (

<div className={`inline-flex flex-col items-center justify-center p-4 rounded-xl border ${bgClass} ${colorClass} shadow-xl backdrop-blur-sm min-w-[80px]`}>
<span className="text-lg font-normal font-mono leading-none tracking-tighter">{score}%</span>
<span className="text-[8px] uppercase tracking-widest mt-1.5 font-normal opacity-60">Match</span>
</div>
);
};

export default VikingGenAIApp;
