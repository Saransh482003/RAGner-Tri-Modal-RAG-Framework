import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { Sparkles, ArrowRight, Compass, CreditCard, LayoutDashboard, LogIn } from "lucide-react";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import styles from "@/styles/Navbar.module.css";

export default function Navbar() {
  const router = useRouter();

  const isActive = (path) => router.pathname === path;

  return (
    <header className={styles.navbarWrapper}>
      <nav className={styles.navbar}>
        <Link href="/" className={styles.brand}>
          <div className={styles.brandIconWrapper}>
            <Image
              src="/RAGner-Logo-Circular.png"
              alt="RAGner Logo"
              width={34}
              height={34}
              className={styles.brandLogoImg}
              priority
            />
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
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className={styles.signInBtn}>
                <LogIn size={14} />
                <span>Sign In</span>
              </button>
            </SignInButton>
          </Show>

          <Show when="signed-in">
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: { width: 34, height: 34 },
                },
              }}
            />
          </Show>

          <Link href="/workspace" className={styles.ctaButton}>
            <span>Launch App</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </nav>
    </header>
  );
}
