import {
  Sparkles,
  FileText,
  Database,
  CheckCircle2,
  Users,
  RefreshCw,
  Shield,
  Zap,
  Target,
  Layout,
  MessageSquare,
  FileOutput,
  Check,
  User,
  Briefcase,
  Crown,
  BarChart3,
  Globe,
  PenTool,
  Settings,
} from 'lucide-react';

const phenomLogo = '/company-logo-demo.png';

export const siteData = {
  brand: { name: 'TalentForge', logo: 'T' },
  navigation: {
    links: [
      { name: 'Product', href: '#product' },
      { name: 'Features', href: '#features' },
      { name: 'Solutions', href: '#solutions' },
      { name: 'Pricing', href: '#cta' },
    ],
    cta: { signIn: 'Sign In', getStarted: 'Sign Up' },
  },
  hero: {
    badge: 'Now live',
    title: 'Create and Manage Job Descriptions Effortlessly.',
    description:
      'TalentForge is an all-in-one platform that helps HR teams and managers use AI to instantly write, collaborate on, and organize Job Descriptions. Connect everything seamlessly to your existing HR software.',
    trusted: 'Trusted by leading HR teams',
    cta: { primary: 'Start for Free', secondary: 'See How It Works' },
    stats: [
      { value: '300,000+', label: 'Jobs Created' },
      { value: '100%', label: 'Cloud Secure' },
      { value: '10x', label: 'Faster Hiring' },
    ],
  },
  workflow: {
    badge: 'HOW IT WORKS',
    title: 'From a blank page to a published role in minutes.',
    subtitle: 'A complete, step-by-step process to generate, review, and approve job descriptions without the endless email chains.',
    steps: [
      { id: '01', title: 'Start with AI', desc: 'Tell our smart AI what role you need, and it instantly generates a professional, fully-structured job description.', icon: Sparkles },
      { id: '02', title: 'Review & Edit', desc: 'HR teams can refine the AI draft, ensuring the tone matches company culture and includes all necessary compliance details.', icon: FileText },
      { id: '03', title: 'Assign Competencies', desc: 'Easily attach the right skills, soft skills, and core competencies required for the role from a built-in library.', icon: Database },
      { id: '04', title: 'Manager Approval', desc: 'Send the draft directly to the hiring manager for a quick digital review and sign-off.', icon: CheckCircle2 },
      { id: '05', title: 'Employee Sign-off', desc: 'New hires can digitally review and acknowledge their exact role expectations on day one.', icon: Users },
      { id: '06', title: 'One-Click Sync', desc: 'Push the finalized job description straight to your core HR system like Cornerstone (CSOD) instantly.', icon: RefreshCw },
      { id: '07', title: 'Track Progress', desc: 'Monitor all your open roles, pending approvals, and historical changes in one simple dashboard.', icon: Shield },
    ],
  },
  aiGenerator: {
    badge: 'AI-POWERED',
    title: 'Meet your AI Job Architect',
    description: 'No more staring at a blank page. Just enter a job title, department, and level, and our AI will write a perfectly structured job description in seconds.',
    sections: ['Job Summary', 'Required Skills', 'Education', 'Experience', 'Benefits'],
    roleLevels: ['Entry Level', 'Manager', 'Executive'],
  },
  features: {
    badge: 'CORE FEATURES',
    title: 'Everything you need to hire smarter.',
    cards: [
      { title: 'AI Job Creation', desc: 'Generate professional job descriptions instantly using advanced AI.', icon: Sparkles, stat: 'Instant' },
      { title: 'HR System Sync', desc: 'Seamlessly export your data to Cornerstone (CSOD) and other HR software.', icon: RefreshCw, stat: 'Live' },
      { title: 'Smart Skill Library', desc: 'Access a vast library of pre-written skills and competencies to add to any role.', icon: Database, stat: '50K+' },
      { title: 'Easy Approvals', desc: 'Set up simple digital workflows to get manager approvals faster.', icon: CheckCircle2, stat: 'Fast' },
      { title: 'Live Dashboard', desc: 'See which job descriptions are pending, approved, or published in real-time.', icon: BarChart3, stat: 'Real-time' },
      { title: 'Global Support', desc: 'Fully supports multiple languages and international character sets.', icon: Globe, stat: 'Global' },
    ],
    extras: [
      { title: 'PDF Exporting', icon: FileText },
      { title: 'Digital Signatures', icon: PenTool },
      { title: 'Custom Templates', icon: Settings },
      { title: 'Change History', icon: Shield },
    ],
  },
  roles: {
    badge: 'WHO IT IS FOR',
    title: 'Built for everyone in your company.',
    items: [
      { name: 'HR Administrator', badge: 'PLATFORM OWNER', desc: 'Controls the entire platform, manages templates, and sets up approval rules.', icon: Crown, perms: ['Manage templates', 'Setup integrations', 'Assign user roles', 'Access all reports'] },
      { name: 'Recruiter', badge: 'CREATOR', desc: 'Generates new job descriptions, organizes open roles, and prepares them for posting.', icon: Briefcase, perms: ['Draft new roles', 'Use AI generator', 'Organize categories', 'Track status'] },
      { name: 'Compliance Officer', badge: 'REVIEWER', desc: 'Checks the history of all changes to ensure legal and company standards are met.', icon: Shield, perms: ['Review changes', 'Check compliance', 'Export audits', 'Approve updates'] },
      { name: 'Hiring Manager', badge: 'APPROVER', desc: 'Reviews drafts, suggests changes, and approves the final role requirements.', icon: User, perms: ['Review team roles', 'Suggest edits', 'Provide feedback', 'Final sign-off'] },
      { name: 'Employee', badge: 'TEAM MEMBER', desc: 'Views their official job description and signs off on their responsibilities.', icon: Users, perms: ['View own role', 'Acknowledge duties', 'Digital sign-off', 'See required skills'] },
    ],
  },
  clients: {
    badge: 'OUR CLIENTS',
    title: 'Trusted by innovative companies worldwide.',
    logos: [
      {
        name: 'Nike',
        src: 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg',
        className: 'w-10 h-10',
        hoverShadow: 'hover:shadow-indigo-500/10'
      },
      {
        name: 'Google',
        src: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg',
        className: 'w-8 h-8',
        hoverShadow: 'hover:shadow-red-500/10'
      },
      {
        name: 'Prada',
        src: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Prada-Logo.svg',
        className: 'w-12 h-12',
        hoverShadow: 'hover:shadow-slate-500/10'
      },
      {
        name: 'Sony',
        src: 'https://cdn.simpleicons.org/sony',
        className: 'w-12 h-12',
        hoverShadow: 'hover:shadow-blue-500/10'
      },
      {
        name: 'Disney',
        src: 'https://upload.wikimedia.org/wikipedia/commons/a/a4/Disney_wordmark.svg',
        className: 'w-14 h-14',
        hoverShadow: 'hover:shadow-cyan-500/10'
      },
      {
        name: 'Apple',
        src: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg',
        className: 'w-8 h-8',
        hoverShadow: 'hover:shadow-rose-500/10'
      },
      {
        name: 'AMG',
        src: '/amg.svg',
        className: 'w-14 h-14',
        hoverShadow: 'hover:shadow-purple-500/10'
      },
      {
        name: 'Bosch',
        src: 'https://cdn.simpleicons.org/bosch',
        className: 'w-14 h-14',
        hoverShadow: 'hover:shadow-red-500/10'
      }
    ]
  },
  solutions: {
    badge: 'BENEFITS',
    title: 'Solve your biggest hiring headaches.',
    description: 'TalentForge replaces messy Word documents and lost emails with a streamlined, cloud-based platform.',
    cards: [
      { title: 'A Central Organized Library', desc: 'Keep all your company\'s job descriptions in one secure, easily searchable place.' },
      { title: 'End the Email Chaos', desc: 'Managers and HR can leave comments, make edits, and approve directly in the app.' },
      { title: 'Always Up to Date', desc: 'When a role changes, update it once and sync it instantly to your main HR system.' },
      { title: 'Stay Compliant & Secure', desc: 'Every change is tracked. Always know exactly who approved a job description and when.' },
    ],
  },
  stats: [
    { value: '300,000+', label: 'Jobs Created', color: 'text-indigo-600' },
    { value: '100%', label: 'Cloud Secure', color: 'text-emerald-600' },
    { value: '10x', label: 'Faster Drafting', color: 'text-cyan-600' },
    { value: '47%', label: 'Less Admin Work', color: 'text-amber-600' },
  ],
  cta: {
    title: 'Ready to modernize your hiring process?',
    description: 'Join the smartest companies that are saving thousands of hours on HR administration. Get set up in minutes.',
    primary: 'Start for Free',
    secondary: 'Book a Demo',
    features: ['Secure Cloud Access', 'Setup in 5 minutes', 'No IT required', '24/7 Support'],
  },
  footer: {
    copyright: `© ${new Date().getFullYear()} TalentForge. All rights reserved.`,
    description: 'The Smart Job Description Management Platform. Create, collaborate, and manage your job library effortlessly.',
    poweredBy: {
      text: 'This product is part of',
      brand: 'Phenom Cloud',
      url: 'https://phenomecloud.com/',
      logo: phenomLogo
    },
    columns: [
      {
        title: 'Platform',
        links: ['Product Overview', 'Features', 'Solutions', 'Pricing', 'Integrations']
      },
      {
        title: 'Resources',
        links: ['Help Center', 'API Documentation', 'Community', 'Webinars', 'Blog']
      },
      {
        title: 'Legal',
        links: ['Privacy Policy', 'Terms of Service', 'Security', 'Compliance']
      }
    ],
    contact: 'talentforge.phenomecloud.support@gmail.com',
  },
};
