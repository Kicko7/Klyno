'use client';

import { notification } from 'antd';
import { Copy, DollarSign, Eye, Link, Share2, TrendingUp, Users } from 'lucide-react';
import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useAffiliateStore } from '@/store/affiliate/store';
import { useUserStore } from '@/store/user';

import Loading from '../chat/loading';
import { NewAffiliate } from './components/NewAffiliate';

interface AffiliateStats {
  totalClicks: number;
  totalSignups: number;
  totalRevenue: number;
  conversionRate: number;
  recentSignups: Array<{
    id: string;
    email: string;
    signupDate: string;
    status: 'active' | 'pending';
  }>;
}

const AffiliatePage = () => {
  const { user } = useUserStore();
  const getAffiliateInfo = useAffiliateStore((state) => state.getAffiliateInfo);
  const getMyAffiliates = useAffiliateStore((state) => state.getMyAffiliate);
  const affiliates = useAffiliateStore((state) => state.affiliates);
  const affiliateInfo = useAffiliateStore((state) => state.affiliateInfo);
  const loading = useAffiliateStore((state) => state.loading);

  useEffect(() => {
    getAffiliateInfo();
    getMyAffiliates();
  }, [user?.id]);

  const [affiliateLink, setAffiliateLink] = useState('');
  const [stats, setStats] = useState<AffiliateStats>({
    totalClicks: 0,
    totalSignups: 0,
    totalRevenue: 0,
    conversionRate: 0,
    recentSignups: [],
  });

  // Generate affiliate link
  useEffect(() => {
    if (user?.id) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const link = `${baseUrl}/signup?ref=${user.id}`;
      setAffiliateLink(link);
    }
  }, [user?.id]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(affiliateInfo?.link || affiliateLink);
      notification.success({
        message: 'Affiliate link copied to clipboard!',
        description: 'Affiliate link copied to clipboard!',
      });
    } catch (err) {
      notification.error({
        message: 'Failed to copy link',
        description: 'Failed to copy link',
      });
    }
  };

  const shareLink = async () => {
    const linkToShare = affiliateInfo?.link || affiliateLink;

    if (!linkToShare) {
      notification.error({
        message: 'No link to share',
        description: 'Please generate your affiliate link first.',
      });
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on this amazing platform!',
          text: "Check out this incredible platform I've been using. You'll love it!",
          url: linkToShare,
        });
      } catch (err) {
        // User cancelled sharing or error occurred
        if (err instanceof Error && err.name !== 'AbortError') {
          notification.error({
            message: 'Share failed',
            description: 'Failed to share the link.',
          });
        }
      }
    } else {
      // Fallback to copying to clipboard
      copyToClipboard();
    }
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color = 'blue',
  }: {
    title: string;
    value: string | number;
    icon: any;
    color?: string;
  }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
        <div className={`p-3 rounded-full bg-${color}-100 dark:bg-${color}-900/20`}>
          <Icon className={`h-6 w-6 text-${color}-600 dark:text-${color}-400`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 w-full">
      {loading ? (
        <Loading />
      ) : !affiliateInfo ? (
        <NewAffiliate />
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Affiliate Program</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Earn rewards by referring new users to our platform
            </p>
          </div>

          {/* Affiliate Link Generator */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Link className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Your Affiliate Link
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={affiliateInfo?.link}
                    readOnly
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Generating your affiliate link..."
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={copyToClipboard}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </Button>
                  <Button
                    onClick={shareLink}
                    variant="outline"
                    className="px-6 py-3 border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">How it works:</h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Share your unique affiliate link with friends and followers</li>
                  <li>• Earn 2% commission on every successful plan purchase</li>
                  <li>• Track your performance in real-time</li>
                  <li>• Get paid monthly via PayPal or bank transfer</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Stats Dashboard */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Performance Dashboard
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Clicks"
                value={affiliateInfo?.totalClicks?.toLocaleString() || 0}
                icon={Eye}
                color="blue"
              />
              <StatCard
                title="Total Signups"
                value={affiliateInfo?.totalSignups || 0}
                icon={Users}
                color="green"
              />
              <StatCard
                title="Total Revenue"
                value={`$${affiliateInfo?.totalRevenue?.toFixed(2) || 0}`}
                icon={DollarSign}
                color="yellow"
              />
              <StatCard
                title="Conversion Rate"
                value={`${affiliateInfo?.conversionRate}%` || 0}
                icon={TrendingUp}
                color="purple"
              />
            </div>
          </div>

          {/* Recent Signups */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Recent Signups
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Signup Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Plan Purchase
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {affiliates?.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {item?.user?.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {item?.affiliate?.createdAt
                          ? new Date(item.affiliate.createdAt).toLocaleDateString()
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {item?.affiliate?.planPurchaseId || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Need Help?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Have questions about the affiliate program? Check out our FAQ or contact support.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/20"
              >
                View FAQ
              </Button>
              <Button
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/20"
              >
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AffiliatePage;
