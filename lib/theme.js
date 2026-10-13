// Runs in <head> before first paint:
// 1. applies the saved theme ('light' | 'dark'); none saved = follow the system.
// 2. picks the page-slide for cross-page view transitions: board → your page slides in from the right ("to-me"),
//    back to the board slides the other way ("to-board"); every other navigation just swaps (no animation).
export const themeScript = `try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}
try{(function(){
var still=matchMedia('(prefers-reduced-motion: reduce)').matches;
function kind(a,b){if(!a||!b)return null;var f=new URL(a).pathname,g=new URL(b).pathname;
return f==='/home'&&g==='/insights'?'to-me':f==='/insights'&&g==='/home'?'to-board':null}
function pick(vt,k){if(!vt)return;if(still||!k)vt.skipTransition();else vt.types.add(k)}
addEventListener('pageswap',function(e){pick(e.viewTransition,kind(location.href,e.activation&&e.activation.entry&&e.activation.entry.url))});
addEventListener('pagereveal',function(e){var a=self.navigation&&navigation.activation;pick(e.viewTransition,a&&a.from&&kind(a.from.url,a.entry.url))});
})()}catch(e){}`;
