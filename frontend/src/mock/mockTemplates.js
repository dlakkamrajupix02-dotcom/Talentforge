// export const mockTemplates = [
//   {
//     id: 1,
//     title: "Frontend Developer",
//     industry: "Technology",
//     content: {
//       summary:
//         "We are looking for a skilled Frontend Developer to build modern web applications.",

//       responsibilities: [
//         "Develop UI using React",
//         "Collaborate with designers",
//         "Write clean and maintainable code",
//         "Optimize application performance"
//       ],

//       qualifications_required: [
//         "3+ years frontend experience",
//         "Strong JavaScript knowledge",
//         "Experience with React"
//       ],

//       qualifications_preferred: [
//         "Experience with Tailwind",
//         "Knowledge of CI/CD"
//       ]
//     }
//   },
//   {
//     id: 2,
//     title: "ICU Registered Nurse",
//     industry: "Healthcare",
//     content: {
//       summary:
//         "Provide high quality nursing care to critically ill patients.",

//       responsibilities: [
//         "Monitor patient condition",
//         "Administer medications",
//         "Assist physicians",
//         "Maintain patient records"
//       ],

//       qualifications_required: [
//         "Valid RN license",
//         "2+ years ICU experience"
//       ],

//       qualifications_preferred: [
//         "Experience with EMR systems"
//       ]
//     }
//   }
// ];


