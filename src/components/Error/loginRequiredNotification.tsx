


export const loginRequired = {
  redirect: () => {
    // Use Clerk's openLogin if available, otherwise redirect
    const openLogin = typeof window !== 'undefined' && window.__clerk_openLogin;
    if (openLogin) {
      openLogin();
    } else {
      window.location.href = '/login';
    }
  },
};
