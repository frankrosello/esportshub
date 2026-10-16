'use strict';
(function () {
  if(window.EsportsHubRoutes)return;
  const here = new URL(window.location.href);
  const root = here.hostname === 'frankrosello.github.io'
    ? new URL('https://frankrosello.github.io/esportshub/')
    : new URL('./', here);
  function home({invite='', auth='', hash=''}={}) {
    const url = new URL('index.html', root);
    if (invite) url.searchParams.set('invite', invite);
    if (auth) url.searchParams.set('auth', auth);
    if (hash) url.hash = hash;
    return url.href;
  }
  // Canonicalize directory visits without discarding Clerk callback parameters,
  // invitation tokens, authentication mode, or the selected dashboard section.
  if(here.pathname===root.pathname||here.pathname===root.pathname.replace(/\/$/,'')){
    const canonical=new URL('index.html',root);
    canonical.search=here.search;
    canonical.hash=here.hash;
    window.history.replaceState(null,'',canonical.href);
  }
  function clerkOptions(returnUrl=home(), invite='') {
    return {
      signInUrl:home({invite,auth:'signin'}),
      signUpUrl:home({invite,auth:'signup'}),
      signInForceRedirectUrl:returnUrl,
      signInFallbackRedirectUrl:returnUrl,
      signUpForceRedirectUrl:returnUrl,
      signUpFallbackRedirectUrl:returnUrl,
      afterSignOutUrl:returnUrl,
      afterMultiSessionSingleSignOutUrl:returnUrl
    };
  }
  window.EsportsHubRoutes=Object.freeze({root:root.href,home,clerkOptions,
    page:name=>new URL(name,root).href});
})();

