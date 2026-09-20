import { useState } from "react";
import { Sparkles, Check, Loader2, PartyPopper } from "lucide-react";
import Modal from "./Modal";
import { UPGRADE_PRICE_USD, PRO_MAX_TOTAL_PAGES } from "@/lib/limits";
import styles from "@/styles/Home.module.css";

const PERKS = [
  "Unlimited questions per project",
  `${PRO_MAX_TOTAL_PAGES.toLocaleString()} page ingestion cap (up from 100)`,
  "Priority RAPTOR + Knowledge Graph processing",
];

export default function UpgradeModal({ open, onClose, onUpgraded }) {
  const [phase, setPhase] = useState("pitch"); // pitch -> processing -> success

  const handleUpgradeClick = () => {
    setPhase("processing");
    // SIMULATED CHECKOUT -- swap this timeout for a real Stripe Checkout redirect.
    setTimeout(() => {
      setPhase("success");
      onUpgraded();
    }, 1200);
  };

  const handleClose = () => {
    setPhase("pitch");
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose}>
      {phase === "pitch" && (
        <>
          <div className={styles.modalIcon}>
            <Sparkles size={22} />
          </div>
          <h3 className={styles.modalTitle}>You have hit the free limit</h3>
          <p className={styles.modalSubtitle}>
            Upgrade to keep querying this workspace without interruption.
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
            <span className={styles.priceAmount}>${UPGRADE_PRICE_USD}</span>
            <span className={styles.priceUnit}>/ month</span>
          </div>

          <button className={styles.modalPrimaryBtn} onClick={handleUpgradeClick}>
            Upgrade Now
          </button>
          <button className={styles.modalGhostBtn} onClick={handleClose}>
            Maybe later
          </button>
        </>
      )}

      {phase === "processing" && (
        <div className={styles.modalCenter}>
          <Loader2 size={28} className={styles.spin} />
          <p className={styles.modalSubtitle}>Processing payment...</p>
        </div>
      )}

      {phase === "success" && (
        <div className={styles.modalCenter}>
          <div className={`${styles.modalIcon} ${styles.modalIconSuccess}`}>
            <PartyPopper size={22} />
          </div>
          <h3 className={styles.modalTitle}>You are on the Pro plan</h3>
          <p className={styles.modalSubtitle}>
            Caps are lifted for this workspace. Happy building.
          </p>
          <button className={styles.modalPrimaryBtn} onClick={handleClose}>
            Continue
          </button>
        </div>
      )}
    </Modal>
  );
}
