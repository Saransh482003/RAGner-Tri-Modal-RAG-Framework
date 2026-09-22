import Link from "next/link";
import Image from "next/image";
import { GitBranch, Heart, Code2 } from "lucide-react";
import styles from "@/styles/Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.grid}>
          <div className={styles.colBrand}>
            <div className={styles.brand}>
              <div className={styles.brandIconWrapper}>
                <Image
                  src="/RAGner-Logo-Circular.png"
                  alt="RAGner Logo"
                  width={32}
                  height={32}
                  className={styles.brandLogoImg}
                />
              </div>
              <span className={styles.brandName}>
                RAG<span className={styles.brandHighlight}>ner</span>
              </span>
            </div>
            <p className={styles.blurb}>
              Next-generation Agentic Retrieval Engine combining High-Density RAPTOR Trees,
              Neo4j Knowledge Graphs, and Cross-Encoder Re-ranking for zero-hallucination precision.
            </p>
            <div className={styles.statusPill}>
              <span className={styles.statusDot} />
              Engine Online &bull; v2.0 Production Ready
            </div>
          </div>

          <div className={styles.col}>
            <h4 className={styles.colHeading}>Product</h4>
            <ul className={styles.linkList}>
              <li><Link href="/workspace">Agentic Workspace</Link></li>
              <li><Link href="/pricing">Pricing Plans</Link></li>
              <li><Link href="/community">Discover Community Bots</Link></li>
              <li><a href="#pipeline">Retrieval Architecture</a></li>
            </ul>
          </div>

          <div className={styles.col}>
            <h4 className={styles.colHeading}>Retrieval Core</h4>
            <ul className={styles.linkList}>
              <li><span className={styles.techTag}>Qdrant Vector DB</span></li>
              <li><span className={styles.techTag}>Neo4j Graph Engine</span></li>
              <li><span className={styles.techTag}>RAPTOR Recursive Tree</span></li>
              <li><span className={styles.techTag}>Cohere-Reranker-Large</span></li>
            </ul>
          </div>

          <div className={styles.col}>
            <h4 className={styles.colHeading}>Developer</h4>
            <ul className={styles.linkList}>
              <li>
                <a
                  href="https://github.com/Saransh482003/RAGner"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.githubLink}
                >
                  <GitBranch size={15} />
                  GitHub Repository
                </a>
              </li>
              <li><a href="mailto:hello@saranshsaini.dev">Contact Support</a></li>
              <li><a href="https://calendly.com/saransh-saini-ai/30min" target="_blank" rel="noopener noreferrer">Enterprise Inquiries</a></li>
            </ul>
          </div>
        </div>

        <div className={styles.bottomBar}>
          <p className={styles.copyright}>
            &copy; {new Date().getFullYear()} RAGner. Built by Saransh Saini. All rights reserved.
          </p>
          <div className={styles.credits}>
            Crafted for multi-modal, agentic information extraction
          </div>
        </div>
      </div>
    </footer>
  );
}
