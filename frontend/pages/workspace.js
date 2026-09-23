import { useState, useRef, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import Sidebar from "@/components/Sidebar";
import ChatPanel from "@/components/ChatPanel";
import UpgradeModal from "@/components/modals/UpgradeModal";
import EnterpriseModal from "@/components/modals/EnterpriseModal";
import ExportModal from "@/components/modals/ExportModal";
import { useUsageTracker } from "@/lib/useUsageTracker";
import { Home as HomeIcon, CreditCard, Sparkles, Compass, LogIn } from "lucide-react";
import { Show, SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { MASTER_COLLECTION, COMPANY_DIRECTORY } from "@/config/companies";
import { API_BASE } from "@/config/api";
import styles from "@/styles/Home.module.css";

export default function WorkspacePage() {
  const router = useRouter();
  const { user, isSignedIn } = useUser();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [strategy, setStrategy] = useState("auto");
  const [workspaces, setWorkspaces] = useState([]);

  const [collectionName] = useState(MASTER_COLLECTION);
  const [projectName, setProjectName] = useState("");

  // Check if matching company exists in COMPANY_DIRECTORY for sample questions & prefilled docs
  const matchingCompany = Object.values(COMPANY_DIRECTORY).find(
    (c) => c.projectName === projectName || c.slug === projectName || (projectName === "" && c.projectName === null)
  );

  const sampleQuestions = matchingCompany?.sampleQuestions || [];
  
  useEffect(() => {
    if (!user?.id) return;

    const fetchWorkspaces = async () => {
      try {
        const res = await fetch(`${API_BASE}/user/workspaces?user_id=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          const userProjects = data.workspaces || [];
          setWorkspaces(userProjects);

          // Auto-select their most recent project if no query param was set
          if (!router.query.project && userProjects.length > 0) {
            setProjectName(userProjects[userProjects.length - 1]);
          }
        }
      } catch (err) {
        console.error("Failed to load user workspaces:", err);
      }
    };

    fetchWorkspaces();
  }, [user?.id, router.query.project]);


  useEffect(() => {
    if (router.isReady) {
      if (router.query.project) {
        setProjectName(router.query.project);
      } else if (typeof window !== "undefined") {
        // Tier 1: Sandbox UUID auto-generation if no project slug is specified
        const storedUid = window.localStorage.getItem("ragner_sandbox_user_uuid");
        if (storedUid) {
          setProjectName(storedUid);
        } else {
          const newUid = `user_${Math.random().toString(36).substring(2, 7)}`;
          window.localStorage.setItem("ragner_sandbox_user_uuid", newUid);
          setProjectName(newUid);
        }
      }
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

    if (user?.id) {
      formData.append("user_id", user.id);
    }

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

  const handleDeleteProject = async (slugToDelete) => {
    try {
      const res = await fetch(
        `${API_BASE}/delete-project/${slugToDelete}?user_id=${user?.id || ""}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        const updated = workspaces.filter((w) => w !== slugToDelete);
        setWorkspaces(updated);
        setUploadedDocs([]);
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: `Project '${slugToDelete}' and its indexed vectors were successfully deleted.` }
        ]);
        setProjectName(updated.length > 0 ? updated[updated.length - 1] : "default-project");
      } else {
        const data = await res.json();
        throw new Error(data.detail || "Failed to delete project");
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: `Failed to delete project: ${err.message}`, isError: true }
      ]);
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

  const handleQueryDirect = async (queryText) => {
    if (!queryText.trim() || isQuerying) return;
    if (usage.questionsLocked) {
      openUpgradeModal();
      return;
    }

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: queryText }]);
    setIsQuerying(true);
    usage.incrementQuestions();

    try {
      const response = await fetch(`${API_BASE}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryText,
          strategy: strategy,
          collection_name: collectionName,
          project_name: projectName === "master" ? null : projectName,
          document_name: selectedDoc === "all" ? null : selectedDoc,
          user_id: user?.id || null,
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

  const handleQuery = async (e) => {
    e?.preventDefault?.();
    if (!input.trim()) return;
    handleQueryDirect(input.trim());
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
                <Image
                  src="/RAGner-Logo-Circular.png"
                  alt="RAGner Logo"
                  width={24}
                  height={24}
                  className={styles.brandLogoImg}
                />
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

            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className={styles.signInBtnNav}>
                  <LogIn size={13} />
                  <span>Sign In</span>
                </button>
              </SignInButton>
            </Show>

            <Show when="signed-in">
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: { width: 30, height: 30 },
                  },
                }}
              />
            </Show>
          </div>
        </header>

        <div className={styles.container}>
          <Sidebar
            collectionName={collectionName}
            projectName={projectName}
            setProjectName={setProjectName}
            workspaces={workspaces}
            onDeleteProject={handleDeleteProject}
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
            sampleQuestions={sampleQuestions}
            onSelectSampleQuestion={handleQueryDirect}
          />
        </div>
      </div>

      {activeModal === "upgrade" && (
        <UpgradeModal 
          open={true} 
          onClose={closeModal} 
          userId={user?.id}
          onUpgraded={usage.simulateUpgrade} 
        />
      )}
      {activeModal === "enterprise" && (
        <EnterpriseModal 
          open={true} 
          reason={enterpriseReason} 
          onClose={closeModal} 
        />
      )}
      {activeModal === "export" && (
        <ExportModal
          open={true}
          projectName={projectName || "default_project"}
          userId={user?.id}
          onClose={closeModal}
          isPro={usage.isPro}
        />
      )}
    </>
  );
}
