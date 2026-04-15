export interface StaticLocale {
  buttons: { github: string; linkedin: string; resume: string };
  nav: { openMenu: string; closeMenu: string };
  work: { subtitle: string; visitProject: string; downloadAppStore: string };
  experience: { subtitle: string; description: string };
  theme: { light: string; dark: string };
  footer: { copyright: string };
  contact: { email: string };
}

export const en: StaticLocale = {
  buttons: {
    github: "GitHub",
    linkedin: "LinkedIn",
    resume: "Resume",
  },
  nav: {
    openMenu: "Open menu",
    closeMenu: "Close menu",
  },
  work: {
    subtitle: "Featured",
    visitProject: "View {name}",
    downloadAppStore: "Download on App Store",
  },
  experience: {
    subtitle: "Contributions & Projects",
    description:
      "Open-source contributions to Zed and selected personal Rust projects that reflect how I like to build.",
  },
  theme: { light: "Light", dark: "Dark" },
  footer: { copyright: "{year} Thomas Jensen" },
  contact: {
    email: "thomas.jensen_@outlook.com",
  },
};
