import { useUser, SignInButton } from "@clerk/nextjs";
import { LogIn } from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Check, Sparkles, Building2, ArrowRight, ShieldCheck, HelpCircle, Users, Zap, Terminal } from "lucide-react";
import {
  CALENDLY_URL,
  CONTACT_EMAIL,
  MAX_FILES,
  MAX_TOTAL_PAGES,
  MAX_QUESTIONS,
  STARTER_PRICE_USD,
  STARTER_MAX_TOTAL_PAGES,
  STARTER_MAX_QUESTIONS,
  PRO_PRICE_USD,
  PRO_MAX_TOTAL_PAGES,
  PRO_MAX_WORKSPACES,
  EXPORT_PRICE_USD,
  LEMON_STARTER_URL,
  LEMON_PRO_URL,
} from "@/lib/limits";
import styles from "@/styles/Pricing.module.css";

export default function PricingPage() {
  const { user } = useUser();

  // Dynamically build the checkout links with the Clerk ID!
  const starterCheckoutUrl = user?.id 
    ? `${LEMON_STARTER_URL}&checkout[custom][user_id]=${user.id}` 
    : null;
    
  const proCheckoutUrl = user?.id 
    ? `${LEMON_PRO_URL}&checkout[custom][user_id]=${user.id}` 
    : null;
    
  return (
    <>
      <Head>
        <title>Pricing &amp; Plans — RAGner Agentic Engine</title>
        <meta
          name="description"
          content="Simple, predictable pricing for RAGner. Free Sandbox, Starter, Pro Developer, and Custom Enterprise deployments."
        />
      </Head>

      <div className={styles.pricingPage}>
        <Navbar />

        <div className={styles.pricingHeader}>
          <div className={styles.badge}>
            <Sparkles size={14} />
            Predictable &amp; Developer-First
          </div>
          <h1 className={styles.title}>
            Transparent Pricing for <br />
            <span className={styles.gradientText}>Every Stage of Scale</span>
          </h1>
          <p className={styles.subtitle}>
            From anonymous sandbox trials to multi-workspace production systems. Choose the right tier for your ingestion volume and multi-hop retrieval workloads.
          </p>
        </div>

        {/* 4-TIER ARCHITECTURE */}
        <div className={styles.grid}>
          {/* TIER 1: SANDBOX ($0) */}
          <div className={styles.card}>
            <h3 className={styles.planName}>Sandbox</h3>
            <p className={styles.planDesc}>
              Instant zero-setup trial with an anonymous auto-generated workspace UUID.
            </p>
            <div className={styles.priceRow}>
              <span className={styles.priceNumber}>$0</span>
              <span className={styles.pricePeriod}>/ forever</span>
            </div>

            <ul className={styles.featureList}>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span>Max <strong>{MAX_FILES} PDF files</strong></span>
              </li>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span><strong>{MAX_TOTAL_PAGES} pages total</strong> (pre-validated)</span>
              </li>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span><strong>{MAX_QUESTIONS} queries</strong> with Cross-Encoder</span>
              </li>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span>Anonymous workspace session</span>
              </li>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span>RAPTOR hierarchical clustering</span>
              </li>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span>Neo4j entity graph extraction</span>
              </li>
            </ul>

            <Link href="/workspace" className={styles.btnSecondary}>
              Launch Sandbox
            </Link>
          </div>

          {/* TIER 2: STARTER ($29/mo) */}
          <div className={styles.card}>
            <h3 className={styles.planName}>Starter</h3>
            <p className={styles.planDesc}>
              For individual researchers and engineers building with a dedicated authenticated workspace.
            </p>
            <div className={styles.priceRow}>
              <span className={styles.priceNumber}>${STARTER_PRICE_USD}</span>
              <span className={styles.pricePeriod}>/ month</span>
            </div>

            <ul className={styles.featureList}>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span><strong>{STARTER_MAX_TOTAL_PAGES} pages</strong> total ingestion volume</span>
              </li>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span><strong>1 Dedicated Workspace</strong> with custom project name</span>
              </li>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span><strong>{STARTER_MAX_QUESTIONS} queries</strong> / month</span>
              </li>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span>Full Cross-Encoder Cohere re-ranking</span>
              </li>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span>Multi-stage pipeline recovery</span>
              </li>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span>Developer community support</span>
              </li>
            </ul>

            {user?.id ? (
              <a
                href={starterCheckoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.btnSecondary}
              >
                Start Starter Plan
              </a>
            ) : (
              <SignInButton mode="modal">
                <button className={styles.btnSecondary} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <LogIn size={16} /> Sign In to Buy
                </button>
              </SignInButton>
            )}
          </div>

          {/* TIER 3: PRO DEVELOPER ($79/mo — POPULAR) */}
          <div className={`${styles.card} ${styles.cardPopular}`}>
            <div className={styles.popularTag}>Most Popular</div>
            <h3 className={styles.planName}>Pro Developer</h3>
            <p className={styles.planDesc}>
              For power-users and builders managing multiple domain projects with complete data export rights.
            </p>
            <div className={styles.priceRow}>
              <span className={styles.priceNumber}>${PRO_PRICE_USD}</span>
              <span className={styles.pricePeriod}>/ month</span>
            </div>

            <ul className={styles.featureList}>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span><strong>{PRO_MAX_TOTAL_PAGES.toLocaleString()} pages</strong> total ingestion volume</span>
              </li>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span>Up to <strong>{PRO_MAX_WORKSPACES} Workspaces</strong> (isolated project tags)</span>
              </li>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span><strong>Generous queries</strong> (unlimited daily capacity)</span>
              </li>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span><strong>Full Data Export Included</strong> (raw Qdrant JSON &amp; Cypher)</span>
              </li>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span>Priority async background RAPTOR + Graph worker</span>
              </li>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span>Priority architecture assistance</span>
              </li>
            </ul>

            {user?.id ? (
              <a
                href={proCheckoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.btnPrimary}
              >
                <span>Upgrade to Pro</span>
                <ArrowRight size={16} />
              </a>
            ) : (
              <SignInButton mode="modal">
                <button className={styles.btnPrimary} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <LogIn size={16} /> Sign In to Upgrade
                </button>
              </SignInButton>
            )}
          </div>

          {/* TIER 4: ENTERPRISE (CUSTOM DEPLOYMENT) */}
          <div className={styles.card}>
            <h3 className={styles.planName}>Enterprise</h3>
            <p className={styles.planDesc}>
              Dedicated RAGner containerized deployment in your AWS/GCP cloud using your own API keys.
            </p>
            <div className={styles.priceRow}>
              <span className={styles.priceNumber}>Custom</span>
              {/* <span className={styles.pricePeriod}>/ tailored</span> */}
            </div>

            <ul className={styles.featureList}>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span><strong>Unlimited pages</strong> &amp; custom volume sizing</span>
              </li>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span>Private VPC / on-premise Docker deployment</span>
              </li>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span>Run with <strong>your own cloud &amp; API keys</strong></span>
              </li>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span>Custom embedding models (Ollama, vLLM, Azure)</span>
              </li>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span>Dedicated Neo4j enterprise cluster setup</span>
              </li>
              <li className={styles.featureItem}>
                <Check size={18} className={styles.featureIcon} />
                <span>Full consulting setup by Saransh Saini</span>
              </li>
            </ul>

            <a
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnSecondary}
            >
              Schedule a Call
            </a>
          </div>
        </div>

        {/* FAQ SECTION */}
        <section className={styles.faqSection}>
          <h2 className={styles.faqHeading}>Frequently Asked Questions</h2>
          <div className={styles.faqGrid}>
            <div className={styles.faqCard}>
              <h3 className={styles.faqQuestion}>How does the Sandbox ($0) tier work?</h3>
              <p className={styles.faqAnswer}>
                When you land on the site, a random UUID (e.g. <code>user_8f72a</code>) is automatically generated and stored in your browser session as your project tag. You get 3 files, 50 pages total, and 30 questions with full RAPTOR and Knowledge Graph extraction without creating an account.
              </p>
            </div>
            <div className={styles.faqCard}>
              <h3 className={styles.faqQuestion}>How does Data Export work in the Pro Developer tier?</h3>
              <p className={styles.faqAnswer}>
                The Pro Developer tier has full Data Export rights. You can export your raw pipeline data at any time via <code>GET /api/v1/export/&#123;project_name&#125;</code>, which packages all project points from Qdrant and all graph relationships from Neo4j into a downloadable ZIP bundle with ready-to-run Cypher queries.
              </p>
            </div>
            <div className={styles.faqCard}>
              <h3 className={styles.faqQuestion}>How is the Enterprise tier deployed?</h3>
              <p className={styles.faqAnswer}>
                For Enterprise clients, we deploy the RAGner Docker container stack directly into your AWS or GCP VPC using your own infrastructure and API credentials. Your data never touches shared servers, satisfying HIPAA, SOC2, and proprietary security standards.
              </p>
            </div>
            <div className={styles.faqCard}>
              <h3 className={styles.faqQuestion}>Why combine RAPTOR trees with Neo4j Knowledge Graphs?</h3>
              <p className={styles.faqAnswer}>
                Vanilla RAG divides documents into disjoint chunks, missing high-level summaries and multi-hop relationships. RAPTOR builds recursive hierarchical clusters for thematic questions, while Neo4j maps entity connections across files.
              </p>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}

