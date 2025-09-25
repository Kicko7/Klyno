"use client";
import React from "react";
import { Shield, Eye, Lock, Users, FileText, Mail, ChevronRight } from "lucide-react";
import { useTheme } from "antd-style";

export default function PrivacyPolicy() {
  const theme = useTheme();
  const isDark = theme.appearance === 'dark';

  const sections = [
    {
      id: 1,
      icon: <FileText className="w-6 h-6" />,
      title: "Introduction",
      content: (
        <p>
          Welcome to <span className="font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Klyno AI</span>. We provide AI-powered chat experiences and collaboration tools, including one-on-one AI agents and team chat. Your privacy is very important to us, and this policy explains how we handle your data.
        </p>
      )
    },
    {
      id: 2,
      icon: <Eye className="w-6 h-6" />,
      title: "Information We Collect",
      content: (
        <div>
          <p className="mb-4">We may collect the following types of information:</p>
          <div className="grid gap-3">
            {[
              "Account details (name, email, authentication info)",
              "Chat interactions with AI agents and team conversations", 
              "Usage data (features used, preferences, device/browser info)",
              "Optional feedback and support requests"
            ].map((item, idx) => (
              <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r border ${
                isDark 
                  ? 'from-purple-900/20 to-blue-900/20 border-purple-800/30' 
                  : 'from-purple-50 to-blue-50 border-purple-100'
              }`}>
                <ChevronRight className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  isDark ? 'text-purple-400' : 'text-purple-600'
                }`} />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 3,
      icon: <Users className="w-6 h-6" />,
      title: "How We Use Your Information",
      content: (
        <div>
          <p className="mb-4">The information we collect helps us:</p>
          <div className="grid gap-3">
            {[
              "Provide personalized AI chat and collaboration services",
              "Improve our models, features, and user experience",
              "Maintain security, prevent fraud, and ensure compliance",
              "Communicate updates, offers, or support messages"
            ].map((item, idx) => (
              <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r border ${
                isDark 
                  ? 'from-green-900/20 to-teal-900/20 border-green-800/30' 
                  : 'from-green-50 to-teal-50 border-green-100'
              }`}>
                <ChevronRight className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  isDark ? 'text-green-400' : 'text-green-600'
                }`} />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 4,
      icon: <Lock className="w-6 h-6" />,
      title: "Data Storage & Security",
      content: (
        <div className={`p-6 rounded-xl bg-gradient-to-br border ${
          isDark 
            ? 'from-red-900/20 via-orange-900/20 to-yellow-900/20 border-orange-800/30' 
            : 'from-red-50 via-orange-50 to-yellow-50 border-orange-200'
        }`}>
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 text-white">
              <Shield className="w-5 h-5" />
            </div>
            <p>
              Your data is stored securely with encryption. We implement best practices to protect against unauthorized access, alteration, or disclosure. However, no system is 100% secure.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 5,
      icon: <Users className="w-6 h-6" />,
      title: "Sharing of Information",
      content: (
        <p>
          We do not sell your data. Limited information may be shared with trusted service providers for hosting, analytics, or compliance with legal obligations.
        </p>
      )
    },
    {
      id: 6,
      icon: <Shield className="w-6 h-6" />,
      title: "Your Rights",
      content: (
        <p>
          You have the right to access, update, or delete your personal data. You may also request to opt out of non-essential data collection.
        </p>
      )
    },
    {
      id: 7,
      icon: <FileText className="w-6 h-6" />,
      title: "Changes to This Policy",
      content: (
        <p>
          We may update this Privacy Policy from time to time. Updates will be posted on this page with the latest revision date.
        </p>
      )
    },
    {
      id: 8,
      icon: <Mail className="w-6 h-6" />,
      title: "Contact Us",
      content: (
        <div className="flex flex-col gap-4">
          <p>If you have any questions, please reach out at:</p>
          <a
            href="mailto:support@ascensionhostings.com"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all duration-200 w-fit group"
          >
            <Mail className="w-4 h-4 group-hover:scale-110 transition-transform text-white" />
            <span className="text-white">
            support@ascensionhostings.com
            </span>
          </a>
        </div>
      )
    }
  ];

  return (
    <div 
      className="min-h-screen transition-all duration-500 w-full overflow-auto"
      style={{
        background: isDark 
          ? 'linear-gradient(135deg, #0c0a1d, #1a1625, #000000)'
          : 'linear-gradient(135deg, #f9fafb, #ffffff, #dbeafe)',
        color: isDark ? '#f3f4f6' : '#111827'
      }}
    >
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 animate-pulse"
          style={{ backgroundColor: isDark ? '#9333ea' : '#a855f7' }}
        ></div>
        <div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 animate-pulse"
          style={{ 
            backgroundColor: isDark ? '#2563eb' : '#3b82f6',
            animationDelay: '2s'
          }}
        ></div>
        <div 
          className="absolute top-3/4 left-1/2 w-64 h-64 rounded-full blur-3xl opacity-20 animate-pulse"
          style={{ 
            backgroundColor: isDark ? '#059669' : '#10b981',
            animationDelay: '4s'
          }}
        ></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 md:px-8 lg:px-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center p-4 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 mb-6">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-purple-600 via-blue-600 to-green-600 bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          <p className={`text-lg opacity-70 mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Your privacy matters to us
          </p>
          
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {sections.map((section, index) => (
            <div
              key={section.id}
              className="group p-8 rounded-2xl backdrop-blur-sm border transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
              style={{
                backgroundColor: isDark ? 'rgba(17, 24, 39, 0.5)' : 'rgba(255, 255, 255, 0.7)',
                borderColor: isDark ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.5)',
                animation: `fadeInUp 0.6s ease-out forwards ${index * 0.1}s`,
                opacity: 0,
                transform: 'translateY(30px)'
              }}
            >
              <div className="flex items-start gap-4 mb-4">
                <div 
                  className="p-3 rounded-xl transition-all duration-300 group-hover:scale-110 text-white"
                  style={{
                    background: index % 4 === 0 
                      ? 'linear-gradient(135deg, #8b5cf6, #3b82f6)'
                      : index % 4 === 1 
                      ? 'linear-gradient(135deg, #3b82f6, #10b981)'
                      : index % 4 === 2 
                      ? 'linear-gradient(135deg, #10b981, #f59e0b)'
                      : 'linear-gradient(135deg, #f59e0b, #ef4444)'
                  }}
                >
                  {section.icon}
                </div>
                <div className="flex-1">
                  <h2 
                    className="text-2xl font-bold mb-4 transition-colors group-hover:text-purple-600"
                    style={{ color: isDark ? '#f3f4f6' : '#111827' }}
                  >
                    {section.id}. {section.title}
                  </h2>
                  <div 
                    className="leading-relaxed"
                    style={{ color: isDark ? '#d1d5db' : '#374151' }}
                  >
                    {section.content}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div 
          className="mt-16 p-8 rounded-2xl text-center backdrop-blur-sm border"
          style={{
            background: isDark 
              ? 'linear-gradient(90deg, rgba(17, 24, 39, 0.5), rgba(31, 41, 55, 0.5))'
              : 'linear-gradient(90deg, rgba(255, 255, 255, 0.7), rgba(249, 250, 251, 0.7))',
            borderColor: isDark ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.5)'
          }}
        >
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 mb-4">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Protected by Design</h3>
          <p 
            className="opacity-70 max-w-2xl mx-auto"
            style={{ color: isDark ? '#d1d5db' : '#4b5563' }}
          >
            At Klyno AI, we believe privacy is a fundamental right. This policy reflects our commitment to protecting your data while delivering exceptional AI experiences.
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}