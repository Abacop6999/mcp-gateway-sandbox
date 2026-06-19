"use client";

import { useState } from "react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"sandbox" | "postman">("sandbox");
  
  // Sandbox State
  const [language, setLanguage] = useState<"javascript" | "typescript" | "python">("javascript");
  const [code, setCode] = useState("console.log('Hello from MCP Sandbox!');");
  const [sandboxResult, setSandboxResult] = useState<{stdout: string, stderr: string, exitCode: number} | null>(null);
  const [sandboxLoading, setSandboxLoading] = useState(false);

  // Postman State
  const [collectionUrl, setCollectionUrl] = useState("https://raw.githubusercontent.com/postmanlabs/newman/develop/examples/sample-collection.json");
  const [postmanResult, setPostmanResult] = useState<any>(null);
  const [postmanLoading, setPostmanLoading] = useState(false);

  const runSandbox = async () => {
    setSandboxLoading(true);
    setSandboxResult(null);
    try {
      const res = await fetch("http://localhost:4000/api/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code }),
      });
      const data = await res.json();
      setSandboxResult(data);
    } catch (e: any) {
      setSandboxResult({ stdout: "", stderr: e.message || "Network Error", exitCode: -1 });
    }
    setSandboxLoading(false);
  };

  const runPostman = async () => {
    setPostmanLoading(true);
    setPostmanResult(null);
    try {
      const res = await fetch("http://localhost:4000/api/postman", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionUrl }),
      });
      const data = await res.json();
      setPostmanResult(data);
    } catch (e: any) {
      setPostmanResult({ error: e.message || "Network Error" });
    }
    setPostmanLoading(false);
  };

  return (
    <main className="min-h-screen p-8 md:p-12 lg:p-24 flex flex-col items-center">
      <div className="w-full max-w-6xl space-y-8">
        
        {/* Header */}
        <header className="text-center space-y-4">
          <div className="inline-block p-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-2">
            <span className="text-blue-400 font-semibold text-sm px-4">MCP Gateway Dashboard</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            Model Context Protocol
          </h1>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Secure, isolated execution environment for AI-generated code and automated test collections.
          </p>
        </header>

        {/* Navigation */}
        <div className="flex justify-center gap-4 mb-8">
          <button 
            onClick={() => setActiveTab("sandbox")}
            className={`px-6 py-2 rounded-full font-medium transition-all ${
              activeTab === "sandbox" ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            Code Sandbox
          </button>
          <button 
            onClick={() => setActiveTab("postman")}
            className={`px-6 py-2 rounded-full font-medium transition-all ${
              activeTab === "postman" ? "bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            Postman Reporter
          </button>
        </div>

        {/* Sandbox Content */}
        {activeTab === "sandbox" && (
          <div className="glass-panel rounded-2xl p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                  Payload Input
                </h2>
                <select 
                  className="bg-zinc-900 border border-zinc-700 text-sm rounded-lg px-3 py-1.5 focus:ring-blue-500 focus:border-blue-500"
                  value={language}
                  onChange={(e: any) => setLanguage(e.target.value)}
                >
                  <option value="javascript">JavaScript</option>
                  <option value="typescript">TypeScript</option>
                  <option value="python">Python</option>
                </select>
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-64 bg-[#1e1e1e] text-[#d4d4d4] font-mono p-4 rounded-xl border border-zinc-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                spellCheck={false}
              />
              <button 
                onClick={runSandbox}
                disabled={sandboxLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl glow-btn disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {sandboxLoading ? (
                   <><svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Executing...</>
                ) : (
                  <>Run Container</>
                )}
              </button>
            </div>

            <div className="space-y-4 flex flex-col h-full">
               <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                 <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                 Terminal UI
               </h2>
               <div className="terminal-ui flex-1 relative min-h-[300px]">
                 {sandboxResult ? (
                    <div>
                      <div className="text-zinc-500 select-none">$ docker run --network none {language}:alpine</div>
                      {sandboxResult.stdout && <pre className="text-emerald-400 mt-2 whitespace-pre-wrap">{sandboxResult.stdout}</pre>}
                      {sandboxResult.stderr && <pre className="text-red-400 mt-2 whitespace-pre-wrap">{sandboxResult.stderr}</pre>}
                      <div className={`mt-4 ${sandboxResult.exitCode === 0 ? 'text-zinc-500' : 'text-red-500'}`}>
                        [Process exited with code {sandboxResult.exitCode}]
                      </div>
                    </div>
                 ) : (
                    <div className="text-zinc-600 flex items-center justify-center h-full select-none">
                      Awaiting execution...
                    </div>
                 )}
               </div>
            </div>
          </div>
        )}

        {/* Postman Content */}
        {activeTab === "postman" && (
          <div className="glass-panel rounded-2xl p-6 md:p-8 space-y-6">
             <div className="flex flex-col md:flex-row gap-4">
                <input 
                  type="text"
                  value={collectionUrl}
                  onChange={(e) => setCollectionUrl(e.target.value)}
                  placeholder="Postman Collection URL or JSON string"
                  className="flex-1 bg-[#1e1e1e] text-white px-4 py-3 rounded-xl border border-zinc-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
                <button 
                  onClick={runPostman}
                  disabled={postmanLoading}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 py-3 rounded-xl glow-btn-success disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                   {postmanLoading ? "Running..." : "Run Collection"}
                </button>
             </div>

             {postmanResult && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-zinc-800">
                   {postmanResult.error ? (
                      <div className="col-span-full p-4 bg-red-900/20 border border-red-500/50 rounded-xl text-red-400">
                         {postmanResult.error}
                      </div>
                   ) : (
                      <>
                        <div className={`p-6 rounded-2xl border ${postmanResult.success ? 'bg-emerald-900/10 border-emerald-500/30' : 'bg-red-900/10 border-red-500/30'} flex flex-col items-center justify-center`}>
                           <div className="text-5xl mb-2">{postmanResult.success ? '✅' : '❌'}</div>
                           <div className="text-lg font-semibold text-white">Status</div>
                           <div className={`text-sm ${postmanResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                             {postmanResult.success ? 'All Tests Passed' : 'Failures Detected'}
                           </div>
                        </div>

                        <div className="p-6 rounded-2xl border bg-zinc-900/50 border-zinc-700/50 flex flex-col items-center justify-center">
                           <div className="text-4xl font-bold text-blue-400 mb-2">{postmanResult.stats?.requests?.total || 0}</div>
                           <div className="text-lg font-semibold text-white">Requests</div>
                           <div className="text-sm text-zinc-400">Total executed</div>
                        </div>

                        <div className="p-6 rounded-2xl border bg-zinc-900/50 border-zinc-700/50 flex flex-col items-center justify-center">
                           <div className="text-4xl font-bold text-purple-400 mb-2">{postmanResult.stats?.assertions?.total || 0}</div>
                           <div className="text-lg font-semibold text-white">Assertions</div>
                           <div className="text-sm text-zinc-400">{postmanResult.stats?.assertions?.failed || 0} failed</div>
                        </div>

                        {!postmanResult.success && postmanResult.failures?.length > 0 && (
                          <div className="col-span-full mt-4">
                             <h3 className="text-lg font-medium text-red-400 mb-4">Failure Details</h3>
                             <div className="space-y-2">
                               {postmanResult.failures.map((f: any, i: number) => (
                                 <div key={i} className="bg-red-950/30 border border-red-900/50 p-4 rounded-lg">
                                    <div className="font-semibold text-red-300">{f.source || 'Unknown source'}</div>
                                    <div className="text-red-400/80 text-sm mt-1">{f.error}</div>
                                 </div>
                               ))}
                             </div>
                          </div>
                        )}
                      </>
                   )}
                </div>
             )}
          </div>
        )}

      </div>
    </main>
  );
}
