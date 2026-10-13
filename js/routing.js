'use strict';
// One base URL for every application entry point and authentication destination.
(function () {
  const here = new URL(window.location.href);
  const root = here.hostname === 'frankrosello.github.io'
    ? new URL('https://frankrosello.github.io/esportshub/')
    : new URL('./', here);
  function home({invite='', auth='', hash=''}={}) {
    const url = new URL(root);
    if (invite) url.searchParams.set('invite', invite);
    if (auth) url.searchParams.set('auth', auth);
    if (hash) url.hash = hash;
    return url.href;
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
