export const mockJDs = {
  nurse: {
    id: "jd_mock_nurse_001",
    job_id: "CRI_ICU_01",
    job_family: "Nursing",
    job_level: "L3",
    department: "Critical Care",
    title: "ICU Registered Nurse",
    industry: "Healthcare",
    region: "IN",
    job_description: {
      title: "ICU Registered Nurse",
      summary: "We are seeking a dedicated ICU Registered Nurse to join our critical care team. You will be responsible for providing high-level nursing care to patients with life-threatening conditions, requiring constant monitoring and rapid intervention.",
      key_duties_with_weight_distribution: [
        { duty: "Monitor patient vital signs and heart rhythms closely", weight: "30" },
        { duty: "Administer specialized medications and intravenous fluids", weight: "25" },
        { duty: "Operate and troubleshoot life support equipment (ventilators, CRRT)", weight: "20" },
        { duty: "Coordinate with multidisciplinary teams for complex care plans", weight: "15" },
        { duty: "Document patient status changes and educate families", weight: "10" }
      ],
      core_competencies: "Clinical Excellence. Vigilance. Quick Decision Making. Empathy. Teamwork.",
      functional_competencies: "Critical Care Nursing. Advanced Cardiac Life Support (ACLS). ECG Interpretation. EMR Documentation.",
      qualifications_required: [
        "Bachelor of Science in Nursing (BSN)",
        "Current State RN License",
        "2+ years of experience in an Intensive Care Unit (ICU)",
        "ACLS and BLS Certification"
      ],
      qualifications_preferred: [
        "CCRN certification",
        "Experience with pediatric critical care",
        "Experience with Epic or Cerner EMR systems"
      ],
      eeo_statement: "We are an Equal Opportunity Employer and do not discriminate against any employee or applicant for employment."
    }
  },
  developer: {
    id: "jd_mock_dev_002",
    job_id: "ENG_SEN_02",
    job_family: "Software Engineering",
    job_level: "L4",
    department: "Engineering",
    title: "Senior React Developer",
    industry: "Technology",
    region: "US",
    job_description: {
       title: "Senior React Developer",
       summary: "Join our core engineering team to build the next generation of our fintech platform. We need a Senior React Developer who is passionate about building high-performance, accessible, and scalable web applications.",
       key_duties_with_weight_distribution: [
         { duty: "Architect and build scalable frontend components using React and Next.js", weight: "35" },
         { duty: "Implement complex data visualizations and financial dashboards", weight: "25" },
         { duty: "Optimize application for maximum speed and scalability", weight: "20" },
         { duty: "Mentor junior developers and lead frontend architecture discussions", weight: "20" }
       ],
       core_competencies: "Technical Leadership. Innovation. Problem Solving. Scalability. Quality Focus.",
       functional_competencies: "React.js. TypeScript. Next.js. State Management (Redux/Zustand). Performance Optimization.",
       qualifications_required: [
         "Bachelor's degree in Computer Science or equivalent",
         "5+ years of professional web development experience",
         "Expert proficiency in React and the modern JS ecosystem",
         "Strong understanding of CSS-in-JS and Tailwind CSS"
       ],
       qualifications_preferred: [
         "Experience with GraphQL and Apollo Client",
         "Background in building fintech or high-availability systems",
         "Knowledge of WebGL or D3.js"
       ],
       eeo_statement: "We are committed to equality of opportunity for all staff and applications from individuals are encouraged regardless of age, disability, sex, gender reassignment, sexual orientation, pregnancy and maternity, race, religion or belief and marriage and civil partnerships."
    }
  },
  analyst: {
    id: "jd_mock_fin_003",
    job_id: "FIN_ANA_03",
    job_family: "Financial Services",
    job_level: "L2",
    department: "Finance",
    title: "Financial Analyst",
    industry: "Finance",
    region: "UK",
    job_description: {
      title: "Financial Analyst",
      summary: "We are looking for a Detail-oriented Financial Analyst to provide strategic insights and forecasting to our executive team. You will be responsible for financial modeling, variance analysis, and evaluating investment opportunities.",
      key_duties_with_weight_distribution: [
        { duty: "Develop and maintain complex financial models for forecasting and budgeting", weight: "30" },
        { duty: "Conduct deep-dive variance analysis and monthly financial reporting", weight: "25" },
        { duty: "Evaluate potential investment opportunities and ROI", weight: "20" },
        { duty: "Partner with department heads to manage and optimize operational budgets", weight: "15" },
        { duty: "Streamline financial data collection and reporting processes", weight: "10" }
      ],
      core_competencies: "Strategic Insight. Analytical Thinking. Accuracy. Integrity. Business Acumen.",
      functional_competencies: "Financial Modeling. Advanced Excel. SQL. ERP Systems (SAP/Oracle). Forecasting.",
      qualifications_required: [
        "Bachelor's degree in Finance, Accounting, or Economics",
        "3+ years of experience in financial analysis or management consulting",
        "Expert proficiency in Microsoft Excel and SQL",
        "Strong analytical and problem-solving skills"
      ],
      qualifications_preferred: [
        "CFA candidate or charterholder",
        "Experience with Power BI or Tableau",
        "Masters degree in Business Administration (MBA)"
      ],
      eeo_statement: "At our firm, we value the diverse perspectives of all our employees. We are an equal opportunity employer."
    }
  }
};

export const getMockJDByTitle = (title = "") => {
  const t = title.toLowerCase();
  
  let result;
  if (t.includes('nurse')) result = mockJDs.nurse;
  else if (t.includes('developer') || t.includes('react')) result = mockJDs.developer;
  else if (t.includes('analyst') || t.includes('financial')) result = mockJDs.analyst;
  else result = mockJDs.developer; // Generic default

  return result;
};

// Keep existing single export for backward compatibility if needed
export const mockJD = mockJDs.developer;