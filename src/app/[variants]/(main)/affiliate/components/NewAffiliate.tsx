'use client';

import { notification } from 'antd';
import {
  CheckCircle,
  Copy,
  DollarSign,
  Link,
  Share2,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useAffiliateStore } from '@/store/affiliate/store';
import { useUserStore } from '@/store/user';

import Loading from '../../chat/loading';

export const NewAffiliate = () => {
  const { user } = useUserStore();
  const [affiliateLink] = useState('');


  const loadingCreateAffiliateInfo = useAffiliateStore((state) => state.loadingCreateAffiliateInfo);
  const loading = useAffiliateStore((state) => state.loading);
  const createAffiliateInfo = useAffiliateStore((state) => state.createAffiliateInfo);

  const generateAffiliateLink = async () => {
    if (!user?.id) {
      notification.error({
        message: 'Authentication Required',
        description: 'Please log in to generate your affiliate link.',
      });
      return;
    }
    await createAffiliateInfo({ ownerId: user.id, link: '' });
  };

  return loading ? (
    <Loading />
  ) : (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-6 shadow-lg">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Generate Your Affiliate Link
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Create your unique referral link and start earning rewards by sharing with friends and
            followers
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50 p-8 mb-8">
          {/* Link Generation Section */}
          <div className="text-center mb-8">
            <div className="relative">
              {!affiliateLink ? (
                <Button
                  onClick={generateAffiliateLink}
                  disabled={loadingCreateAffiliateInfo}
                  className="relative px-8 py-4 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loadingCreateAffiliateInfo ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Generating Link...
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5 mr-3" />
                      Generate Affiliate Link
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-6">
                  {/* Generated Link Display */}
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-200 dark:border-green-700 rounded-xl p-6">
                    <div className="flex items-center justify-center mb-4">
                      <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
                      <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">
                        Your Affiliate Link is Ready!
                      </h3>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                        <Link className="h-4 w-4" />
                        <span>Your unique affiliate link:</span>
                      </div>
                      <div className="font-mono text-sm text-gray-800 dark:text-gray-200 break-all">
                        {affiliateLink}
                      </div>
                    </div>

                    {/* Action Buttons */}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Benefits Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200 dark:border-blue-700">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Easy Sharing</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Share your link on social media, email, or anywhere you want
              </p>
            </div>

            <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl border border-green-200 dark:border-green-700">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                Earn Rewards
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                Get 2% commission on every successful referral purchase
              </p>
            </div>

            <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl border border-purple-200 dark:border-purple-700">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                Track Performance
              </h3>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                Monitor clicks, conversions, and earnings in real-time
              </p>
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
            How It Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: '1',
                title: 'Generate Link',
                description: 'Click the button above to create your unique affiliate link',
                icon: Link,
                color: 'blue',
              },
              {
                step: '2',
                title: 'Share Everywhere',
                description: 'Share your link on social media, blogs, or with friends',
                icon: Share2,
                color: 'green',
              },
              {
                step: '3',
                title: 'Track Referrals',
                description: 'Monitor who clicks your link and signs up',
                icon: TrendingUp,
                color: 'purple',
              },
              {
                step: '4',
                title: 'Earn Rewards',
                description: 'Get paid monthly for every successful referral',
                icon: DollarSign,
                color: 'purple',
              },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div
                  className={`w-16 h-16 bg-${item.color}-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg`}
                >
                  <span className="text-2xl font-bold text-white">{item.step}</span>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
