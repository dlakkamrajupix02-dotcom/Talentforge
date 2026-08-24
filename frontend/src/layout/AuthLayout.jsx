import React, { useContext } from 'react';
import { Hammer, Sparkles } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { JDContext } from '../context/JDContext';

const AuthLayout = ({ children }) => {
  var navigate = useNavigate();
  const { login } = useContext(JDContext);
  const location = useLocation();

  const handleDemoClick=()=>{
    const mockToken = "mock_token_" + Date.now();
    const mockUser = {
      full_name: "Sarah Chen",
      email: "sarah.chen@company.com",
      role: "HR Manager"
    };
    login(mockToken, mockUser);
    navigate("/");
  }

  return (
    <div className="h-screen bg-[#EEF4FF] bg-white  flex flex-col items-center justify-between p-4 md:p-6 font-sans overflow-auto">
      <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm text-slate-900 items-center justify-center w-full max-w-[460px]">
        {/* Logo & Header */}
        <div className="flex flex-col items-center mb-3 text-center">
          <div className="bg-[#1d63ff] p-2.5 rounded-2xl mb-3 shadow-xl shadow-blue-200">
            <Hammer className="text-white w-7 h-7" />
          </div>
          <h1 className="text-3xl font-extrabold text-[#0f172a] tracking-tight">TalentForge</h1>
          <p className="text-slate-500 mt-1 text-xs font-semibold opacity-80 tracking-wider">
            AI-Powered Job Description Generator
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white w-full rounded-[28px] shadow-2xl shadow-blue-100/50 border border-white/50 p-6 md:p-8 transition-all">
          {/* Tabs */}
          <div className="bg-slate-100 p-1.5 rounded-2xl flex mb-6 gap-1 border border-slate-200/50">
            <Link to="/login" className={`flex-1 py-2.5 text-center text-sm font-bold rounded-xl transition-all ${location.pathname === '/login' ? 'bg-white shadow-md text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
              Log In
            </Link>
            <Link to="/signup" className={`flex-1 py-2.5 text-center text-sm font-bold rounded-xl transition-all ${location.pathname === '/signup' ? 'bg-white shadow-md text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
              Sign Up
            </Link>
          </div>

          {children}

          <div className="mt-8 flex justify-center">
            <button 
              disabled
              className="flex items-center gap-2 text-slate-400 font-bold text-xs cursor-not-allowed opacity-60 group"
              title="Demo mode is coming soon"
            >
              <Sparkles size={14} className="text-slate-300" />
              <span>Try demo — no sign up needed (Coming Soon)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Badges */}
      <div className="w-full mt-4 pb-4">
        <div className="flex flex-wrap justify-center gap-3 max-w-2xl mx-auto">
          {["AI-generated JDs in < 10s", "EEOC compliance scanning", "One-click CSOD push"].map((f, i) => (
            <div key={i} className=" px-5 py-2.5 border border-slate-100 shadow-sm text-[12px] text-slate-500 ">
              {f}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;