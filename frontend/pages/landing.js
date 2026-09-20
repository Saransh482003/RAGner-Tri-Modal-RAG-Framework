import Head from "next/head";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Database,
  Share2,
  TreeDeciduous,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Cpu,
  FileSearch,
  Search,
  Compass,
  Sparkles,
  Bot,
  Activity,
  Workflow,
  Lock,
} from "lucide-react";
import styles from "@/styles/Landing.module.css";

export default function LandingPage() {
  return (
    <>
      <Head>
        <title>RAGner — Enterprise Agentic Retrieval Engine</title>
        <meta
          name="description"
          content="Multi-modal Retrieval Augmented Generation combining RAPTOR recursive trees, Neo4j knowledge graphs, and Cross-Encoder re-ranking for ultra-precise answers."
        />
      </Head>

      <div className={styles.landing}>
        <Navbar />

        {/* HERO */}
        <section className={styles.heroSection}>
          <div className={styles.badge}>
            <Sparkles size={14} className={styles.badgeIcon} />
            Next-Gen RAG Architecture 2.0
          </div>

          <h1 className={styles.heroTitle}>
            Zero-Hallucination Retrieval for{" "}
            <span className={styles.heroGradient}>Complex Knowledge</span>
          </h1>

          <p className={styles.heroSubtitle}>
            RAGner is an agentic, multi-layer retrieval engine. It unifies Qdrant vector search,
            recursive RAPTOR hierarchical clustering, and Neo4j knowledge graphs to answer nuanced
            domain queries with surgical precision.
          </p>

          <div className={styles.ctaGroup}>
            <Link href="/workspace" className={styles.primaryCta}>
              <span>Get Started</span>
              <ArrowRight size={18} />
            </Link>
            <Link href="/pricing" className={styles.secondaryCta}>
              View Pricing &amp; Plans
            </Link>
            <Link href="/community" className={styles.secondaryCta}>
              <Compass size={16} />
              <span>Discover Bots</span>
            </Link>
          </div>

          <div className={styles.statsBar}>
            <div className={styles.statItem}>
              <CheckCircle2 size={16} />
              <span>Multi-Strategy Autonomous Routing</span>
            </div>
            <div className={styles.statItem}>
              <CheckCircle2 size={16} />
              <span>Cross-Encoder BGE Re-ranking</span>
            </div>
            <div className={styles.statItem}>
              <CheckCircle2 size={16} />
              <span>Enterprise Data Export</span>
            </div>
          </div>
        </section>

        {/* SHOWCASE PREVIEW */}
        <section className={styles.showcaseSection}>
          <div className={styles.showcaseCard}>
            <div className={styles.showcaseHeader}>
              <div className={styles.windowControls}>
                <span className={`${styles.windowDot} ${styles.windowDotRed}`} />
                <span className={`${styles.windowDot} ${styles.windowDotYellow}`} />
                <span className={`${styles.windowDot} ${styles.windowDotGreen}`} />
              </div>
              <div className={styles.windowTitle}>ragner-core // live-agentic-orchestrator</div>
              <div className={styles.windowStatus}>
                <span className={styles.windowStatusDot} />
                Live Pipeline
              </div>
            </div>

            <div className={styles.showcaseBody}>
              <div className={styles.previewSide}>
                <div className={styles.previewBox}>
                  <div className={styles.previewBoxHeader}>
                    <span className={styles.previewBoxTitle}>
                      <Search size={15} /> Incoming Complex Query
                    </span>
                    <span className={styles.tagPill}>Multi-Hop</span>
                  </div>
                  <div className={styles.previewQuery}>
                    &ldquo;What were NVIDIA&rsquo;s data center revenues and how did their architecture evolve to support H100 GPU clusters?&rdquo;
                  </div>
                  <div className={styles.routingFlow}>
                    <span>Auto-Router Decision:</span>
                    <span className={styles.routingStep}>RAPTOR Root + Neo4j Graph + Cross-Encoder</span>
                  </div>
                </div>

                <div className={styles.sourcesList}>
                  <div className={styles.sourceMiniCard}>
                    <div>
                      <span className={`${styles.sourceMiniType} ${styles.typeRaptor}`}>RAPTOR TREE</span>
                      <span style={{ marginLeft: 8, color: "var(--text-secondary)" }}>10-K Executive Summary (L3 Cluster)</span>
                    </div>
                    <span className={styles.sourceMiniScore}>0.9842</span>
                  </div>
                  <div className={styles.sourceMiniCard}>
                    <div>
                      <span className={`${styles.sourceMiniType} ${styles.typeGraph}`}>KNOWLEDGE GRAPH</span>
                      <span style={{ marginLeft: 8, color: "var(--text-secondary)" }}>NVIDIA -[:ARCHITECTED]-&gt; Hopper H100</span>
                    </div>
                    <span className={styles.sourceMiniScore}>0.9419</span>
                  </div>
                  <div className={styles.sourceMiniCard}>
                    <div>
                      <span className={`${styles.sourceMiniType} ${styles.typeVector}`}>VECTOR CHUNK</span>
                      <span style={{ marginLeft: 8, color: "var(--text-secondary)" }}>Section 4.2: Data Center Financials</span>
                    </div>
                    <span className={styles.sourceMiniScore}>0.9120</span>
                  </div>
                </div>
              </div>

              <div className={styles.previewResult}>
                <div className={styles.resultTitle}>
                  <Sparkles size={16} /> Synthesized Verified Grounding
                </div>
                <p className={styles.resultText}>
                  According to NVIDIA&rsquo;s FY2024 annual report, the Data Center segment recorded a record <strong>$47.5 billion</strong> in revenue (up 217% year-over-year).
                </p>
                <p className={styles.resultText}>
                  Architecturally, Hopper introduced fourth-generation Tensor Cores and the Transformer Engine, which dynamically shifts between 8-bit and 16-bit precision to quadruple training throughput across multi-node InfiniBand fabrics.
                </p>
                <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "var(--text-faint)" }}>
                  <span>Grounding Confidence: 99.4%</span>
                  <span>Latency: 380ms</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3 PILLARS / FEATURES */}
        <section className={styles.featuresSection} id="features">
          <div className={styles.sectionHeader}>
            <div className={styles.sectionPretitle}>Core Capabilities</div>
            <h2 className={styles.sectionTitle}>Engineered for High-Stakes Information Retrieval</h2>
            <p className={styles.sectionSubtitle}>
              Traditional semantic search fails when queries require multi-document synthesis or entity relationships. RAGner attacks this with three specialized retrieval engines.
            </p>
          </div>

          <div className={styles.featureGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIconWrapper}>
                <TreeDeciduous size={24} />
              </div>
              <h3 className={styles.featureTitle}>RAPTOR Recursive Tree</h3>
              <p className={styles.featureDesc}>
                Hierarchical clustering with Gaussian Mixture / K-Means models. Recursively summarizes documents from granular leaves to thematic root summaries, solving whole-corpus understanding.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIconWrapper}>
                <Share2 size={24} />
              </div>
              <h3 className={styles.featureTitle}>Neo4j Knowledge Graph</h3>
              <p className={styles.featureDesc}>
                Extracts entities, relationships, and causal chains into an interactive graph database. Resolves cross-document entity linking and multi-hop questions with Cypher queries.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIconWrapper}>
                <Layers size={24} />
              </div>
              <h3 className={styles.featureTitle}>Cross-Encoder Re-Ranking</h3>
              <p className={styles.featureDesc}>
                Deep semantic re-ranking via BGE-Reranker-Large scores candidate passages against the query simultaneously, weeding out irrelevant hits before feeding context to the LLM.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIconWrapper}>
                <Cpu size={24} />
              </div>
              <h3 className={styles.featureTitle}>Autonomous Query Router</h3>
              <p className={styles.featureDesc}>
                Dynamically classifies user intent to select Vanilla Vector, RAPTOR Tree, Knowledge Graph, or a synthesized hybrid path to minimize latency and token spend.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIconWrapper}>
                <Database size={24} />
              </div>
              <h3 className={styles.featureTitle}>Master Vector Collection</h3>
              <p className={styles.featureDesc}>
                Isolated project namespaces within single scalable Qdrant collections. Ingest multiple projects side-by-side with metadata filtering and no crosstalk.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIconWrapper}>
                <ShieldCheck size={24} />
              </div>
              <h3 className={styles.featureTitle}>Zero-Vendor Lock-in</h3>
              <p className={styles.featureDesc}>
                Export raw vector payloads and Neo4j Cypher import statements anytime. Your data, embeddings, and relationship topologies remain entirely yours.
              </p>
            </div>
          </div>
        </section>

        {/* PIPELINE / ARCHITECTURE */}
        <section className={styles.pipelineSection} id="pipeline">
          <div className={styles.pipelineContainer}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionPretitle}>How It Works</div>
              <h2 className={styles.sectionTitle}>The 4-Stage Ingestion &amp; Query Pipeline</h2>
              <p className={styles.sectionSubtitle}>
                From unstructured PDFs to verifiable, grounded answers in milliseconds.
              </p>
            </div>

            <div className={styles.pipelineSteps}>
              <div className={styles.stepCard}>
                <span className={styles.stepNumber}>01</span>
                <h3 className={styles.stepTitle}>Multi-Modal Chunking</h3>
                <p className={styles.stepDesc}>
                  PDFs are parsed into semantic text chunks and structured tables. Pages and offsets are tracked for auditability.
                </p>
              </div>

              <div className={styles.stepCard}>
                <span className={styles.stepNumber}>02</span>
                <h3 className={styles.stepTitle}>Dual-Engine Ingestion</h3>
                <p className={styles.stepDesc}>
                  Vectors are embedded into Qdrant while LLM entity extractors build relationship triplets directly in Neo4j.
                </p>
              </div>

              <div className={styles.stepCard}>
                <span className={styles.stepNumber}>03</span>
                <h3 className={styles.stepTitle}>RAPTOR Clustering</h3>
                <p className={styles.stepDesc}>
                  Chunks are recursively clustered and summarized into hierarchical tree layers to capture thematic context.
                </p>
              </div>

              <div className={styles.stepCard}>
                <span className={styles.stepNumber}>04</span>
                <h3 className={styles.stepTitle}>Re-Ranked Synthesis</h3>
                <p className={styles.stepDesc}>
                  Auto-router executes targeted multi-channel retrieval, Cross-Encoder sorts top passages, and verified answer is generated.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA BANNER */}
        <section className={styles.ctaBannerSection}>
          <div className={styles.ctaBanner}>
            <div className={styles.ctaBannerContent}>
              <h2 className={styles.ctaBannerTitle}>Ready to build an unstoppable retrieval stack?</h2>
              <p className={styles.ctaBannerSubtitle}>
                Experience the power of graph-augmented and recursive tree retrieval right in your browser.
              </p>
              <Link href="/workspace" className={styles.bannerBtn}>
                <span>Open RAGner Workspace</span>
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
