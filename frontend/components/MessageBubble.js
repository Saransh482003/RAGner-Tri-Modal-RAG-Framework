import { Zap } from "lucide-react";
import SourceCard from "./SourceCard";
import styles from "@/styles/Home.module.css";

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const rowClass = isUser ? styles.rowUser : styles.rowAi;
  let bubbleClass = isUser ? styles.bubbleUser : styles.bubbleAi;
  if (message.isError) bubbleClass = styles.bubbleError;

  return (
    <div className={`${styles.messageRow} ${rowClass}`}>
      <div className={`${styles.bubble} ${bubbleClass}`}>
        {message.strategy_used && (
          <div className={styles.strategyBadge}>
            <Zap size={12} />
            Routed via {message.strategy_used}
          </div>
        )}

        <div className={styles.bubbleContent}>{message.content}</div>

        {message.sources && message.sources.length > 0 && (
          <div className={styles.sourcesSection}>
            <h4 className={styles.sourcesTitle}>Grounding Sources</h4>
            <div>
              {message.sources.map((source, sIdx) => (
                <SourceCard key={sIdx} source={source} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
