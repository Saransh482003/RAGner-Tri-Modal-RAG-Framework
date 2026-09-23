import { useState, useRef } from "react";
import Image from "next/image";
import {
  Paperclip, FileText, Loader2, RefreshCw, PackageOpen, Trash2
} from "lucide-react";
import { PDFDocument } from "pdf-lib";
import UsageMeter from "./UsageMeter";
import { MAX_FILES, MAX_FILE_SIZE_MB, MAX_TOTAL_PAGES } from "@/lib/limits";
import styles from "@/styles/Home.module.css";

async function countPdfPages(file) {
  const buffer = await file.arrayBuffer();
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  return doc.getPageCount();
}

export default function Sidebar({
  collectionName,
  setCollectionName,
  projectName,
  setProjectName,
  workspaces = [],
  onDeleteProject,
  buildRaptor,
  setBuildRaptor,
  buildGraph,
  setBuildGraph,
  isRebuilding,
  statusMessage,
  uploadedDocs,
  isUploading,
  onUpload,
  onStageRebuild,
  usage,
  onEnterpriseTrigger,
  onUpgradeTrigger,
  onExportClick,
}) {
  const [selectedFiles, setSelectedFiles] = useState(null);
  const [pendingPages, setPendingPages] = useState(0);
  const [isCounting, setIsCounting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef(null);

  const processFileList = async (fileList) => {
    const fileArray = Array.from(fileList);
    if (fileArray.length === 0) return;

    const nonPdf = fileArray.find((f) => !f.name.toLowerCase().endsWith(".pdf"));
    if (nonPdf) {
      onEnterpriseTrigger(null);
      return;
    }

    if (!usage.isPro && fileArray.length > MAX_FILES) {
      onEnterpriseTrigger(`You selected ${fileArray.length} files (limit: ${MAX_FILES}).`);
      return;
    }

    const oversized = fileArray.find((f) => f.size > MAX_FILE_SIZE_MB * 1024 * 1024);
    if (!usage.isPro && oversized) {
      const sizeMb = (oversized.size / (1024 * 1024)).toFixed(1);
      onEnterpriseTrigger(`"${oversized.name}" is ${sizeMb}MB (limit: ${MAX_FILE_SIZE_MB}MB).`);
      return;
    }

    setIsCounting(true);
    try {
      const pageCounts = await Promise.all(fileArray.map(countPdfPages));
      const totalPages = pageCounts.reduce((a, b) => a + b, 0);

      if (!usage.isPro && usage.pagesUsed + totalPages > MAX_TOTAL_PAGES) {
        onUpgradeTrigger();
        setIsCounting(false);
        return;
      }

      setSelectedFiles(fileArray);
      setPendingPages(totalPages);
    } catch (err) {
      console.error("Failed to read PDF page counts:", err);
    } finally {
      setIsCounting(false);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) processFileList(e.target.files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) processFileList(e.dataTransfer.files);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedFiles || selectedFiles.length === 0) return;
    onUpload(selectedFiles, pendingPages);
    setSelectedFiles(null);
    setPendingPages(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async () => {
    if (!projectName) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete project "${projectName}"? This will permanently wipe all its vectors from Qdrant.`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    await onDeleteProject(projectName);
    setIsDeleting(false);
  };

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          <Image
            src="/RAGner-Logo-Circular.png"
            alt="RAGner Logo"
            width={26}
            height={26}
            className={styles.titleLogoImg}
          />
          RAGner
        </h1>
        <p className={styles.subtitle}>Agentic Retrieval Engine</p>
      </div>

      <div className={styles.sidebarContent}>
        <div className={styles.fieldGroup}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Master Collection (Fixed)</label>
            <div className={styles.staticBadgeSm}>
              <span className={styles.staticBadgeDot} />
              {collectionName || "ragner_master_collection"}
            </div>
          </div>

          <div className={styles.field}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <label className={styles.fieldLabel} style={{ margin: 0 }}>Project Slug (Tag)</label>
              {onDeleteProject && projectName && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  title={`Delete project "${projectName}"`}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--danger, #ef4444)",
                    cursor: isDeleting ? "not-allowed" : "pointer",
                    padding: "2px 4px",
                    display: "flex",
                    alignItems: "center",
                    opacity: isDeleting ? 0.5 : 1,
                  }}
                >
                  {isDeleting ? <Loader2 size={13} className={styles.spin} /> : <Trash2 size={13} />}
                </button>
              )}
            </div>

            {/* If the user has saved projects from prior logins, offer quick switching */}
            {workspaces.length > 0 && (
              <select
                value={workspaces.includes(projectName) ? projectName : ""}
                onChange={(e) => {
                  if (e.target.value) setProjectName(e.target.value);
                }}
                className={styles.textInputSm}
                style={{ marginBottom: "6px" }}
              >
                <option value="" disabled>Saved Projects ({workspaces.length})</option>
                {workspaces.map((ws) => (
                  <option key={ws} value={ws}>
                    {ws}
                  </option>
                ))}
              </select>
            )}

            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              placeholder="e.g. nvidia or create-new"
              className={styles.textInputSm}
            />
          </div>
        </div>

        <h2 className={styles.sectionTitle}>Ingestion Pipeline</h2>

        <form onSubmit={handleSubmit}>
          <div
            className={`${styles.uploadBox} ${dragActive ? styles.uploadBoxActive : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf"
              onChange={handleFileInputChange}
              id="file-upload"
              style={{ display: "none" }}
            />
            <label htmlFor="file-upload" className={styles.uploadLabel}>
              <Paperclip size={20} className={styles.uploadIcon} />
              <span className={styles.uploadText}>
                {isCounting
                  ? "Counting pages..."
                  : selectedFiles && selectedFiles.length > 0
                  ? `${selectedFiles.length} file(s) selected -- ${pendingPages} pages`
                  : "Select or drop PDF documents"}
              </span>
            </label>
          </div>

          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={buildRaptor} onChange={(e) => setBuildRaptor(e.target.checked)} />
              Build RAPTOR Tree (K-Means)
            </label>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={buildGraph} onChange={(e) => setBuildGraph(e.target.checked)} />
              Build Knowledge Graph (Neo4j)
            </label>
          </div>

          <button
            type="submit"
            disabled={!selectedFiles || isUploading || isCounting}
            className={styles.submitBtn}
          >
            {isUploading ? <Loader2 size={16} className={styles.spin} /> : <FileText size={16} />}
            {isUploading ? "Processing..." : "Upload & Build"}
          </button>
        </form>

        <div className={styles.recoverySection}>
          <label className={styles.fieldLabel}>Stage Recovery (No Re-upload)</label>
          <div className={styles.recoveryRow}>
            <button
              type="button"
              disabled={isRebuilding}
              onClick={() => onStageRebuild("raptor")}
              className={styles.recoveryBtn}
            >
              <RefreshCw size={12} className={isRebuilding ? styles.spin : ""} />
              RAPTOR
            </button>
            <button
              type="button"
              disabled={isRebuilding}
              onClick={() => onStageRebuild("graph")}
              className={styles.recoveryBtn}
            >
              <RefreshCw size={12} className={isRebuilding ? styles.spin : ""} />
              GRAPH
            </button>
          </div>
        </div>

        {statusMessage && <div className={styles.statusPill}>{statusMessage}</div>}

        <UsageMeter
          filesCount={uploadedDocs.length}
          pagesUsed={usage.pagesUsed}
          pageCap={usage.pageCap}
          questionsUsed={usage.questionsUsed}
          isPro={usage.isPro}
        />

        {uploadedDocs.length > 0 && (
          <div className={styles.corpusSection}>
            <h2 className={styles.sectionTitle}>Session Corpus</h2>
            <ul className={styles.docList}>
              {uploadedDocs.map((doc, idx) => (
                <li key={idx} className={styles.docItem}>
                  <FileText size={14} className={styles.docIcon} />
                  <span className={styles.docName}>{doc}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.exportSection}>
          <h2 className={styles.sectionTitle}>Developer Export</h2>
          <p className={styles.exportBlurb}>
            Just want the raw Qdrant vectors and Neo4j graph for this project?
          </p>
          <button type="button" className={styles.exportBtn} onClick={onExportClick}>
            <PackageOpen size={14} />
            Export project data
          </button>
        </div>
      </div>
    </div>
  );
}