export const mockTemplates = [
  // TECHNOLOGY (3)
  {
    id: "TEMP-JD-001",
    title: "Senior Frontend Developer",
    industry: "Technology",
    region: "IN",
    content: {
      jobId: "TECH_SFD_001",
      department: "Engineering",
      jobFamily: "Software Development",
      jobLevel: "L4",
      summary: "We're seeking a Senior Frontend Developer to architect and build scalable web applications using modern React ecosystems. You'll lead UI/UX implementation, mentor junior developers, and drive technical decisions that impact millions of users.",
      responsibilities: [
        { title: "Architect and develop complex React applications", weight: 25, description: "Lead the technical design and implementation of scalable frontend systems." },
        { title: "Lead code reviews and establishment of best practices", weight: 20, description: "Ensure high code quality and consistency across the team." },
        { title: "Optimize application performance", weight: 15, description: "Address Core Web Vitals and optimize bundle sizes for better UX." },
        { title: "Collaborate with UX designers", weight: 15, description: "Translate design mockups into pixel-perfect responsive interfaces." },
        { title: "Mentor junior developers", weight: 15, description: "Provide guidance and conduct technical training sessions." },
        { title: "Drive adoption of modern tools", weight: 10, description: "Evaluate and implement new technologies like Next.js and Tailwind." }
      ],
      coreCompetencies: [
        { title: "Technical Leadership", weight: 15, description: "Ability to lead teams and drive technical excellence." },
        { title: "Problem Solving", weight: 10, description: "Analytical approach to complex technical challenges." },
        { title: "Effective Communication", weight: 10, description: "Clear articulation of technical concepts to non-technical stakeholders." }
      ],
      functionalCompetencies: [
        { title: "React Ecosystem", weight: 20, description: "Deep understanding of React hooks, state management, and performance." },
        { title: "Frontend Architecture", weight: 15, description: "Designing modular and maintainable frontend architectures." },
        { title: "Web Performance", weight: 10, description: "Proficiency in optimizing web vitals and overall speed." }
      ],
      qualifications: {
        required: [
          "5+ years of frontend development experience",
          "Expert-level JavaScript/TypeScript proficiency",
          "Deep React.js knowledge (hooks, context, performance patterns)",
          "Experience with state management (Redux, Zustand, or Jotai)",
          "Strong CSS/SASS skills and responsive design expertise"
        ],
        preferred: [
          "Next.js 13+ with App Router experience",
          "GraphQL and Apollo Client knowledge",
          "CI/CD pipeline configuration (GitHub Actions, Vercel)",
          "Open source contributions or technical blog",
          "Experience with React Native or micro-frontends"
        ]
      },
      eeo_statement: "We are an Equal Opportunity Employer. We celebrate diversity and are committed to creating an inclusive environment for all employees."
    }
  },
  {
    id: "TEMP-JD-002",
    title: "DevOps Engineer",
    industry: "Technology",
    region: "US",
    content: {
      jobId: "TECH_DOE_002",
      department: "Engineering",
      jobFamily: "Infrastructure",
      jobLevel: "L3",
      summary: "Join our platform team to build and maintain cloud infrastructure that powers our global SaaS products. You'll automate deployments, optimize costs, and ensure 99.99% uptime for critical services.",
      responsibilities: [
        { title: "Design and maintain AWS/GCP infrastructure", weight: 25, description: "Manage cloud resources using Terraform and ensure high availability." },
        { title: "Build CI/CD pipelines", weight: 20, description: "Automate delivery of microservices using GitHub Actions and Jenkins." },
        { title: "Implement monitoring and alerting", weight: 15, description: "Setup Datadog dashboards and PagerDuty for incident response." },
        { title: "Optimize cloud costs", weight: 15, description: "Perform regular audits of resource utilization and suggest savings." },
        { title: "Manage Kubernetes clusters", weight: 15, description: "Oversee cluster health, scaling, and security configurations." },
        { title: "Respond to incidents", weight: 10, description: "Participate in on-call rotations and lead post-mortem discussions." }
      ],
      coreCompetencies: [
        { title: "Systems Thinking", weight: 15, description: "Understanding complex architectural interdependencies." },
        { title: "Operational Excellence", weight: 10, description: "Commitment to reliability and high-quality service delivery." },
        { title: "Agility", weight: 10, description: "Ability to adapt and iterate in fast-moving environments." }
      ],
      functionalCompetencies: [
        { title: "Infrastructure as Code", weight: 20, description: "Proficiency in Terraform, Ansible, and CloudFormation." },
        { title: "Cloud Security", weight: 15, description: "Implementing IAM, VPC, and encryption best practices." },
        { title: "Containers", weight: 10, description: "Deep knowledge of Docker and Kubernetes orchestration." }
      ],
      qualifications: {
        required: [
          "3+ years of DevOps or SRE experience",
          "Strong AWS or GCP expertise (certifications preferred)",
          "Kubernetes administration and troubleshooting skills",
          "Infrastructure as Code (Terraform, CloudFormation, or Pulumi)",
          "Scripting proficiency (Python, Bash, or Go)"
        ],
        preferred: [
          "AWS Solutions Architect or CKA certification",
          "Experience with GitOps (ArgoCD, Flux)",
          "Knowledge of security best practices (SOC2, ISO 27001)",
          "Database administration (PostgreSQL, MongoDB)",
          "Experience with chaos engineering or load testing"
        ]
      },
      eeo_statement: "We are an Equal Opportunity Employer. We celebrate diversity and are committed to creating an inclusive environment for all employees."
    }
  },
  {
    id: "TEMP-JD-003",
    title: "Product Manager - SaaS",
    industry: "Technology",
    region: "UK",
    content: {
      jobId: "TECH_PMS_003",
      department: "Product",
      jobFamily: "Product Management",
      jobLevel: "L4",
      summary: "Drive the roadmap for our flagship B2B SaaS platform. You'll work cross-functionally with engineering, design, and sales to deliver features that solve real customer problems and drive revenue growth.",
      responsibilities: [
        { title: "Own product roadmap and prioritization", weight: 25, description: "Strategically plan features using data-driven frameworks like RICE." },
        { title: "Conduct user research and analytics", weight: 20, description: "Gather insights to inform product decisions and identify opportunities." },
        { title: "Write detailed PRDs and user stories", weight: 15, description: "Communicate requirement clearly to engineering and design teams." },
        { title: "Collaborate with sales and CS", weight: 15, description: "Synthesize customer feedback into actionable product improvements." },
        { title: "Define and track KPIs", weight: 15, description: "Monitor metrics like activation, retention, and NPS." },
        { title: "Present product updates to stakeholders", weight: 10, description: "Effectively communicate product vision and progress to leadership." }
      ],
      coreCompetencies: [
        { title: "Strategic Thinking", weight: 15, description: "Connecting product goals with broader business objectives." },
        { title: "Customer Obsession", weight: 10, description: "Unwavering focus on solving user pain points." },
        { title: "Collaboration", weight: 10, description: "Building consensus across diverse cross-functional teams." }
      ],
      functionalCompetencies: [
        { title: "Agile Methodologies", weight: 20, description: "Leading scrum/kanban processes and sprint planning." },
        { title: "Data Analysis", weight: 15, description: "Extracting insights from complex datasets (SQL, Amplitude)." },
        { title: "Technical Fluency", weight: 10, description: "Understanding engineering constraints and API design." }
      ],
      qualifications: {
        required: [
          "4+ years of product management experience in B2B SaaS",
          "Track record of shipping features that drove revenue",
          "Strong SQL and data analysis skills",
          "Experience with agile methodologies (Scrum, Kanban)",
          "Excellent written and verbal communication skills"
        ],
        preferred: [
          "MBA or technical degree (CS, Engineering)",
          "Experience with product analytics tools (Amplitude, Mixpanel)",
          "Background in enterprise software or fintech",
          "Knowledge of API design and developer platforms",
          "Experience with pricing and packaging strategy"
        ]
      },
      eeo_statement: "We are an Equal Opportunity Employer. We celebrate diversity and are committed to creating an inclusive environment for all employees."
    }
  },

  // HEALTHCARE (3)
  {
    id: "TEMP-JD-004",
    title: "ICU Registered Nurse",
    industry: "Healthcare",
    region: "IN",
    content: {
      jobId: "HLTH_ICU_004",
      department: "Nursing",
      jobFamily: "Critical Care",
      jobLevel: "L3",
      summary: "Provide critical care to patients in our 24-bed Intensive Care Unit. You'll work with cutting-edge monitoring technology and collaborate with intensivists to deliver life-saving interventions.",
      responsibilities: [
        { title: "Monitor and assess critically ill patients", weight: 25, description: "Perform advanced hemodynamic monitoring and status evaluations." },
        { title: "Administer high-alert medications", weight: 20, description: "Safely manage vasopressors, sedation, and complex IV protocols." },
        { title: "Manage specialized equipment", weight: 15, description: "Operate ventilators, CRRT, and ECMO systems." },
        { title: "Collaborate with intensive care team", weight: 15, description: "Work closely with intensivists and respiratory therapists." },
        { title: "Coordinate emergency responses", weight: 15, description: "Lead or support code blue and rapid response activations." },
        { title: "Document precision patient records", weight: 10, description: "Maintain accurate electronic health records in Epic." }
      ],
      coreCompetencies: [
        { title: "Critical Thinking", weight: 15, description: "Rapidly evaluating data to make life-saving decisions." },
        { title: "Compassion", weight: 10, description: "Providing empathetic care to patients and families." },
        { title: "Integrity", weight: 10, description: "Maintaining highest ethical standards in patient care." }
      ],
      functionalCompetencies: [
        { title: "Hemodynamic Monitoring", weight: 20, description: "Expertise in interpreting arterial, central venous, and PA pressures." },
        { title: "Ventilation Management", weight: 15, description: "Advanced knowledge of mechanical ventilation modes and weaning." },
        { title: "Epic EMR Proficiency", weight: 10, description: "Navigating and documenting complex clinical workflows." }
      ],
      qualifications: {
        required: [
          "Active RN license in state of practice",
          "BLS and ACLS certifications (current)",
          "2+ years of critical care or ICU experience",
          "CCRN certification or commitment to obtain within 1 year",
          "Ability to work 12-hour shifts including nights/weekends"
        ],
        preferred: [
          "CNRN or CCRN-E certification",
          "Experience with Epic EMR systems",
          "TNCC or CEN certification",
          "Bachelor of Science in Nursing (BSN)",
          "Experience with open-heart or neuro ICU patients"
        ]
      },
      eeo_statement: "We are an Equal Opportunity Employer. We celebrate diversity and are committed to creating an inclusive environment for all employees."
    }
  },
  {
    id: "TEMP-JD-005",
    title: "Medical Laboratory Technician",
    industry: "Healthcare",
    region: "US",
    content: {
      jobId: "HLTH_MLT_005",
      department: "Diagnostics",
      jobFamily: "Laboratory",
      jobLevel: "L2",
      summary: "Perform complex diagnostic tests in our CAP-accredited laboratory. You'll analyze blood, tissue, and bodily fluids to aid physicians in disease diagnosis and treatment monitoring.",
      responsibilities: [
        { title: "Perform complex diagnostic tests", weight: 25, description: "Analyze blood, tissue, and bodily fluids in a CAP-accredited lab." },
        { title: "Maintain laboratory instruments", weight: 20, description: "Calibrate and troubleshoot Roche/Beckman Coulter equipment." },
        { title: "Analyze and flag test results", weight: 15, description: "Review accuracy and immediately report critical values to physicians." },
        { title: "Ensure regulatory compliance", weight: 15, description: "Follow CLIA and CAP protocols for all laboratory procedures." },
        { title: "Execute quality control procedures", weight: 15, description: "Perform daily QC and document deviations or maintenance." },
        { title: "Train laboratory staff", weight: 10, description: "Provide guidance on safety and advanced testing methodologies." }
      ],
      coreCompetencies: [
        { title: "Attention to Detail", weight: 15, description: "Ensuring precision in every test and measurement." },
        { title: "Ethical Conduct", weight: 10, description: "Maintaining patient confidentiality and integrity." },
        { title: "Safety Awareness", weight: 10, description: "Strict adherence to biohazard and chemical safety protocols." }
      ],
      functionalCompetencies: [
        { title: "Clinical Chemistry", weight: 20, description: "Advanced knowledge of automated chemistry analyzers." },
        { title: "Microbiology", weight: 15, description: "Proficiency in culture identification and sensitivity testing." },
        { title: "Laboratory Informatics", weight: 10, description: "Operating LIS systems for data entry and retrieval." }
      ],
      qualifications: {
        required: [
          "Associate degree in Medical Laboratory Technology (MLT)",
          "ASCP or AMT certification (or eligible)",
          "1+ year of clinical laboratory experience",
          "Knowledge of laboratory safety and infection control",
          "Ability to work rotating shifts including weekends"
        ],
        preferred: [
          "Bachelor's degree in Medical Technology (MT/MLS)",
          "Specialist certification in specific discipline (e.g., SM, SC, SH)",
          "Experience with blood banking or molecular diagnostics",
          "Six Sigma or Lean laboratory experience",
          "Bilingual capabilities (Spanish, Mandarin, etc.)"
        ]
      },
      eeo_statement: "We are an Equal Opportunity Employer. We celebrate diversity and are committed to creating an inclusive environment for all employees."
    }
  },
  {
    id: "TEMP-JD-006",
    title: "Healthcare Data Analyst",
    industry: "Healthcare",
    region: "CA",
    content: {
      jobId: "HLTH_HDA_006",
      department: "Informatics",
      jobFamily: "Data Analytics",
      jobLevel: "L3",
      summary: "Transform clinical and operational data into actionable insights. You'll build dashboards, analyze patient outcomes, and support quality improvement initiatives across our health system.",
      responsibilities: [
        { title: "Analyze clinical and operational data", weight: 25, description: "Query Epic Clarity/Caboodle databases using advanced SQL." },
        { title: "Build interactive BI dashboards", weight: 20, description: "Create visualizations in Tableau or Power BI for leadership." },
        { title: "Support value-based care reporting", weight: 15, description: "Analyze patient outcomes and readmission rates for contracts." },
        { title: "Conduct statistical analysis", weight: 15, description: "Identify trends and patterns to support quality improvement." },
        { title: "Collaborate with clinical teams", weight: 15, description: "Support research and operational efficiency projects." },
        { title: "Ensure HIPAA data security", weight: 10, description: "Maintain strict compliance in all data handling activities." }
      ],
      coreCompetencies: [
        { title: "Analytical Thinking", weight: 15, description: "Breaking down complex data into meaningful insights." },
        { title: "Curiosity", weight: 10, description: "Proactively seeking patterns and opportunities in data." },
        { title: "Accuracy", weight: 10, description: "Maintaining high standards of data integrity and precision." }
      ],
      functionalCompetencies: [
        { title: "Healthcare SQL", weight: 20, description: "Expertise in querying complex relational healthcare databases." },
        { title: "Data Visualization", weight: 15, description: "Mastery of storytelling through interactive dashboards." },
        { title: "Epic Data Models", weight: 10, description: "Knowledge of clinical and financial data schemas (Clarity)." }
      ],
      qualifications: {
        required: [
          "Bachelor's degree in Health Informatics, Statistics, or related field",
          "2+ years of healthcare data analysis experience",
          "Advanced SQL skills and relational database knowledge",
          "Proficiency in Tableau, Power BI, or similar BI tools",
          "Understanding of healthcare metrics (LOS, readmission rates, HCAHPS)"
        ],
        preferred: [
          "Master's degree in Health Informatics or Public Health",
          "Epic certification (Cogito, Clarity Data Model)",
          "Experience with Python or R for statistical analysis",
          "Knowledge of HL7 FHIR and interoperability standards",
          "Six Sigma Green Belt or Black Belt certification"
        ]
      },
      eeo_statement: "We are an Equal Opportunity Employer. We celebrate diversity and are committed to creating an inclusive environment for all employees."
    }
  },

  // FINANCE (3)
  {
    id: "TEMP-JD-007",
    title: "Senior Financial Analyst - FP&A",
    industry: "Finance",
    region: "UK",
    content: {
      jobId: "FIN_SFA_007",
      department: "Finance",
      jobFamily: "FP&A",
      jobLevel: "L4",
      summary: "Drive financial planning and analysis for a $500M business unit. You'll build sophisticated models, support strategic decisions, and present insights to C-suite executives.",
      responsibilities: [
        { title: "Build complex financial models", weight: 25, description: "Create 3-statement models in Excel to support $500M business unit." },
        { title: "Lead forecasting and budgeting", weight: 20, description: "Manage monthly cycles and long-range planning processes." },
        { title: "Analyze and present variance drivers", weight: 15, description: "Provide actionable insights to leadership based on financial gaps." },
        { title: "Support M&A due diligence", weight: 15, description: "Perform integration modeling and financial health assessments." },
        { title: "Automate financial reporting", weight: 15, description: "Utilize Power Query or Python to streamline data workflows." },
        { title: "Partner with business units", weight: 10, description: "Conduct pricing and profitability analysis for stakeholders." }
      ],
      coreCompetencies: [
        { title: "Business Acumen", weight: 15, description: "Understanding market dynamics and internal value drivers." },
        { title: "Executive Presence", weight: 10, description: "Confidently presenting to C-suite and board members." },
        { title: "Persuasiveness", weight: 10, description: "Influencing decisions through data-backed narratives." }
      ],
      functionalCompetencies: [
        { title: "Financial Modeling", weight: 20, description: "Advanced mastery of pro-forma and valuation techniques." },
        { title: "SaaS Metrics", weight: 15, description: "Deep knowledge of ARR, NRR, CAC, and LTV." },
        { title: "ERP Systems", weight: 10, description: "Proficiency in extracting and analyzing data from SAP/Oracle." }
      ],
      qualifications: {
        required: [
          "Bachelor's degree in Finance, Accounting, or Economics",
          "4+ years of FP&A or corporate finance experience",
          "Expert-level Excel and financial modeling skills",
          "Experience with ERP systems (SAP, Oracle, or Workday)",
          "Strong presentation skills and executive presence"
        ],
        preferred: [
          "MBA or CFA (Level 2 or Charterholder)",
          "Experience with SQL, Python, or Power BI",
          "Big 4 accounting or investment banking background",
          "Knowledge of US GAAP and SOX compliance",
          "Experience with SaaS metrics (ARR, NRR, CAC, LTV)"
        ]
      },
      eeo_statement: "We are an Equal Opportunity Employer. We celebrate diversity and are committed to creating an inclusive environment for all employees."
    }
  },
  {
    id: "TEMP-JD-008",
    title: "Investment Banking Associate",
    industry: "Finance",
    region: "US",
    content: {
      jobId: "FIN_IBA_008",
      department: "Investment Banking",
      jobFamily: "Advisory",
      jobLevel: "L3",
      summary: "Join our M&A advisory team working on transformative deals across TMT and Healthcare sectors. You'll lead diligence processes, build complex models, and interact with senior clients daily.",
      responsibilities: [
        { title: "Execute valuation modeling", weight: 25, description: "Build detailed LBO, DCF, and accretion/dilution models." },
        { title: "Coordinate deal due diligence", weight: 20, description: "Liaise with legal and accounting advisors on transactions." },
        { title: "Prepare transaction documents", weight: 15, description: "Draft pitch books, CIMs, and board presentations." },
        { title: "Conduct industry research", weight: 15, description: "Perform deep-dive analysis on TMT and Healthcare sectors." },
        { title: "Support client relationship management", weight: 15, description: "Participate in senior management meetings and deal negotiations." },
        { title: "Mentor and review analyst work", weight: 10, description: "Ensure accuracy and quality across deal team deliverables." }
      ],
      coreCompetencies: [
        { title: "Working Under Pressure", weight: 15, description: "Maintaining excellence in high-stakes deal environments." },
        { title: "Commercial Awareness", weight: 10, description: "Deep understanding of sector trends and deal math." },
        { title: "Ambition", weight: 10, description: "Strong drive to execute and close transformative transactions." }
      ],
      functionalCompetencies: [
        { title: "M&A Execution", weight: 20, description: "End-to-end management of transaction lifecycles." },
        { title: "Investment Analysis", weight: 15, description: "Evaluating capital structures and returns profiles." },
        { title: "Pitching", weight: 10, description: "Crafting compelling narratives for capital raising or M&A." }
      ],
      qualifications: {
        required: [
          "Bachelor's degree from top-tier university",
          "2+ years of investment banking or private equity experience",
          "Exceptional financial modeling and Excel skills",
          "Ability to work 80+ hours in demanding deal environments",
          "Series 79 and 63 licenses (or ability to obtain)"
        ],
        preferred: [
          "MBA from M7 business school",
          "Experience leading deals >$500M enterprise value",
          "Sector expertise in TMT, Healthcare, or Fintech",
          "CFA Level 1 or higher",
          "Multilingual capabilities (Mandarin, Spanish, German)"
        ]
      },
      eeo_statement: "We are an Equal Opportunity Employer. We celebrate diversity and are committed to creating an inclusive environment for all employees."
    }
  },
  {
    id: "TEMP-JD-009",
    title: "Risk & Compliance Manager",
    industry: "Finance",
    region: "CA",
    content: {
      jobId: "FIN_RCM_009",
      department: "Risk Management",
      jobFamily: "Compliance",
      jobLevel: "L5",
      summary: "Lead our enterprise risk management framework for a rapidly growing fintech. You'll ensure regulatory compliance, manage vendor risk, and support our SOC2 and PCI-DSS certification programs.",
      responsibilities: [
        { title: "Enhance ERM framework", weight: 25, description: "Maintain and improve the Enterprise Risk Management system." },
        { title: "Coordinate regulatory exams", weight: 20, description: "Manage responses to regulatory inquiries and audits." },
        { title: "Conduct risk assessments", weight: 15, description: "Evaluate risks for new products and third-party partnerships." },
        { title: "Manage vendor due diligence", weight: 15, description: "Oversee ongoing monitoring and risk rating of critical vendors." },
        { title: "Deliver compliance training", weight: 15, description: "Develop and conduct training sessions across the organization." },
        { title: "Support security certifications", weight: 10, description: "Assist in SOC2, PCI-DSS, and state licensing audits." }
      ],
      coreCompetencies: [
        { title: "Risk Identification", weight: 15, description: "Proactively spotting potential threats to the organization." },
        { title: "Regulatory Knowledge", weight: 10, description: "Staying current with evolving financial regulations." },
        { title: "Conflict Resolution", weight: 10, description: "Navigating disagreements between compliance and business goals." }
      ],
      functionalCompetencies: [
        { title: "BSA/AML Compliance", weight: 20, description: "Expertise in anti-money laundering and KYC regulations." },
        { title: "Vendor Risk Management", weight: 15, description: "Evaluating third-party risk profiles and mitigation strategies." },
        { title: "Audit Coordination", weight: 10, description: "Leading the response and remediation for internal/external audits." }
      ],
      qualifications: {
        required: [
          "Bachelor's degree in Finance, Law, or Business",
          "5+ years of risk management or compliance experience",
          "Knowledge of banking regulations (BSA/AML, UDAAP, FCRA)",
          "Experience with GRC platforms (ServiceNow, MetricStream, or RSA)",
          "Strong project management and cross-functional coordination skills"
        ],
        preferred: [
          "CRCM, CCEP, or CRMA certification",
          "Experience in fintech, payments, or lending",
          "Knowledge of cloud security (AWS Well-Architected, CIS)",
          "JD or advanced degree in relevant field",
          "Experience with international regulations (GDPR, PCI-DSS v4.0)"
        ]
      },
      eeo_statement: "We are an Equal Opportunity Employer. We celebrate diversity and are committed to creating an inclusive environment for all employees."
    }
  },

  // MANUFACTURING (3)
  {
    id: "TEMP-JD-010",
    title: "Production Supervisor",
    industry: "Manufacturing",
    region: "IN",
    content: {
      jobId: "MFG_PSV_010",
      department: "Operations",
      jobFamily: "Production",
      jobLevel: "L3",
      summary: "Lead a team of 25+ operators in our ISO 9001-certified automotive components plant. You'll drive OEE improvements, ensure safety compliance, and deliver on production schedules.",
      responsibilities: [
        { title: "Supervise production shifts", weight: 25, description: "Direct daily operations to meet output and quality targets." },
        { title: "Enforce safety protocols", weight: 20, description: "Lead safety meetings and investigate any workplace incidents." },
        { title: "Implement Lean manufacturing", weight: 15, description: "Apply 5S, Kaizen, and TPM tools to improve efficiency." },
        { title: "Coach and develop operators", weight: 15, description: "Manage performance and provide training to production staff." },
        { title: "Coordinate cross-functionally", weight: 15, description: "Work with maintenance and quality to minimize downtime." },
        { title: "Analyze production data", weight: 10, description: "Track OEE and identify areas for continuous improvement." }
      ],
      coreCompetencies: [
        { title: "Team Leadership", weight: 15, description: "Inspiring and directing teams to achieve collective goals." },
        { title: "Stress Tolerance", weight: 10, description: "Remaining effective in high-pressure production environments." },
        { title: "Decisiveness", weight: 10, description: "Making quick and effective operational decisions." }
      ],
      functionalCompetencies: [
        { title: "Lean Manufacturing", weight: 20, description: "Practical application of waste reduction methodologies." },
        { title: "Safety Management", weight: 15, description: "Deep knowledge of OSHA and industrial safety standards." },
        { title: "ERP/MES Proficiency", weight: 10, description: "Using systems like SAP or Plex to manage production." }
      ],
      qualifications: {
        required: [
          "Bachelor's degree in Engineering, Operations, or related field",
          "3+ years of manufacturing supervision experience",
          "Knowledge of Lean manufacturing principles",
          "Experience with ERP/MES systems (SAP, Oracle, or Plex)",
          "Ability to work rotating shifts if needed"
        ],
        preferred: [
          "Six Sigma Green Belt or Black Belt",
          "Experience in automotive (IATF 16949) or aerospace (AS9100)",
          "Bilingual Spanish/English capabilities",
          "Knowledge of robotic welding or CNC operations",
          "Previous experience with unionized workforces"
        ]
      },
      eeo_statement: "We are an Equal Opportunity Employer. We celebrate diversity and are committed to creating an inclusive environment for all employees."
    }
  },
  {
    id: "TEMP-JD-011",
    title: "Quality Engineer",
    industry: "Manufacturing",
    region: "UK",
    content: {
      jobId: "MFG_QEN_011",
      department: "Quality",
      jobFamily: "Engineering",
      jobLevel: "L3",
      summary: "Ensure product excellence across our medical device manufacturing lines. You'll lead CAPA investigations, validate processes, and support FDA inspections.",
      responsibilities: [
        { title: "Maintain quality standards", weight: 25, description: "Develop and update control plans and PFMEAs for production." },
        { title: "Lead root cause investigations", weight: 20, description: "Identify and remediate customer complaints and defects." },
        { title: "Validate processes and equipment", weight: 15, description: "Author and execute IQ/OQ/PQ validation protocols." },
        { title: "Support regulatory audits", weight: 15, description: "Lead responses for FDA and ISO 13485 inspections." },
        { title: "Train staff on quality", weight: 15, description: "Educate production teams on inspection methods and standards." },
        { title: "Drive statistical process control", weight: 10, description: "Analyze SPC data to maintain process stability." }
      ],
      coreCompetencies: [
        { title: "Precision", weight: 15, description: "Unwavering commitment to accuracy and standards." },
        { title: "Objective Judgment", weight: 10, description: "Evaluating facts without bias during investigations." },
        { title: "Continuous Improvement", weight: 10, description: "Constantly seeking ways to enhance quality and efficiency." }
      ],
      functionalCompetencies: [
        { title: "ISO 13485 Standards", weight: 20, description: "Expertise in medical device quality management systems." },
        { title: "Root Cause Analysis", weight: 15, description: "Proficiency in fishbone diagrams, 5-Whys, and CAPA." },
        { title: "Metrology & GD&T", weight: 10, description: "Measuring parts and interpreting engineering drawings." }
      ],
      qualifications: {
        required: [
          "Bachelor's degree in Engineering (Mechanical, Industrial, or Biomedical)",
          "3+ years of quality engineering in regulated manufacturing",
          "Experience with ISO 13485, FDA 21 CFR Part 820, or similar",
          "Proficiency in statistical analysis (Minitab, JMP, or similar)",
          "Knowledge of GD&T and metrology principles"
        ],
        preferred: [
          "ASQ CQE or CQA certification",
          "Six Sigma Black Belt with DOE expertise",
          "Experience with medical devices or pharmaceuticals",
          "Knowledge of risk management (ISO 14971)",
          "Experience with SAP QM or similar quality modules"
        ]
      },
      eeo_statement: "We are an Equal Opportunity Employer. We celebrate diversity and are committed to creating an inclusive environment for all employees."
    }
  },
  {
    id: "TEMP-JD-012",
    title: "Supply Chain Planner",
    industry: "Manufacturing",
    region: "US",
    content: {
      jobId: "MFG_SCP_012",
      department: "Supply Chain",
      jobFamily: "Planning",
      jobLevel: "L2",
      summary: "Optimize inventory and production planning for a $200M consumer goods portfolio. You'll balance service levels with working capital targets using advanced forecasting tools.",
      responsibilities: [
        { title: "Develop demand forecasts", weight: 25, description: "Create statistical models to predict inventory needs accurately." },
        { title: "Optimize inventory levels", weight: 20, description: "Balance service levels with working capital across all DCs." },
        { title: "Coordinate with suppliers", weight: 15, description: "Manage capacity and lead times to ensure material availability." },
        { title: "Lead S&OP meetings", weight: 15, description: "Align sales, marketing, and operations on the supply plan." },
        { title: "Analyze accuracy metrics", weight: 15, description: "Track MAPE and inventory turns to drive improvements." },
        { title: "Manage production schedules", weight: 10, description: "Oversee MPS and MRP processes in the ERP system." }
      ],
      coreCompetencies: [
        { title: "Data Interpretation", weight: 15, description: "Turning complex datasets into clear supply chain strategies." },
        { title: "Collaborative Planning", weight: 10, description: "Working effectively across departments to reach consensus." },
        { title: "Adaptability", weight: 10, description: "Adjusting plans quickly in response to market disruptions." }
      ],
      functionalCompetencies: [
        { title: "Inventory Optimization", weight: 20, description: "Using advanced stocking logic and safety stock formulas." },
        { title: "ERP Planning Modules", weight: 15, description: "Mastery of SAP APO or similar supply chain planning tools." },
        { title: "Forecasting Methods", weight: 10, description: "Applying ARIMA, Regression, or ML models to demand." }
      ],
      qualifications: {
        required: [
          "Bachelor's degree in Supply Chain, Operations, or Business",
          "3+ years of demand planning or supply chain experience",
          "Advanced Excel and ERP planning module experience (SAP APO, o9, Kinaxis)",
          "Knowledge of forecasting methodologies (ARIMA, Holt-Winters, ML)",
          "Strong analytical skills and attention to detail"
        ],
        preferred: [
          "APICS CPIM or CSCP certification",
          "Experience with Python, R, or Alteryx for demand modeling",
          "Knowledge of inventory optimization (multi-echelon, safety stock)",
          "Experience with international supply chains and Incoterms",
          "MBA with supply chain concentration"
        ]
      },
      eeo_statement: "We are an Equal Opportunity Employer. We celebrate diversity and are committed to creating an inclusive environment for all employees."
    }
  },

  // LOGISTICS (2)
  {
    id: "TEMP-JD-013",
    title: "Fleet Operations Manager",
    industry: "Logistics",
    region: "IN",
    content: {
      jobId: "LOG_FOM_013",
      department: "Transportation",
      jobFamily: "Operations",
      jobLevel: "L4",
      summary: "Manage a fleet of 150+ Class 8 trucks across 5 states. You'll optimize routes, ensure DOT compliance, and lead a team of dispatchers and driver supervisors.",
      responsibilities: [
        { title: "Oversee daily dispatch operations", weight: 25, description: "Manage routing and scheduling for 150+ Class 8 trucks." },
        { title: "Ensure DOT regulatory compliance", weight: 20, description: "Maintain HOS, DVIR, and drug testing programs across 5 states." },
        { title: "Manage driver retention programs", weight: 15, description: "Lead hiring and training initiatives to reduce turnover." },
        { title: "Optimize fuel and route efficiency", weight: 15, description: "Reduce empty miles and implement fuel-saving technologies." },
        { title: "Coordinate with key customers", weight: 15, description: "Ensure on-time performance and manage delivery exceptions." },
        { title: "Analyze transportation metrics", weight: 10, description: "Track CPM and OTP to drive operational excellence." }
      ],
      coreCompetencies: [
        { title: "Operational Control", weight: 15, description: "Maintaining order in complex, geographically dispersed operations." },
        { title: "Resilience", weight: 10, description: "Thriving in high-stress, 24/7 logistics environments." },
        { title: "Strategic Resource Allocation", weight: 10, description: "Maximizing utility of fleet and human assets." }
      ],
      functionalCompetencies: [
        { title: "FMCSA Regulations", weight: 20, description: "In-depth knowledge of federal transportation safety laws." },
        { title: "TMS Optimization", weight: 15, description: "Leveraging platforms like McLeod or TMW for efficiency." },
        { title: "Route Planning", weight: 10, description: "Advanced strategies for hub-and-spoke or point-to-point networks." }
      ],
      qualifications: {
        required: [
          "Bachelor's degree in Logistics, Transportation, or Business",
          "5+ years of fleet or transportation management",
          "Knowledge of DOT regulations (FMCSA, CSA scores)",
          "Experience with TMS platforms (McLeod, TMW, or Samsara)",
          "CDL Class A license or willingness to obtain"
        ],
        preferred: [
          "CTP or PMP certification",
          "Experience with dedicated contract carriage (DCC)",
          "Knowledge of transportation management systems optimization",
          "Background in union driver management (Teamsters)",
          "Experience with electric or alternative fuel vehicles"
        ]
      },
      eeo_statement: "We are an Equal Opportunity Employer. We celebrate diversity and are committed to creating an inclusive environment for all employees."
    }
  },
  {
    id: "TEMP-JD-014",
    title: "Warehouse Supervisor - E-commerce",
    industry: "Logistics",
    region: "CA",
    content: {
      jobId: "LOG_WSE_014",
      department: "Distribution",
      jobFamily: "Fulfillment",
      jobLevel: "L3",
      summary: "Lead a high-volume e-commerce fulfillment center processing 50K+ orders daily. You'll drive productivity, ensure inventory accuracy, and maintain safety standards in a fast-paced environment.",
      responsibilities: [
        { title: "Supervise fulfillment center associates", weight: 25, description: "Lead 100+ staff across picking, packing, and shipping functions." },
        { title: "Meet daily productivity targets", weight: 20, description: "Ensure UPH and LPH standards are met while maintaining quality." },
        { title: "Ensure inventory accuracy", weight: 15, description: "Manage cycle counts and process controls within the WMS." },
        { title: "Troubleshoot WMS configurations", weight: 15, description: "Resolve system issues in Manhattan or Blue Yonder platforms." },
        { title: "Lead performance coaching", weight: 15, description: "Conduct daily stand-ups and provide associate feedback." },
        { title: "Manage carrier relationships", weight: 10, description: "Coordinate with FedEx/UPS for timely pickups and exceptions." }
      ],
      coreCompetencies: [
        { title: "People Management", weight: 15, description: "Motivating and directing large, diverse hourly workforces." },
        { title: "Sense of Urgency", weight: 10, description: "Maintaining pace in high-volume e-commerce environments." },
        { title: "Process Discipline", weight: 10, description: "Ensuring strict adherence to standard operating procedures." }
      ],
      functionalCompetencies: [
        { title: "WMS Management", weight: 20, description: "Expert user of tier-1 warehouse management software." },
        { title: "Inventory Control", weight: 15, description: "Experience with ABC analysis and shrink reduction." },
        { title: "Safety (OSHA)", weight: 10, description: "Maintaining compliance with warehouse safety regulations." }
      ],
      qualifications: {
        required: [
          "Bachelor's degree in Operations, Logistics, or related field",
          "3+ years of warehouse supervision in e-commerce or retail",
          "Experience with WMS (Manhattan, Blue Yonder, or SAP EWM)",
          "Knowledge of OSHA safety standards and workers' comp management",
          "Ability to work flexible hours including weekends/peak seasons"
        ],
        preferred: [
          "Experience with robotics or automation (AMRs, sortation)",
          "Knowledge of Lean warehousing or Toyota Production System",
          "Bilingual Spanish/English capabilities",
          "Experience with same-day or next-day fulfillment models",
          "Background in peak season planning (Black Friday, Prime Day)"
        ]
      },
      eeo_statement: "We are an Equal Opportunity Employer. We celebrate diversity and are committed to creating an inclusive environment for all employees."
    }
  },

  // RETAIL (1)
  {
    id: "TEMP-JD-015",
    title: "Store Manager - Flagship Location",
    industry: "Retail",
    region: "US",
    content: {
      jobId: "RETL_SMF_015",
      department: "Sales",
      jobFamily: "Retail Operations",
      jobLevel: "L4",
      summary: "Lead our highest-volume retail location generating $15M annually. You'll drive sales, deliver exceptional customer experiences, and develop a team of 40+ associates.",
      responsibilities: [
        { title: "Drive sales performance", weight: 25, description: "Exceed revenue and margin targets for $15M flagship location." },
        { title: "Recruit and retain high-performers", weight: 20, description: "Build a top-tier sales team through effective talent management." },
        { title: "Manage P&L and operating expenses", weight: 15, description: "Control payroll, shrink, and overhead to maximize profitability." },
        { title: "Ensure brand visual standards", weight: 15, description: "Maintain pixel-perfect merchandising and store appearance." },
        { title: "Analyze retail metrics", weight: 15, description: "Adjust strategies based on traffic, conversion, and AUR data." },
        { title: "Execute local marketing events", weight: 10, description: "Build community ties and drive store traffic through activations." }
      ],
      coreCompetencies: [
        { title: "Customer Centricity", weight: 15, description: "Obsessing over the customer experience at every touchpoint." },
        { title: "Financial Literacy", weight: 10, description: "Fluency in interpreting retail profit and loss statements." },
        { title: "Influence", weight: 10, description: "Inspiring associates and customers to embrace the brand vision." }
      ],
      functionalCompetencies: [
        { title: "Sales Management", weight: 20, description: "Coaching teams to close complex or high-value sales." },
        { title: "Visual Merchandising", weight: 15, description: "Implementing corporate floor sets and creative displays." },
        { title: "Inventory Management", weight: 10, description: "Optimizing stock levels and managing complex replenishment." }
      ],
      qualifications: {
        required: [
          "Bachelor's degree in Business, Retail Management, or related field",
          "5+ years of retail management with P&L responsibility",
          "Track record of driving sales growth in competitive markets",
          "Experience with retail analytics (traffic, conversion, AUR)",
          "Availability to work evenings, weekends, and holidays"
        ],
        preferred: [
          "Experience with luxury or high-end retail brands",
          "Visual merchandising or interior design background",
          "Multilingual capabilities to serve diverse customer base",
          "Experience with clienteling and CRM programs",
          "Community involvement and local network in market"
        ]
      },
      eeo_statement: "We are an Equal Opportunity Employer. We celebrate diversity and are committed to creating an inclusive environment for all employees."
    }
  },

  // AVIATION (2)
  {
    id: "TEMP-JD-016",
    title: "Aircraft Maintenance Engineer",
    industry: "Aviation",
    region: "AU",
    content: {
      jobId: "AVN_AME_016",
      department: "Maintenance",
      jobFamily: "Engineering",
      jobLevel: "L3",
      summary: "Ensure the airworthiness of our fleet. You'll perform scheduled maintenance and troubleshoot complex avionics and mechanical systems according to CASA regulations.",
      responsibilities: [
        { title: "Perform scheduled maintenance inspections", weight: 30, description: "Execute A, B, and C checks on Boeing 737/787 aircraft." },
        { title: "Troubleshoot avionics and engine systems", weight: 25, description: "Diagnose faults using advanced diagnostic tools and manuals." },
        { title: "Document all maintenance actions", weight: 15, description: "Maintain precise records in compliance with CASA standards." }
      ],
      coreCompetencies: [
        { title: "Safety Focus", weight: 20, description: "Unwavering commitment to aircraft and personnel safety." },
        { title: "Technical Precision", weight: 15, description: "Exceptional accuracy in mechanical and electronic work." }
      ],
      functionalCompetencies: [
        { title: "Avionics Troubleshooting", weight: 20, description: "Diagnosing complex wiring and sensor issues." },
        { title: "Component Overhaul", weight: 15, description: "Repairing and certifying aircraft components." }
      ],
      qualifications: {
        required: ["CASA Part 66 License", "5+ years heavy maintenance experience"],
        preferred: ["B1/B2 ratings", "Experience with composite repairs"]
      },
      eeo_statement: "We are an Equal Opportunity Employer."
    }
  },
  {
    id: "TEMP-JD-017",
    title: "Flight Operations Coordinator",
    industry: "Aviation",
    region: "SG",
    content: {
      jobId: "AVN_FOC_017",
      department: "Flight Ops",
      jobFamily: "Operations",
      jobLevel: "L2",
      summary: "Manage daily flight schedules and crew assignments at our Changi Airport hub. You'll coordinate with ATC and ground handling to ensure on-time performance.",
      responsibilities: [
        { title: "Coordinate flight dispatch", weight: 35, description: "Monitor weather and NOTAMs to optimize flight paths." },
        { title: "Manage crew scheduling", weight: 25, description: "Ensure all flights have legal crew compliments per CAAS rules." }
      ],
      coreCompetencies: [
        { title: "Crisis Management", weight: 20, description: "Calm and effective response to weather or technical delays." }
      ],
      qualifications: {
        required: ["Degree in Aviation Management", "2+ years ops experience"],
        preferred: ["Flight Dispatcher License", "Multilingual"]
      },
      eeo_statement: "We are an Equal Opportunity Employer."
    }
  },

  // PHARMA (2)
  {
    id: "TEMP-JD-018",
    title: "Clinical Research Associate",
    industry: "Pharma",
    region: "IN",
    content: {
      jobId: "PHRM_CRA_018",
      department: "R&D",
      jobFamily: "Clinical Trials",
      jobLevel: "L3",
      summary: "Monitor clinical trial sites ensuring compliance with GCP and local regulatory requirements. You'll verify data integrity and support investigator relationships.",
      responsibilities: [
        { title: "Monitor trial site compliance", weight: 40, description: "Perform on-site and remote monitoring visits regularly." },
        { title: "Verify source data and CRF entries", weight: 30, description: "Ensure 100% accuracy of clinical trial data." }
      ],
      coreCompetencies: [
        { title: "Ethical Integrity", weight: 20, description: "Strict adherence to patient safety and data privacy." }
      ],
      qualifications: {
        required: ["Master's in Pharmacy or Life Sciences", "GCP Certification"],
        preferred: ["3+ years phase III trial experience"]
      },
      eeo_statement: "We are an Equal Opportunity Employer."
    }
  },
  {
    id: "TEMP-JD-019",
    title: "Regulatory Affairs Specialist",
    industry: "Pharma",
    region: "UK",
    content: {
      jobId: "PHRM_RAS_019",
      department: "Regulatory",
      jobFamily: "Compliance",
      jobLevel: "L4",
      summary: "Prepare and submit product dossiers to MHRA and EMA. You'll ensure all marketing authorizations are maintained and updated per evolving UK/EU regulations.",
      responsibilities: [
        { title: "Manage regulatory submissions", weight: 45, description: "Lead the preparation of CTAs and MAAs." }
      ],
      coreCompetencies: [
        { title: "Knowledge of MHRA/EMA rules", weight: 25, description: "Expertise in post-Brexit UK regulatory landscape." }
      ],
      qualifications: {
        required: ["Degree in Life Sciences", "5+ years regulatory experience"],
        preferred: ["RAC certification", "Experience with orphan drugs"]
      },
      eeo_statement: "We are an Equal Opportunity Employer."
    }
  },

  // HOTEL (1)
  {
    id: "TEMP-JD-020",
    title: "Director of Rooms",
    industry: "Hotel",
    region: "MY",
    content: {
      jobId: "HTL_DOR_020",
      department: "Operations",
      jobFamily: "Hospitality",
      jobLevel: "L5",
      summary: "Oversee front office, housekeeping, and guest services for our luxury Resort. You'll drive guest satisfaction scores and optimize room revenue.",
      responsibilities: [
        { title: "Direct rooms department operations", weight: 30, description: "Lead a team of 150+ to deliver world-class service." }
      ],
      coreCompetencies: [
        { title: "Hospitality Excellence", weight: 25, description: "Obsession with guest experience and VIP service standards." }
      ],
      qualifications: {
        required: ["Degree in Hotel Management", "8+ years luxury hotel experience"],
        preferred: ["Experience with PMS systems like Opera"]
      },
      eeo_statement: "We are an Equal Opportunity Employer."
    }
  },

  // EDUCATION (1)
  {
    id: "TEMP-JD-021",
    title: "Curriculum Developer",
    industry: "Education",
    region: "AU",
    content: {
      jobId: "EDU_CUR_021",
      department: "Academic Affairs",
      jobFamily: "Design",
      jobLevel: "L3",
      summary: "Design engaging K-12 STEM curriculum for digital learning platforms. You'll collaborate with subject matter experts to create standards-aligned content.",
      responsibilities: [
        { title: "Develop digital learning content", weight: 40, description: "Create interactive modules for online science courses." }
      ],
      coreCompetencies: [
        { title: "Pedagogical Expertise", weight: 20, description: "Deep understanding of how students learn in digital environments." }
      ],
      qualifications: {
        required: ["Master's in Education", "3+ years teaching or design experience"],
        preferred: ["Experience with LMS like Canvas or Moodle"]
      },
      eeo_statement: "We are an Equal Opportunity Employer."
    }
  },

  // BANKING & FINANCE (STOCK MARKET) (3)
  {
    id: "TEMP-JD-022",
    title: "Branch Manager",
    industry: "Banking",
    region: "IN",
    content: {
      jobId: "BNK_BRM_022",
      department: "Retail Banking",
      jobFamily: "Sales",
      jobLevel: "L4",
      summary: "Lead operations and sales for our urban flagship branch. You'll drive deposit growth, manage loan portfolios, and ensure 100% RBI compliance.",
      responsibilities: [
        { title: "Drive branch profitability", weight: 35, description: "Meet targets for CASA, FDs, and retail assets." }
      ],
      coreCompetencies: [
        { title: "Sales Leadership", weight: 25, description: "Ability to motivate branch teams to exceed targets." }
      ],
      qualifications: {
        required: ["MBA Finance", "6+ years retail banking experience"],
        preferred: ["CAIIB Certification"]
      },
      eeo_statement: "We are an Equal Opportunity Employer."
    }
  },
  {
    id: "TEMP-JD-023",
    title: "Equity Research Analyst",
    industry: "Finance (stock market)",
    region: "US",
    content: {
      jobId: "STK_ERA_023",
      department: "Research",
      jobFamily: "Equities",
      jobLevel: "L3",
      summary: "Cover the technology sector for our institutional clients. You'll build detailed earnings models and issue Buy/Hold/Sell recommendations based on fundamental analysis.",
      responsibilities: [
        { title: "Lead technology sector coverage", weight: 40, description: "Follow 15-20 publicly traded tech companies." }
      ],
      coreCompetencies: [
        { title: "Analytical Rigor", weight: 30, description: "Obsessive attention to SEC filings and financial footnotes." }
      ],
      qualifications: {
        required: ["CFA Charterholder or MBA", "3+ years buy/sell side experience"],
        preferred: ["Expertise in semiconductor or cloud verticals"]
      },
      eeo_statement: "We are an Equal Opportunity Employer."
    }
  },
  {
    id: "TEMP-JD-024",
    title: "Compliance Officer",
    industry: "Banking",
    region: "SG",
    content: {
      jobId: "BNK_COM_024",
      department: "Compliance",
      jobFamily: "Risk",
      jobLevel: "L3",
      summary: "Ensure adherence to MAS regulations and internal AML/KYC policies for our private banking division. You'll conduct periodic reviews of high-net-worth accounts.",
      responsibilities: [
        { title: "Monitor AML/KYC compliance", weight: 45, description: "Review SARs and conduct enhanced due diligence." }
      ],
      coreCompetencies: [
        { title: "Regulatory Expertise", weight: 25, description: "Deep knowledge of MAS notice 626 and international FATF rules." }
      ],
      qualifications: {
        required: ["Degree in Law or Finance", "4+ years AML experience"],
        preferred: ["ACAMS certification"]
      },
      eeo_statement: "We are an Equal Opportunity Employer."
    }
  },

  // GENERAL (1)
  {
    id: "TEMP-JD-025",
    title: "Administrative Assistant",
    industry: "General",
    region: "UK",
    content: {
      jobId: "GEN_ADM_025",
      department: "Administration",
      jobFamily: "Support",
      jobLevel: "L1",
      summary: "Provide high-level administrative support to our regional management team. You'll manage calendars, coordinate travel, and ensure smooth office operations.",
      responsibilities: [
        { title: "Coordinate office administration", weight: 50, description: "Manage executive schedules and meeting logistics." }
      ],
      coreCompetencies: [
        { title: "Organization", weight: 30, description: "Exceptional ability to multitask in a busy office environment." }
      ],
      qualifications: {
        required: ["3+ years admin experience", "Proficiency in MS Office"],
        preferred: ["Experience with SAP or Oracle ERP"]
      },
      eeo_statement: "We are an Equal Opportunity Employer."
    }
  },

  // TECH (5 MORE)
  {
    id: "TEMP-JD-026",
    title: "Full Stack Engineer",
    industry: "Technology",
    region: "SG",
    content: {
      jobId: "TECH_FSE_026",
      department: "Engineering",
      jobFamily: "Software",
      jobLevel: "L3",
      summary: "Build scalable web applications using React and Node.js for our fintech platform in Singapore.",
      responsibilities: [{ title: "Develop new features", weight: 40 }],
      qualifications: { required: ["3+ years experience in React/Node"], preferred: ["Fintech experience"] },
      eeo_statement: "EOE."
    }
  },
  {
    id: "TEMP-JD-027",
    title: "Data Scientist",
    industry: "Technology",
    region: "MY",
    content: {
      jobId: "TECH_DSC_027",
      department: "Data",
      jobFamily: "Analytics",
      jobLevel: "L3",
      summary: "Leverage machine learning to drive business insights for our Kuala Lumpur operations.",
      responsibilities: [{ title: "Build predictive models", weight: 50 }],
      qualifications: { required: ["MS in Data Science or related", "Python proficiency"], preferred: ["PyTorch/TensorFlow"] },
      eeo_statement: "EOE."
    }
  },
  {
    id: "TEMP-JD-028",
    title: "Cloud Architect",
    industry: "Technology",
    region: "AU",
    content: {
      jobId: "TECH_ARC_028",
      department: "Infrastructure",
      jobFamily: "Cloud",
      jobLevel: "L5",
      summary: "Design and implement robust AWS/Azure architectures for our Australian enterprise clients.",
      responsibilities: [{ title: "Cloud infrastructure design", weight: 45 }],
      qualifications: { required: ["AWS/Azure Solutions Architect Cert", "10+ years IT"], preferred: ["Terraform/IaC"] },
      eeo_statement: "EOE."
    }
  },
  {
    id: "TEMP-JD-029",
    title: "Cybersecurity Analyst",
    industry: "Technology",
    region: "UK",
    content: {
      jobId: "TECH_CYB_029",
      department: "Security",
      jobFamily: "Security",
      jobLevel: "L2",
      summary: "Protect our UK network from threats and manage incident response workflows.",
      responsibilities: [{ title: "Monitor security alerts", weight: 60 }],
      qualifications: { required: ["CompTIA Security+", "2+ years experience"], preferred: ["CISSP"] },
      eeo_statement: "EOE."
    }
  },
  {
    id: "TEMP-JD-030",
    title: "QA Automation Engineer",
    industry: "Technology",
    region: "US",
    content: {
      jobId: "TECH_QA_030",
      department: "Engineering",
      jobFamily: "Quality",
      jobLevel: "L2",
      summary: "Drive software quality through automated testing frameworks in our Silicon Valley HQ.",
      responsibilities: [{ title: "Maintain test suites", weight: 50 }],
      qualifications: { required: ["Selenium/Cypress experience", "Java/JS"], preferred: ["Performance testing"] },
      eeo_statement: "EOE."
    }
  },

  // HEALTHCARE (4 MORE)
  {
    id: "TEMP-JD-031",
    title: "Pharmacist",
    industry: "Healthcare",
    region: "IN",
    content: {
      jobId: "HLTH_PHR_031",
      department: "Pharmacy",
      jobFamily: "Clinical",
      jobLevel: "L3",
      summary: "Dispense medications and provide expert clinical advice to patients in our Mumbai hospital.",
      responsibilities: [{ title: "Medication counseling", weight: 35 }],
      qualifications: { required: ["B.Pharm/M.Pharm", "Registered Pharmacist"], preferred: ["Hospital experience"] },
      eeo_statement: "EOE."
    }
  },
  {
    id: "TEMP-JD-032",
    title: "Physical Therapist",
    industry: "Healthcare",
    region: "US",
    content: {
      jobId: "HLTH_PT_032",
      department: "Rehabilitation",
      jobFamily: "Clinical",
      jobLevel: "L3",
      summary: "Provide personalized physical therapy and rehabilitation programs in our New York clinic.",
      responsibilities: [{ title: "Develop treatment plans", weight: 45 }],
      qualifications: { required: ["Doctor of Physical Therapy (DPT)", "State License"], preferred: ["Sports med specialty"] },
      eeo_statement: "EOE."
    }
  },
  {
    id: "TEMP-JD-033",
    title: "Radiologic Technologist",
    industry: "Healthcare",
    region: "SG",
    content: {
      jobId: "HLTH_RAD_033",
      department: "Imaging",
      jobFamily: "Diagnostics",
      jobLevel: "L2",
      summary: "Operate X-ray, CT, and MRI equipment at our Singapore multidisciplinary center.",
      responsibilities: [{ title: "Perform diagnostic imaging", weight: 50 }],
      qualifications: { required: ["Degree in Radiography", "AHPC registration"], preferred: ["MRI specialty"] },
      eeo_statement: "EOE."
    }
  },
  {
    id: "TEMP-JD-034",
    title: "Medical Receptionist",
    industry: "Healthcare",
    region: "UK",
    content: {
      jobId: "HLTH_REC_034",
      department: "Admin",
      jobFamily: "Support",
      jobLevel: "L1",
      summary: "Manage patient scheduling and front-desk operations for our London private clinic.",
      responsibilities: [{ title: "Patient coordination", weight: 60 }],
      qualifications: { required: ["2+ years medical admin", "Proficient in EMIS/SystmOne"], preferred: ["Customer service award"] },
      eeo_statement: "EOE."
    }
  },

  // FINANCE (STOCK MARKET) (1 MORE)
  {
    id: "TEMP-JD-035",
    title: "Portfolio Manager",
    industry: "Finance (stock market)",
    region: "SG",
    content: {
      jobId: "STK_PM_035",
      department: "Asset Management",
      jobFamily: "Investment",
      jobLevel: "L6",
      summary: "Lead the Asia Pacific equity fund, making strategic allocation decisions based on market analysis.",
      responsibilities: [{ title: "Asset allocation", weight: 45 }],
      qualifications: { required: ["CFA Charterholder", "12+ years experience"], preferred: ["Track record of alpha generation"] },
      eeo_statement: "EOE."
    }
  },

  // BANKING (3 MORE)
  {
    id: "TEMP-JD-036",
    title: "Relationship Manager - Wealth",
    industry: "Banking",
    region: "SG",
    content: {
      jobId: "BNK_RM_036",
      department: "Private Banking",
      jobFamily: "Sales",
      jobLevel: "L4",
      summary: "Manage a portfolio of high-net-worth clients in Singapore, providing bespoke investment and credit solutions.",
      responsibilities: [{ title: "AUM growth", weight: 40 }],
      qualifications: { required: ["6+ years priority banking", "CACS Paper 1 & 2"], preferred: ["Existing HNW network"] },
      eeo_statement: "EOE."
    }
  },
  {
    id: "TEMP-JD-037",
    title: "Credit Risk Manager",
    industry: "Banking",
    region: "MY",
    content: {
      jobId: "BNK_CRM_037",
      department: "Risk",
      jobFamily: "Risk",
      jobLevel: "L4",
      summary: "Evaluate and approve corporate credit applications for our Kuala Lumpur commercial banking division.",
      responsibilities: [{ title: "Credit assessment", weight: 45 }],
      qualifications: { required: ["Degree in Finance/Accountancy", "7+ years credit risk"], preferred: ["CCP certification"] },
      eeo_statement: "EOE."
    }
  },
  {
    id: "TEMP-JD-038",
    title: "Investment Advisor",
    industry: "Banking",
    region: "UK",
    content: {
      jobId: "BNK_IA_038",
      department: "Wealth Management",
      jobFamily: "Advisory",
      jobLevel: "L3",
      summary: "Provide investment advice and portfolio reviews to retail banking clients in the UK.",
      responsibilities: [{ title: "Portfolio advisory", weight: 35 }],
      qualifications: { required: ["Level 4 Diploma in Financial Planning", "3+ years advisory"], preferred: ["Chartered status"] },
      eeo_statement: "EOE."
    }
  },

  // FINANCE (STOCK MARKET) (3 MORE)
  {
    id: "TEMP-JD-039",
    title: "Quantitative Researcher",
    industry: "Finance (stock market)",
    region: "US",
    content: {
      jobId: "STK_QR_039",
      department: "Research",
      jobFamily: "Quantitative",
      jobLevel: "L3",
      summary: "Develop alpha-generating trading signals using statistical models and large datasets in New York.",
      responsibilities: [{ title: "Model development", weight: 50 }],
      qualifications: { required: ["PhD in Math/Physics/CS", "Python/C++ expert"], preferred: ["Experience with HFT"] },
      eeo_statement: "EOE."
    }
  },
  {
    id: "TEMP-JD-040",
    title: "Global Macro Strategist",
    industry: "Finance (stock market)",
    region: "UK",
    content: {
      jobId: "STK_GMS_040",
      department: "Strategy",
      jobFamily: "Research",
      jobLevel: "L5",
      summary: "Synthesize global economic data to provide directional investment themes for our London hedge fund.",
      responsibilities: [{ title: "Macroeconomic analysis", weight: 40 }],
      qualifications: { required: ["10+ years macro research", "PhD/MS Economics"], preferred: ["Published researcher"] },
      eeo_statement: "EOE."
    }
  },
  {
    id: "TEMP-JD-041",
    title: "Derivatives Trader",
    industry: "Finance (stock market)",
    region: "SG",
    content: {
      jobId: "STK_DT_041",
      department: "Trading",
      jobFamily: "Execution",
      jobLevel: "L3",
      summary: "Execute complex options and futures trades across Asian exchanges from our Singapore desk.",
      responsibilities: [{ title: "Trade execution", weight: 60 }],
      qualifications: { required: ["3+ years derivatives trading", "Strong mental math"], preferred: ["VBA/Python"] },
      eeo_statement: "EOE."
    }
  },

  // HOTEL (2 MORE)
  {
    id: "TEMP-JD-042",
    title: "Executive Chef",
    industry: "Hotel",
    region: "US",
    content: {
      jobId: "HTL_EC_042",
      department: "Food & Beverage",
      jobFamily: "Culinary",
      jobLevel: "L5",
      summary: "Lead the culinary operations for our 5-star hotel in Las Vegas, including 4 signature restaurants.",
      responsibilities: [{ title: "Menu design & innovation", weight: 30 }],
      qualifications: { required: ["Culinary Arts degree", "10+ years fine dining"], preferred: ["Michelin-star experience"] },
      eeo_statement: "EOE."
    }
  },
  {
    id: "TEMP-JD-043",
    title: "Spa Manager",
    industry: "Hotel",
    region: "SG",
    content: {
      jobId: "HTL_SM_043",
      department: "Wellness",
      jobFamily: "Operations",
      jobLevel: "L3",
      summary: "Manage our award-winning luxury spa in Singapore, ensuring exceptional member and guest service.",
      responsibilities: [{ title: "Spa operations management", weight: 40 }],
      qualifications: { required: ["5+ years spa management", "CIBTAC/CIDESCO preferred"], preferred: ["Hospitality background"] },
      eeo_statement: "EOE."
    }
  },

  // EDUCATION (2 MORE)
  {
    id: "TEMP-JD-044",
    title: "School Principal",
    industry: "Education",
    region: "MY",
    content: {
      jobId: "EDU_PRI_044",
      department: "Leadership",
      jobFamily: "Admin",
      jobLevel: "L6",
      summary: "Lead our International School in Kuala Lumpur, driving academic excellence and community engagement.",
      responsibilities: [{ title: "School strategic planning", weight: 35 }],
      qualifications: { required: ["Master's in Education Leadership", "10+ years teaching/admin"], preferred: ["IB experience"] },
      eeo_statement: "EOE."
    }
  },
  {
    id: "TEMP-JD-045",
    title: "University Registrar",
    industry: "Education",
    region: "IN",
    content: {
      jobId: "EDU_REG_045",
      department: "Student Affairs",
      jobFamily: "Admin",
      jobLevel: "L4",
      summary: "Oversee student records, enrollment services, and academic scheduling for our university in Delhi.",
      responsibilities: [{ title: "Record management", weight: 40 }],
      qualifications: { required: ["5+ years higher education administration", "Master's degree"], preferred: ["ERP experience"] },
      eeo_statement: "EOE."
    }
  },

  // AVIATION (2 MORE)
  {
    id: "TEMP-JD-046",
    title: "Air Traffic Controller",
    industry: "Aviation",
    region: "AU",
    content: {
      jobId: "AVN_ATC_046",
      department: "Operations",
      jobFamily: "Operations",
      jobLevel: "L3",
      summary: "Manage aircraft movements in Australian airspace, ensuring the highest safety standards at Melbourne Airport.",
      responsibilities: [{ title: "Aircraft separation", weight: 70 }],
      qualifications: { required: ["Airservices Australia Certification", "Class 3 Medical"], preferred: ["5+ years experience"] },
      eeo_statement: "EOE."
    }
  },
  {
    id: "TEMP-JD-047",
    title: "Ground Services Manager",
    industry: "Aviation",
    region: "US",
    content: {
      jobId: "AVN_GSM_047",
      department: "Ground Ops",
      jobFamily: "Operations",
      jobLevel: "L4",
      summary: "Manage all ground handling operations at JFK Airport, including ramp and passenger services.",
      responsibilities: [{ title: "Ramp operations oversight", weight: 45 }],
      qualifications: { required: ["8+ years airport operations", "Proven leadership"], preferred: ["FAA safety knowledge"] },
      eeo_statement: "EOE."
    }
  },

  // PHARMA (3 MORE)
  {
    id: "TEMP-JD-048",
    title: "Quality Assurance Specialist",
    industry: "Pharma",
    region: "US",
    content: {
      jobId: "PHRM_QA_048",
      department: "Quality",
      jobFamily: "Compliance",
      jobLevel: "L3",
      summary: "Ensure GMP compliance for our pharmaceutical manufacturing site in New Jersey.",
      responsibilities: [{ title: "Batch record review", weight: 50 }],
      qualifications: { required: ["Degree in Science/Pharmacy", "4+ years QA"], preferred: ["Experience with API production"] },
      eeo_statement: "EOE."
    }
  },
  {
    id: "TEMP-JD-049",
    title: "Medical Science Liaison",
    industry: "Pharma",
    region: "SG",
    content: {
      jobId: "PHRM_MSL_049",
      department: "Medical Affairs",
      jobFamily: "Science",
      jobLevel: "L4",
      summary: "Build relationships with key opinion leaders (KOLs) in the oncology therapeutic area across Singapore.",
      responsibilities: [{ title: "KOL engagement", weight: 50 }],
      qualifications: { required: ["PhD/PharmD/MD", "Strong science communication"], preferred: ["Oncology background"] },
      eeo_statement: "EOE."
    }
  },
  {
    id: "TEMP-JD-050",
    title: "Formulation Scientist",
    industry: "Pharma",
    region: "MY",
    content: {
      jobId: "PHRM_FS_050",
      department: "R&D",
      jobFamily: "Science",
      jobLevel: "L3",
      summary: "Develop and optimize oral solid dosage formulations at our Kuala Lumpur research center.",
      responsibilities: [{ title: "Dosage form development", weight: 40 }],
      qualifications: { required: ["Master's in Pharmaceutics", "3+ years R&D"], preferred: ["Experience with QbD"] },
      eeo_statement: "EOE."
    }
  }
];
