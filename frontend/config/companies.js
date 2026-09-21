export const MASTER_COLLECTION = "ragner_master_collection";

export const COMPANY_DIRECTORY = {
  master: {
    id: "master",
    displayName: "Global Master Corpus",
    projectName: null, // Sending null triggers Global Database Search
    slug: "master",
    description: "Global cross-document knowledge base across all indexed organizations, SEC filings, and technical papers.",
    docs: ["All Indexed Global Documents"],
    tags: ["Global Corpus", "Cross-Entity", "Auto-Router"],
    author: "ragner-system",
    sampleQuestions: [
      "Compare Microsoft's cloud growth with Amazon's AWS growth.",
      "What were the total Q2 capital expenditures for Meta and NVIDIA combined?",
      "What is the career transition rate for the Scaler Data Science program?"
    ]
  },
  scaler: {
    id: "scaler",
    displayName: "Scaler Academic & AI Programs",
    projectName: "scaler-bot",
    slug: "scaler",
    description: "Curriculum specifications, placement statistics, module breakdowns, and project guides for Scaler Academy, DSML, and Agentic AI programs.",
    docs: [
      "FDE_Brochure_.pdf",
      "Academy_brochure_2026.pdf",
      "DSML_Brochure_2026.pdf",
      "AI__ML_Agentic_AI_Brochure_.pdf"
    ],
    tags: ["RAPTOR Tree", "Tech Education", "Agentic AI"],
    author: "saransh482003",
    sampleQuestions: [
      "According to the AI/ML Agentic AI program's placement statistics, what is the career transition rate specifically for the Scaler Data Science program?",
      "What was Utkarsh Gupta's rank in the Google Hash Code 2019 competition?",
      "How long is the 'Generative AI for Data Analytics & Automation' module in the DSML program, and what specific projects does it entail?",
      "What domain options are currently trending in the 'Apply your skills to business problems' module of the DSML Program?",
      "What library and tooling skills are specifically listed for Project 6 (Meesho - A/B Experimentation Platform - Checkout Conversion)?"
    ]
  },
  nvidia: {
    id: "nvidia",
    displayName: "NVIDIA Financials & Architecture",
    projectName: "nvidia",
    slug: "nvidia",
    description: "Annual reports and technical roadmaps covering Hopper H100/H200, Blackwell architecture, and Vera Rubin datacenter platforms.",
    docs: ["NVIDIAAn.pdf"],
    tags: ["Neo4j Graph", "Semiconductors", "Financials"],
    author: "saransh482003",
    sampleQuestions: [
      "What was NVIDIA's Data Center revenue for Q2 FY27 and its year-over-year growth?",
      "Which specific cloud partners are currently running the NVIDIA Vera Rubin platform?"
    ]
  }
};
