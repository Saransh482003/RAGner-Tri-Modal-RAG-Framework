import Head from "next/head";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Check, Sparkles, Building2, ArrowRight, ShieldCheck, HelpCircle } from "lucide-react";
import { CALENDLY_URL, CONTACT_EMAIL, UPGRADE_PRICE_USD, EXPORT_PRICE_USD } from "@/lib/limits";
import styles from "@/styles/Pricing.module.css";

export default function PricingPage() {
  return (
    <>
      <Head>
        <title>Pricing &amp; Plans — RAGner Agentic Engine</title>
        <meta
          name="description"
          content="Simple, predictable pricing for RAGner. Free trial, Pro workspace, and Enterprise dedicated deployments."
        />
      </Head>

      <div className={styles.pricingPage}>
        <Navbar />

        <div className={styles.pricingHeader}>
          <div className={styles.badge}>
            <Sparkles size={14} />
            Transparent &amp; Developer-Friendly
          </div>
          <h1 className={styles.title}>
            Invest in Precision, <br />
            <span className={styles.gradientText}>Eliminate Hallucinations</span>
          </h1>
          <p className={styles.subtitle}>
            Start for free to test recursive trees and knowledge graphs on your documents. Upgrade when you need higher ingestion volumes or dedicated enterprise pipelines.
          </p>
        </div>

        {/* PRICING CARDS */}
        <div className={styles.grid}>
          {/* TIER 1: FREE TRIAL */}
          <div className={styles.card}>
            <h3 className={styles.planName}>Free Sandbox</h3>
            <p className={styles.planDesc}>
              Instant zero-setup trial for developers exploring agentic multi-hop retrieval.
            </p>
            <div className={styles.priceRow}>
              <span className={styles.priceNumber}>$0</span>
              <span className={styles.pricePeriod}>/ forever</span>
            </div>

            <ul className={styles.featureList}>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span>Up to <strong>5 PDF documents</strong> per session</span>
              </li>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span><strong>100 pages</strong> total ingestion cap</span>
              </li>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span><strong>30 queries</strong> with full cross-encoder reranking</span>
              </li>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span>RAPTOR hierarchical clustering included</span>
              </li>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span>Neo4j knowledge graph entity extraction</span>
              </li>
            </ul>

            <Link href="/workspace" className={styles.btnSecondary}>
              Launch Workspace
            </Link>
          </div>

          {/* TIER 2: PRO (POPULAR) */}
          <div className={`${styles.card} ${styles.cardPopular}`}>
            <div className={styles.popularTag}>Most Popular</div>
            <h3 className={styles.planName}>Pro Developer</h3>
            <p className={styles.planDesc}>
              For researchers, power-users, and engineers processing larger corpora.
            </p>
            <div className={styles.priceRow}>
              <span className={styles.priceNumber}>${UPGRADE_PRICE_USD}</span>
              <span className={styles.pricePeriod}>/ month</span>
            </div>

            <ul className={styles.featureList}>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span><strong>Unlimited queries</strong> across all workspaces</span>
              </li>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span><strong>2,000 pages</strong> ingestion limit (20x boost)</span>
              </li>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span>Priority async background RAPTOR + Graph worker</span>
              </li>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span>Multi-project namespace isolation in Qdrant</span>
              </li>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span>Raw data export bundle option (${EXPORT_PRICE_USD} one-time)</span>
              </li>
            </ul>

            <Link href="/workspace" className={styles.btnPrimary}>
              <span>Upgrade in Workspace</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* TIER 3: ENTERPRISE */}
          <div className={styles.card}>
            <h3 className={styles.planName}>Custom Enterprise</h3>
            <p className={styles.planDesc}>
              Dedicated, private VPC deployments for organizations with sensitive compliance requirements.
            </p>
            <div className={styles.priceRow}>
              <span className={styles.priceNumber}>Custom</span>
              <span className={styles.pricePeriod}>/ tailored</span>
            </div>

            <ul className={styles.featureList}>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span>Self-hosted on AWS, GCP, or on-premise infrastructure</span>
              </li>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span>Custom embedding models (Ollama, vLLM, Bedrock, Azure)</span>
              </li>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span>Dedicated Neo4j enterprise cluster configuration</span>
              </li>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span>SOC2, HIPAA, and GDPR compliance architecture</span>
              </li>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span>Direct Slack/Teams channel with Saransh Saini</span>
              </li>
            </ul>

            <a
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnSecondary}
            >
              Book Discovery Call
            </a>
          </div>
        </div>

        {/* FAQ SECTION */}
        <section className={styles.faqSection}>
          <h2 className={styles.faqHeading}>Frequently Asked Questions</h2>
          <div className={styles.faqGrid}>
            <div className={styles.faqCard}>
              <h3 className={styles.faqQuestion}>Why do I need RAPTOR and Knowledge Graphs together?</h3>
              <p className={styles.faqAnswer}>
                Vanilla RAG chunks text into isolated fragments, losing broader narrative context and cross-page relationships. RAPTOR builds recursive summary trees so the model understands overall themes, while Neo4j extracts factual entity triples to connect concepts across separate documents.
              </p>
            </div>
            <div className={styles.faqCard}>
              <h3 className={styles.faqQuestion}>Can I export my vectors and graphs to avoid lock-in?</h3>
              <p className={styles.faqAnswer}>
                Yes! Every project workspace has a Developer Export feature. For ${EXPORT_PRICE_USD}, you can download a complete ZIP bundle containing the raw Qdrant vector JSON payloads and ready-to-run Neo4j Cypher import statements.
              </p>
            </div>
            <div className={styles.faqCard}>
              <h3 className={styles.faqQuestion}>How does billing work for the Pro tier?</h3>
              <p className={styles.faqAnswer}>
                The Pro tier is billed at ${UPGRADE_PRICE_USD}/month. During local testing, you can activate Pro directly from the UI toolbar or modal to unlock 2,000 pages and unlimited queries immediately.
              </p>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
