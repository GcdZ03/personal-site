export interface Role {
  organisation: string;
  title: string;
  period: string;
  summary: string;
  highlights: string[];
}

export interface SkillGroup {
  label: string;
  items: string[];
}

export const experience: Role[] = [
  {
    organisation: 'Independent',
    title: 'Developer',
    period: '2026 — present',
    summary: 'Building macOS developer tools, most recently CreativeNotch.',
    highlights: [
      'Shipped CreativeNotch v0.5.0, an event-driven macOS notch utility.',
    ],
  },
];

export const skills: SkillGroup[] = [
  { label: 'Languages', items: ['Swift', 'TypeScript'] },
  { label: 'Platforms', items: ['macOS', 'Web'] },
  { label: 'Tools', items: ['Git', 'Xcode'] },
];
