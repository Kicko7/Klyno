'use client';

import { useTheme } from 'antd-style';
import {
  ArrowRight,
  CheckCircle,
  Clock,
  Cloud,
  HardDrive,
  Settings,
  Sparkles,
  Zap,
} from 'lucide-react';
import { memo } from 'react';
import { Center, Flexbox } from 'react-layout-kit';

const IntegrationsComingSoon = memo(() => {
  const theme = useTheme();

  const integrations = [
    {
      id: 'mate',
      name: 'Mate',
      description: 'AI-powered productivity assistant for seamless workflow automation',
      icon: Settings,
      color: 'from-blue-500 to-purple-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      status: 'coming-soon',
    },
    {
      id: 'zapier',
      name: 'Zapier',
      description: 'Connect 5000+ apps and automate your workflows with ease',
      icon: Zap,
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-50 dark:bg-orange-950/20',
      borderColor: 'border-orange-200 dark:border-orange-800',
      status: 'coming-soon',
    },
    {
      id: 'google-drive',
      name: 'Google Drive',
      description: 'Access and manage your Google Drive files directly in KlynoAI',
      icon: Cloud,
      color: 'from-green-500 to-blue-500',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
      borderColor: 'border-green-200 dark:border-green-800',
      status: 'coming-soon',
    },
    {
      id: 'dropbox',
      name: 'Dropbox',
      description: 'Seamlessly integrate with Dropbox for file storage and sharing',
      icon: HardDrive,
      color: 'from-blue-600 to-cyan-500',
      bgColor: 'bg-cyan-50 dark:bg-cyan-950/20',
      borderColor: 'border-cyan-200 dark:border-cyan-800',
      status: 'coming-soon',
    },
  ];

  return (
    <div
      className="min-h-screen p-6 overflow-auto"
      style={{ backgroundColor: theme.colorBgLayout }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-6"
            style={{
              background:
                theme.appearance === 'dark'
                  ? 'linear-gradient(to right, rgba(147, 51, 234, 0.3), rgba(236, 72, 153, 0.3))'
                  : 'linear-gradient(to right, rgb(243, 232, 255), rgb(252, 231, 243))',
              borderColor:
                theme.appearance === 'dark' ? 'rgba(147, 51, 234, 0.7)' : 'rgb(196, 181, 253)',
            }}
          >
            <Sparkles
              className="w-4 h-4"
              style={{
                color: theme.appearance === 'dark' ? 'rgb(196, 181, 253)' : 'rgb(147, 51, 234)',
              }}
            />
            <span
              className="text-sm font-medium"
              style={{
                color: theme.appearance === 'dark' ? 'rgb(196, 181, 253)' : 'rgb(126, 34, 206)',
              }}
            >
              Coming Soon
            </span>
          </div>

          <h1
            className="text-4xl md:text-5xl font-bold bg-clip-text mb-4"
            style={{
              background:
                theme.appearance === 'dark'
                  ? 'linear-gradient(to right, white, rgb(209, 213, 219))'
                  : 'linear-gradient(to right, rgb(17, 24, 39), rgb(75, 85, 99))',
                  color: theme.appearance === 'dark' ? 'black' : 'white',
            }}
          >
            Integrations Hub
          </h1>

          <p className="text-lg max-w-2xl mx-auto" style={{ color: theme.colorTextSecondary }}>
            Connect KlynoAI with your favorite tools and services to create powerful workflows and
            boost your productivity.
          </p>
        </div>

        {/* Construction Banner */}
        <div className="relative mb-12">
          <div className="absolute -top-2 -left-2 right-2 h-8 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 rotate-1 z-10 flex items-center justify-center overflow-hidden rounded-lg">
            <div className="whitespace-nowrap text-xs font-bold text-white uppercase tracking-wider animate-pulse">
              🚧 Under Development • Coming Soon • Work In Progress • 🚧
            </div>
          </div>

          <div
            className="relative backdrop-blur-xl border rounded-2xl p-8 shadow-xl"
            style={{
              backgroundColor:
                theme.appearance === 'dark' ? 'rgba(17, 24, 39, 0.8)' : 'rgba(255, 255, 255, 0.8)',
              borderColor: theme.colorBorder,
            }}
          >
            <Center>
              <Flexbox align="center" gap={4} className="text-center">
                <Clock
                  className="w-8 h-8"
                  style={{
                    color: theme.appearance === 'dark' ? 'rgb(251, 146, 60)' : 'rgb(249, 115, 22)',
                  }}
                />
                <div>
                  <h2 className="text-xl font-semibold mb-2" style={{ color: theme.colorText }}>
                    We're Building Something Amazing
                  </h2>
                  <p style={{ color: theme.colorTextSecondary }}>
                    Our team is working hard to bring you powerful integrations that will transform
                    how you work with AI.
                  </p>
                </div>
              </Flexbox>
            </Center>
          </div>
        </div>

        {/* Integration Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {integrations.map((integration) => {
            const IconComponent = integration.icon;

            return (
              <div
                key={integration.id}
                className="relative group border-2 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:scale-105"
                style={{
                  backgroundColor: theme.appearance === 'dark' 
                    ? integration.id === 'mate' ? 'rgba(59, 130, 246, 0.1)' :
                      integration.id === 'zapier' ? 'rgba(249, 115, 22, 0.1)' :
                      integration.id === 'google-drive' ? 'rgba(34, 197, 94, 0.1)' :
                      'rgba(6, 182, 212, 0.1)'
                    : integration.id === 'mate' ? 'rgba(239, 246, 255, 1)' :
                      integration.id === 'zapier' ? 'rgba(255, 247, 237, 1)' :
                      integration.id === 'google-drive' ? 'rgba(240, 253, 244, 1)' :
                      'rgba(236, 254, 255, 1)',
                  borderColor: theme.appearance === 'dark' 
                    ? integration.id === 'mate' ? 'rgba(59, 130, 246, 0.3)' :
                      integration.id === 'zapier' ? 'rgba(249, 115, 22, 0.3)' :
                      integration.id === 'google-drive' ? 'rgba(34, 197, 94, 0.3)' :
                      'rgba(6, 182, 212, 0.3)'
                    : integration.id === 'mate' ? 'rgb(191, 219, 254)' :
                      integration.id === 'zapier' ? 'rgb(254, 215, 170)' :
                      integration.id === 'google-drive' ? 'rgb(187, 247, 208)' :
                      'rgb(165, 243, 252)'
                }}
              >
                {/* Coming Soon Badge */}
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                  Soon
                </div>

                {/* Icon */}
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300"
                  style={{
                    background: integration.id === 'mate' ? 'linear-gradient(to right, rgb(59, 130, 246), rgb(147, 51, 234))' :
                      integration.id === 'zapier' ? 'linear-gradient(to right, rgb(249, 115, 22), rgb(239, 68, 68))' :
                      integration.id === 'google-drive' ? 'linear-gradient(to right, rgb(34, 197, 94), rgb(59, 130, 246))' :
                      'linear-gradient(to right, rgb(37, 99, 235), rgb(6, 182, 212))'
                  }}
                >
                  <IconComponent className="w-6 h-6 text-white" />
                </div>

                {/* Content */}
                <h3 
                  className="text-lg font-semibold mb-2"
                  style={{ color: theme.colorText }}
                >
                  {integration.name}
                </h3>

                <p 
                  className="text-sm mb-4 leading-relaxed"
                  style={{ color: theme.colorTextSecondary }}
                >
                  {integration.description}
                </p>

                {/* Status */}
                <div 
                  className="flex items-center gap-2 text-sm"
                  style={{ color: theme.colorTextTertiary }}
                >
                  <Clock className="w-4 h-4" />
                  <span>Coming Soon</span>
                </div>

                {/* Hover Effect */}
                <div 
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    background: theme.appearance === 'dark' 
                      ? 'linear-gradient(to right, transparent, rgba(255, 255, 255, 0.05), transparent)'
                      : 'linear-gradient(to right, transparent, rgba(0, 0, 0, 0.05), transparent)'
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Features Preview */}
        <div 
          className="rounded-2xl p-8 mb-12"
          style={{
            background: theme.appearance === 'dark' 
              ? 'linear-gradient(to right, rgb(31, 41, 55), rgb(17, 24, 39))'
              : 'linear-gradient(to right, rgb(249, 250, 251), rgb(243, 244, 246))'
          }}
        >
          <div className="text-center mb-8">
            <h2 
              className="text-2xl font-bold mb-4"
              style={{ color: theme.colorText }}
            >
              What to Expect
            </h2>
            <p style={{ color: theme.colorTextSecondary }}>
              These integrations will bring powerful capabilities to your AI workflow
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 
                className="font-semibold mb-2"
                style={{ color: theme.colorText }}
              >
                Automation
              </h3>
              <p 
                className="text-sm"
                style={{ color: theme.colorTextSecondary }}
              >
                Automate repetitive tasks and create powerful workflows
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Cloud className="w-6 h-6 text-white" />
              </div>
              <h3 
                className="font-semibold mb-2"
                style={{ color: theme.colorText }}
              >
                File Access
              </h3>
              <p 
                className="text-sm"
                style={{ color: theme.colorTextSecondary }}
              >
                Access and manage files from your favorite cloud storage
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <h3 
                className="font-semibold mb-2"
                style={{ color: theme.colorText }}
              >
                Seamless Integration
              </h3>
              <p 
                className="text-sm"
                style={{ color: theme.colorTextSecondary }}
              >
                Connect all your tools in one unified AI-powered interface
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div 
            className="rounded-2xl p-8 shadow-lg border"
            style={{
              backgroundColor: theme.colorBgContainer,
              borderColor: theme.colorBorder
            }}
          >
            <h2 
              className="text-2xl font-bold mb-4"
              style={{ color: theme.colorText }}
            >
              Stay Updated
            </h2>
            <p 
              className="mb-6 max-w-2xl mx-auto"
              style={{ color: theme.colorTextSecondary }}
            >
              Be the first to know when these integrations go live. We'll notify you as soon as
              they're available.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl">
                <CheckCircle className="w-5 h-5" />
                Get Notified
              </button>

              <button 
                className="px-6 py-3 border font-semibold rounded-lg transition-all duration-300 flex items-center gap-2"
                style={{
                  borderColor: theme.colorBorder,
                  color: theme.colorText,
                  backgroundColor: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colorFillTertiary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Learn More
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

IntegrationsComingSoon.displayName = 'IntegrationsComingSoon';

export default IntegrationsComingSoon;