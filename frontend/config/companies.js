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
  },
  "neuralix": {
    id: "neuralix",
    displayName: "Neuralix ChatBot",
    projectName: "neuralix",
    slug: "neuralix",
    description: "Know all about Neuralix's Data Science and AI services. Chat with the bot and get instant answers.",
    docs: [
      "AI for Manufacturing – AI Solutions For all Industries.pdf",
      "AI for Oil and Gas – AI Solutions For all Industries.pdf",
      "AI for Renewable Energy – AI Solutions For all Industries.pdf",
      "AI for Water Management – AI Solutions For all Industries.pdf",
    ],
    tags: ["Neuralix", "Data Science", "AI Services"],
    author: "saransh482003",
    sampleQuestions: [
      "What specific measurable benefit did Neuralixai achieve for a leading midstream operator in their saltwater disposal operations?",
      "Which specific operational systems does Neuralixai's AI for Oil and Gas integrate with to process live data?",
      "How does Neuralixai's AI specifically assist with solar power plants and wind energy assets?",
      "What kind of operational shift does Neuralixai enable for renewable asset maintenance?",
      "How does Neuralixai's AI optimize pump energy usage in water management operations?",
      "How does the AI platform address non-revenue water (NRW) and distribution leaks?",
      "Which major organizations and industry programs have backed Neuralixai's manufacturing AI solution?",
      "How does Neuralixai prevent 'quality leakage' from increasing operational costs in manufacturing?"
    ]
  },
  "straive": {
    id: "straive",
    displayName: "Straive ChatBot",
    projectName: "straive",
    slug: "straive",
    description: "Know all about Straive's Data Science and AI services. Chat with the bot and get instant answers.",
    docs: [
      "straive.com-AI Design Deployment.pdf",
      "straive.com-AI in Customer Experience Solution for Enterprises Enhance CX Operations.pdf",
      "straive.com-AI-Enabled GCCs for PortCos and Mid-Market Enterprises.pdf",
      "straive.com-Data Management and Analytics Services.pdf",
      "straive.com-Enterprise Agentic AI Solutions and Services.pdf",
      "straive.com-GenAI Accelerator Toolkit That Dont Box You In.pdf",
      "straive.com-Insights Analytics.pdf",
    ],
    tags: ["Straive", "Data Science", "AI Services"],
    author: "saransh482003",
    sampleQuestions: [
      "How did Straive apply its AI solutions to enhance educational accessibility for a prominent U.S.-based publisher?",
      "What specific AI design and deployment services does Straive offer to augment business capabilities?",
      "What operational improvements does Straive's Tier 2 AI-Accelerated Expert Support deliver to contact centers?",
      "What are the key functionalities of Straive's DocExplore toolkit for unstructured documents?",
      "What role does Straive's Spark.AI platform play in its Insights & Analytics offerings?",
      "What measurable results did Straive achieve through the Michigan Data Hub education project?",
      "How is Straive's AI-powered customer support framework structured across different interaction tiers?",
      "Which specific Centers of Excellence (COEs) does Straive implement to scale impact in its GCCs?"
    ]
  }
};
