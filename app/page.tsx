"use client";
import Link from 'next/link';
import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  
  const fullText = "A Safer CyberSpace for Every Filipino.";const features = [
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
  // Typing animation effect with loop
  useEffect(() => {
    if (currentIndex < fullText.length) {
      const timer = setTimeout(() => {
        setTypedText(prev => prev + fullText[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 100); // Adjust typing speed here (lower = faster)
      
      return () => clearTimeout(timer);
    } else {
      // When typing is complete, wait 2 seconds then restart
      setIsTyping(false);
      const restartTimer = setTimeout(() => {
        setTypedText('');
        setCurrentIndex(0);
        setIsTyping(true);
      }, 2000); // Wait 2 seconds before restarting
      
      return () => clearTimeout(restartTimer);
    }
  }, [currentIndex, fullText]);
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
            <a href="#howitworks" className="hover:text-blue-600 transition-colors">How It Works</a>
            <a href="#contact" className="hover:text-blue-600 transition-colors">Contact us</a>
          </nav>
        </div>
      </header>      {/* Hero Section */}      <section className="container mx-auto flex flex-col md:flex-row items-center justify-between px-6 py-8 gap-6">
        <div className="flex-1 max-w-xl">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight text-slate-900 min-h-[80px]">
            {typedText}
            {isTyping && <span className="animate-pulse text-blue-600">|</span>}
          </h1>
          <p className="text-lg md:text-xl text-slate-700 mb-6">
           “Together, let’s create a secure online world where every Filipino can connect, learn, and grow without fear. Stay smart, stay safe, and protect our digital future!”
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a href="#report" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg shadow transition-all text-center">🔍 Analyze Now</a>
          </div>
        </div>
        <div className="flex-1 flex justify-center md:justify-end">
          <Image src="/file.jpg" alt="Cyber illustration" width={340} height={260} className="rounded-xl" />
        </div>
      </section>

      {/* What is CyberSafe4B? */}
      <section className="bg-slate-50 py-16 border-t border-slate-100">
        <div className="container mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">What is CyberSafe4B?</h2>          <p className="text-slate-700 max-w-3xl mb-10">
            CyberSafe4B is an initiative of the Regional Information and Communications Technology Management Division (RICTMD) under Police Regional Office 4B – MIMAROPA. Our mission is to help every Filipino become more aware, alert, and protected in the digital space. We provide updated, accurate, and real-time information.
          </p>
          
          {/* Our Core Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-bold mb-3 text-blue-900">AI-Powered Detection</h3>
              <p className="text-slate-700 leading-relaxed">
                Advanced artificial intelligence that analyzes suspicious messages, emails, and content to protect Filipino communities from cyber threats in real-time.
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-bold mb-3 text-green-900">Instant Analysis</h3>
              <p className="text-slate-700 leading-relaxed">
                Get immediate threat assessments and security recommendations within seconds, helping you make informed decisions about digital content safety.
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
              <div className="text-4xl mb-4">🇵🇭</div>
              <h3 className="text-xl font-bold mb-3 text-purple-900">Philippine-Focused</h3>
              <p className="text-slate-700 leading-relaxed">
                Specially designed for Filipino communities with understanding of local languages, culture, and specific cyber threats targeting our region.
              </p>
            </div>          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="howitworks" className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-slate-900">How It Works</h2>
            <p className="text-slate-700 max-w-2xl mx-auto">
              Simple, fast, and effective threat detection in just three easy steps. Protect yourself and your community from cyber threats.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {howItWorksSteps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">{step.icon}</span>
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {step.step}
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-900">{step.title}</h3>
                <p className="text-slate-700 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <a 
              href="/analysis" 
              className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg shadow transition-all"
            >
              <span className="mr-2">🚀</span>
              Start Analyzing Now
            </a>
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
      </section>      {/* CTA Banner */}
      <section className="bg-blue-700 py-12">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Join us in building a cyber-aware Philippines.</h2>
          <p className="text-white/90 text-lg mb-6">Together, we can fight misinformation, digital threats, and cybercrime.</p>
          <a href="#get-involved" className="inline-block bg-white text-blue-700 font-semibold px-8 py-3 rounded-lg shadow hover:bg-blue-50 transition-all">Get Involved</a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Logo and Description */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Image src="/threatshield-icon.svg" alt="CyberSafe4B Logo" width={28} height={28} />
                </div>
                <span className="text-2xl font-bold tracking-tight">CYBERSAFE4B</span>
              </div>
              <p className="text-slate-300 mb-4 max-w-md">
                An initiative of the Regional Information and Communications Technology Management Division (RICTMD) under Police Regional Office 4B – MIMAROPA.
              </p>
              <p className="text-slate-400 text-sm">
                Protecting Filipino communities through advanced AI-powered threat detection and cybersecurity awareness.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold mb-4 text-white">Quick Links</h4>
              <ul className="space-y-2 text-slate-300">
                <li><a href="#" className="hover:text-white transition-colors">Home</a></li>
                <li><a href="#howitworks" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="/analysis" className="hover:text-white transition-colors">Threat Analysis</a></li>
                <li><a href="#contact" className="hover:text-white transition-colors">Contact Us</a></li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className="font-semibold mb-4 text-white">Contact</h4>
              <ul className="space-y-2 text-slate-300 text-sm">
                <li className="flex items-center space-x-2">
                  <span>📍</span>
                  <span>Police Regional Office 4B<br />MIMAROPA Region</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span>📧</span>
                  <span>cybersafe4b@pro4b.pnp.gov.ph</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span>📞</span>
                  <span>Emergency Hotline: 911</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-slate-700 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="text-slate-400 text-sm mb-4 md:mb-0">
              © 2025 CyberSafe4B - Police Regional Office 4B. All rights reserved.
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Image src="/pnp-logo.svg" alt="PNP Logo" width={24} height={24} />
                <span className="text-slate-400 text-sm">Philippine National Police</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
