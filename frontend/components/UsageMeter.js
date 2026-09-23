import { MAX_FILES, MAX_QUESTIONS } from "@/lib/limits";
import styles from "@/styles/Home.module.css";

function Bar({ label, used, cap, unlimited }) {
  // Fix: For Pro users, fill the bar to 100% instead of locking it at an 8% sliver
  const pct = unlimited ? 100 : cap > 0 ? Math.min(100, (used / cap) * 100) : 0;
  
  let barClass = styles.usageBarFillGreen;
  
  // Optional: You can make the bar gold/blue for Pro users here if you want
  if (!unlimited && pct >= 100) barClass = styles.usageBarFillRed;
  else if (!unlimited && pct >= 70) barClass = styles.usageBarFillAmber;

  return (
    <div className={styles.usageRow}>
      <div className={styles.usageLabelRow}>
        <span>{label}</span>
        {/* Fix: Use the actual unicode infinity symbol (∞) instead of the number 8 */}
        <span className={styles.usageCount}>
          {unlimited ? `${used} / ∞` : `${used} / ${cap}`}
        </span>
      </div>
      <div className={styles.usageBarTrack}>
        <div className={`${styles.usageBarFill} ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function UsageMeter({ 
  filesCount = 0,
  pagesUsed = 0,
  pageCap = 50,
  questionsUsed = 0,
  questionCap = 30, 
  isPro = false,
 }) {
  return (
    <div className={styles.usageMeter}>
      <div className={styles.usageMeterHeader}>
        <span>{isPro ? "Workspace usage" : "Trial usage"}</span>
        {isPro && <span className={styles.proBadge}>PRO</span>}
      </div>
      
      <Bar label="Files this session" used={filesCount} cap={MAX_FILES} unlimited={isPro} />
      <Bar label="Pages ingested" used={pagesUsed} cap={pageCap} unlimited={isPro} />
      {/* Fix: Use the passed questionCap prop instead of the hardcoded MAX_QUESTIONS import */}
      <Bar label="Questions asked" used={questionsUsed} cap={questionCap} unlimited={isPro} />
    </div>
  );
}