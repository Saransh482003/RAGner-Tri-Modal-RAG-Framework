import Link from "next/link";
import { useRouter } from "next/router";
import { Database, Sparkles, ArrowRight, Compass, CreditCard, LayoutDashboard } from "lucide-react";
import styles from "@/styles/Navbar.module.css";

export default function Navbar() {
  const router = useRouter();

  const isActive = (path) => router.pathname === path;

  return (
    <header className={styles.navbarWrapper}>
      <nav className={styles.navbar}>
        <Link href="/" className={styles.brand}>
          <div className={styles.brandIconWrapper}>
            <Database size={20} className={styles.brandIcon} />
            <span className={styles.pulsePoint} />
          </div>
          <span className={styles.brandName}>
            RAG<span className={styles.brandHighlight}>ner</span>
          </span>
          <span className={styles.brandBadge}>v2.0</span>
        </Link>

        <div className={styles.navLinks}>
          <Link
            href="/"
            className={`${styles.navLink} ${isActive("/") ? styles.navLinkActive : ""}`}
          >
            Overview
          </Link>
          <Link
            href="/workspace"
            className={`${styles.navLink} ${isActive("/workspace") ? styles.navLinkActive : ""}`}
          >
            <LayoutDashboard size={15} />
            Workspace
          </Link>
          <Link
            href="/pricing"
            className={`${styles.navLink} ${isActive("/pricing") ? styles.navLinkActive : ""}`}
          >
            <CreditCard size={15} />
            Pricing
          </Link>
          <Link
            href="/community"
            className={`${styles.navLink} ${isActive("/community") ? styles.navLinkActive : ""}`}
          >
            <Compass size={15} />
            Explore Bots
            <span className={styles.badgeSoon}>Beta</span>
          </Link>
        </div>

        <div className={styles.navActions}>
          <Link href="/workspace" className={styles.ctaButton}>
            <span>Launch App</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </nav>
    </header>
  );
}
