// Runs in <head> before first paint: applies the saved theme ('light' | 'dark'); none saved = follow the system.
export const themeScript = `try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;
