import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ─── Floating Code Background ───
function CodeParticles({ darkMode }) {
  const symbols = useMemo(() => [
    '{ }', '< />', 'def', '( )', '=>', '[ ]', '# ', 'if', 'for',
    'class', 'import', 'return', 'self', '==', '!=', '&&', '||',
    'try', 'except', '.py', '.js', 'SQL', 'git', 'pip', 'npm',
    'API', 'ERP', 'ORM', 'XML', 'CSV', 'def()', 'True', '0x',
  ], []);

  const particles = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      text: symbols[i % symbols.length],
      left: `${Math.random() * 100}%`,
      duration: 15 + Math.random() * 25,
      delay: Math.random() * 20,
      size: 10 + Math.random() * 14,
      diagonal: Math.random() > 0.5,
    }));
  }, [symbols]);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((p) => (
        <span
          key={p.id}
          className={p.diagonal ? 'code-particle-diagonal' : 'code-particle'}
          style={{
            left: p.left,
            fontSize: `${p.size}px`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            color: darkMode
              ? `rgba(129, 140, 248, ${0.08 + Math.random() * 0.12})`
              : `rgba(199, 210, 254, ${0.25 + Math.random() * 0.2})`,
          }}
        >
          {p.text}
        </span>
      ))}
      {/* Glowing orbs */}
      {[...Array(5)].map((_, i) => (
        <div
          key={`orb-${i}`}
          className="glow-particle absolute rounded-full"
          style={{
            width: `${100 + i * 60}px`,
            height: `${100 + i * 60}px`,
            left: `${10 + i * 20}%`,
            top: `${15 + (i % 3) * 30}%`,
            background: darkMode
              ? `radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)`
              : `radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, transparent 70%)`,
            animationDelay: `${i * 0.8}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Mouse Parallax Hook ───
function useMouseParallax(strength = 0.02) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouse = (e) => {
      const x = (e.clientX - window.innerWidth / 2) * strength;
      const y = (e.clientY - window.innerHeight / 2) * strength;
      setOffset({ x, y });
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, [strength]);

  return offset;
}

// ─── Tilt Card Hook ───
function useTiltEffect() {
  const ref = useRef(null);

  const handleMouseMove = useCallback((e) => {
    const card = ref.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (ref.current) {
      ref.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    }
  }, []);

  return { ref, handleMouseMove, handleMouseLeave };
}

// ─── Scroll Reveal Hook ───
function useScrollReveal() {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );
    if (node) observer.observe(node);
    return () => { if (node) observer.unobserve(node); };
  }, []);

  return [ref, isVisible];
}

// ─── Animated Section ───
function AnimatedSection({ children, delay = 0 }) {
  const [ref, isVisible] = useScrollReveal();
  return (
    <div
      ref={ref}
      className="transition-all duration-700 ease-out"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Typing Effect ───
function useTypingEffect(texts, typingSpeed = 80, deletingSpeed = 40, pauseDuration = 2000) {
  const [displayText, setDisplayText] = useState('');
  const [textIndex, setTextIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentText = texts[textIndex];
    let timeout;

    if (!isDeleting && displayText === currentText) {
      timeout = setTimeout(() => setIsDeleting(true), pauseDuration);
    } else if (isDeleting && displayText === '') {
      setIsDeleting(false);
      setTextIndex((prev) => (prev + 1) % texts.length);
    } else {
      timeout = setTimeout(() => {
        setDisplayText(
          isDeleting
            ? currentText.substring(0, displayText.length - 1)
            : currentText.substring(0, displayText.length + 1)
        );
      }, isDeleting ? deletingSpeed : typingSpeed);
    }

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, textIndex, texts, typingSpeed, deletingSpeed, pauseDuration]);

  return displayText;
}

// ─── Animated Counter ───
function AnimatedCounter({ end, duration = 2000, suffix = '' }) {
  const [count, setCount] = useState(0);
  const [ref, isVisible] = useScrollReveal();
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (isVisible && !hasAnimated.current) {
      hasAnimated.current = true;
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.floor(eased * end));
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }
  }, [isVisible, end, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

// ─── Tilt Skill Card ───
function TiltSkillCard({ children, darkMode }) {
  const { ref, handleMouseMove, handleMouseLeave } = useTiltEffect();
  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`tilt-card group p-6 rounded-2xl border transition-all duration-300 hover:shadow-xl ${darkMode ? 'bg-gray-900/80 border-gray-800 hover:border-gray-700 hover:shadow-indigo-500/10' : 'bg-white/80 border-stone-200 hover:border-stone-300 hover:shadow-indigo-100'}`}
    >
      {children}
    </div>
  );
}

// ─── Mobile Menu ───
function MobileMenu({ navLinks, activeSection, darkMode, isOpen, onClose }) {
  return (
    <div
      className={`fixed inset-0 z-[55] transition-all duration-300 md:hidden ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className={`absolute inset-0 ${darkMode ? 'bg-gray-950/95' : 'bg-stone-50/95'} backdrop-blur-lg`} onClick={onClose} />
      <nav className="relative flex flex-col items-center justify-center h-full gap-8">
        {navLinks.map((link, i) => (
          <a
            key={link.id}
            href={`#${link.id}`}
            onClick={onClose}
            className={`text-2xl font-medium transition-all duration-300 hover:scale-110 ${
              activeSection === link.id
                ? (darkMode ? 'text-indigo-400' : 'text-indigo-600')
                : (darkMode ? 'text-gray-300' : 'text-gray-700')
            }`}
            style={{
              transitionDelay: isOpen ? `${i * 80}ms` : '0ms',
              transform: isOpen ? 'translateY(0)' : 'translateY(20px)',
              opacity: isOpen ? 1 : 0,
            }}
          >
            {link.label}
          </a>
        ))}
      </nav>
    </div>
  );
}

// ─── Contact Modal ───
function ContactModal({ isOpen, onClose, darkMode }) {
  const [sent, setSent] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { onClose(); setSent(false); }} />
      <div
        className={`relative w-full max-w-md p-8 rounded-2xl shadow-2xl transition-all duration-300 ${
          darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-stone-200'
        }`}
        style={{ animation: 'fadeInUp 0.3s ease-out' }}
      >
        <button
          onClick={() => { onClose(); setSent(false); }}
          className={`absolute top-4 right-4 p-1 rounded-full transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-stone-100 text-gray-500'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {sent ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Message Sent!</h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Thanks for reaching out. I'll get back to you soon.</p>
          </div>
        ) : (
          <>
            <h3 className="text-xl font-semibold mb-1">Get in Touch</h3>
            <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>I'd love to hear from you.</p>
            <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Your Name"
                  required
                  className={`w-full px-4 py-2.5 rounded-lg text-sm border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    darkMode ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500' : 'bg-stone-50 border-stone-200 text-gray-900 placeholder-gray-400'
                  }`}
                />
              </div>
              <div>
                <input
                  type="email"
                  placeholder="Your Email"
                  required
                  className={`w-full px-4 py-2.5 rounded-lg text-sm border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    darkMode ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500' : 'bg-stone-50 border-stone-200 text-gray-900 placeholder-gray-400'
                  }`}
                />
              </div>
              <div>
                <textarea
                  placeholder="Your Message"
                  rows={4}
                  required
                  className={`w-full px-4 py-2.5 rounded-lg text-sm border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none ${
                    darkMode ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500' : 'bg-stone-50 border-stone-200 text-gray-900 placeholder-gray-400'
                  }`}
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98]"
              >
                Send Message
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Skill Progress Bar ───
function SkillBar({ name, level, darkMode, delay = 0 }) {
  const [ref, isVisible] = useScrollReveal();
  return (
    <div ref={ref} className="group cursor-default" style={{ transitionDelay: `${delay}ms` }}>
      <div className="flex justify-between items-center mb-1.5">
        <span className={`text-sm font-medium transition-colors duration-200 ${darkMode ? 'text-gray-300 group-hover:text-indigo-400' : 'text-gray-700 group-hover:text-indigo-600'}`}>{name}</span>
        <span className={`text-xs font-mono transition-all duration-500 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {isVisible ? `${level}%` : '0%'}
        </span>
      </div>
      <div className={`h-2 rounded-full overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-stone-200'}`}>
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-out group-hover:shadow-lg group-hover:shadow-indigo-500/30"
          style={{
            width: isVisible ? `${level}%` : '0%',
            transitionDelay: `${delay + 200}ms`,
          }}
        />
      </div>
    </div>
  );
}

