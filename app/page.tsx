"use client";
import Link from 'next/link';
import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);  const features = [
    {
      icon: "🛡️",
      title: "AI-Powered Detection",
      description: "Advanced artificial intelligence na nag-aanalyze ng mga suspicious messages at content para sa mga mamamayan ng MIMAROPA",
      details: [
        "Machine learning algorithms",
        "Pattern recognition technology", 
        "Real-time threat database",
        "Local threat pattern analysis"
      ]
    },
    {
      icon: "⚡",
      title: "Instant Analysis",
      description: "Mabilis na threat assessment para sa immediate protection ng mga Pilipinong may access sa technology",
      details: [
        "3-second analysis time",
        "Instant threat scoring",
        "Real-time vulnerability checks",
        "Immediate risk assessment"
      ]
    },
    {
      icon: "🇵🇭",
      title: "MIMAROPA-Focused",
      description: "Specially designed para sa mga cyber threats na nakakaapekto sa Region IV-B at buong Pilipinas",
      details: [
        "Regional threat pattern recognition",
        "Tagalog/English analysis",
        "Philippine-specific threats",
        "Local context awareness"
      ]
    },
    {
      icon: "🔒",
      title: "Privacy & Security",
      description: "Secure at private na analysis na sumusunod sa mga data protection standards",
      details: [
        "Zero data retention",
        "End-to-end encryption",
        "No personal data storage",
        "Anonymous analysis"
      ]
    },
    {
      icon: "📚",
      title: "Educational Resource",
      description: "Comprehensive cyber security awareness tool para sa publiko at law enforcement",
      details: [
        "Threat identification guide",
        "Prevention techniques",
        "Educational materials",
        "Awareness campaigns"
      ]
    },
    {
      icon: "🤝",
      title: "Community Protection",
      description: "Collaborative effort ng RICTMD at PRO4B para sa mas secure na digital environment",
      details: [
        "Government-backed initiative",
        "Law enforcement support",
        "Community outreach",
        "Public-private partnership"
      ]
    }
  ];
  const howItWorksSteps = [
    {
      step: "1",
      title: "Mag-Upload o Mag-Paste",
      description: "I-upload ang screenshot o i-paste ang suspicious message na na-receive ninyo",
      icon: "📱"
    },
    {
      step: "2", 
      title: "AI Analysis",
      description: "Ang aming advanced AI system ay mag-aanalyze ng content para sa mga threat indicators",
      icon: "🧠"
    },
    {
      step: "3",
      title: "Makakuha ng Results",
      description: "Instant risk assessment at detailed recommendations para sa inyong kaligtasan",
      icon: "✅"
    }
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      {/* Header */}
      <header className="w-full border-b border-slate-100 bg-white sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Image src="/threatshield-icon.svg" alt="CyberSafe4B Logo" width={28} height={28} />
            </div>
            <span className="text-2xl font-bold tracking-tight text-blue-900">CYBERSAFE4B</span>
          </div>
          <nav className="hidden md:flex items-center space-x-8 text-base font-medium">
            <a href="#" className="hover:text-blue-600 transition-colors">Home</a>
            <a href="#report" className="hover:text-blue-600 transition-colors">Report Cybercrime</a>
            <a href="#tips" className="hover:text-blue-600 transition-colors">CyberTips</a>
            <a href="#contact" className="hover:text-blue-600 transition-colors">Contact us</a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto flex flex-col md:flex-row items-center justify-between px-6 py-16 gap-10">
        <div className="flex-1 max-w-xl">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight text-slate-900">
            A Safer Internet<br />for Every Filipino.
          </h1>
          <p className="text-lg md:text-xl text-slate-700 mb-8">
            CyberSafe4B is a project by RICTMD PRO 4B MiMAROPA designed to protect and empower Filipinos through cybersecurity education, alerts, and support.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a href="#report" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg shadow transition-all text-center">Report Cybercrime</a>
            <a href="#tips" className="bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold px-6 py-3 rounded-lg shadow transition-all text-center">Learn CyberSafety Tips</a>
          </div>
        </div>
        <div className="flex-1 flex justify-center md:justify-end">
          <Image src="/file.svg" alt="Cyber illustration" width={340} height={260} className="rounded-xl" />
        </div>
      </section>

      {/* What is CyberSafe4B? */}
      <section className="bg-slate-50 py-16 border-t border-slate-100">
        <div className="container mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">What is CyberSafe4B?</h2>
          <p className="text-slate-700 max-w-3xl mb-10">
            CyberSafe4B is an initiative of the Regional Information and Communications Technology Management Division (RICTMD) under Police Regional Office 4B – MIMAROPA. Our mission is to help every Filipino become more aware, alert, and protected in the digital space. We provide updated, accurate, and real-time information.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
            <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center text-center shadow-sm">
              <div className="text-3xl mb-2 text-orange-500">❗</div>
              <h3 className="font-semibold mb-1">Report a Cybercrime</h3>
              <p className="text-slate-600 text-sm">File a report quickly and easily.</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center text-center shadow-sm">
              <div className="text-3xl mb-2 text-blue-600">📖</div>
              <h3 className="font-semibold mb-1">Cybersecurity Tips</h3>
              <p className="text-slate-600 text-sm">Learn how to stay safe online.</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center text-center shadow-sm">
              <div className="text-3xl mb-2 text-yellow-500">⚠️</div>              <h3 className="font-semibold mb-1">Threat Alerts & Advisories</h3>
              <p className="text-slate-600 text-sm">Get real-time updates on digital threats.</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center text-center shadow-sm">
              <div className="text-3xl mb-2 text-blue-400">👥</div>
              <h3 className="font-semibold mb-1">Community Seminars</h3>
              <p className="text-slate-600 text-sm">Join local webinars and info drives.</p>
            </div>
          </div>
          <div className="flex justify-center">
            <a href="#advisories" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg shadow transition-all">See All Advisories</a>
          </div>
        </div>
      </section>

      {/* Latest Cyber Alerts & Partners */}
      <section className="container mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-2 gap-10">
        <div>
          <h3 className="text-xl font-bold mb-4">Latest Cyber Alerts</h3>
          <ul className="list-disc pl-5 text-slate-700 space-y-2">
            <li>Be informed on CyberSafe4B (PRO 4B, RICTMD)</li>
            <li>Police Regional Office 4B</li>
            <li>Department of Information and Communications Technology</li>
          </ul>
        </div>
        <div>
          <h3 className="text-xl font-bold mb-4">Partners & Support</h3>
          <ul className="list-disc pl-5 text-slate-700 space-y-2">
            <li>Police Regional Office 4B</li>
            <li>RICTMD</li>
            <li>Philippine National Police</li>
            <li>Local Government Units across MIMAROPA</li>
          </ul>
          <div className="mt-4">
            <Image src="/pnp-logo.svg" alt="PNP Logo" width={60} height={60} />
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-blue-700 py-12">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Join us in building a cyber-aware Philippines.</h2>
          <p className="text-white/90 text-lg mb-6">Together, we can fight misinformation, digital threats, and cybercrime.</p>
          <a href="#get-involved" className="inline-block bg-white text-blue-700 font-semibold px-8 py-3 rounded-lg shadow hover:bg-blue-50 transition-all">Get Involved</a>
        </div>
      </section>
    </div>
  );
}
