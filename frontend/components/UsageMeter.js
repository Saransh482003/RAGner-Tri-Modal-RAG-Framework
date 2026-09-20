import { MAX_FILES, MAX_QUESTIONS } from "@/lib/limits";
import styles from "@/styles/Home.module.css";

function Bar({ label, used, cap, unlimited }) {
  const pct = unlimited ? 8 : cap > 0 ? Math.min(100, (used / cap) * 100) : 0;
  let barClass = styles.usageBarFillGreen;
  if (!unlimited && pct >= 100) barClass = styles.usageBarFillRed;
  else if (!unlimited && pct >= 70) barClass = styles.usageBarFillAmber;

  return (
    <div className={styles.usageRow}>
      <div className={styles.usageLabelRow}>
        <span>{label}</span>
        <span className={styles.usageCount}>{unlimited ? `${used} used` : `${used} / ${cap}`}</span>
      </div>
      <div className={styles.usageBarTrack}>
        <div className={`${styles.usageBarFill} ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function UsageMeter({ filesCount, pagesUsed, pageCap, questionsUsed, isPro }) {
  return (
    <div className={styles.usageMeter}>
      <div className={styles.usageMeterHeader}>
        <span>Trial usage</span>
        {isPro && <span className={styles.proBadge}>PRO</span>}
      </div>
      <Bar label="Files this session" used={filesCount} cap={MAX_FILES} />
      <Bar label="Pages ingested" used={pagesUsed} cap={pageCap} unlimited={isPro} />
      <Bar label="Questions asked" used={questionsUsed} cap={MAX_QUESTIONS} unlimited={isPro} />
    </div>
  );
}
