# P2P Server-less WebRTC Chat

A Zoom/Teams-style P2P Server-less WebRTC app for chat, audio/video calls, screen share, screen recording, file sharing

## Observations

1. for custom domains
   - in pwa options `navigateFallback: null` is importanat
   - basepath="/" is important in router(RouterProvider)
      - so github pages looks in repo folder not github root folder
   - Github pages may ignore underscore files (eg: /assets/_DH_0222.js)
     - to fix, `.nojekyll` file should be added in public ( root folder )
   - gh-pages may ignore dotfiles (.nojekyll), so add dotfiles option  