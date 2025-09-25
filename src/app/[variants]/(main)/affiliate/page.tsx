'use client';

import { notification } from 'antd';
import { Copy, DollarSign, Eye, Link, Share2, TrendingUp, Users, X, History, Clock, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useAffiliateStore } from '@/store/affiliate/store';
import { useUserStore } from '@/store/user';

import Loading from '../chat/loading';
import { NewAffiliate } from './components/NewAffiliate';
import { mailTo } from '@/const/url';
import { useTheme } from 'antd-style';

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
  const withdrawAffiliate = useAffiliateStore((state) => state.withdrawAffiliate);
  const getMyWithdrawalHistory = useAffiliateStore((state) => state.getMyWithdrawalHistory);
  const withdraws = useAffiliateStore((state) => state.withdrawalHistory);

  const theme = useTheme();
  useEffect(() => {
    getAffiliateInfo();
    getMyAffiliates();
    getMyWithdrawalHistory({ userId: user?.id as string });
  }, [user?.id]);

  const [affiliateLink, setAffiliateLink] = useState('');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);


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

  const WithdrawModal = () => (
    <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 ${theme.appearance === "dark" ? "bg-black bg-opacity-80" : "bg-white bg-opacity-50"}`}>
      <div className={`${theme.appearance === "dark" ? "bg-gray-900" : "bg-white"} rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto`}>
        <div className={`flex items-center justify-between p-6 border-b ${theme.appearance === "dark" ? "border-gray-700" : "border-gray-200"}`}>
          <h2 className={`text-xl font-semibold ${theme.appearance === "dark" ? "text-white" : "text-gray-900"}`}>Withdrawal Information</h2>
          <button
            onClick={() => setShowWithdrawModal(false)}
            className={`${theme.appearance === "dark" ? "!text-white hover:!text-gray-300 hover:bg-gray-700 rounded-full p-1 transition-colors" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-colors"}`}
            style={theme.appearance === "dark" ? { color: 'white' } : {}}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className={`${theme.appearance === "dark" ? "bg-yellow-900/20 border-yellow-800" : "bg-yellow-50 border-yellow-200"} border rounded-lg p-4`}>
            <h3 className={`font-medium mb-2 ${theme.appearance === "dark" ? "text-yellow-100" : "text-yellow-900"}`}>Minimum Withdrawal Amount</h3>
            <p className={`text-sm ${theme.appearance === "dark" ? "text-yellow-200" : "text-yellow-800"}`}>
              You need a minimum of <strong>$50.00</strong> in your affiliate balance to request a withdrawal.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className={`font-medium ${theme.appearance === "dark" ? "text-white" : "text-gray-900"}`}>Current Balance</h3>
            <div className={`${theme.appearance === "dark" ? "bg-gray-800" : "bg-gray-50"} rounded-lg p-4`}>
              <p className={`text-2xl font-bold ${theme.appearance === "dark" ? "text-white" : "text-gray-900"}`}>
                ${affiliateInfo?.totalRevenue?.toFixed(2) || '0.00'}
              </p>
              <p className={`text-sm ${theme.appearance === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                {affiliateInfo?.totalRevenue && affiliateInfo?.totalRevenue >= 50 
                  ? 'You can request a withdrawal!' 
                  : `You need $${(50 - (affiliateInfo?.totalRevenue || 0)).toFixed(2)} more to withdraw`}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className={`font-medium ${theme.appearance === "dark" ? "text-white" : "text-gray-900"}`}>Withdrawal Process</h3>
            <ul className={`text-sm space-y-2 ${theme.appearance === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              <li className="flex items-start">
                <span className={`mr-2 ${theme.appearance === "dark" ? "text-blue-400" : "text-blue-600"}`}>•</span>
                Withdrawals are processed monthly on the 1st of each month
              </li>
              <li className="flex items-start">
                <span className={`mr-2 ${theme.appearance === "dark" ? "text-blue-400" : "text-blue-600"}`}>•</span>
                Payments are sent via PayPal or bank transfer
              </li>
              <li className="flex items-start">
                <span className={`mr-2 ${theme.appearance === "dark" ? "text-blue-400" : "text-blue-600"}`}>•</span>
                Processing time: 3-5 business days
              </li>
              <li className="flex items-start">
                <span className={`mr-2 ${theme.appearance === "dark" ? "text-blue-400" : "text-blue-600"}`}>•</span>
                Contact support to set up your payment method
              </li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => setShowWithdrawModal(false)}
              variant="outline"
              className={`flex-1 ${theme.appearance === "dark" ? "border-gray-500 text-white bg-transparent hover:bg-gray-700 hover:border-gray-400" : "border-blue-300 text-blue-700 hover:bg-blue-50"}`}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setShowWithdrawModal(false);
                notification.info({
                  message: 'Withdrawal Request Submitted',
                  description: 'Your withdrawal request has been submitted. Please wait for the admin to process it.',
                });
                withdrawAffiliate({ affiliateId: affiliateInfo?.id as string ,userId: user?.id as string });
                // window.open(mailTo("support@ascensionhostings.com"), '_blank');
              }}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              disabled={!affiliateInfo?.totalRevenue || affiliateInfo.totalRevenue < 50}
            >
              Withdraw
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // Mock withdrawal history data - replace with real data from your API
 

  const WithdrawalHistoryModal = () => (
    <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 ${theme.appearance === "dark" ? "bg-black bg-opacity-80" : "bg-white bg-opacity-50"}`}>
      <div className={`${theme.appearance === "dark" ? "bg-gray-900" : "bg-white"} rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto`}>
        <div className={`flex items-center justify-between p-6 border-b ${theme.appearance === "dark" ? "border-gray-700" : "border-gray-200"}`}>
          <h2 className={`text-xl font-semibold ${theme.appearance === "dark" ? "text-white" : "text-gray-900"}`}>
            Withdrawal History
          </h2>
          <button
            onClick={() => setShowHistoryModal(false)}
            className={`${theme.appearance === "dark" ? "!text-white hover:!text-gray-300 hover:bg-gray-700 rounded-full p-1 transition-colors" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-colors"}`}
            style={theme.appearance === "dark" ? { color: 'white' } : {}}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <History className={`h-5 w-5 ${theme.appearance === "dark" ? "text-blue-400" : "text-blue-600"}`} />
              <h3 className={`text-lg font-medium ${theme.appearance === "dark" ? "text-white" : "text-gray-900"}`}>
                Your Withdrawal Requests
              </h3>
            </div>
            <p className={`text-sm ${theme.appearance === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              Track all your withdrawal requests and their processing status
            </p>
          </div>

          <div className="space-y-4">
            {withdraws?.map((withdrawal) => (
              <div
                key={withdrawal?.id}
                className={`${theme.appearance === "dark" ? "bg-gray-800" : "bg-gray-50"} rounded-lg border ${theme.appearance === "dark" ? "border-gray-700" : "border-gray-200"} p-4`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${withdrawal?.status === 'paid' ? 'bg-green-100 dark:bg-green-900/20' : 'bg-yellow-100 dark:bg-yellow-900/20'}`}>
                      {withdrawal?.status === 'paid' ? (
                        <CheckCircle className={`h-5 w-5 ${theme.appearance === "dark" ? "text-green-400" : "text-green-600"}`} />
                      ) : (
                        <Clock className={`h-5 w-5 ${theme.appearance === "dark" ? "text-yellow-400" : "text-yellow-600"}`} />
                      )}
                    </div>
                    <div>
                      <p className={`font-semibold ${theme.appearance === "dark" ? "text-white" : "text-gray-900"} relative top-[6px]`}>
                        ${withdrawal?.amount.toFixed(2)}
                      </p>
                     
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      withdrawal.status === 'paid' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                    }`}>
                      {withdrawal.status === 'paid' ? 'Completed' : 'Pending'}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className={`${theme.appearance === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                      Request Date:
                    </p>
                    <p className={`${theme.appearance === "dark" ? "text-white" : "text-gray-900"}`}>
                      {new Date(withdrawal?.createdAt as Date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className={`${theme.appearance === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                      {withdrawal.status === 'paid' ? 'Processed Date:' : 'Expected Processing:'}
                    </p>
                    <p className={`${theme.appearance === "dark" ? "text-white" : "text-gray-900"}`}>
                      {withdrawal.updatedAt 
                        ? new Date(withdrawal.updatedAt).toLocaleDateString()
                        : '3-5 business days'
                      }
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {withdraws?.length === 0 && (
            <div className={`text-center py-8 ${theme.appearance === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              <History className={`h-12 w-12 mx-auto mb-4 ${theme.appearance === "dark" ? "text-gray-500" : "text-gray-400"}`} />
              <p>No withdrawal requests found</p>
              <p className="text-sm mt-1">Your withdrawal history will appear here</p>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-end">
              <Button
                onClick={() => setShowHistoryModal(false)}
                className={`${theme.appearance === "dark" ? "border-gray-500 text-white bg-transparent hover:bg-gray-700 hover:border-gray-400" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
                variant="outline"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

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
    <div className={`${theme.appearance === "dark" ? "bg-gray-800" : "bg-white"} rounded-lg shadow-sm border ${theme.appearance === "dark" ? "border-gray-700" : "border-gray-200"} p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${theme.appearance === "dark" ? "text-gray-400" : "text-gray-600"}`}>{title}</p>
          <p className={`text-2xl font-bold ${theme.appearance === "dark" ? "text-white" : "text-gray-900"}`}>{value}</p>
        </div>
        <div className={`p-3 rounded-full ${theme.appearance === "dark" ? `bg-${color}-900/20` : `bg-${color}-100`}`}>
          <Icon className={`h-6 w-6 ${theme.appearance === "dark" ? `text-${color}-400` : `text-${color}-600`}`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen w-full ${theme.appearance === "dark" ? "bg-gray-900" : "bg-gray-50"} overflow-auto`}>
      {loading ? (
        <Loading />
      ) : !affiliateInfo ? (
        <NewAffiliate />
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className={`text-3xl font-bold ${theme.appearance === "dark" ? "text-white" : "text-gray-900"}`}>Affiliate Program</h1>
            <p className={`mt-2 ${theme.appearance === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              Earn rewards by referring new users to our platform
            </p>
          </div>

          {/* Affiliate Link Generator */}
          <div className={`${theme.appearance === "dark" ? "bg-gray-800" : "bg-white"} rounded-lg shadow-sm border ${theme.appearance === "dark" ? "border-gray-700" : "border-gray-200"} p-6 mb-8`}>
            <div className="flex items-center gap-2 mb-4">
              <Link className="h-5 w-5 text-blue-600" />
              <h2 className={`text-xl font-semibold ${theme.appearance === "dark" ? "text-white" : "text-gray-900"}`}>
                Your Affiliate Link
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <div className="flex-1">
                  <input
                    type="text"
                    value={affiliateInfo?.link}
                    readOnly
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme.appearance === "dark" ? "border-gray-600 bg-gray-700 text-white" : "border-gray-300 bg-gray-50 text-gray-900"}`}
                    placeholder="Generating your affiliate link..."
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={copyToClipboard}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Copy className="h-4 w-4 text-white" />
                    <span className="text-white">Copy Link</span>
                  </Button>
                  <Button
                    onClick={shareLink}
                    variant="outline"
                    className={`px-6 py-3 rounded-lg transition-colors ${theme.appearance === "dark" ? "border-gray-500 text-white bg-transparent hover:bg-gray-700 hover:border-gray-400" : "border-blue-300 text-blue-700 hover:bg-blue-50"}`}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>

              <div className={`${theme.appearance === "dark" ? "bg-blue-900/20 border-blue-800" : "bg-blue-50 border-blue-200"} border rounded-lg p-4`}>
                <h3 className={`font-medium mb-2 ${theme.appearance === "dark" ? "text-blue-100" : "text-blue-900"}`}>How it works:</h3>
                <ul className={`text-sm space-y-1 ${theme.appearance === "dark" ? "text-blue-200" : "text-blue-800"}`}>
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <h2 className={`text-xl font-semibold ${theme.appearance === "dark" ? "text-white" : "text-gray-900"}`}>
                Performance Dashboard
              </h2>
              <div className="flex flex-col sm:flex-row gap-3 mt-4 sm:mt-0">
                <Button
                  onClick={() => setShowHistoryModal(true)}
                  variant="outline"
                  className={`${theme.appearance === "dark" ? "border-gray-500 text-white bg-transparent hover:bg-gray-700 hover:border-gray-400" : "border-gray-300 text-gray-700 hover:bg-gray-50"} px-6 py-3 rounded-lg transition-colors`}
                >
                  <History className="h-4 w-4 mr-2" />
                  History
                </Button>
                <Button
                  onClick={() => setShowWithdrawModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg font-semibold rounded-lg transition-colors"
                >
                  💰 Get Paid
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              {/* <StatCard
                title="Conversion Rate"
                value={`${affiliateInfo?.conversionRate}%` || 0}
                icon={TrendingUp}
                color="purple"
              /> */}
            </div>
          </div>

          {/* Recent Signups */}
          <div className={`${theme.appearance === "dark" ? "bg-gray-800" : "bg-white"} rounded-lg shadow-sm border ${theme.appearance === "dark" ? "border-gray-700" : "border-gray-200"}`}>
            <div className={`px-6 py-4 border-b ${theme.appearance === "dark" ? "border-gray-700" : "border-gray-200"}`}>
              <h2 className={`text-xl font-semibold ${theme.appearance === "dark" ? "text-white" : "text-gray-900"}`}>
                Recent Signups
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${theme.appearance === "dark" ? "bg-gray-700" : "bg-gray-50"}`}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme.appearance === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                      Email
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme.appearance === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                      Signup Date
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme.appearance === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                      Plan Purchase
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme.appearance === "dark" ? "divide-gray-700" : "divide-gray-200"}`}>
                  {affiliates?.map((item, index) => (
                    <tr key={index} className={`${theme.appearance === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"}`}>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme.appearance === "dark" ? "text-white" : "text-gray-900"}`}>
                        {item?.user?.email}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme.appearance === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                        {item?.affiliate?.createdAt
                          ? new Date(item.affiliate.createdAt).toLocaleDateString()
                          : 'N/A'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme.appearance === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                        {item?.subscription?.planName || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Additional Info */}
          <div className={`mt-8 rounded-lg p-6 border ${theme.appearance === "dark" ? "bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border-blue-800" : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"}`}>
            <h3 className={`text-lg font-semibold mb-3 ${theme.appearance === "dark" ? "text-white" : "text-gray-900"}`}>Need Help?</h3>
            <p className={`mb-4 ${theme.appearance === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              Have questions about the affiliate program? Check out our FAQ or contact support.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className={`${theme.appearance === "dark" ? "border-gray-500 text-white bg-transparent hover:bg-gray-700 hover:border-gray-400" : "border-blue-300 text-blue-700 hover:bg-blue-50"}`}
                onClick={() => {
                  window.open(mailTo("support@ascensionhostings.com"), '_blank');
                }}
              >
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      )}
      {showWithdrawModal && <WithdrawModal />}
      {showHistoryModal && <WithdrawalHistoryModal />}
    </div>
  );
};

export default AffiliatePage;
