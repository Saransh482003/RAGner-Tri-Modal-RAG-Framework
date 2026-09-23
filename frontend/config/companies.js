export const MASTER_COLLECTION = "ragner_master_collection";

export const COMPANY_DIRECTORY = {
  // master: {
  //   id: "master",
  //   displayName: "Global Master Corpus",
  //   projectName: null, // Sending null triggers Global Database Search
  //   slug: "master",
  //   description: "Global cross-document knowledge base across all indexed organizations, SEC filings, and technical papers.",
  //   docs: ["All Indexed Global Documents"],
  //   tags: ["Global Corpus", "Cross-Entity", "Auto-Router"],
  //   author: "ragner-system",
  //   sampleQuestions: [
  //     "Compare Microsoft's cloud growth with Amazon's AWS growth.",
  //     "What were the total Q2 capital expenditures for Meta and NVIDIA combined?",
  //     "What is the career transition rate for the Scaler Data Science program?"
  //   ]
  // },
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
  "big-corp-financial": {
    id: "big-corp-financial",
    displayName: "The 5 Big Corporates",
    projectName: "big-corp-financial",
    slug: "big-corp-financial",
    description: "2026 Annual reports and technical roadmaps of 5 big corporates: Alphabet, Amazon, Meta, Microsoft and NVIDIA.",
    docs: [
      "Allphabet-earnings-release.pdf",
      "AMZN-Q2-2026-Earnings-Release.pdf",
      "META-Q2-2026-Earnings-Call-Transcript.pdf",
      "Microsoft FY 2026.pdf",
      "NVIDIAAn.pdf"
    ],
    tags: ["Financials", "Annual Reports", "Corporate Strategy"],
    author: "saransh482003",
    sampleQuestions: [
      "What was the year-over-year revenue growth for Google Cloud in Q2 2026, and what specific products drove this acceleration?",
      "According to the Q2 2026 Supplemental Information table, what was the total revenue for 'Google Search & other' compared to 'YouTube ads'?",
      "What is AWS Forward Deployed Engineering, how much is Amazon investing in it, and who are some of its early customers?",
      "Look at the Segment Information table. What was the operating income for the AWS segment in Q2 2026 compared to Q2 2025?",
      "What new strategic venture did Meta announce regarding its Meta Compute effort in El Paso, Texas?",
      "How many paid seats has M365 Copilot surpassed as of FY26 Q4?",
      "The NVIDIA Vera Rubin platform is ramping into full production. Which specific cloud partners are currently running it?"
    ]
  },
  "triomics": {
    id: "triomics",
    displayName: "Triomics ChatBot",
    projectName: "triomics",
    slug: "triomics",
    description: "A bot you can use to know about Triomics's Press Releases.",
    docs: [
      "Mount Sinai Launches AI-Powered- 8 Jan.pdf",
      "MSK to Deploy Triomics’ AI Platform- 4 Nov.pdf",
      "Savista partners with Triomics- 4 Nov.pdf",
      "Triomics implements AI cancer clinical-trial- 18 Nov.pdf",
      "Trusted by Leading Cancer Centers- 27 May.pdf"
    ],
    tags: ["Triomics", "Healthcare", "Press Releases"],
    author: "saransh482003",
    sampleQuestions: [
      "What is the primary benefit of deploying the oncology-specific AI tool across the Mount Sinai Health System?",
      "What kind of unstructured patient data does Triomics' AI read through at Yale Cancer Center to generate a shortlist of trials?",
      "How did Memorial Sloan Kettering Cancer Center (MSK) initially engage with Triomics before their broader collaboration?",
      "According to published results, how much have users of Triomics' product increased trial matches and enrollments?",
      "How does the Triomics platform explain its inclusion or exclusion decisions for clinical trials?",
      "How long can it manually take to pre-screen patient medical records against clinical trial portfolios?",
      "What are the main goals of the automated workflows in the Savista and Triomics platform?"
    ]
  }
};
