import { Building2, CalendarClock, Mail } from "lucide-react";
import Modal from "./Modal";
import { CALENDLY_URL, CONTACT_EMAIL } from "@/lib/limits";
import styles from "@/styles/Home.module.css";

export default function EnterpriseModal({ open, onClose, reason }) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className={`${styles.modalIcon} ${styles.modalIconViolet}`}>
        <Building2 size={22} />
      </div>
      <h3 className={styles.modalTitle}>This is bigger than a self-serve trial</h3>
      {reason && <p className={styles.modalReason}>{reason}</p>}
      <p className={styles.modalSubtitle}>
        Need to process hundreds of documents across a complex organization?
        Book a discovery call with Saransh Saini to build a custom, dedicated
        multi-modal pipeline.
      </p>

      <a
        href={CALENDLY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.modalPrimaryBtn}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
      >
        <CalendarClock size={16} />
        Book a discovery call
      </a>
      <a
        href={`mailto:${CONTACT_EMAIL}`}
        className={styles.modalGhostBtn}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
      >
        <Mail size={14} />
        {CONTACT_EMAIL}
      </a>
    </Modal>
  );
}
