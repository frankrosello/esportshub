'use strict';
(function(){
 const routes=window.EsportsHubRoutes;
 const source=new URL(window.location.href);
 const target=new URL(routes.home());
 target.search=source.search;
 target.hash=source.hash;
 window.location.replace(target.href);
})();
