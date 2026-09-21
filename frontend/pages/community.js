import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Compass, Search, Bot, ArrowRight, Sparkles, Database, Layers, CheckCircle2 } from "lucide-react";
import { MASTER_COLLECTION, COMPANY_DIRECTORY } from "@/config/companies";
import styles from "@/styles/Community.module.css";

export default function CommunityPage() {
  const [search, setSearch] = useState("");

  const botsList = Object.values(COMPANY_DIRECTORY);

  const filteredBots = botsList.filter(
    (b) =>
      b.displayName.toLowerCase().includes(search.toLowerCase()) ||
      b.description.toLowerCase().includes(search.toLowerCase()) ||
      b.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <Head>
        <title>Discover RAG Bots — RAGner Community</title>
        <meta
          name="description"
          content="Explore curated agentic RAG bots with pre-built RAPTOR trees and Neo4j knowledge graphs."
        />
      </Head>

      <div className={styles.communityPage}>
        <Navbar />

        <div className={styles.header}>
          <div className={styles.badge}>
            <Compass size={14} />
            Explore Live Knowledge Bots
          </div>
          <h1 className={styles.title}>
            Discover Curated <br />
            <span className={styles.gradientText}>Agentic RAG Bots</span>
          </h1>
          <p className={styles.subtitle}>
            Test pre-indexed vector collections, recursive trees, and knowledge graphs. Each bot is ready to answer questions with 10 free interactive trial queries without ingestion overhead.
          </p>

          <div className={styles.searchBarWrapper}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search by topic, organization, technology (e.g. Scaler, NVIDIA, Graph)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        {/* BOTS GRID */}
        <div className={styles.botGrid}>
          {filteredBots.map((bot) => (
            <div key={bot.id} className={styles.botCard}>
              <div className={styles.botTop}>
                <div className={styles.botAvatar}>
                  <Bot size={24} />
                </div>
                <span className={styles.statusTag}>
                  <CheckCircle2 size={12} style={{ display: "inline", marginRight: 4 }} />
                  Live & Verified
                </span>
              </div>

              <h3 className={styles.botName}>{bot.displayName}</h3>
              <p className={styles.botDesc}>{bot.description}</p>

              <div className={styles.tagGroup}>
                {bot.tags.map((tag) => (
                  <span key={tag} className={styles.botPill}>
                    {tag}
                  </span>
                ))}
              </div>

              <div style={{ marginBottom: 14, fontSize: "0.78rem", color: "var(--text-muted)" }}>
                <strong>Collection:</strong> {MASTER_COLLECTION}
                <br />
                <strong>Sample Prompts:</strong> {bot.sampleQuestions?.length || 0} available
              </div>

              <div className={styles.botFooter}>
                <span className={styles.botAuthor}>
                  By <strong>@{bot.author}</strong>
                </span>
                <Link
                  href={`/explore?bot=${bot.id}`}
                  className={styles.tryBotBtn}
                >
                  <span>Explore Bot</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* COMING SOON CALLOUT */}
        <div className={styles.comingSoonBox}>
          <Sparkles size={24} style={{ color: "var(--primary)", margin: "0 auto 12px" }} />
          <h3 className={styles.comingSoonTitle}>Want to publish your own RAGner bot?</h3>
          <p className={styles.comingSoonText}>
            Public bot publishing, shared Neo4j knowledge graphs, and community voting are rolling out in the upcoming v2.1 update. You can currently build and export private bots in the workspace.
          </p>
          <Link href="/workspace" className={styles.tryBotBtn} style={{ padding: "10px 20px" }}>
            <span>Build a Bot in Workspace</span>
            <ArrowRight size={15} />
          </Link>
        </div>

        <Footer />
      </div>
    </>
  );
}
