import { useState, useRef, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import ChatPanel from "@/components/ChatPanel";
import {
  Database,
  Home as HomeIcon,
  CreditCard,
  Compass,
  Bot,
  FileText,
  Lock,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Layers,
} from "lucide-react";
import { MASTER_COLLECTION, COMPANY_DIRECTORY } from "@/config/companies";
import { API_BASE } from "@/config/api";
import styles from "@/styles/Home.module.css";

const EXPLORE_QUESTION_LIMIT = 10;

export default function ExploreBotPage() {
  const router = useRouter();
  const { bot: botQueryKey } = router.query;

  // Resolve bot from query (e.g. /explore?bot=scaler or /explore?bot=nvidia)
  const botKey = botQueryKey && COMPANY_DIRECTORY[botQueryKey] ? botQueryKey : "scaler";
  const activeBot = COMPANY_DIRECTORY[botKey] || COMPANY_DIRECTORY.scaler;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [strategy, setStrategy] = useState("auto");
  const [isQuerying, setIsQuerying] = useState(false);
  const [questionsAsked, setQuestionsAsked] = useState(0);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset conversation and count when changing bots
  useEffect(() => {
    setMessages([]);
    setInput("");
    setQuestionsAsked(0);
  }, [botKey]);

  const locked = questionsAsked >= EXPLORE_QUESTION_LIMIT;

  const handleSelectSampleQuestion = (questionText) => {
    handleQueryDirect(questionText);
  };

  const handleQueryDirect = async (queryText) => {
    if (!queryText.trim() || isQuerying || locked) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: queryText }]);
    setIsQuerying(true);
    setQuestionsAsked((prev) => prev + 1);

    try {
      const response = await fetch(`${API_BASE}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryText,
          strategy: strategy,
          collection_name: MASTER_COLLECTION,
          project_name: activeBot.projectName,
          document_name: null,
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
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: `Error: ${error.message}`, isError: true },
      ]);
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
        <title>{activeBot.displayName} — Explore RAGner Bot</title>
        <meta
          name="description"
          content={`Explore and query the pre-indexed ${activeBot.displayName} bot with RAPTOR trees and knowledge graphs.`}
        />
      </Head>

      <div className={styles.workspaceLayout}>
        {/* Navigation Bar */}
        <header className={styles.workspaceTopNav}>
          <div className={styles.topNavLeft}>
            <Link href="/" className={styles.topNavBrand} title="Back to Landing Page">
              <div className={styles.topNavLogo}>
                <Database size={16} />
              </div>
              <span className={styles.topNavName}>
                RAG<span style={{ color: "var(--primary)" }}>ner</span>
              </span>
              <span className={styles.topNavWorkspaceBadge}>Explore Mode</span>
            </Link>

            <div className={styles.topNavBreadcrumbs}>
              <span className={styles.breadcrumbItem}>{MASTER_COLLECTION}</span>
              <span className={styles.breadcrumbDivider}>/</span>
              <span className={styles.breadcrumbProject}>
                {activeBot.projectName || "global-master"}
              </span>
            </div>
          </div>

          <div className={styles.topNavRight}>
            <Link href="/community" className={styles.topNavLink}>
              <ArrowLeft size={14} />
              All Bots
            </Link>
            <Link href="/workspace" className={styles.topNavLink}>
              <Layers size={14} />
              Full Workspace
            </Link>
            <Link href="/pricing" className={styles.topNavLink}>
              <CreditCard size={14} />
              Pricing
            </Link>
            <span className={styles.proActiveBadge}>
              {EXPLORE_QUESTION_LIMIT - questionsAsked} Queries Left
            </span>
          </div>
        </header>

        <div className={styles.container}>
          {/* Read-Only Bot Overview Sidebar (NO Ingestion Pipeline) */}
          <aside className={styles.exploreSidebar}>
            <div className={styles.exploreBotHeader}>
              <span className={styles.botHeaderBadge}>
                <CheckCircle2 size={12} />
                Verified Corpus
              </span>
              <h1 className={styles.exploreBotTitle}>{activeBot.displayName}</h1>
              <p className={styles.exploreBotDesc}>{activeBot.description}</p>
            </div>

            <div className={styles.sidebarContent}>
              {/* Question quota widget */}
              <div className={styles.exploreQuotaCard}>
                <div className={styles.exploreQuotaTitleRow}>
                  <span>Explore Session Quota</span>
                  <span className={styles.exploreQuotaPill}>
                    {questionsAsked} / {EXPLORE_QUESTION_LIMIT}
                  </span>
                </div>
                <div className={styles.usageBarTrack}>
                  <div
                    className={`${styles.usageBarFill} ${
                      locked
                        ? styles.usageBarFillRed
                        : questionsAsked >= 7
                        ? styles.usageBarFillAmber
                        : styles.usageBarFillGreen
                    }`}
                    style={{
                      width: `${Math.min(100, (questionsAsked / EXPLORE_QUESTION_LIMIT) * 100)}%`,
                    }}
                  />
                </div>
                <p style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: 8 }}>
                  Curated bots include 10 free interactive queries per session without requiring document uploads.
                </p>
              </div>

              {/* Fixed Master Collection Indicator */}
              <div className={styles.field} style={{ padding: "0 20px" }}>
                <label className={styles.fieldLabel}>Master Collection (Fixed)</label>
                <div className={styles.staticBadgeSm}>
                  <span className={styles.staticBadgeDot} />
                  {MASTER_COLLECTION}
                </div>
              </div>

              {/* Pre-Indexed Documents List */}
              <div style={{ padding: "0 20px" }}>
                <h2 className={styles.sectionTitle} style={{ marginTop: 12 }}>
                  Indexed Documents ({activeBot.docs.length})
                </h2>
                <ul className={styles.exploreDocList}>
                  {activeBot.docs.map((doc, idx) => (
                    <li key={idx} className={styles.exploreDocItem}>
                      <FileText size={15} style={{ color: "var(--primary)", flexShrink: 0 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {doc}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Bot Switcher */}
              <div style={{ padding: "0 20px", marginTop: "auto" }}>
                <h2 className={styles.sectionTitle}>Switch Demo Bot</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {Object.entries(COMPANY_DIRECTORY).map(([key, bot]) => (
                    <Link
                      key={key}
                      href={`/explore?bot=${key}`}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: key === botKey ? "var(--primary-light)" : "var(--bg-subtle)",
                        color: key === botKey ? "var(--primary-dark)" : "var(--text-secondary)",
                        border: `1px solid ${key === botKey ? "var(--primary)" : "var(--border)"}`,
                      }}
                    >
                      <span>{bot.displayName}</span>
                      {key === botKey && <span style={{ fontSize: "0.68rem", fontWeight: 700 }}>ACTIVE</span>}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Interactive Chat Panel with Sample Prompts */}
          <ChatPanel
            messages={messages}
            isQuerying={isQuerying}
            messagesEndRef={messagesEndRef}
            collectionName={MASTER_COLLECTION}
            projectName={activeBot.displayName}
            strategy={strategy}
            setStrategy={setStrategy}
            uploadedDocs={activeBot.docs}
            selectedDoc="all"
            setSelectedDoc={() => {}}
            input={input}
            setInput={setInput}
            onSubmit={handleQuery}
            locked={locked}
            onUpgradeClick={() => router.push("/pricing")}
            sampleQuestions={activeBot.sampleQuestions}
            onSelectSampleQuestion={handleSelectSampleQuestion}
          />
        </div>
      </div>
    </>
  );
}
