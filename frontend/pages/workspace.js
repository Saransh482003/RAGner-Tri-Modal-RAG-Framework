import { useState, useRef, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Sidebar from "@/components/Sidebar";
import ChatPanel from "@/components/ChatPanel";
import UpgradeModal from "@/components/modals/UpgradeModal";
import EnterpriseModal from "@/components/modals/EnterpriseModal";
import ExportModal from "@/components/modals/ExportModal";
import { useUsageTracker } from "@/lib/useUsageTracker";
import { Database, Home as HomeIcon, CreditCard, Sparkles, Compass } from "lucide-react";
import styles from "@/styles/Home.module.css";

const API_BASE = "http://localhost:8000/api/v1";

export default function WorkspacePage() {
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [strategy, setStrategy] = useState("auto");

  const [collectionName, setCollectionName] = useState("ragner_master_collection");
  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    if (router.isReady) {
      if (router.query.collection) setCollectionName(router.query.collection);
      if (router.query.project) setProjectName(router.query.project);
    }
  }, [router.isReady, router.query]);

  const [buildRaptor, setBuildRaptor] = useState(true);
  const [buildGraph, setBuildGraph] = useState(true);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState("all");

  const [isUploading, setIsUploading] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);

  const [activeModal, setActiveModal] = useState(null);
  const [enterpriseReason, setEnterpriseReason] = useState(null);

  const messagesEndRef = useRef(null);
  const usage = useUsageTracker();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openEnterpriseModal = (reason) => {
    setEnterpriseReason(reason);
    setActiveModal("enterprise");
  };

  const openUpgradeModal = () => setActiveModal("upgrade");
  const closeModal = () => setActiveModal(null);

  const handleUpload = async (files, pageCount) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setStatusMessage(`Uploading chunks to master collection '${collectionName}'...`);

    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("files", file));
    formData.append("collection_name", collectionName);
    formData.append("project_name", projectName);
    formData.append("build_raptor", buildRaptor.toString());
    formData.append("build_graph", buildGraph.toString());

    try {
      const response = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setUploadedDocs((prev) => Array.from(new Set([...prev, ...data.documents])));
        setStatusMessage(data.message || "Upload complete!");
        usage.addPages(pageCount);

        let successMsg = `Successfully processed ${files.length} document(s) into global collection '${collectionName}', tagged for project '${projectName}'.`;
        if (data.stages_queued?.raptor || data.stages_queued?.graph) {
          successMsg += " Background tasks queued.";
        }

        setMessages((prev) => [...prev, { role: "ai", content: successMsg }]);
      } else {
        throw new Error(data.detail || "Upload failed");
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: "ai", content: `Error: ${error.message}`, isError: true }]);
      setStatusMessage("Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleStageRebuild = async (stage) => {
    setIsRebuilding(true);
    setStatusMessage(`Triggering background ${stage.toUpperCase()} build...`);

    try {
      const response = await fetch(`${API_BASE}/pipeline/rebuild`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collection_name: collectionName,
          project_name: projectName,
          document_name: selectedDoc === "all" ? null : selectedDoc,
          build_raptor: stage === "raptor" || stage === "all",
          build_graph: stage === "graph" || stage === "all",
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setStatusMessage(data.status || "Stage triggered successfully!");
        setMessages((prev) => [...prev, { role: "ai", content: `Recovery initiated: ${data.status}` }]);
      } else {
        throw new Error(data.detail || "Rebuild failed");
      }
    } catch (error) {
      setStatusMessage("Failed to trigger stage rebuild.");
      setMessages((prev) => [...prev, { role: "ai", content: `Error: ${error.message}`, isError: true }]);
    } finally {
      setIsRebuilding(false);
    }
  };

  const handleQuery = async (e) => {
    e.preventDefault();
    if (!input.trim() || isQuerying) return;
    if (usage.questionsLocked) {
      openUpgradeModal();
      return;
    }

    const userQuery = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userQuery }]);
    setIsQuerying(true);
    usage.incrementQuestions();

    try {
      const response = await fetch(`${API_BASE}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: userQuery,
          strategy: strategy,
          collection_name: collectionName,
          project_name: projectName === "master" ? null : projectName,
          document_name: selectedDoc === "all" ? null : selectedDoc,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            content: data.answer,
            sources: data.sources,
            strategy_used: data.strategy_used,
          },
        ]);
      } else {
        throw new Error(data.detail || "Query failed");
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: "ai", content: `Error: ${error.message}`, isError: true }]);
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

      <div className={styles.workspaceLayout}>
        {/* Workspace Top Navigation Bar */}
        <header className={styles.workspaceTopNav}>
          <div className={styles.topNavLeft}>
            <Link href="/" className={styles.topNavBrand} title="Back to Landing Page">
              <div className={styles.topNavLogo}>
                <Database size={16} />
              </div>
              <span className={styles.topNavName}>
                RAG<span style={{ color: "var(--primary)" }}>ner</span>
              </span>
              <span className={styles.topNavWorkspaceBadge}>Workspace</span>
            </Link>

            <div className={styles.topNavBreadcrumbs}>
              <span className={styles.breadcrumbItem}>{collectionName}</span>
              <span className={styles.breadcrumbDivider}>/</span>
              <span className={styles.breadcrumbProject}>
                {projectName || "unscoped-project"}
              </span>
            </div>
          </div>

          <div className={styles.topNavRight}>
            <Link href="/" className={styles.topNavLink}>
              <HomeIcon size={14} />
              Landing
            </Link>
            <Link href="/pricing" className={styles.topNavLink}>
              <CreditCard size={14} />
              Pricing
            </Link>
            <Link href="/community" className={styles.topNavLink}>
              <Compass size={14} />
              Discover Bots
            </Link>

            {!usage.isPro ? (
              <button onClick={openUpgradeModal} className={styles.proUpgradeBtn}>
                <Sparkles size={14} />
                <span>Upgrade Pro</span>
              </button>
            ) : (
              <span className={styles.proActiveBadge}>PRO ACTIVE</span>
            )}
          </div>
        </header>

        <div className={styles.container}>
          <Sidebar
            collectionName={collectionName}
            setCollectionName={setCollectionName}
            projectName={projectName}
            setProjectName={setProjectName}
            buildRaptor={buildRaptor}
            setBuildRaptor={setBuildRaptor}
            buildGraph={buildGraph}
            setBuildGraph={setBuildGraph}
            isRebuilding={isRebuilding}
            statusMessage={statusMessage}
            uploadedDocs={uploadedDocs}
            isUploading={isUploading}
            onUpload={handleUpload}
            onStageRebuild={handleStageRebuild}
            usage={usage}
            onEnterpriseTrigger={openEnterpriseModal}
            onUpgradeTrigger={openUpgradeModal}
            onExportClick={() => setActiveModal("export")}
          />

          <ChatPanel
            messages={messages}
            isQuerying={isQuerying}
            messagesEndRef={messagesEndRef}
            collectionName={collectionName}
            projectName={projectName}
            strategy={strategy}
            setStrategy={setStrategy}
            uploadedDocs={uploadedDocs}
            selectedDoc={selectedDoc}
            setSelectedDoc={setSelectedDoc}
            input={input}
            setInput={setInput}
            onSubmit={handleQuery}
            locked={usage.questionsLocked}
            onUpgradeClick={openUpgradeModal}
          />
        </div>
      </div>

      {activeModal === "upgrade" && (
        <UpgradeModal onClose={closeModal} onUpgraded={usage.simulateUpgrade} />
      )}
      {activeModal === "enterprise" && (
        <EnterpriseModal reason={enterpriseReason} onClose={closeModal} />
      )}
      {activeModal === "export" && (
        <ExportModal projectName={projectName || "default_project"} onClose={closeModal} />
      )}
    </>
  );
}
