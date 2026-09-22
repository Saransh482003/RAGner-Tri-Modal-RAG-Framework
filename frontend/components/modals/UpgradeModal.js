import { useState } from "react";
import { Sparkles, Check, ExternalLink, LogIn } from "lucide-react";
import { SignInButton } from "@clerk/nextjs";
import Modal from "./Modal";
import { UPGRADE_PRICE_USD, PRO_MAX_TOTAL_PAGES, LEMON_PRO_URL } from "@/lib/limits";
import styles from "@/styles/Home.module.css";

const PERKS = [
  "Unlimited questions per project",
  `${PRO_MAX_TOTAL_PAGES.toLocaleString()} page ingestion cap`,
  "Up to 5 Workspaces",
  "Full Qdrant + Neo4j raw data export included",
  "Priority RAPTOR + Knowledge Graph processing",
];

export default function UpgradeModal({ open, onClose, userId }) {
  const checkoutUrl = userId
    ? `${LEMON_PRO_URL}&checkout[custom][user_id]=${userId}`
    : null;

  return (
    <Modal open={open} onClose={onClose}>
      <div className={styles.modalIcon}>
        <Sparkles size={22} />
      </div>
      <h3 className={styles.modalTitle}>Upgrade to Pro Developer</h3>
      <p className={styles.modalSubtitle}>
        Unlock 2,000 pages, generous queries, 5 isolated workspaces, and full data export capabilities.
      </p>

      <ul className={styles.perkList}>
        {PERKS.map((perk) => (
          <li key={perk}>
            <Check size={16} className={styles.perkIcon} />
            {perk}
          </li>
        ))}
      </ul>

      <div className={styles.priceCard}>
        <span className={styles.priceAmount}>$79</span>
        <span className={styles.priceUnit}>/ month</span>
      </div>

      {userId ? (
        <a
          href={checkoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.modalPrimaryBtn}
          style={{ textDecoration: "none", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          <span>Proceed to Checkout</span>
          <ExternalLink size={16} />
        </a>
      ) : (
        <SignInButton mode="modal">
          <button className={styles.modalPrimaryBtn} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <LogIn size={16} />
            <span>Sign In to Upgrade</span>
          </button>
        </SignInButton>
      )}

      <button className={styles.modalGhostBtn} onClick={onClose}>
        Maybe later
      </button>
    </Modal>
  );
}
