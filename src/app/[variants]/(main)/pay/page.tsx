'use client';

import { notification } from 'antd';
import { useTheme } from 'antd-style';
import { CheckCircle, DollarSign, Eye, TrendingUp, Users, X } from 'lucide-react';
import { redirect, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useAffiliateStore } from '@/store/affiliate/store';
import { useUserStore } from '@/store/user';

import Loading from '../chat/loading';

interface WithdrawalData {
  userId: string;
  amount: number;
  withdrawalId: string;
  userInfo?: {
    id: string;
    email: string;
    name?: string;
  };
  affiliateInfo?: {
    totalRevenue: number;
    totalClicks: number;
    totalSignups: number;
    link: string;
  };
}

const AdminWithdrawalPage = () => {
  const theme = useTheme();
  const searchParams = useSearchParams();
  const [withdrawalData, setWithdrawalData] = useState<WithdrawalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const getAffiliateInfoByUserId = useAffiliateStore((state) => state.getAffiliateInfoByUserId);
  const affiliateInfoByUserId = useAffiliateStore((state) => state.affiliateInfoByUserId);
  const user = useUserStore((state) => state.user);
  const getFullUser = useAffiliateStore((state) => state.getFullUser);
  const processWithdrawal = useAffiliateStore((state) => state.processWithdrawal);
  const [userAdmin, setUserAdmin] = useState<any>(null);

  const checkUserAdmin = async () => {
    if (!user?.id) return;
    setIsLoading(true);

    const isUserAdmin = await getFullUser(user.id);
    setUserAdmin(isUserAdmin);

    console.log('Admin check result:', isUserAdmin);

    if (isUserAdmin?.role !== 'admin') {
      redirect('/');
    }

    setIsLoading(false);
  };

  useEffect(() => {
    setIsLoading(true);

    // Only check admin status if user is loaded
    if (user?.id) {
      checkUserAdmin();
    }

    const userId = searchParams.get('userId');
    const amount = searchParams.get('amount');
    const withdrawalId = searchParams.get('withdrawalId');

    if (userId && amount) {
      getAffiliateInfoByUserId(userId);
      setWithdrawalData({
        userId,
        amount: parseFloat(amount),
        withdrawalId: withdrawalId || '',
      });
    }

    setIsLoading(false);
  }, [user]);

  // Show loading while user is being fetched
  if (!user) {
    return <Loading />;
  }

  const router = useRouter();

  const handleMarkAsPaid = async () => {
    if (!withdrawalData) return;

    setProcessing(true);
    try {
      notification.success({
        message: 'Withdrawal Marked as Paid!',
        description: `Successfully processed withdrawal of $${withdrawalData.amount.toFixed(2)} for user ${withdrawalData.userId}`,
      });

      await processWithdrawal({
        withdrawalId: withdrawalData.withdrawalId || '',
        userId: withdrawalData.userId || '',
      });

      router.push('/');
    } catch (error) {
      console.log(error);
      notification.error({
        message: 'Failed to Process',
        description: 'Failed to mark withdrawal as paid. Please try again.',
      });
    } finally {
      setProcessing(false);
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
    <div
      className={`${theme.appearance === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm border ${theme.appearance === 'dark' ? 'border-gray-700' : 'border-gray-200'} p-6`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p
            className={`text-sm font-medium ${theme.appearance === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}
          >
            {title}
          </p>
          <p
            className={`text-2xl font-bold ${theme.appearance === 'dark' ? 'text-white' : 'text-gray-900'}`}
          >
            {value}
          </p>
        </div>
        <div
          className={`p-3 rounded-full ${theme.appearance === 'dark' ? `bg-${color}-900/20` : `bg-${color}-100`}`}
        >
          <Icon
            className={`h-6 w-6 ${theme.appearance === 'dark' ? `text-${color}-400` : `text-${color}-600`}`}
          />
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return <Loading />;
  }

  if (!withdrawalData) {
    return (
      <div
        className={`min-h-screen w-full ${theme.appearance === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}
      >
        <div
          className={`${theme.appearance === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm border ${theme.appearance === 'dark' ? 'border-gray-700' : 'border-gray-200'} p-8 text-center`}
        >
          <X
            className={`h-16 w-16 mx-auto mb-4 ${theme.appearance === 'dark' ? 'text-red-400' : 'text-red-500'}`}
          />
          <h2
            className={`text-xl font-semibold mb-2 ${theme.appearance === 'dark' ? 'text-white' : 'text-gray-900'}`}
          >
            Invalid Withdrawal Request
          </h2>
          <p className={`${theme.appearance === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            This withdrawal request is invalid or has expired.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen w-full ${theme.appearance === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} overflow-auto`}
    >
      {isLoading || !userAdmin ? (
        <Loading />
      ) : (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1
              className={`text-3xl font-bold ${theme.appearance === 'dark' ? 'text-white' : 'text-gray-900'}`}
            >
              Admin - Withdrawal Processing
            </h1>
            <p
              className={`mt-2 ${theme.appearance === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}
            >
              Review and process affiliate withdrawal request
            </p>
          </div>

          {/* Alert */}
          <div
            className={`${theme.appearance === 'dark' ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200'} border rounded-lg p-4 mb-8`}
          >
            <div className="flex items-center">
              <DollarSign
                className={`h-5 w-5 mr-3 ${theme.appearance === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`}
              />
              <p
                className={`font-medium ${theme.appearance === 'dark' ? 'text-yellow-100' : 'text-yellow-900'} relative top-[6px]`}
              >
                Withdrawal Request Pending Review
              </p>
            </div>
          </div>

          {/* Withdrawal Details */}
          <div
            className={`${theme.appearance === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm border ${theme.appearance === 'dark' ? 'border-gray-700' : 'border-gray-200'} p-6 mb-8`}
          >
            <h2
              className={`text-xl font-semibold mb-6 ${theme.appearance === 'dark' ? 'text-white' : 'text-gray-900'}`}
            >
              Withdrawal Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div
                className={`${theme.appearance === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4`}
              >
                <h3
                  className={`font-medium mb-3 ${theme.appearance === 'dark' ? 'text-white' : 'text-gray-900'}`}
                >
                  Request Information
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span
                      className={`${theme.appearance === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}
                    >
                      User ID:
                    </span>
                    <span
                      className={`${theme.appearance === 'dark' ? 'text-white' : 'text-gray-900'}`}
                    >
                      {withdrawalData.userId}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span
                      className={`${theme.appearance === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}
                    >
                      Amount:
                    </span>
                    <span
                      className={`font-semibold ${theme.appearance === 'dark' ? 'text-green-400' : 'text-green-600'}`}
                    >
                      ${withdrawalData.amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span
                      className={`${theme.appearance === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}
                    >
                      Request Date:
                    </span>
                    <span
                      className={`${theme.appearance === 'dark' ? 'text-white' : 'text-gray-900'}`}
                    >
                      {new Date().toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className={`${theme.appearance === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4`}
              >
                <h3
                  className={`font-medium mb-3 ${theme.appearance === 'dark' ? 'text-white' : 'text-gray-900'}`}
                >
                  Processing Steps
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <div
                      className={`w-2 h-2 rounded-full mr-3 ${theme.appearance === 'dark' ? 'bg-blue-400' : 'bg-blue-500'}`}
                    ></div>
                    <span
                      className={`text-sm ${theme.appearance === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                      Verify user identity
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div
                      className={`w-2 h-2 rounded-full mr-3 ${theme.appearance === 'dark' ? 'bg-blue-400' : 'bg-blue-500'}`}
                    ></div>
                    <span
                      className={`text-sm ${theme.appearance === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                      Confirm payment method
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div
                      className={`w-2 h-2 rounded-full mr-3 ${theme.appearance === 'dark' ? 'bg-blue-400' : 'bg-blue-500'}`}
                    ></div>
                    <span
                      className={`text-sm ${theme.appearance === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                      Process payment
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div
                      className={`w-2 h-2 rounded-full mr-3 ${theme.appearance === 'dark' ? 'bg-gray-500' : 'bg-gray-400'}`}
                    ></div>
                    <span
                      className={`text-sm ${theme.appearance === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}
                    >
                      Mark as paid
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mock Affiliate Stats */}
          <div className="mb-8">
            <h2
              className={`text-xl font-semibold mb-6 ${theme.appearance === 'dark' ? 'text-white' : 'text-gray-900'}`}
            >
              User Affiliate Performance
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard
                title="Total Clicks"
                value={affiliateInfoByUserId?.totalClicks || 0}
                icon={Eye}
                color="blue"
              />
              <StatCard
                title="Total Signups"
                value={affiliateInfoByUserId?.totalSignups || 0}
                icon={Users}
                color="green"
              />
              <StatCard
                title="Total Revenue"
                value={`$${withdrawalData.amount.toFixed(2)}`}
                icon={TrendingUp}
                color="yellow"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div
            className={`${theme.appearance === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm border ${theme.appearance === 'dark' ? 'border-gray-700' : 'border-gray-200'} p-6`}
          >
            <h3
              className={`text-lg font-semibold mb-4 ${theme.appearance === 'dark' ? 'text-white' : 'text-gray-900'}`}
            >
              Processing Actions
            </h3>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleMarkAsPaid}
                disabled={processing}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 text-lg font-semibold"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Mark as Paid
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                className={`flex-1 py-3 ${theme.appearance === 'dark' ? 'border-gray-500 text-white bg-transparent hover:bg-gray-700 hover:border-gray-400' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                onClick={() => window.close()}
              >
                Cancel
              </Button>
            </div>

            <div
              className={`mt-4 p-4 rounded-lg ${theme.appearance === 'dark' ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} border`}
            >
              <p
                className={`text-sm ${theme.appearance === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}
              >
                <strong>Note:</strong> Once marked as paid, this action cannot be undone. Make sure
                you have processed the payment through your payment system before clicking "Mark as
                Paid".
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWithdrawalPage;
