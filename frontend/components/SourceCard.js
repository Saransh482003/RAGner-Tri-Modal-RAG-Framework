import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import styles from "@/styles/Home.module.css";

export default function SourceCard({ source }) {
  const [expanded, setExpanded] = useState(false);

  const getBadgeClass = (type) => {
    switch (type) {
      case "graph_edge": return styles.labelGraph;
      case "raptor_summary":
      case "raptor_root_summary": return styles.labelRaptor;
      case "table": return styles.labelTable;
      default: return styles.labelText;
    }
  };

  const getLabel = (type) => {
    if (type === "graph_edge") return "Knowledge Graph";
    if (type?.includes("raptor")) return "RAPTOR Tree";
    if (type === "table") return "Data Table";
    return "Document Text";
  };

  return (
    <div className={styles.sourceCard}>
      <div className={styles.sourceHeader}>
        <div className={styles.sourceMeta}>
          <span className={`${styles.sourceLabel} ${getBadgeClass(source.metadata.chunk_type)}`}>
            {getLabel(source.metadata.chunk_type)}
          </span>
          <span className={styles.sourceDocName}>{source.metadata.source}</span>
          <span className={styles.sourcePage}>Page {source.metadata.page_number}</span>
        </div>
        <button
          className={styles.sourceToggle}
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? "Collapse source" : "Expand source"}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      <div className={`${styles.sourceText} ${expanded ? "" : styles.collapsed}`}>
        {source.text}
      </div>

      {expanded && source.cross_encoder_score && (
        <div className={styles.sourceScore}>
          Relevance Score: {source.cross_encoder_score.toFixed(4)}
        </div>
      )}
    </div>
  );
}
