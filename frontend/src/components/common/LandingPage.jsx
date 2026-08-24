// App.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CloudUpload, 
  CheckCircle, 
  Sparkles, 
  RefreshCw, 
  Eye, 
  Download,
  BarChart3,
  Users,
  Globe,
  FileText,
  Settings,
  Shield,
  Clock,
  ArrowRight,
  Menu,
  X,
  ChevronDown,
  Star,
  Zap,
  Award,
  TrendingUp,
  Play,
  Check,
  AlertCircle,
  Layers,
  BookOpen,
  GitBranch,
  UserCheck,
  FileCode,
  Database,
  Activity
} from 'lucide-react';

const LandingPage = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedRole, setSelectedRole] = useState('Senior HR Business Partner');
  const [selectedDept, setSelectedDept] = useState('Human Resources');
  const [selectedLevel, setSelectedLevel] = useState('Manager');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const steps = [
    { name: 'Start with AI', icon: Sparkles, status: 'completed', color: 'bg-green-500' },
    { name: 'Review & Edit', icon: CheckCircle, status: 'active', color: 'bg-blue-500' },
    { name: 'Add Competencies', icon: Layers, status: 'pending', color: 'bg-purple-500' },
    { name: 'Manager Approval', icon: UserCheck, status: 'pending', color: 'bg-yellow-500' },
    { name: 'Employee Sign-off', icon: Users, status: 'pending', color: 'bg-indigo-500' },
    { name: 'One-Click Sync', icon: Download, status: 'pending', color: 'bg-red-500' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-2">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                TalentForge 3.2
              </span>
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                NOW LIVE
              </span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#" className="text-gray-700 hover:text-blue-600 transition">Features</a>
              <a href="#" className="text-gray-700 hover:text-blue-600 transition">Workflow</a>
              <a href="#" className="text-gray-700 hover:text-blue-600 transition">AI Generator</a>
              <a href="#" className="text-gray-700 hover:text-blue-600 transition">Roles</a>
              <button className="px-4 py-2 text-gray-700 hover:text-blue-600 transition">Sign In</button>
              <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all">
                Get Started
              </button>
            </div>
            
            <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-0 right-0 bg-white shadow-lg z-40 md:hidden"
          >
            <div className="px-4 py-4 space-y-3">
              <a href="#" className="block text-gray-700 hover:text-blue-600">Features</a>
              <a href="#" className="block text-gray-700 hover:text-blue-600">Workflow</a>
              <a href="#" className="block text-gray-700 hover:text-blue-600">AI Generator</a>
              <a href="#" className="block text-gray-700 hover:text-blue-600">Roles</a>
              <button className="w-full px-4 py-2 text-gray-700 hover:text-blue-600">Sign In</button>
              <button className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg">Get Started</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="pt-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 py-20">
          <div className="absolute inset-0 bg-grid-gray-900/[0.02] bg-[size:50px_50px]" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm mb-6">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-semibold text-gray-700">AI-Powered Migration Platform</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Create & Manage Job Descriptions
                <br />
                Effortlessly
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                TalentForge 3.2 is the all-in-one platform for HR teams to instantly write, collaborate on, and organize Job Descriptions using AI, then seamlessly sync them to your HR systems.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-2xl transition-all transform hover:scale-105">
                  Start Migration →
                </button>
                <button className="px-8 py-4 border-2 border-gray-300 rounded-xl font-semibold hover:border-blue-600 transition-all">
                  See How It Works
                </button>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
                {[
                  { value: '12,400+', label: 'Job Descriptions Migrated', icon: FileText },
                  { value: '99.8%', label: 'Data Accuracy Rate', icon: CheckCircle },
                  { value: '6x', label: 'Faster Migration', icon: TrendingUp }
                ].map((stat, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200"
                  >
                    <stat.icon className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                    <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                    <div className="text-gray-600">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Migration Workflow */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl font-bold mb-4">The Modern HR Workflow</h2>
              <p className="text-xl text-gray-600">From a blank page to a published role in minutes</p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {steps.map((step, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="relative group cursor-pointer"
                  onClick={() => setActiveStep(idx)}
                >
                  <div className={`absolute inset-0 bg-gradient-to-r ${step.color.replace('bg-', 'from-')} to-transparent opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity`} />
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-xl transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`${step.color} p-3 rounded-xl`}>
                        <step.icon className="w-6 h-6 text-white" />
                      </div>
                      {step.status === 'completed' && <CheckCircle className="w-6 h-6 text-green-500" />}
                      {step.status === 'active' && <Play className="w-6 h-6 text-blue-500 animate-pulse" />}
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{step.name}</h3>
                    <p className="text-gray-600 text-sm">
                      {step.name === 'Start with AI' && 'Tell our smart AI what role you need, and it instantly generates a fully-structured job description.'}
                      {step.name === 'Review & Edit' && 'HR teams can refine the AI draft, ensuring it matches your company culture and compliance rules.'}
                      {step.name === 'Add Competencies' && 'Easily attach the right skills and core competencies required for the role from a built-in library.'}
                      {step.name === 'Manager Approval' && 'Send the draft directly to the hiring manager for a quick digital review and sign-off.'}
                      {step.name === 'Employee Sign-off' && 'New hires can digitally review and acknowledge their exact role expectations on day one.'}
                      {step.name === 'One-Click Sync' && 'Push the finalized job description straight to your core HR system instantly.'}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* AI Generator Section */}
        <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <div className="inline-flex items-center gap-2 bg-purple-100 px-4 py-2 rounded-full mb-4">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-semibold text-purple-600">AI-POWERED GENERATION</span>
                </div>
                <h2 className="text-4xl font-bold mb-4">Generate Complete Job Descriptions</h2>
                <p className="text-xl text-gray-600 mb-6">with OpenAI GPT-4</p>
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                  <div className="mb-4">
                    <label className="block text-sm font-semibold mb-2">Role Title</label>
                    <input 
                      type="text" 
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Department</label>
                      <select 
                        value={selectedDept}
                        onChange={(e) => setSelectedDept(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option>Human Resources</option>
                        <option>Engineering</option>
                        <option>Marketing</option>
                        <option>Sales</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Level</label>
                      <select 
                        value={selectedLevel}
                        onChange={(e) => setSelectedLevel(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option>Manager</option>
                        <option>Director</option>
                        <option>Individual Contributor</option>
                        <option>Executive</option>
                      </select>
                    </div>
                  </div>
                  <button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all">
                    Generate with AI
                  </button>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl p-8 shadow-xl border border-gray-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">{selectedRole}</h3>
                    <p className="text-gray-600">{selectedDept} • {selectedLevel}</p>
                  </div>
                  <Sparkles className="w-6 h-6 text-purple-600" />
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Generated Summary</h4>
                    <p className="text-gray-700 text-sm">
                      The {selectedRole.toLowerCase()} serves as a strategic advisor to business leaders, partnering with cross-functional teams to design and execute people strategies that drive organizational performance. This role is responsible for talent acquisition, workforce planning, employee relations, and change management across a 200+ person business unit.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Ideal Candidate</h4>
                    <p className="text-gray-700 text-sm">
                      Brings 8+ years of progressive {selectedDept.toLowerCase()} experience, with demonstrated success in fast-paced environments and a data-driven approach to solving complex organizational challenges.
                    </p>
                  </div>
                  <div className="border-t pt-4 mt-4">
                    <div className="flex gap-2">
                      <button className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:border-blue-600 transition-all">
                        Edit
                      </button>
                      <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all">
                        Approve
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Platform Capabilities */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl font-bold mb-4">Everything You Need to Hire Smarter</h2>
              <p className="text-xl text-gray-600">A complete toolset to manage your organization's job library</p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Sparkles, title: 'AI Job Creation', desc: 'Generate professional job descriptions instantly using advanced AI.', color: 'bg-blue-500' },
                { icon: RefreshCw, title: 'HR System Sync', desc: 'Seamlessly export your data to Cornerstone and other HR software.', color: 'bg-green-500' },
                { icon: Layers, title: 'Competency Library', desc: 'Access 50,000+ skills and competencies to attach to any role.', color: 'bg-purple-500' },
                { icon: UserCheck, title: 'Easy Approvals', desc: 'Set up simple digital workflows to get manager approvals faster.', color: 'bg-orange-500' },
                { icon: BarChart3, title: 'Live Dashboard', desc: 'See which job descriptions are pending or approved in real-time.', color: 'bg-red-500' },
                { icon: Globe, title: 'Global Support', desc: 'Fully supports multiple languages and international character sets.', color: 'bg-indigo-500' },
                { icon: FileText, title: 'PDF Exporting', desc: 'Generate clean, professional PDF documents instantly.', color: 'bg-pink-500' },
                { icon: Shield, title: 'Change History', desc: 'Every change is tracked for complete compliance and security.', color: 'bg-teal-500' }
              ].map((cap, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                  className="group bg-gray-50 rounded-2xl p-6 hover:shadow-xl transition-all cursor-pointer"
                >
                  <div className={`${cap.color} w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <cap.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{cap.title}</h3>
                  <p className="text-gray-600 text-sm">{cap.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Role-Based Access Control */}
        <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl font-bold mb-4">Role-Based Access Control</h2>
              <p className="text-xl text-gray-600">5 distinct roles with granular permissions</p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {[
                { title: 'Super User', icon: Shield, color: 'bg-red-500', perms: ['Full system access', 'Manage all users', 'Configure system'] },
                { title: 'JD Manager', icon: FileCode, color: 'bg-blue-500', perms: ['Manage JD templates', 'Create categories', 'Run reports'] },
                { title: 'HR Rep', icon: Users, color: 'bg-green-500', perms: ['Review JDs', 'Approve changes', 'Manage employees'] },
                { title: 'Manager', icon: UserCheck, color: 'bg-purple-500', perms: ['Review team JDs', 'Provide feedback', 'Approve team'] },
                { title: 'Participant', icon: CheckCircle, color: 'bg-gray-500', perms: ['View own JD', 'Sign off', 'Submit feedback'] }
              ].map((role, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all"
                >
                  <div className={`${role.color} w-12 h-12 rounded-xl flex items-center justify-center mb-4`}>
                    <role.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-3">{role.title}</h3>
                  <ul className="space-y-2">
                    {role.perms.map((perm, i) => (
                      <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        {perm}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Ready to Modernize Your Hiring Process?
              </h2>
              <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                Join the smartest companies that are saving thousands of hours on HR administration. Get set up in minutes.
              </p>
              <button className="px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold hover:shadow-2xl transition-all transform hover:scale-105">
                Start for Free →
              </button>
            </motion.div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LandingPage;