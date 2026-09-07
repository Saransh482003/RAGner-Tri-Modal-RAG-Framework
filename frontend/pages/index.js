import React, { useState, useRef, useEffect } from "react";
import Head from "next/head";
import { Geist, Geist_Mono } from "next/font/google";
import styles from "@/styles/Home.module.css";
import { 
  Send, Paperclip, FileText, Database, 
  Network, Zap, ChevronDown, ChevronUp, Loader2, RefreshCw
} from "lucide-react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SourceCard = ({ source }) => {
  const [expanded, setExpanded] = useState(false);
  
  const getBadgeClass = (type) => {
    switch (type) {
      case "graph_edge": return styles.labelGraph;
      case "raptor_summary": 
      case "raptor_root_summary": return styles.labelRaptor;
      case "table": return styles.labelTable;
      default: return styles.labelText;
    }
  };

  const getLabel = (type) => {
    if (type === "graph_edge") return "Knowledge Graph";
    if (type?.includes("raptor")) return "RAPTOR Tree";
    if (type === "table") return "Data Table";
    return "Document Text";
  };

  return (
    <div className={styles.sourceCard}>
      <div className={styles.sourceHeader}>
        <div className={styles.sourceMeta}>
          <span className={`${styles.sourceLabel} ${getBadgeClass(source.metadata.chunk_type)}`}>
            {getLabel(source.metadata.chunk_type)}
          </span>
          <span style={{ color: "#6b7280", fontWeight: 500 }}>{source.metadata.source}</span>
          <span style={{ color: "#9ca3af" }}>| Page {source.metadata.page_number}</span>
        </div>
        <button 
          onClick={() => setExpanded(!expanded)} 
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
      
      <div className={`${styles.sourceText} ${expanded ? "" : styles.collapsed}`}>
        {source.text}
      </div>
      
      {expanded && source.cross_encoder_score && (
        <div style={{ marginTop: "8px", fontSize: "0.75rem", color: "#9ca3af", fontFamily: "monospace" }}>
          Relevance Score: {source.cross_encoder_score.toFixed(4)}
        </div>
      )}
    </div>
  );
};

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [strategy, setStrategy] = useState("auto");
  
  // New Workspace & Pipeline State
  const [projectName, setProjectName] = useState("portfolio-demo");
  const [buildRaptor, setBuildRaptor] = useState(true);
  const [buildGraph, setBuildGraph] = useState(true);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const [files, setFiles] = useState(null);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState("all");
  
  const [isUploading, setIsUploading] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setStatusMessage("Uploading and extracting base chunks...");
    
    const formData = new FormData();
    Array.from(files).forEach(file => formData.append("files", file));
    
    // Append new granular build configurations
    formData.append("project_name", projectName);
    formData.append("build_raptor", buildRaptor.toString());
    formData.append("build_graph", buildGraph.toString());

    try {
      const response = await fetch("http://localhost:8000/api/v1/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setUploadedDocs(prev => Array.from(new Set([...prev, ...data.documents])));
        setStatusMessage(data.message || "Upload complete!");
        
        let successMsg = `✅ Successfully processed ${files.length} document(s) into workspace '${projectName}'.`;
        if (data.stages_queued?.raptor || data.stages_queued?.graph) {
           successMsg += ` Background tasks queued.`;
        }
        
        setMessages(prev => [...prev, { role: "ai", content: successMsg }]);
      } else {
        throw new Error(data.detail || "Upload failed");
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: "ai", content: `❌ Error: ${error.message}`, isError: true }]);
      setStatusMessage("Upload failed.");
    } finally {
      setIsUploading(false);
      setFiles(null);
    }
  };

  const handleStageRebuild = async (stage) => {
    setIsRebuilding(true);
    setStatusMessage(`Triggering background ${stage.toUpperCase()} build...`);

    try {
      const response = await fetch("http://localhost:8000/api/v1/pipeline/rebuild", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_name: projectName,
          document_name: selectedDoc === "all" ? null : selectedDoc,
          build_raptor: stage === "raptor" || stage === "all",
          build_graph: stage === "graph" || stage === "all",
        }),
      });
      
      const data = await response.json();
      if (response.ok) {
        setStatusMessage(data.status || "Stage triggered successfully!");
        setMessages(prev => [...prev, { role: "ai", content: `🔄 Recovery Initiated: ${data.status}` }]);
      } else {
        throw new Error(data.detail || "Rebuild failed");
      }
    } catch (error) {
      console.error("Rebuild error:", error);
      setStatusMessage("Failed to trigger stage rebuild.");
      setMessages(prev => [...prev, { role: "ai", content: `❌ Error: ${error.message}`, isError: true }]);
    } finally {
      setIsRebuilding(false);
    }
  };

  const handleQuery = async (e) => {
    e.preventDefault();
    if (!input.trim() || isQuerying) return;

    const userQuery = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userQuery }]);
    setIsQuerying(true);

    try {
      const response = await fetch("http://localhost:8000/api/v1/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: userQuery,
          strategy: strategy,
          project_name: projectName, // Pass active workspace to query router
          document_name: selectedDoc === "all" ? null : selectedDoc
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessages(prev => [...prev, { 
          role: "ai", 
          content: data.answer,
          sources: data.sources,
          strategy_used: data.strategy_used
        }]);
      } else {
        throw new Error(data.detail || "Query failed");
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: "ai", content: `❌ Error: ${error.message}`, isError: true }]);
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <>
      <Head>
        <title>RAGner | Agentic Retrieval Workspace</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <div className={`${styles.container} ${geistSans.variable} ${geistMono.variable}`}>
        
        {/* Sidebar */}
        <div className={styles.sidebar}>
          <div className={styles.header}>
            <h1 className={styles.title}>
              <Database size={24} />
              RAGner
            </h1>
            <p className={styles.subtitle}>Agentic Retrieval Engine</p>
          </div>

          <div className={styles.sidebarContent}>
            
            {/* Workspace Selection */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#4b5563", marginBottom: "8px", textTransform: "uppercase" }}>
                Active Workspace
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                placeholder="e.g. portfolio-demo"
                className={styles.textInput}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem" }}
              />
            </div>

            <h2 className={styles.sectionTitle}>Ingestion Pipeline</h2>
            
            <form onSubmit={handleUpload}>
              <div className={styles.uploadBox}>
                <input
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={(e) => setFiles(e.target.files)}
                  id="file-upload"
                  style={{ display: "none" }}
                />
                <label htmlFor="file-upload" style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
                  <Paperclip size={20} color="#9ca3af" />
                  <span style={{ fontSize: "0.875rem", color: "#4b5563", marginTop: "8px" }}>
                    {files && files.length > 0 ? `${files.length} file(s) selected` : "Select PDF documents"}
                  </span>
                </label>
              </div>

              {/* Granular Pipeline Controls */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px", marginTop: "12px" }}>
                <label style={{ fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "8px", color: "#374151", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={buildRaptor}
                    onChange={(e) => setBuildRaptor(e.target.checked)}
                  />
                  Build RAPTOR Tree (K-Means)
                </label>
                <label style={{ fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "8px", color: "#374151", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={buildGraph}
                    onChange={(e) => setBuildGraph(e.target.checked)}
                  />
                  Build Knowledge Graph (Neo4j)
                </label>
              </div>

              <button
                type="submit"
                disabled={!files || isUploading}
                className={styles.submitBtn}
              >
                {isUploading ? <Loader2 size={16} className={styles.spin} /> : <FileText size={16} />}
                {isUploading ? "Processing..." : "Upload & Build"}
              </button>
            </form>

            {/* Stage Recovery Tools */}
            <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #e5e7eb" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", marginBottom: "12px", textTransform: "uppercase" }}>
                Stage Recovery (No Re-upload)
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  disabled={isRebuilding}
                  onClick={() => handleStageRebuild("raptor")}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "8px", fontSize: "0.75rem", background: "#ffffff", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer", color: "#374151", fontWeight: 500 }}
                >
                  <RefreshCw size={12} className={isRebuilding ? styles.spin : ""} />
                  RAPTOR
                </button>
                <button
                  type="button"
                  disabled={isRebuilding}
                  onClick={() => handleStageRebuild("graph")}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "8px", fontSize: "0.75rem", background: "#ffffff", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer", color: "#374151", fontWeight: 500 }}
                >
                  <RefreshCw size={12} className={isRebuilding ? styles.spin : ""} />
                  GRAPH
                </button>
              </div>
            </div>

            {/* Global Status Message Pill */}
            {statusMessage && (
              <div style={{ marginTop: "16px", fontSize: "0.75rem", color: "#1d4ed8", background: "#eff6ff", padding: "10px", borderRadius: "6px", border: "1px solid #bfdbfe", fontWeight: 500, lineHeight: "1.4" }}>
                {statusMessage}
              </div>
            )}

            {/* Active Document Context */}
            {uploadedDocs.length > 0 && (
              <div style={{ marginTop: "32px" }}>
                <h2 className={styles.sectionTitle}>Global Corpus</h2>
                <ul className={styles.docList}>
                  {uploadedDocs.map((doc, idx) => (
                    <li key={idx} className={styles.docItem}>
                      <FileText size={14} color="#3b82f6" />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className={styles.chatArea}>
          <div className={styles.messagesWindow}>
            {messages.length === 0 ? (
              <div className={styles.emptyState}>
                <Network size={48} color="#d1d5db" style={{ marginBottom: "16px" }} />
                <h2 style={{ fontSize: "1.25rem", fontWeight: 500, color: "#4b5563", margin: 0 }}>Workspace Initialized</h2>
                <p style={{ fontSize: "0.875rem", marginTop: "8px", color: "#6b7280" }}>Upload documents or query an existing project workspace to begin.</p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isUser = msg.role === "user";
                const rowClass = isUser ? styles.rowUser : styles.rowAi;
                let bubbleClass = styles.bubbleAi;
                if (isUser) bubbleClass = styles.bubbleUser;
                if (msg.isError) bubbleClass = styles.bubbleError;

                return (
                  <div key={idx} className={`${styles.messageRow} ${rowClass}`}>
                    <div className={`${styles.bubble} ${bubbleClass}`}>
                      
                      {msg.strategy_used && (
                        <div className={styles.strategyBadge}>
                          <Zap size={12} />
                          Routed via {msg.strategy_used}
                        </div>
                      )}

                      <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>

                      {msg.sources && msg.sources.length > 0 && (
                        <div className={styles.sourcesSection}>
                          <h4 className={styles.sourcesTitle}>Grounding Sources</h4>
                          <div>
                            {msg.sources.map((source, sIdx) => (
                              <SourceCard key={sIdx} source={source} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            
            {isQuerying && (
              <div className={`${styles.messageRow} ${styles.rowAi}`}>
                <div className={styles.loadingPill}>
                  <Loader2 size={18} className={styles.spin} />
                  <span>Navigating Vector Space & Knowledge Graph...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className={styles.inputArea}>
            <form onSubmit={handleQuery} className={styles.inputForm}>
              <div className={styles.selectGroup}>
                <select 
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  className={styles.selectInput}
                >
                  <option value="auto">Auto-Router</option>
                  <option value="vanilla">Vanilla Vector</option>
                  <option value="raptor">RAPTOR Tree</option>
                  <option value="graph">Knowledge Graph</option>
                </select>

                {uploadedDocs.length > 0 && (
                  <select 
                    value={selectedDoc}
                    onChange={(e) => setSelectedDoc(e.target.value)}
                    className={styles.selectInput}
                    style={{ textOverflow: "ellipsis", maxWidth: "200px" }}
                  >
                    <option value="all">Global Corpus</option>
                    {uploadedDocs.map((doc, idx) => (
                      <option key={idx} value={doc}>{doc}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Ask questions about '${projectName}'...`}
                  className={styles.textInput}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isQuerying}
                  className={styles.sendBtn}
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}