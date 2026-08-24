
export const initializeEndUserData = () => {
  const currentTasks = [
    {
      id: 'task_1',
      title: 'ICU Registered Nurse JD Sign-off Required',
      type: 'JD_SIGN_OFF',
      status: 'Overdue',
      dueDate: 'April 30, 2026',
      assignedTo: 'Sahil Kumar',
      description: 'Review and acknowledge your updated Job Description for ICU Registered Nurse position.',
      jdId: 'jd_icu_nurse'
    },
    {
      id: 'task_2',
      title: '2026 Annual Performance Appraisal Available',
      type: 'APPRAISAL',
      status: 'Pending',
      dueDate: 'June 30, 2026',
      assignedTo: 'Sahil Kumar',
      description: 'Your annual performance appraisal for 2026 is now available for self-assessment.'
    }
  ];

  const signedJDs = [
    {
      id: 'signed_jd_1',
      title: 'ICU Registered Nurse',
      signedDate: 'April 28, 2026',
      version: '3.2',
      status: 'Signed',
      content: 'Full JD content for ICU Registered Nurse...'
    },
    {
      id: 'signed_jd_2',
      title: 'ICU Registered Nurse',
      signedDate: 'March 15, 2025',
      version: '3.1',
      status: 'Signed'
    }
  ];

  const appraisals = [
    {
      id: 'appraisal_1',
      title: '2025 Annual Review',
      completedDate: 'December 15, 2025',
      score: 87,
      status: 'Completed',
      competencies: [
        { name: 'Clinical Judgment', rating: 'Exceeds Expectations', weight: 40, score: 40, comments: 'Emma has demonstrated exceptional clinical judgment...' },
        { name: 'Patient Safety', rating: 'Meets Expectations', weight: 35, score: 26.25, comments: 'Maintains patient safety standards and follows protocols consistently.' },
        { name: 'Communication', rating: 'Exceeds Expectations', weight: 25, score: 25, comments: 'Communicates effectively with patients, families, and healthcare team members.' }
      ],
      managerComments: 'Emma has demonstrated exceptional clinical judgment and communication skills throughout the review period. Her ability to handle complex patient cases and collaborate with the multidisciplinary team has been outstanding.',
      selfAssessment: 'This year I focused on improving my critical care skills and building stronger relationships with patients and families. I\'m proud of the progress I\'ve made and look forward to continuing my professional development.'
    }
  ];

  const activity = [
    { id: 1, type: 'sign', text: 'You signed ICU Registered Nurse JD (v3.2)', date: '2 hours ago' },
    { id: 2, type: 'review', text: 'Manager (David Chen) updated your Appraisal 2025', date: 'Yesterday' },
    { id: 3, type: 'system', text: 'New JD version published for Engineering department', date: '2 days ago' }
  ];

  const stats = {
    totalSigned: 12,
    avgPerformance: 87,
    pendingTasks: 1,
    teamSize: 12
  };

  if (!localStorage.getItem('enduser_tasks')) {
    localStorage.setItem('enduser_tasks', JSON.stringify(currentTasks));
  }
  if (!localStorage.getItem('enduser_signed_jds')) {
    localStorage.setItem('enduser_signed_jds', JSON.stringify(signedJDs));
  }
  if (!localStorage.getItem('enduser_appraisals')) {
    localStorage.setItem('enduser_appraisals', JSON.stringify(appraisals));
  }
  if (!localStorage.getItem('enduser_activity')) {
    localStorage.setItem('enduser_activity', JSON.stringify(activity));
  }
  if (!localStorage.getItem('enduser_stats')) {
    localStorage.setItem('enduser_stats', JSON.stringify(stats));
  }
};
