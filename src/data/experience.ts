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
    organisation: 'Enroute Tech',
    title: 'Software Engineer',
    period: 'Mar 2026 — present',
    summary:
      'Migrating and extending a fleet and logistics SaaS platform — 11 interconnected microservices serving several user roles across web and mobile.',
    highlights: [
      'Work across a PHP 8.2 / CodeIgniter 4 backend, including a core API covering 60+ domain models and a JWT auth service with multi-device session tracking.',
      'Contribute to two cross-platform Flutter apps shipping on iOS and Android, with GPS tracking, Firebase push notifications and foreground location services.',
    ],
  },
  {
    organisation: 'APM Corporate Service, Group IT',
    title: 'IT Intern',
    period: 'Dec 2024 — Feb 2025',
    summary:
      'Application support across five Infor ERPLN 10.7 modules — sales, procurement, warehouse, inventory and finance.',
    highlights: [
      'Worked in live and staging ERP environments, monitoring data flow and troubleshooting issues raised by end users.',
      'Extracted and reconciled inventory data across company databases for the year-end audit, resolving discrepancies for the system accountants.',
    ],
  },
];

export const skills: SkillGroup[] = [
  {
    label: 'Languages',
    items: ['TypeScript', 'Python', 'Java', 'PHP', 'Dart', 'Swift', 'Kotlin'],
  },
  {
    label: 'Frameworks',
    items: ['React', 'Vue', 'Angular', 'Node.js', 'Flutter', 'React Native', 'Astro', 'SwiftUI'],
  },
  {
    label: 'Data',
    items: ['MySQL', 'MongoDB', 'Neo4j', 'Cassandra'],
  },
  {
    label: 'Tools',
    items: ['Git', 'Docker', 'Xcode', 'Figma'],
  },
];
