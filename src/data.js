// Portfolio content rendered onto the pages of the 3D book.

export const profile = {
  name: 'Bonifasius Baron Betazara',
  shortName: 'Baron Betazara',
  roles: ['ERP Developer', 'Odoo Specialist', 'Django Developer', 'Problem Solver'],
  summary:
    'A passionate ERP Developer specialized in Odoo and Django, with expertise in building production modules, HR systems, and custom business solutions. Based in South Tangerang, Indonesia.',
  location: 'South Tangerang, Indonesia',
  photo: '/profile.jpg',
  stats: [
    { value: '3+', label: 'Years Exp.' },
    { value: '4+', label: 'Companies' },
    { value: '10+', label: 'Projects' },
  ],
};

export const links = [
  { label: 'Email', value: 'baronbetazara@gmail.com', href: 'mailto:baronbetazara@gmail.com' },
  { label: 'LinkedIn', value: 'linkedin.com/in/baronbetazara', href: 'https://linkedin.com/in/baronbetazara' },
  { label: 'GitHub', value: 'github.com/barbeetazara1', href: 'https://github.com/barbeetazara1' },
];

export const experiences = [
  {
    title: 'ERP Developer',
    company: 'Hashmicro Solution Indonesia',
    location: 'Remote',
    period: 'Apr 2025 - Present',
    current: true,
    items: [
      'Developed with Odoo Version 14',
      'Developed and Enhanced Production Module (Manufacturing, Mining, Cutting, Assembly)',
      'Built Production Module with Custom Django Framework (Manufacturing)',
    ],
  },
  {
    title: 'Supervisor Odoo Developer',
    company: 'PT BSR Indonesia (MNC Group)',
    location: 'Jakarta, Indonesia',
    period: 'Feb 2024 - Mar 2025',
    items: [
      'Developed with Odoo Version 12 & 16',
      'Created a Custom Module Reservation Room for I-Hub',
      'Enhanced HR System for Human Outsourcing (Payroll, Attendance, Recruitment and Termination)',
      'Created a custom report with Excel, PDF, Word',
      'Created an API Integration for Android (Flutter)',
    ],
  },
  {
    title: 'Jr. Odoo Developer',
    company: 'Nibble Softwork',
    location: 'Remote',
    period: 'Sept 2023 - Jan 2024',
    items: [
      'Developed with Odoo Version 12, 14, 15, 16',
      'Enhanced Custom Module (Sales, Purchase, HR, Accounting, Manufacturing, Inventory)',
      'Created a Custom Module Student Management for Parahyangan University',
      'Created an API Integration for Android (Flutter)',
    ],
  },
  {
    title: 'Odoo Intern',
    company: 'PT Wibicon Karya Indonesia',
    location: 'Bandung, Indonesia',
    period: 'Sept 2022 - May 2023',
    items: [
      'Developed with Odoo Version 14',
      'Enhanced a ERP System for Sharon Bakery and PT Putera Mulya Terang Indah',
    ],
  },
];

export const skills = [
  { title: 'Languages', skills: ['Python', 'Odoo OWL'] },
  { title: 'Web Frameworks', skills: ['Odoo', 'Django'] },
  { title: 'Database', skills: ['PostgreSQL', 'MySQL'] },
  { title: 'Infrastructure & Cloud', skills: ['Docker'] },
  { title: 'DevOps', skills: ['Git'] },
];

export const education = [
  {
    school: 'Bina Nusantara University',
    degree: 'BIS in Information System',
    location: 'Jakarta, Indonesia',
    period: 'Oct 2023 - May 2026',
    thesis: 'User Experience Analysis of the South Tangerang Dukcapil Website Features',
    gpa: '3.60 / 4.00',
  },
  {
    school: 'Telkom University',
    degree: 'A.IS. in Information System',
    location: 'Bandung, Indonesia',
    period: 'Aug 2020 - June 2023',
    thesis: 'Fabric Production Application Development at PT Wibicon Karya Indonesia',
    gpa: '3.80 / 4.00',
  },
];