// ─── Main App ───
function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [activeSection, setActiveSection] = useState('about');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [expandedExp, setExpandedExp] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cursorGlow, setCursorGlow] = useState({ x: 0, y: 0 });
  const mouseParallax = useMouseParallax(0.015);

  const typedText = useTypingEffect([
    'ERP Developer',
    'Odoo Specialist',
    'Django Developer',
    'Problem Solver',
  ]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Cursor glow effect
  useEffect(() => {
    const handleMouse = (e) => setCursorGlow({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  // Scroll progress & active section
  const handleScroll = useCallback(() => {
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    setScrollProgress((window.scrollY / totalHeight) * 100);

    const sections = ['about', 'experience', 'skills', 'education'];
    for (const id of [...sections].reverse()) {
      const el = document.getElementById(id);
      if (el && window.scrollY >= el.offsetTop - 200) {
        setActiveSection(id);
        break;
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const navLinks = [
    { id: 'about', label: 'About' },
    { id: 'experience', label: 'Experience' },
    { id: 'skills', label: 'Skills' },
    { id: 'education', label: 'Education' },
  ];

  const experiences = [
    {
      title: 'ERP Developer',
      company: 'Hashmiro Solution Indonesia',
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

  const skillCategories = [
    {
      title: 'Languages',
      skills: ['Python', 'Odoo OWL'],
      color: 'blue',
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />,
    },
    {
      title: 'Web Frameworks',
      skills: ['Odoo', 'Django'],
      color: 'purple',
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />,
    },
    {
      title: 'Database',
      skills: ['PostgreSQL', 'MySQL'],
      color: 'emerald',
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />,
    },
    {
      title: 'Infrastructure & Cloud',
      skills: ['Docker'],
      color: 'orange',
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />,
    },
    {
      title: 'DevOps',
      skills: ['Git'],
      color: 'rose',
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />,
    },
  ];

  const colorMap = {
    blue: { bg: darkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600' },
    purple: { bg: darkMode ? 'bg-purple-900/50 text-purple-400' : 'bg-purple-100 text-purple-600' },
    emerald: { bg: darkMode ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-600' },
    orange: { bg: darkMode ? 'bg-orange-900/50 text-orange-400' : 'bg-orange-100 text-orange-600' },
    rose: { bg: darkMode ? 'bg-rose-900/50 text-rose-400' : 'bg-rose-100 text-rose-600' },
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 relative ${darkMode ? 'bg-gray-950 text-gray-100' : 'bg-stone-50 text-gray-900'}`}>
      {/* Floating code background */}
      <CodeParticles darkMode={darkMode} />

      {/* Cursor glow */}
      <div
        className="fixed pointer-events-none z-[1] transition-opacity duration-300 hidden md:block"
        style={{
          left: cursorGlow.x - 200,
          top: cursorGlow.y - 200,
          width: 400,
          height: 400,
          background: darkMode
            ? 'radial-gradient(circle, rgba(99, 102, 241, 0.06) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(99, 102, 241, 0.04) 0%, transparent 70%)',
        }}
      />

      {/* Scroll Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 z-[60]">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Navigation */}
      <nav className={`fixed top-1 w-full z-50 backdrop-blur-md border-b transition-colors duration-300 ${darkMode ? 'bg-gray-950/80 border-gray-800' : 'bg-stone-50/80 border-stone-200'}`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="font-serif text-xl font-semibold tracking-tight">Baron Betazara</h1>
          <div className="flex items-center gap-8">
            <div className="hidden md:flex gap-6 text-sm font-medium">
              {navLinks.map((link) => (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  className={`relative py-1 transition-colors duration-200 ${
                    activeSection === link.id
                      ? (darkMode ? 'text-indigo-400' : 'text-indigo-600')
                      : 'hover:opacity-70'
                  }`}
                >
                  {link.label}
                  <span
                    className={`absolute bottom-0 left-0 h-0.5 bg-indigo-500 transition-all duration-300 ${
                      activeSection === link.id ? 'w-full' : 'w-0'
                    }`}
                  />
                </a>
              ))}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-stone-200'}`}
              aria-label="Menu"
            >
              <div className="w-5 h-4 flex flex-col justify-between">
                <span className={`block h-0.5 rounded transition-all duration-300 ${darkMode ? 'bg-gray-300' : 'bg-gray-700'} ${mobileMenuOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
                <span className={`block h-0.5 rounded transition-all duration-300 ${darkMode ? 'bg-gray-300' : 'bg-gray-700'} ${mobileMenuOpen ? 'opacity-0' : ''}`} />
                <span className={`block h-0.5 rounded transition-all duration-300 ${darkMode ? 'bg-gray-300' : 'bg-gray-700'} ${mobileMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
              </div>
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-full transition-all duration-300 ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-yellow-400 hover:rotate-180' : 'bg-stone-200 hover:bg-stone-300 text-gray-700 hover:-rotate-12'}`}
              aria-label="Toggle theme"
            >
              {darkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform duration-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform duration-500" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <MobileMenu
        navLinks={navLinks}
        activeSection={activeSection}
        darkMode={darkMode}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Hero / About Section */}
      <section id="about" className="pt-32 pb-20 px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <AnimatedSection>
              <div
                className="relative group"
                style={{
                  transform: `translate(${mouseParallax.x * -1}px, ${mouseParallax.y * -1}px)`,
                  transition: 'transform 0.3s ease-out',
                }}
              >
                {/* Rotating ring around photo */}
                <div className="absolute -inset-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div
                    className={`w-full h-full rounded-full border-2 border-dashed ${darkMode ? 'border-indigo-500/30' : 'border-indigo-400/30'}`}
                    style={{ animation: 'spin 20s linear infinite' }}
                  />
                </div>
                <div className={`w-64 h-64 md:w-80 md:h-80 rounded-full overflow-hidden shadow-2xl ring-4 transition-all duration-500 group-hover:shadow-indigo-500/25 group-hover:scale-[1.02] ${darkMode ? 'ring-gray-800' : 'ring-stone-200'}`}>
                  <img
                    src="/profile.jpg"
                    alt="Bonifasius Baron Betazara"
                    className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
                <div className={`absolute bottom-2 -right-2 w-20 h-20 rounded-full ${darkMode ? 'bg-indigo-600' : 'bg-indigo-500'} flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                  <span className="text-white text-xs font-semibold text-center leading-tight">3+ yrs<br/>exp</span>
                </div>
              </div>
            </AnimatedSection>
            <AnimatedSection delay={200}>
              <div className="flex-1 text-center md:text-left">
                <p className={`text-sm font-medium tracking-widest uppercase mb-3 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  <span>{typedText}</span>
                  <span className="animate-pulse ml-0.5">|</span>
                </p>
                <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                  Bonifasius Baron<br />Betazara
                </h2>
                <p className={`text-lg leading-relaxed max-w-xl mb-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  A passionate ERP Developer specialized in Odoo and Django, with expertise in building
                  production modules, HR systems, and custom business solutions. Based in South Tangerang, Indonesia.
                </p>

                {/* Stats */}
                <div className="flex flex-wrap gap-8 justify-center md:justify-start mb-8">
                  {[
                    { value: 3, suffix: '+', label: 'Years Exp.' },
                    { value: 4, suffix: '+', label: 'Companies' },
                    { value: 10, suffix: '+', label: 'Projects' },
                  ].map((stat, i) => (
                    <div key={i} className={`text-center group/stat cursor-default p-3 rounded-xl transition-all duration-300 hover:scale-110 ${darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-white/50'}`}>
                      <p className={`text-3xl font-bold ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                        <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                      </p>
                      <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{stat.label}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  <a href="mailto:baronbetazara@gmail.com"
                    className="magnetic-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5 text-white active:scale-95">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                    Contact Me
                  </a>
                  <a href="https://linkedin.com/in/baronbetazara" target="_blank" rel="noreferrer"
                    className={`magnetic-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border transition-all duration-300 hover:-translate-y-0.5 active:scale-95 ${darkMode ? 'border-gray-700 hover:bg-gray-800 hover:shadow-lg hover:shadow-gray-900/50' : 'border-stone-300 hover:bg-stone-100 hover:shadow-lg hover:shadow-stone-200/50'}`}>
                    LinkedIn
                  </a>
                  <a href="https://github.com/barbeetazara1" target="_blank" rel="noreferrer"
                    className={`magnetic-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border transition-all duration-300 hover:-translate-y-0.5 active:scale-95 ${darkMode ? 'border-gray-700 hover:bg-gray-800 hover:shadow-lg hover:shadow-gray-900/50' : 'border-stone-300 hover:bg-stone-100 hover:shadow-lg hover:shadow-stone-200/50'}`}>
                    GitHub
                  </a>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <hr className={`transition-colors duration-300 ${darkMode ? 'border-gray-800' : 'border-stone-200'}`} />
      </div>

      {/* Experience Section */}
      <section id="experience" className="py-20 px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection>
            <p className={`text-sm font-medium tracking-widest uppercase mb-3 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
              Career Journey
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-12">Experience</h2>
          </AnimatedSection>

          {/* Timeline */}
          <div className="relative">
            <div className={`absolute left-0 md:left-8 top-0 bottom-0 w-0.5 ${darkMode ? 'bg-gray-800' : 'bg-stone-200'}`} />

            <div className="space-y-6">
              {experiences.map((exp, i) => (
                <AnimatedSection key={i} delay={i * 100}>
                  <div
                    className="relative pl-8 md:pl-20 cursor-pointer"
                    onClick={() => setExpandedExp(expandedExp === i ? -1 : i)}
                  >
                    <div className={`absolute left-0 md:left-8 top-8 w-3 h-3 rounded-full -translate-x-[5px] transition-all duration-300 ${
                      expandedExp === i
                        ? 'bg-indigo-500 scale-150 shadow-lg shadow-indigo-500/50'
                        : exp.current
                          ? (darkMode ? 'bg-green-400' : 'bg-green-500')
                          : (darkMode ? 'bg-gray-600' : 'bg-stone-400')
                    }`} />
                    {/* Pulse ring on active */}
                    {expandedExp === i && (
                      <div className="absolute left-0 md:left-8 top-8 w-3 h-3 rounded-full -translate-x-[5px] bg-indigo-500/30 animate-ping" />
                    )}

                    <div className={`p-6 md:p-8 rounded-2xl border transition-all duration-300 ${
                      expandedExp === i
                        ? (darkMode ? 'bg-gray-900/80 border-indigo-500/50 shadow-lg shadow-indigo-500/10' : 'bg-white/80 border-indigo-300 shadow-lg shadow-indigo-100')
                        : (darkMode ? 'bg-gray-900/60 border-gray-800 hover:border-gray-700' : 'bg-white/60 border-stone-200 hover:border-stone-300')
                    } backdrop-blur-sm hover:shadow-md`}>
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-semibold flex items-center gap-2">
                            {exp.title}
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform duration-300 ${expandedExp === i ? 'rotate-180' : ''} ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </h3>
                          <p className={`${darkMode ? 'text-indigo-400' : 'text-indigo-600'} font-medium`}>{exp.company}</p>
                          <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{exp.location}</p>
                        </div>
                        <span className={`text-sm font-medium mt-2 md:mt-0 px-3 py-1 rounded-full whitespace-nowrap ${exp.current ? (darkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700') : (darkMode ? 'bg-gray-800 text-gray-300' : 'bg-stone-100 text-gray-600')}`}>
                          {exp.period}
                        </span>
                      </div>
                      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${expandedExp === i ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                        <ul className={`space-y-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {exp.items.map((item, j) => (
                            <li key={j} className="flex items-start gap-2" style={{ transitionDelay: `${j * 50}ms` }}>
                              <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${darkMode ? 'bg-indigo-400' : 'bg-indigo-500'}`}></span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <hr className={`transition-colors duration-300 ${darkMode ? 'border-gray-800' : 'border-stone-200'}`} />
      </div>

      {/* Skills Section */}
      <section id="skills" className="py-20 px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection>
            <p className={`text-sm font-medium tracking-widest uppercase mb-3 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
              Technical Expertise
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-12">Skills</h2>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {skillCategories.map((cat, i) => (
              <AnimatedSection key={i} delay={i * 100}>
                <TiltSkillCard darkMode={darkMode}>
                  <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${colorMap[cat.color].bg}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      {cat.icon}
                    </svg>
                  </div>
                  <h3 className="font-semibold text-lg mb-3">{cat.title}</h3>
                  <div className="flex flex-wrap gap-2">
                    {cat.skills.map((skill, j) => (
                      <span
                        key={j}
                        className={`px-3 py-1 rounded-full text-sm transition-all duration-200 hover:scale-110 cursor-default ${darkMode ? 'bg-gray-800 text-gray-300 hover:bg-indigo-900/50 hover:text-indigo-300' : 'bg-stone-100 text-gray-700 hover:bg-indigo-100 hover:text-indigo-700'}`}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </TiltSkillCard>
              </AnimatedSection>
            ))}
          </div>

        </div>
      </section>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <hr className={`transition-colors duration-300 ${darkMode ? 'border-gray-800' : 'border-stone-200'}`} />
      </div>

      {/* Education Section */}
      <section id="education" className="py-20 px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection>
            <p className={`text-sm font-medium tracking-widest uppercase mb-3 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
              Academic Background
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-12">Education</h2>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
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
            ].map((edu, i) => (
              <AnimatedSection key={i} delay={i * 150}>
                <div className={`group p-6 md:p-8 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl backdrop-blur-sm ${darkMode ? 'bg-gray-900/80 border-gray-800 hover:border-gray-700' : 'bg-white/80 border-stone-200 hover:border-stone-300'}`}>
                  <span className={`text-sm font-medium px-3 py-1 rounded-full ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-stone-100 text-gray-600'}`}>
                    {edu.period}
                  </span>
                  <h3 className="text-xl font-semibold mt-4 group-hover:text-indigo-500 transition-colors duration-300">{edu.school}</h3>
                  <p className={`${darkMode ? 'text-indigo-400' : 'text-indigo-600'} font-medium`}>{edu.degree}</p>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{edu.location}</p>
                  <div className={`mt-4 p-3 rounded-lg transition-colors duration-300 ${darkMode ? 'bg-gray-800/50 group-hover:bg-gray-800' : 'bg-stone-50 group-hover:bg-stone-100'}`}>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <span className="font-medium">Thesis:</span> {edu.thesis}
                    </p>
                    <p className={`text-sm mt-2 font-semibold ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>GPA: {edu.gpa}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-8 px-6 border-t relative z-10 transition-colors duration-300 ${darkMode ? 'border-gray-800' : 'border-stone-200'}`}>
        <div className="max-w-6xl mx-auto text-center">
          <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            &copy; 2026 Bonifasius Baron Betazara. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Scroll to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`fixed bottom-6 right-6 p-3 rounded-full shadow-lg transition-all duration-300 z-50 ${
          scrollProgress > 10 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        } bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-xl hover:-translate-y-1 active:scale-90`}
        aria-label="Scroll to top"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
}

export default App;
