import { useState } from "react";
import { Send, Network, Loader2, Lock, ChevronDown, ChevronUp, Sparkles, HelpCircle } from "lucide-react";
import MessageBubble from "./MessageBubble";
import styles from "@/styles/Home.module.css";

export default function ChatPanel({
  messages,
  isQuerying,
  messagesEndRef,
  collectionName,
  projectName,
  strategy,
  setStrategy,
  uploadedDocs,
  selectedDoc,
  setSelectedDoc,
  input,
  setInput,
  onSubmit,
  locked,
  onUpgradeClick,
  sampleQuestions = [],
  onSelectSampleQuestion,
}) {
  const [showQuestions, setShowQuestions] = useState(true);

  // If there are messages, default to collapsed unless toggled by user
  const hasMessages = messages.length > 0;
  const isQuestionsVisible = hasMessages ? !showQuestions : showQuestions;

  const handleToggle = () => {
    setShowQuestions((prev) => !prev);
  };

  const handleQuestionClick = (q) => {
    if (onSelectSampleQuestion) {
      onSelectSampleQuestion(q);
    } else {
      setInput(q);
    }
  };

  return (
    <div className={styles.chatArea}>
      <div className={styles.messagesWindow}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyBlob} />
            <Network size={44} className={styles.emptyIcon} />
            <h2 className={styles.emptyTitle}>Workspace initialized</h2>
            <p className={styles.emptySubtitle}>
              Targeting collection <strong>{collectionName}</strong>
              <br />
              Filtered via project tag <strong>{projectName || "none"}</strong>
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => <MessageBubble key={idx} message={msg} />)
        )}

        {isQuerying && (
          <div className={`${styles.messageRow} ${styles.rowAi}`}>
            <div className={styles.loadingPill}>
              <span className={styles.loadingDots}>
                <span />
                <span />
                <span />
              </span>
              <span>Navigating vector space & knowledge graph...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputArea}>
        {sampleQuestions && sampleQuestions.length > 0 && (
          <div className={styles.sampleQuestionsContainer}>
            {hasMessages ? (
              <div>
                <button
                  type="button"
                  onClick={handleToggle}
                  className={styles.sampleQuestionsToggle}
                >
                  <Sparkles size={14} />
                  <span>Sample Questions ({sampleQuestions.length})</span>
                  {showQuestions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {showQuestions && (
                  <div className={styles.sampleQuestionsList} style={{ marginTop: 8 }}>
                    {sampleQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleQuestionClick(q)}
                        className={styles.sampleQuestionBtn}
                        disabled={isQuerying || locked}
                      >
                        <HelpCircle size={14} className={styles.sampleQuestionIcon} />
                        <span>{q}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: "0.78rem", fontWeight: 700, color: "var(--primary-dark)" }}>
                  <Sparkles size={14} />
                  <span>Suggested Prompts for this Corpus:</span>
                </div>
                <div className={styles.sampleQuestionsList}>
                  {sampleQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleQuestionClick(q)}
                      className={styles.sampleQuestionBtn}
                      disabled={isQuerying || locked}
                    >
                      <HelpCircle size={14} className={styles.sampleQuestionIcon} />
                      <span>{q}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {locked ? (
          <div className={styles.lockOverlay}>
            <Lock size={18} />
            <span>You have reached the trial limit for this workspace.</span>
            <button className={styles.lockUpgradeBtn} onClick={onUpgradeClick}>
              Upgrade to continue
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className={styles.inputForm}>
            <div className={styles.selectGroup}>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className={styles.selectInput}
              >
                <option value="auto">Auto-Router</option>
                <option value="vanilla">Vanilla Vector</option>
                <option value="raptor">RAPTOR Tree</option>
                <option value="graph">Knowledge Graph</option>
              </select>

              {uploadedDocs.length > 0 && (
                <select
                  value={selectedDoc}
                  onChange={(e) => setSelectedDoc(e.target.value)}
                  className={styles.selectInput}
                >
                  <option value="all">Global Corpus</option>
                  {uploadedDocs.map((doc, idx) => (
                    <option key={idx} value={doc}>{doc}</option>
                  ))}
                </select>
              )}
            </div>

            <div className={styles.inputWrapper}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask questions about '${projectName || "your documents"}'...`}
                className={styles.textInput}
              />
              <button
                type="submit"
                disabled={!input.trim() || isQuerying}
                className={styles.sendBtn}
              >
                {isQuerying ? <Loader2 size={18} className={styles.spin} /> : <Send size={18} />}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

