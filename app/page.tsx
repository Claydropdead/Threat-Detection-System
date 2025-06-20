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
  
  const fullText = "A Safer CyberSpace for Every Filipino.";  const features = [
    {
      icon: "🧠",
      title: "Smart Threat Detection",
      description: "Analyzes text, images, audio, and URLs to identify phishing, fraud, impersonation, and misinformation targeting Filipinos",
      details: [
        "Multi-modal content analysis",
        "Philippine-specific threat patterns", 
        "Purpose-first assessment approach",
        "Context-aware risk evaluation"
      ]
    },    {
      icon: "🇵🇭",
      title: "Filipino-Focused Protection",
      description: "Specialized detection of OFW scams, GCash/Maya fraud, government impersonation, and cultural exploitation tactics",
      details: [
        "Local financial app fraud detection",
        "Tagalog/English bilingual analysis",
        "Cultural context understanding",
        "Regional threat landscape awareness"
      ]
    },
    {
      icon: "🎯",
      title: "User Intent Recognition",
      description: "Understands what users actually want to know and provides relevant, educational responses instead of generic warnings",
      details: [
        "Content purpose research",
        "Intent-matched responses",
        "Educational explanations",
        "False positive reduction"
      ]
    },
    {
      icon: "🔒",
      title: "Privacy Protection",
      description: "Secure analysis with no personal data storage and immediate processing for user privacy protection",
      details: [
        "No data retention policy",
        "Temporary processing only",
        "Anonymous threat analysis",
        "Secure API communications"
      ]
    },
    {
      icon: "📚",
      title: "Educational Focus",
      description: "Teaches users to recognize threats independently while providing context-specific safety guidance",
      details: [
        "Threat pattern education",
        "Verification techniques",
        "Critical thinking skills",
        "Prevention strategies"
      ]
    },
    {
      icon: "🤝",
      title: "Community Initiative",
      description: "Government-backed cybersecurity awareness program supporting MIMAROPA region's digital safety",
      details: [
        "RICTMD PRO4B partnership",
        "Law enforcement collaboration",
        "Public education outreach",
        "Regional cybersecurity support"
      ]
    }
  ];  const howItWorksSteps = [
    {
      step: "1",
      title: "Submit Content for Analysis",
      description: "Upload images, paste text messages, record audio, or enter URLs of suspicious content you've received or encountered online",
      icon: "📱"
    },
    {
      step: "2", 
      title: "AI Content Research",
      description: "Our system understands your question, researches what the content actually is, and analyzes for specific threat indicators like phishing, fraud, or impersonation",
      icon: "🔍"
    },
    {
      step: "3",
      title: "Get Educational Results",
      description: "Receive detailed explanations, threat assessments, safety advice, and learn how to recognize similar threats in the future",
      icon: "🎓"
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
      {/* Header */}      <header className="w-full border-b border-slate-100 bg-white sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <Image 
              src="/banner.jpg" 
              alt="MIMAROPA Regional Logos" 
              width={200} 
              height={60} 
              className="h-14 w-auto object-contain"
            />
            <span className="text-gray-400 text-3xl font-light">|</span>
            <span className="text-3xl font-bold tracking-tight text-blue-900">CyberSafe 4B</span>
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
            <a href="/analysis" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg shadow transition-all text-center">🔍 Analyze Now</a>
          </div>
        </div>
        <div className="flex-1 flex justify-center md:justify-end">
          <Image src="/file.jpg" alt="Cyber illustration" width={340} height={260} className="rounded-xl" />
        </div>
      </section>      {/* What is CyberSafe 4B? */}
      <section className="bg-slate-50 py-16 border-t border-slate-100">
        <div className="container mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">What is CyberSafe 4B?</h2>          <p className="text-slate-700 max-w-3xl mb-10">
            CyberSafe 4B is an initiative of the Regional Information and Communications Technology Management Division (RICTMD) under Police Regional Office 4B – MIMAROPA. Our mission is to help every Filipino become more aware, alert, and protected in the digital space. We provide updated, accurate, and real-time information.
          </p>
          
          {/* Our Core Features */}          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <div className="text-4xl mb-4">🧠</div>
              <h3 className="text-xl font-bold mb-3 text-blue-900">Smart Content Analysis</h3>
              <p className="text-slate-700 leading-relaxed">
                Analyzes text messages, images, audio recordings, and websites to identify phishing attempts, financial fraud, impersonation scams, and misinformation targeting Filipinos.
              </p>
            </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
              <div className="text-4xl mb-4">🇵🇭</div>
              <h3 className="text-xl font-bold mb-3 text-green-900">Philippine Context Aware</h3>
              <p className="text-slate-700 leading-relaxed">
                Specialized detection of OFW scams, GCash/Maya fraud, government impersonation, local banking threats, and scams exploiting Filipino cultural values and trust patterns.
              </p>
            </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-bold mb-3 text-purple-900">Purpose-First Detection</h3>
              <p className="text-slate-700 leading-relaxed">
                Understands user intent and researches content purpose before assessment, reducing false alarms while providing accurate threat identification and educational guidance.
              </p>
            </div></div>
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
        </div>      </section>

      {/* Specific Threats We Detect */}
      <section className="bg-slate-50 py-16 border-t border-slate-100">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-slate-900">Threats We Actually Detect</h2>
            <p className="text-slate-700 max-w-3xl mx-auto">
              Our system specializes in identifying real threats targeting Filipinos, not generic warnings. Here's what we actually analyze and detect:
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
              <div className="text-3xl mb-3">💰</div>
              <h3 className="font-bold text-lg mb-2 text-slate-900">Financial Fraud</h3>
              <p className="text-slate-700 text-sm leading-relaxed">
                GCash/Maya fake notifications, investment scams, loan fraud, fake banking messages, and financial app impersonation targeting Filipino users.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
              <div className="text-3xl mb-3">🏛️</div>
              <h3 className="font-bold text-lg mb-2 text-slate-900">Government Impersonation</h3>
              <p className="text-slate-700 text-sm leading-relaxed">
                Fake SSS, PhilHealth, BIR, DTI messages, fraudulent government announcements, and official agency spoofing attempts.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
              <div className="text-3xl mb-3">🌏</div>
              <h3 className="font-bold text-lg mb-2 text-slate-900">OFW Targeting Scams</h3>
              <p className="text-slate-700 text-sm leading-relaxed">
                Remittance fraud, fake job offers abroad, OFW assistance scams, and exploitation targeting overseas Filipino workers and their families.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
              <div className="text-3xl mb-3">🎣</div>
              <h3 className="font-bold text-lg mb-2 text-slate-900">Phishing & Identity Theft</h3>
              <p className="text-slate-700 text-sm leading-relaxed">
                Fake login pages, credential harvesting, personal data collection scams, and identity verification frauds targeting Filipino accounts.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
              <div className="text-3xl mb-3">📱</div>
              <h3 className="font-bold text-lg mb-2 text-slate-900">Voice & Audio Scams</h3>
              <p className="text-slate-700 text-sm leading-relaxed">
                Phone call frauds, voice message scams, AI-generated voice impersonation, and audio-based manipulation targeting Filipinos.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
              <div className="text-3xl mb-3">🔗</div>
              <h3 className="font-bold text-lg mb-2 text-slate-900">Malicious Links & Sites</h3>
              <p className="text-slate-700 text-sm leading-relaxed">
                Suspicious websites, malware distribution, fake shopping sites, and dangerous downloads disguised as legitimate Filipino services.
              </p>
            </div>
          </div>          <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-200 shadow-lg">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-3 text-blue-900">What Makes Us Different</h3>
              <p className="text-blue-700 max-w-2xl mx-auto">
                Our approach focuses on education and understanding, not fear-based warnings
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-green-200">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-green-600 text-xl font-bold">✅</span>
                  </div>
                  <h4 className="text-xl font-bold text-green-800">What We Do</h4>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-3 mt-1">•</span>
                    <span className="text-gray-700">Research content purpose before judging</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-3 mt-1">•</span>
                    <span className="text-gray-700">Understand user intent and questions</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-3 mt-1">•</span>
                    <span className="text-gray-700">Provide educational explanations</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-3 mt-1">•</span>
                    <span className="text-gray-700">Focus on actual Filipino threat patterns</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-3 mt-1">•</span>
                    <span className="text-gray-700">Give context-specific safety advice</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-sm border border-red-200">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-red-600 text-xl font-bold">❌</span>
                  </div>
                  <h4 className="text-xl font-bold text-red-800">What We Don't Do</h4>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="text-red-500 mr-3 mt-1">•</span>
                    <span className="text-gray-700">Make assumptions based on keywords</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-3 mt-1">•</span>
                    <span className="text-gray-700">Give generic "be careful" warnings</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-3 mt-1">•</span>
                    <span className="text-gray-700">Flag legitimate content as threats</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-3 mt-1">•</span>
                    <span className="text-gray-700">Ignore cultural and linguistic context</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-3 mt-1">•</span>
                    <span className="text-gray-700">Provide one-size-fits-all responses</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="text-center mt-8">
              <div className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-full">
                <span className="mr-2">🎯</span>
                <span className="font-semibold">Smart Analysis, Not Fear-Based Warnings</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Cyber Safety Posts */}
      <section className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold mb-8 text-center">Facebook Cyber Security Advisories</h3>
          
          {/* Facebook Post Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Sample Facebook Post Card 1 */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">f</span>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-800">RICTMD MIMAROPA</h4>
                  <p className="text-xs text-slate-500">Password security tips</p>
                </div>
              </div>
              <p className="text-sm text-slate-700 mb-3">
                🔐 Password Security: Use strong, unique passwords for each account. Enable two-factor authentication whenever possible to add an extra layer of protection.
              </p>
              <a href="https://www.facebook.com/rictmd.mimaropa" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="text-blue-600 text-xs hover:underline">
                View on Facebook →
              </a>
            </div>

            {/* Sample Facebook Post Card 2 */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">f</span>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-800">RACU MIMAROPA</h4>
                  <p className="text-xs text-slate-500">Online shopping safety</p>
                </div>
              </div>
              <p className="text-sm text-slate-700 mb-3">
                🛒 Safe Online Shopping: Only buy from reputable websites with secure payment methods. Look for HTTPS and verified seller badges before making purchases.
              </p>
              <a href="https://www.facebook.com/racu.mimaropa" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="text-blue-600 text-xs hover:underline">
                View on Facebook →
              </a>
            </div>            {/* Sample Facebook Post Card 3 */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">f</span>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-800">Anti Cybercrime Unit</h4>
                  <p className="text-xs text-slate-500">Social media protection</p>
                </div>
              </div>
              <p className="text-sm text-slate-700 mb-3">
                📲 Social Media Safety: Be cautious about friend requests from strangers. Limit personal information sharing and review your privacy settings regularly.
              </p>
              <a href="https://www.facebook.com/homeofecowarriors" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="text-blue-600 text-xs hover:underline">
                View on Facebook →
              </a>
            </div>

            {/* Sample Facebook Post Card 4 */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">f</span>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-800">RICTMD MIMAROPA</h4>
                  <p className="text-xs text-slate-500">Phishing awareness</p>
                </div>
              </div>
              <p className="text-sm text-slate-700 mb-3">
                ⚠️ Phishing Alert: Never click suspicious links or download attachments from unknown senders. Always verify the sender's identity before taking any action.
              </p>
              <a href="https://www.facebook.com/rictmd.mimaropa" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="text-blue-600 text-xs hover:underline">
                View on Facebook →
              </a>
            </div>

            {/* Sample Facebook Post Card 5 */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">f</span>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-800">RACU MIMAROPA</h4>
                  <p className="text-xs text-slate-500">Banking security</p>
                </div>
              </div>
              <p className="text-sm text-slate-700 mb-3">
                💳 Banking Safety: Never share your OTP, PIN, or banking credentials with anyone. Banks will never ask for these details via email or phone.
              </p>
              <a href="https://www.facebook.com/racu.mimaropa" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="text-blue-600 text-xs hover:underline">
                View on Facebook →
              </a>
            </div>            {/* Sample Facebook Post Card 6 */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">f</span>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-800">Anti Cybercrime Unit</h4>
                  <p className="text-xs text-slate-500">WiFi security</p>
                </div>
              </div>
              <p className="text-sm text-slate-700 mb-3">
                📶 WiFi Safety: Avoid using public WiFi for sensitive activities like online banking. Use a VPN when connecting to unsecured networks.
              </p>
              <a href="https://www.facebook.com/homeofecowarriors" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="text-blue-600 text-xs hover:underline">
                View on Facebook →
              </a>
            </div>
          </div>
        </div>
      </section>      {/* Mission Statement Banner */}
      <section className="bg-gradient-to-r from-blue-700 to-blue-800 py-16">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
              Smart Cybersecurity Education for Every Filipino
            </h2>            <p className="text-blue-100 text-lg md:text-xl mb-4 leading-relaxed">
              CyberSafe 4B helps Filipinos understand digital threats through intelligent analysis that researches content purpose, provides educational explanations, and teaches threat recognition skills - not just generic warnings.
            </p>
            <div className="mt-8">
              <a 
                href="/analysis" 
                className="inline-flex items-center bg-white text-blue-700 font-semibold px-8 py-3 rounded-lg shadow-lg hover:bg-blue-50 transition-all"
              >
                <span className="mr-2">🎓</span>
                Learn While You Analyze
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Logo and Description */}
            <div className="col-span-1 md:col-span-2">            <div className="flex items-center space-x-4 mb-4">
                <Image 
                  src="/banner.jpg" 
                  alt="MIMAROPA Regional Logos" 
                  width={180} 
                  height={55} 
                  className="h-12 w-auto object-contain"
                />
                <span className="text-gray-400 text-3xl font-light">|</span>                <span className="text-3xl font-bold tracking-tight">CyberSafe 4B</span>
              </div>              <p className="text-slate-300 mb-4 max-w-md">
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
            </div>            {/* Contact Info */}
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
              </ul>              {/* Official Facebook Pages */}
              <div className="mt-6">
                <h5 className="font-semibold mb-3 text-white">Official Facebook Pages</h5>
                <ul className="space-y-2 text-slate-300 text-sm">
                  <li className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-600 rounded-sm flex items-center justify-center">
                      <span className="text-white text-xs font-bold">f</span>
                    </div>
                    <a href="https://www.facebook.com/rictmd.mimaropa" 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="hover:text-blue-400 transition-colors">
                      RICTMD MIMAROPA
                    </a>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-600 rounded-sm flex items-center justify-center">
                      <span className="text-white text-xs font-bold">f</span>
                    </div>
                    <a href="https://www.facebook.com/racu.mimaropa" 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="hover:text-blue-400 transition-colors">
                      RACU MIMAROPA
                    </a>
                  </li>                  <li className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-600 rounded-sm flex items-center justify-center">
                      <span className="text-white text-xs font-bold">f</span>
                    </div>
                    <a href="https://www.facebook.com/homeofecowarriors" 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="hover:text-blue-400 transition-colors">
                      Police Regional Office Mimaropa
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>          {/* Bottom Bar */}
          <div className="border-t border-slate-700 mt-8 pt-8">
            <div className="text-center">
              <div className="text-slate-400 text-sm mb-2">
                © 2025 CyberSafe 4B - Police Regional Office Mimaropa. All rights reserved.
              </div>              <div className="text-sm text-slate-600 mb-4">
                Made with <span className="text-red-500">❤</span> by <a href="https://pinesprojects.hashnode.dev" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 transition-colors">Pinesprojects</a>
              </div>              <div className="flex justify-center space-x-4">
                {/* Government and Security Organization Logos */}
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 hover:scale-110 transition-all duration-300 cursor-pointer shadow-lg" title="Philippine National Police">
                  <span className="text-white text-xs font-bold">PNP</span>
                </div>
                <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 hover:scale-110 transition-all duration-300 cursor-pointer shadow-lg" title="CyberSafe 4B">
                  <span className="text-white text-xs font-bold">4B</span>
                </div>
                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center hover:bg-green-700 hover:scale-110 transition-all duration-300 cursor-pointer shadow-lg" title="ICT Division">
                  <span className="text-white text-xs font-bold">ICT</span>
                </div>
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center hover:bg-purple-700 hover:scale-110 transition-all duration-300 cursor-pointer shadow-lg" title="Cybersecurity Shield">
                  <span className="text-white text-lg">🛡️</span>
                </div>
                <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center hover:bg-orange-700 hover:scale-110 transition-all duration-300 cursor-pointer shadow-lg" title="Republic of the Philippines">
                  <span className="text-white text-lg">🇵🇭</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
