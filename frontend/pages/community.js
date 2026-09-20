import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Compass, Search, Bot, ArrowRight, Sparkles, Database, Layers, Network } from "lucide-react";
import styles from "@/styles/Community.module.css";

const FEATURED_BOTS = [
  {
    id: "nvidia-annual-2024",
    name: "NVIDIA Financials & Architecture",
    description: "Deep RAPTOR synthesis of NVIDIA's 2024 10-K, covering Blackwell & Hopper GPU roadmaps and datacenter margins.",
    collection: "ragner_master_collection",
    projectSlug: "nvidia-10k",
    tags: ["RAPTOR Tree", "Finance", "Semiconductors"],
    author: "saransh482003",
    verified: true,
  },
  {
    id: "biomed-kg-pubmed",
    name: "BioMed Oncology Knowledge Graph",
    description: "Neo4j extracted drug-target-disease relationships across 140 PubMed oncology papers with multi-hop reasoning.",
    collection: "ragner_master_collection",
    projectSlug: "biomed-oncology",
    tags: ["Neo4j Graph", "Life Sciences", "Multi-Hop"],
    author: "saransh482003",
    verified: true,
  },
  {
    id: "legal-contract-auditor",
    name: "SaaS Enterprise MSA Auditor",
    description: "Identifies non-standard indemnity clauses, liability caps, and termination rights across 25 standard enterprise MSAs.",
    collection: "ragner_master_collection",
    projectSlug: "legal-msa-suite",
    tags: ["Vanilla Vector", "Legal Tech", "Cross-Encoder"],
    author: "community",
    verified: false,
  },
  {
    id: "distributed-systems-papers",
    name: "Raft, Paxos & Dynamo Systems Bot",
    description: "Multi-document comparative assistant ground in canonical distributed systems papers with cross-paper synthesis.",
    collection: "ragner_master_collection",
    projectSlug: "dist-sys-papers",
    tags: ["RAPTOR Tree", "Computer Science", "Systems"],
    author: "saransh482003",
    verified: true,
  },
  {
    id: "climate-ipcc-synthesizer",
    name: "IPCC AR6 Technical Assessment",
    description: "Comprehensive cross-encoder re-ranked queries spanning physical science basis and mitigation options.",
    collection: "ragner_master_collection",
    projectSlug: "ipcc-ar6",
    tags: ["RAPTOR Tree", "Climate", "BGE-Reranker"],
    author: "community",
    verified: false,
  },
  {
    id: "scaler-fullstack-ai",
    name: "Scaler Bot AI & Fullstack",
    description: "Pre-loaded course docs and technical references indexed with recursive cluster summaries.",
    collection: "ragner_master_collection",
    projectSlug: "scaler-bot",
    tags: ["Default Project", "Auto-Router"],
    author: "system",
    verified: true,
  },
];

export default function CommunityPage() {
  const [search, setSearch] = useState("");

  const filteredBots = FEATURED_BOTS.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.description.toLowerCase().includes(search.toLowerCase()) ||
      b.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <Head>
        <title>Discover RAG Bots — RAGner Community</title>
        <meta
          name="description"
          content="Explore agentic RAG bots trained on domain-specific corpora using RAPTOR trees and Neo4j knowledge graphs."
        />
      </Head>

      <div className={styles.communityPage}>
        <Navbar />

        <div className={styles.header}>
          <div className={styles.badge}>
            <Compass size={14} />
            Community &amp; Verified Pipelines
          </div>
          <h1 className={styles.title}>
            Discover Curated <br />
            <span className={styles.gradientText}>Agentic RAG Bots</span>
          </h1>
          <p className={styles.subtitle}>
            Explore pre-indexed vector collections, RAPTOR trees, and knowledge graphs shared by engineers and researchers. Test and fork them directly in your workspace.
          </p>

          <div className={styles.searchBarWrapper}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search by topic, paper, technology (e.g. RAPTOR, NVIDIA, Graph)..."
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
                {bot.verified && <span className={styles.statusTag}>Verified Bot</span>}
              </div>

              <h3 className={styles.botName}>{bot.name}</h3>
              <p className={styles.botDesc}>{bot.description}</p>

              <div className={styles.tagGroup}>
                {bot.tags.map((tag) => (
                  <span key={tag} className={styles.botPill}>
                    {tag}
                  </span>
                ))}
              </div>

              <div className={styles.botFooter}>
                <span className={styles.botAuthor}>
                  By <strong>@{bot.author}</strong>
                </span>
                <Link
                  href={`/workspace?collection=${bot.collection}&project=${bot.projectSlug}`}
                  className={styles.tryBotBtn}
                >
                  <span>Launch Bot</span>
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
