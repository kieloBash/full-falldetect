// location: frontend/lib/auth/constants.ts
export const COPY = {
  brandName: "FallDetect",
  headline: "Real-time fall detection for every resident, on every floor.",
  subheadline: "Sign in to monitor live alerts, respond to incidents, and keep your care team coordinated.",
  features: ["Sub-second fall alerts, 24/7", "HIPAA-compliant, encrypted end-to-end"],
  copyright: `© ${new Date().getFullYear()} FallDetect. All rights reserved.`,

  loginTitle: "Welcome back",
  loginSubtitle: "Sign in with your facility credentials to continue.",
  loginMissingFields: "Enter your email and password to continue.",
  rememberMeLabel: "Keep me signed in on this device",
  ssoLabel: "Sign in with facility SSO",
  noAccountPrompt: "No account yet? Ask your facility administrator to create one for you.",
  forgotPasswordHint: "Ask your facility administrator to reset your password.",

  doneTitle: "Signed in",
  doneSubtitle: "Welcome back — your shift dashboard is ready.",
  continueLabel: "Continue →",
} as const;
