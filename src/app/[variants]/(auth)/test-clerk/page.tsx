import { authEnv } from '@/config/auth';

const TestClerkPage = () => {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-4 text-center">Clerk Configuration Test</h1>
        
        <div className="space-y-4">
          <div className="p-3 rounded bg-gray-50">
            <h3 className="font-semibold mb-2">Environment Variables:</h3>
            <div className="text-sm space-y-1">
              <div>
                <span className="font-mono">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:</span>
                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                  authEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {authEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? '✓ Set' : '✗ Not Set'}
                </span>
              </div>
              
              <div>
                <span className="font-mono">NEXT_PUBLIC_ENABLE_CLERK_AUTH:</span>
                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                  authEnv.NEXT_PUBLIC_ENABLE_CLERK_AUTH ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {authEnv.NEXT_PUBLIC_ENABLE_CLERK_AUTH ? '✓ Enabled' : '✗ Disabled'}
                </span>
              </div>
              
              <div>
                <span className="font-mono">NEXT_PUBLIC_ENABLE_NEXT_AUTH:</span>
                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                  !authEnv.NEXT_PUBLIC_ENABLE_NEXT_AUTH ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {!authEnv.NEXT_PUBLIC_ENABLE_NEXT_AUTH ? '✓ Disabled' : '✗ Enabled'}
                </span>
              </div>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            {authEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
              <div className="text-green-600">
                ✓ Clerk is properly configured! You can access:
                <ul className="mt-2 ml-4 list-disc">
                  <li><a href="/login" className="underline text-blue-600">/login</a> - Sign In</li>
                  <li><a href="/signup" className="underline text-blue-600">/signup</a> - Sign Up</li>
                </ul>
              </div>
            ) : (
              <div className="text-red-600">
                ✗ Please set your Clerk environment variables in .env.local
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestClerkPage;
