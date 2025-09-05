"use client";
import React from "react";
import { Scale, Users, AlertTriangle, CreditCard, Gavel, Shield, FileText, Mail, ChevronRight } from "lucide-react";
import { useTheme } from "antd-style";

export default function TermsOfService() {
  const theme = useTheme();
  const isDark = theme.appearance === 'dark';

  const sections = [
    {
      id: 1,
      icon: <FileText className="w-6 h-6" />,
      title: "Acceptance of Terms",
      content: (
        <p>
          By accessing and using <span className="font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Klyno AI</span> services, you accept and agree to be bound by the terms and provision of this agreement. These terms apply to all visitors, users, and others who access or use our AI-powered chat and collaboration platform.
        </p>
      )
    },
    {
      id: 2,
      icon: <Users className="w-6 h-6" />,
      title: "Description of Service",
      content: (
        <div>
          <p className="mb-4">Klyno AI provides the following services:</p>
          <div className="grid gap-3">
            {[
              "AI-powered chat experiences and one-on-one AI agents",
              "Team collaboration tools and group chat functionality",
              "Advanced AI models for various use cases and applications",
              "Integration capabilities and API access for developers"
            ].map((item, idx) => (
              <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r border ${
                isDark 
                  ? 'from-blue-900/20 to-indigo-900/20 border-blue-800/30' 
                  : 'from-blue-50 to-indigo-50 border-blue-100'
              }`}>
                <ChevronRight className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  isDark ? 'text-blue-400' : 'text-blue-600'
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
      icon: <Scale className="w-6 h-6" />,
      title: "User Responsibilities",
      content: (
        <div>
          <p className="mb-4">As a user of our platform, you agree to:</p>
          <div className="grid gap-3">
            {[
              "Provide accurate and complete information when creating accounts",
              "Use our services in compliance with all applicable laws and regulations",
              "Respect intellectual property rights and not engage in unauthorized use",
              "Maintain the confidentiality of your account credentials and passwords"
            ].map((item, idx) => (
              <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r border ${
                isDark 
                  ? 'from-emerald-900/20 to-teal-900/20 border-emerald-800/30' 
                  : 'from-emerald-50 to-teal-50 border-emerald-100'
              }`}>
                <ChevronRight className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  isDark ? 'text-emerald-400' : 'text-emerald-600'
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
      icon: <AlertTriangle className="w-6 h-6" />,
      title: "Prohibited Uses",
      content: (
        <div className={`p-6 rounded-xl bg-gradient-to-br border ${
          isDark 
            ? 'from-red-900/20 via-orange-900/20 to-yellow-900/20 border-red-800/30' 
            : 'from-red-50 via-orange-50 to-yellow-50 border-red-200'
        }`}>
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 text-white">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="mb-3">You may not use our service to:</p>
              <ul className="text-sm space-y-1 opacity-90">
                <li>• Generate illegal, harmful, or malicious content</li>
                <li>• Violate intellectual property or privacy rights</li>
                <li>• Attempt to reverse engineer our AI models</li>
                <li>• Spam, harass, or abuse other users or our systems</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 5,
      icon: <CreditCard className="w-6 h-6" />,
      title: "Payment Terms",
      content: (
        <p>
          Subscription fees are billed in advance on a monthly or annual basis. All fees are non-refundable except as required by law. We reserve the right to modify pricing with 30 days notice to existing subscribers.
        </p>
      )
    },
    {
      id: 6,
      icon: <Shield className="w-6 h-6" />,
      title: "Intellectual Property",
      content: (
        <p>
          The service and its original content, features, and functionality are owned by Klyno AI and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
        </p>
      )
    },
    {
      id: 7,
      icon: <Gavel className="w-6 h-6" />,
      title: "Limitation of Liability",
      content: (
        <p>
          In no event shall Klyno AI be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
        </p>
      )
    },
    {
      id: 8,
      icon: <FileText className="w-6 h-6" />,
      title: "Termination",
      content: (
        <p>
          We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
        </p>
      )
    },
    {
      id: 9,
      icon: <Scale className="w-6 h-6" />,
      title: "Governing Law",
      content: (
        <p>
          These Terms shall be interpreted and governed by the laws of the jurisdiction in which Klyno AI operates, without regard to its conflict of law provisions.
        </p>
      )
    },
    {
      id: 10,
      icon: <Mail className="w-6 h-6" />,
      title: "Contact Information",
      content: (
        <div className="flex flex-col gap-4">
          <p>If you have any questions about these Terms of Service, please contact us:</p>
          <a
            href="mailto:support@ascensionhostings.com"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 transition-all duration-200 w-fit group"
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
          style={{ backgroundColor: isDark ? '#7c3aed' : '#8b5cf6' }}
        ></div>
        <div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 animate-pulse"
          style={{ 
            backgroundColor: isDark ? '#1d4ed8' : '#3b82f6',
            animationDelay: '2s'
          }}
        ></div>
        <div 
          className="absolute top-3/4 left-1/2 w-64 h-64 rounded-full blur-3xl opacity-20 animate-pulse"
          style={{ 
            backgroundColor: isDark ? '#047857' : '#059669',
            animationDelay: '4s'
          }}
        ></div>
        <div 
          className="absolute top-1/2 right-1/3 w-80 h-80 rounded-full blur-3xl opacity-15 animate-pulse"
          style={{ 
            backgroundColor: isDark ? '#dc2626' : '#ef4444',
            animationDelay: '6s'
          }}
        ></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 md:px-8 lg:px-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center p-4 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 mb-6">
            <Scale className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-purple-600 via-blue-600 to-emerald-600 bg-clip-text text-transparent">
            Terms of Service
          </h1>
          <p className={`text-lg opacity-70 mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Please read these terms carefully
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
                    background: index % 5 === 0 
                      ? 'linear-gradient(135deg, #8b5cf6, #3b82f6)'
                      : index % 5 === 1 
                      ? 'linear-gradient(135deg, #3b82f6, #10b981)'
                      : index % 5 === 2 
                      ? 'linear-gradient(135deg, #10b981, #f59e0b)'
                      : index % 5 === 3
                      ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                      : 'linear-gradient(135deg, #ef4444, #8b5cf6)'
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
            <Scale className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Fair & Transparent Terms</h3>
          <p 
            className="opacity-70 max-w-2xl mx-auto"
            style={{ color: isDark ? '#d1d5db' : '#4b5563' }}
          >
            At Klyno AI, we believe in clear, fair terms that protect both our users and our platform. These terms ensure a safe and productive environment for everyone.
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: translateY(30px);
          }
        }
      `}</style>
    </div>
  );
}