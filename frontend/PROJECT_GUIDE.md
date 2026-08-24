# Air Flow - JD Forge Project Guide

Welcome to the **Air Flow** (JD Forge) project. This document provides a high-level overview of the application's architecture, user roles, and the complex Job Description (JD) approval workflow.

---

## 🚀 Tech Stack & Architecture

- **Frontend**: React (Vite)
- **Styling**: Vanilla CSS with modern premium aesthetics (glassmorphism, vibrant gradients).
- **State Management**: `JDContext.jsx` (React Context API).
- **Data Persistence**: `localStorage` (Demo-ready persistent storage).
- **Icons**: Lucide React.
- **Routing**: React Router DOM (v6).

---

## 👥 User Roles

The application is built with a strictly enforced role-based access control (RBAC) system:

1. **Admin**:
   - Full access to dashboards and generation.
   - **Exclusive Feature**: Workflow Builder (Configure multi-step approval paths).
   - Manage Departments and Team Members.
2. **HR Manager**:
   - Primary creator of Job Descriptions.
   - Can select templates and generate AI-assisted JDs.
   - Responsible for "Sending for Review" and choosing the appropriate workflow.
3. **Department Manager**:
   - Reviewer role.
   - Dashboard-centric view of Pending, Approved, and Rejected JDs.
   - **Progressive archive visibility**: Sees their approved steps immediately in their personal dashboard.

---

## 🛠️ The Approval Workflow (The "Progressive" Model)

This is the core logic of the application. JDs move through a dynamic state machine defined by the Admin in the Settings.

### 1. The Workflow Builder (Admin)
Admins define "Workflows" (e.g., "Engineering Standard"). Each workflow contains multiple steps. Each step has:
- A specific **Reviewer** (Manager/Admin).
- An **SLA** (Target days).
- **Notification settings**.

### 2. JD State Transitions
A Job Description typically moves through these statuses:
- **Draft/Finalized**: Created by HR but not yet in review.
- **Review Step 1, 2, ... X**: The JD is assigned to a specific manager's email. It appears in their **"Pending Review"** tab.
- **Approved**: 
  - If a step is approved, the JD moves to the *next* step.
  - If no more steps remain, the global status becomes `Approved`.
- **Rejected**: The JD is re-assigned to the HR Creator and moves to the Manager's **"Revisions Requested"** archive.

### 3. Progressive Visibility logic
- **Individual Archives**: As soon as a Manager approves their specific step (e.g., Step 1), the JD moves to their **"Approved"** tab, even if the JD is still globally in `"Review Step 2"` or a later step.
- **Action Lockdown**: Once a reviewer has performed an action (Approve/Reject), their action buttons are disabled to prevent duplicate processing, but the **Collaboration Hub** remains open for discussion.

---

## 💬 Collaboration Hub & Feedback

Every status change (Approval/Rejection) or manual comment is logged in the **Collaboration Hub**:
- Uses **Email-ID identity** for professional tracking.
- Every approval step automatically logs the manager's feedback into the thread.
- Provides a "live" feel to the document review process.

---

## 📂 Key Files for Developers

- `/src/context/JDContext.jsx`: The "Brain" of the app. Contains the state machine for status changes and the `myJDs` filtering logic.
- `/src/pages/Admin/Settings.jsx`: Where workflows and system configurations are managed.
- `/src/pages/Manager/ReviewCollaborate.jsx`: The high-fidelity review interface where managers edit and approve JDs.
- `/src/pages/HR/MyJDs.jsx`: The HR hub where JDs are finalized and submitted for review.
- `/src/services/authService.js`: Mock authentication logic for the demo environment.

---

## 🧪 Demo Credentials (Mock)
- **HR**: `hr@talentforge.com`
- **Manager**: `manager1@talentforge.com`
- **Admin**: `admin@talentforge.com`

*Note: Roles are determined during the login process by the authService.*
