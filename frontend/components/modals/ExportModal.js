import { useState } from "react";
import { PackageOpen, Check, Loader2, Download, ExternalLink } from "lucide-react";
import Modal from "./Modal";
import { EXPORT_PRICE_USD, LEMON_EXPORT_URL } from "@/lib/limits";
import { API_BASE } from "@/config/api";
import styles from "@/styles/Home.module.css";

const CONTENTS = [
  "qdrant_vectors.json -- every vector + payload for this project",
  "neo4j_triplets.csv -- every knowledge-graph edge as a flat table",
  "neo4j_import.cypher -- ready-to-run MERGE statements",
];

export default function ExportModal({ open, onClose, projectName, isPro = false }) {
  const [phase, setPhase] = useState("pitch"); // pitch -> processing -> done -> error

  const handleFreeDownload = async () => {
    setPhase("processing");
    try {
      const response = await fetch(`${API_BASE}/export/${encodeURIComponent(projectName)}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectName || "ragner_project"}_export.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setPhase("done");
    } catch (error) {
      console.error("Export error:", error);
      setPhase("error");
    }
  };

  const handleClose = () => {
    setPhase("pitch");
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose}>
      {phase === "pitch" && (
        <>
          <div className={`${styles.modalIcon} ${styles.modalIconGold}`}>
            <PackageOpen size={22} />
          </div>
          <h3 className={styles.modalTitle}>Export your raw pipeline data</h3>
          <p className={styles.modalSubtitle}>
            Want the raw Qdrant vectors and Neo4j graph for project{" "}
            <strong>{projectName || "this workspace"}</strong>? Download everything packaged into an import-ready zip bundle.
          </p>

          <ul className={styles.perkList}>
            {CONTENTS.map((item) => (
              <li key={item}>
                <Check size={16} className={styles.perkIcon} />
                {item}
              </li>
            ))}
          </ul>

          {isPro ? (
            <div className={styles.priceCard}>
              <span className={styles.priceAmount}>Free</span>
              <span className={styles.priceUnit}>included with Pro</span>
            </div>
          ) : (
            <div className={styles.priceCard}>
              <span className={styles.priceAmount}>${EXPORT_PRICE_USD}</span>
              <span className={styles.priceUnit}>one-time checkout</span>
            </div>
          )}

          {isPro ? (
            <button className={styles.modalPrimaryBtn} onClick={handleFreeDownload}>
              Download Export (.zip)
            </button>
          ) : (
            <a
              href={LEMON_EXPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.modalPrimaryBtn}
              style={{
                textDecoration: "none",
                textAlign: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <span>Pay ${EXPORT_PRICE_USD} & Unlock Download</span>
              <ExternalLink size={16} />
            </a>
          )}

          <button className={styles.modalGhostBtn} onClick={handleClose}>
            Cancel
          </button>
        </>
      )}

      {phase === "processing" && (
        <div className={styles.modalCenter}>
          <Loader2 size={28} className={styles.spin} />
          <p className={styles.modalSubtitle}>Bundling your export zip...</p>
        </div>
      )}

      {phase === "done" && (
        <div className={styles.modalCenter}>
          <div className={`${styles.modalIcon} ${styles.modalIconSuccess}`}>
            <Download size={22} />
          </div>
          <h3 className={styles.modalTitle}>Your export is downloading</h3>
          <p className={styles.modalSubtitle}>Check your browser downloads for the zip file.</p>
          <button className={styles.modalPrimaryBtn} onClick={handleClose}>
            Done
          </button>
        </div>
      )}

      {phase === "error" && (
        <div className={styles.modalCenter}>
          <h3 className={styles.modalTitle}>Export failed</h3>
          <p className={styles.modalSubtitle}>
            No data was found for this project, or the server is unreachable. Confirm the
            project has been uploaded and try again.
          </p>
          <button className={styles.modalPrimaryBtn} onClick={() => setPhase("pitch")}>
            Try again
          </button>
        </div>
      )}
    </Modal>
  );
}
