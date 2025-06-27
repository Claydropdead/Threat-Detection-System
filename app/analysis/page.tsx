"use client"; // Add this directive for client-side interactivity

import Link from 'next/link';
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import TermsAndConditionsModal from "../components/TermsAndConditionsModal";
import ConsentManager from "../components/ConsentManager";
import { hasUserConsent } from "../utils/consentManager";
import { ThreatDetectionResult } from './interfaces';
import ResultsDisplay from './ResultsDisplay';

export default function Home() {
  const [threatContent, setThreatContent] = useState("");
  const [analysisResult, setAnalysisResult] = useState<ThreatDetectionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  
  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Add tab state management
  const [activeTab, setActiveTab] = useState<'text' | 'image' | 'voice'>('text');

  // Add state for form completion tracking
  const [hasContent, setHasContent] = useState({
    text: false,
    image: false,
    voice: false
  });

  // Feedback form state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    type: 'general' // general, bug, feature, improvement
  });
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  // Anti-spam timer state
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [cooldownLoaded, setCooldownLoaded] = useState(false);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update content tracking
  useEffect(() => {
    setHasContent({
      text: threatContent.trim().length > 0,
      image: !!imagePreview,
      voice: !!audioBlob
    });
  }, [threatContent, imagePreview, audioBlob]);
  
  // Initialize cooldown from localStorage on mount
  useEffect(() => {
    const storedCooldown = localStorage.getItem('threatAnalysisCooldown');
    if (storedCooldown) {
      const cooldownData = JSON.parse(storedCooldown);
      const currentTime = Date.now();
      const remainingSeconds = Math.max(0, Math.ceil((cooldownData.endTime - currentTime) / 1000));
      
      if (remainingSeconds > 0) {
        setCooldownSeconds(remainingSeconds);
        startCooldownTimer(remainingSeconds);
      } else {
        // Cooldown has expired, remove from localStorage
        localStorage.removeItem('threatAnalysisCooldown');
      }
    }
    setCooldownLoaded(true);
  }, []);
  
  // Start cooldown timer without storing to localStorage (used for resuming)
  const startCooldownTimer = (seconds: number) => {
    const countdown = () => {
      setCooldownSeconds(prev => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) {
            clearInterval(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
          }
          // Remove from localStorage when cooldown ends
          localStorage.removeItem('threatAnalysisCooldown');
          return 0;
        }
        return prev - 1;
      });
    };
    
    cooldownTimerRef.current = setInterval(countdown, 1000);
  };
  
  // Anti-spam cooldown function
  const startCooldown = (seconds: number = 30) => {
    const endTime = Date.now() + (seconds * 1000);
    
    // Store cooldown info in localStorage
    localStorage.setItem('threatAnalysisCooldown', JSON.stringify({
      endTime: endTime,
      duration: seconds
    }));
    
    setCooldownSeconds(seconds);
    startCooldownTimer(seconds);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, []);
  
  // Check if user has previously accepted terms
  useEffect(() => {
    // Check if the user has consent using our new system
    const termsAccepted = hasUserConsent('termsAndConditions');
    
    // Also check the legacy formats for backward compatibility
    const legacyTermsAccepted = 
      localStorage.getItem('threatShieldTermsAccepted') === 'true' ||
      localStorage.getItem('scamDetectTermsAccepted') === 'true';
    
    if (termsAccepted || legacyTermsAccepted) {
      setHasAcceptedTerms(true);
    } else {
      setShowTermsModal(true);
    }
  }, []);
  
  // Handle accepting terms
  const handleAcceptTerms = () => {
    // The saveUserConsent is now called inside the TermsAndConditionsModal component
    // But we'll keep the legacy format for backward compatibility
    localStorage.setItem('threatShieldTermsAccepted', 'true');
    setHasAcceptedTerms(true);
    setShowTermsModal(false);
  };
  
  // Handle closing terms (declining)
  const handleCloseTerms = () => {
    setShowTermsModal(false);
  };
  
  // Handle voice recording
  const startRecording = async () => {
    if (!hasAcceptedTerms) {
      setShowTermsModal(true);
      return;
    }
    
    try {
      // Clear previous recording data
      setAudioBlob(null);
      setAudioURL(null);
      setRecordingDuration(0);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        // Create audio blob from chunks
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        
        // Create URL for audio playback
        const audioURL = URL.createObjectURL(audioBlob);
        setAudioURL(audioURL);
        
        // Stop all tracks in the stream
        stream.getTracks().forEach(track => track.stop());
      };
      
      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      
      // Start timer to track recording duration
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setPermissionDenied(true);
      setError("Microphone access denied. Please grant permission to use voice analysis.");
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Clear recording timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };
  
  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Clear recording timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      // Clear audio data
      setAudioBlob(null);
      setAudioURL(null);
      setRecordingDuration(0);
    }
  };
  
  const removeAudio = () => {
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
    }
    setAudioBlob(null);
    setAudioURL(null);
    setRecordingDuration(0);
  };
  
  // Format seconds to mm:ss
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove selected image
  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };
  const handleDetectScam = async () => {
    // Check for cooldown
    if (cooldownSeconds > 0) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      // Prepare request body with text content (can be empty if image or audio is provided)
      const requestBody: { content: string; imageBase64?: string; audioBase64?: string } = {
        content: threatContent.trim(),
      };

      // If an image is selected, add its base64 data
      if (selectedImage && imagePreview) {
        // Extract the base64 data part (remove the "data:image/jpeg;base64," prefix)
        const base64Data = imagePreview.split(",")[1];
        requestBody.imageBase64 = base64Data;
      }
      
      // If audio is recorded, add its base64 data
      if (audioBlob) {
        // Convert audio blob to base64
        const audioBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = reader.result as string;
            // Extract the base64 part without the prefix
            const base64Content = base64data.split(',')[1];
            resolve(base64Content);
          };
          reader.readAsDataURL(audioBlob);
        });
        
        requestBody.audioBase64 = audioBase64;
      }

      const response = await fetch("/api/detect-threat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to analyze content");
      }

      const result: ThreatDetectionResult = await response.json();
      setAnalysisResult(result);
      
      // Start cooldown after successful analysis to prevent spam
      startCooldown(30);
      
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      // Start a shorter cooldown on error to prevent spam
      startCooldown(15);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle feedback form submission
  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingFeedback(true);

    try {
      const response = await fetch('/api/send-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackForm),
      });

      if (!response.ok) {
        throw new Error('Failed to send feedback');
      }

      setFeedbackSuccess(true);
      setFeedbackForm({
        name: '',
        email: '',
        subject: '',
        message: '',
        type: 'general'
      });

      // Auto close modal after success
      setTimeout(() => {
        setShowFeedbackModal(false);
        setFeedbackSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Feedback submission error:', error);
      alert('Failed to send feedback. Please try again.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      {/* Terms and Conditions Modal */}
      <TermsAndConditionsModal 
        isOpen={showTermsModal} 
        onAccept={handleAcceptTerms} 
        onClose={handleCloseTerms} 
      />

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-slate-900 flex items-center">
                  <span className="mr-2">💬</span>
                  Send Feedback
                </h3>
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              {feedbackSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-green-800 mb-2">Feedback Sent!</h4>
                  <p className="text-sm text-green-600">Thank you for your feedback. We'll review it soon.</p>
                </div>
              ) : (
                <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Feedback Type
                    </label>
                    <select
                      value={feedbackForm.type}
                      onChange={(e) => setFeedbackForm({...feedbackForm, type: e.target.value})}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      required
                    >
                      <option value="general">General Feedback</option>
                      <option value="bug">Bug Report</option>
                      <option value="feature">Feature Request</option>
                      <option value="improvement">Improvement Suggestion</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={feedbackForm.name}
                      onChange={(e) => setFeedbackForm({...feedbackForm, name: e.target.value})}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={feedbackForm.email}
                      onChange={(e) => setFeedbackForm({...feedbackForm, email: e.target.value})}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      placeholder="your.email@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={feedbackForm.subject}
                      onChange={(e) => setFeedbackForm({...feedbackForm, subject: e.target.value})}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      placeholder="Brief subject line"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Message
                    </label>
                    <textarea
                      rows={4}
                      value={feedbackForm.message}
                      onChange={(e) => setFeedbackForm({...feedbackForm, message: e.target.value})}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
                      placeholder="Please describe your feedback in detail..."
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowFeedbackModal(false)}
                      className="flex-1 px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                      disabled={isSubmittingFeedback}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingFeedback || !feedbackForm.subject || !feedbackForm.message}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    >
                      {isSubmittingFeedback ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Sending...
                        </>
                      ) : (
                        'Send Feedback'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Bar - Aligned with landing page */}
      <header className="w-full border-b border-slate-100 bg-white sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center space-x-4 hover:opacity-80 transition-opacity duration-300">
            <Image 
              src="/banner.jpg" 
              alt="MIMAROPA Regional Logos" 
              width={200} 
              height={60} 
              className="h-14 w-auto object-contain"
            />
            <span className="text-gray-400 text-3xl font-light">|</span>
            <span className="text-3xl font-bold tracking-tight text-blue-900">CyberSafe 4B</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-8 text-base font-medium">
            <Link href="/" className="hover:text-blue-600 transition-colors">
              Home
            </Link>
            <Link href="/analysis" className="text-blue-600 font-semibold">
              Analyze Content
            </Link>
            <button 
              onClick={() => setShowFeedbackModal(true)}
              className="hover:text-blue-600 transition-colors flex items-center"
              title="Send Feedback"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
              </svg>
              Feedback
            </button>
            <button 
              onClick={() => setShowTermsModal(true)}
              className="hover:text-blue-600 transition-colors flex items-center"
              title="View Privacy & Terms"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Terms
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        {/* Hero Section - Aligned with landing page */}
        <section className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight text-slate-900">
            CyberSafe 4B Analysis
          </h1>
          <p className="text-lg md:text-xl text-slate-700 max-w-3xl mx-auto mb-8 leading-relaxed">
            Protect yourself from evolving digital threats with advanced AI analysis. Get instant risk assessments for trending 
            attacks in messages, emails, websites, and voice communications.
          </p>
        </section>

        {/* Main Form Container - Aligned with landing page style */}
        <main className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
            {/* Form Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-6">
              <h2 className="text-3xl font-bold text-white flex items-center">
                <span className="mr-3 text-4xl">🔍</span>
                Threat Analysis
              </h2>
              <p className="text-blue-100 mt-2 text-lg">Upload text, images, or voice recordings to detect trending threats with AI-powered analysis</p>
            </div>

            {/* Form Content */}
            <div className="p-8 md:p-10 bg-slate-50">
              {/* Consent Manager */}
              <ConsentManager />
              
              <div className="space-y-8">
                {/* Tab Navigation */}
                <div className="flex justify-center mb-6">
                  <button
                    onClick={() => setActiveTab('text')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2 ${
                      activeTab === 'text' 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                    disabled={isLoading}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm2-1a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1V5a1 1 0 00-1-1H4z" clipRule="evenodd" />
                    </svg>
                    <span>Text Analysis</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('image')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2 ${
                      activeTab === 'image' 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                    disabled={isLoading}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm2-1a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1V5a1 1 0 00-1-1H4z" clipRule="evenodd" />
                    </svg>
                    <span>Image Analysis</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('voice')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2 ${
                      activeTab === 'voice' 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                    disabled={isLoading}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a2 2 0 00-2 2v10a2 2 0 004 0V5a2 2 0 00-2-2zm-8 2a8 8 0 1116 0 8 8 0 01-16 0z" clipRule="evenodd" />
                    </svg>
                    <span>Voice Analysis</span>
                  </button>
                </div>

                {/* Active Tab Content */}
                <div className="space-y-8">
                  {/* Text Input Section - Active when text tab is selected */}
                  {activeTab === 'text' && (
                    <div className="space-y-4">
                      <label
                        htmlFor="threatContent"
                        className="block text-lg font-semibold text-slate-800 mb-3"
                      >
                        📝 Enter content to analyze
                      </label>
                      <p className="text-sm text-slate-600 mb-4">
                        Paste suspicious SMS messages, emails, or any text content you want to analyze for potential threats.
                      </p>
                      
                      <div className="relative">
                        <textarea
                          id="threatContent"
                          name="threatContent"
                          rows={7}
                          className={`w-full p-4 border-2 ${
                            !hasAcceptedTerms 
                              ? 'border-yellow-300 bg-yellow-50' 
                              : 'border-slate-300 focus:border-blue-500 bg-white'
                          } rounded-xl shadow-sm transition-all duration-200 focus:ring-4 focus:ring-blue-100 text-base placeholder-slate-500 resize-none hover:shadow-md`}
                          placeholder={!hasAcceptedTerms 
                            ? "⚠️ Please accept the terms and conditions first..." 
                            : (imagePreview 
                              ? "💡 Optional: Add text for analysis alongside the image..." 
                              : "📱 Paste suspicious text here (SMS, email, message, etc.)...\n\nExample:\n'ALERT: New login detected from unknown location. Secure your account: unknown-security.com'"
                            )}
                          value={threatContent}
                          onChange={(e) => setThreatContent(e.target.value)}
                          disabled={isLoading || !hasAcceptedTerms}
                          onClick={!hasAcceptedTerms ? () => setShowTermsModal(true) : undefined}
                          maxLength={5000}
                          aria-describedby="content-help"
                        />
                        
                        {/* Character Counter */}
                        <div className="absolute bottom-3 right-3 text-xs text-slate-500 bg-white/80 px-2 py-1 rounded">
                          {threatContent.length}/5000
                        </div>
                      </div>
                      
                      <div id="content-help" className="flex items-start space-x-2 text-sm text-slate-600">
                        <svg className="w-4 h-4 mt-0.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span>
                          Tip: The AI works best with complete messages. Include URLs, phone numbers, and any suspicious elements for accurate analysis.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Image Upload Section - Active when image tab is selected */}
                  {activeTab === 'image' && (
                    <div className="space-y-4">
                      <label className="block text-lg font-semibold text-slate-800 mb-3">
                        🖼️ Upload image for analysis (optional)
                      </label>
                      <p className="text-sm text-slate-600 mb-4">
                        Upload screenshots of suspicious messages, fake websites, or any images that might contain scam content.
                      </p>
                      
                      <div className="mt-1 flex flex-col space-y-4">
                        {!imagePreview ? (
                          <div 
                            onClick={!hasAcceptedTerms ? () => setShowTermsModal(true) : undefined}
                            className={`flex flex-col items-center justify-center w-full h-40 border-2 ${
                              !hasAcceptedTerms 
                                ? 'border-yellow-300 bg-yellow-50' 
                                : 'border-slate-300 hover:border-blue-400 bg-white'
                            } border-dashed rounded-xl ${hasAcceptedTerms ? 'cursor-pointer hover:bg-slate-50' : ''} transition-all duration-200 relative group`}
                          >
                            {hasAcceptedTerms ? (
                              <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                  <div className="p-3 bg-blue-100 rounded-full mb-4 group-hover:bg-blue-200 transition-colors">
                                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                                    </svg>
                                  </div>
                                  <p className="mb-2 text-base font-medium text-slate-700">
                                    <span className="font-bold text-blue-600">Click to upload</span> or drag and drop
                                  </p>
                                  <p className="text-sm text-slate-500">PNG, JPG, JPEG (MAX. 5MB)</p>
                                </div>
                                <input 
                                  id="dropzone-file" 
                                  type="file" 
                                  className="hidden" 
                                  accept="image/png,image/jpeg,image/jpg"
                                  onChange={handleImageChange}
                                  disabled={isLoading}
                                />
                              </label>
                            ) : (
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <div className="p-3 bg-yellow-100 rounded-full mb-4">
                                  <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                                  </svg>
                                </div>
                                <p className="mb-2 text-base font-medium text-yellow-700">
                                  <span className="font-bold">Accept terms to upload images</span>
                                </p>
                                <p className="text-sm text-yellow-600">Terms & conditions required</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="relative bg-slate-50 rounded-xl p-4 border border-slate-200">
                            <div className="relative w-full h-64 border border-slate-300 rounded-lg overflow-hidden bg-white">
                              {/* Using img tag is acceptable for user-uploaded images with dynamic sources */}
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={imagePreview}
                                alt="Preview"
                                className="w-full h-full object-contain"
                              />
                              <button
                                type="button"
                                onClick={handleRemoveImage}
                                className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                                disabled={isLoading}
                                title="Remove image"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                            <p className="mt-3 text-sm text-slate-600 flex items-center">
                              <span className="mr-2">✅</span>
                              Image uploaded successfully. Add optional text above for a more comprehensive analysis.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Voice Recording Section - Active when voice tab is selected */}
                  {activeTab === 'voice' && (
                    <div className="space-y-4">
                      <label className="block text-lg font-semibold text-slate-800 mb-3">
                        🎤 Record voice for analysis (optional)
                      </label>
                      <p className="text-sm text-slate-600 mb-4">
                        Record suspicious voice messages, calls, or conversations for AI-powered scam detection analysis.
                      </p>
                      
                      <div className="flex flex-col space-y-4">
                        {audioURL ? (
                          <div className="relative bg-slate-50 rounded-xl p-4 border border-slate-200">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 mr-4">
                                <p className="text-sm text-slate-600 mb-1 flex items-center">
                                  <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-2"></span>
                                  Recorded Audio
                                </p>
                                <audio 
                                  controls 
                                  className="w-full h-12 bg-white rounded-lg"
                                  src={audioURL}
                                />
                                <p className="text-xs text-slate-500 mt-2">
                                  Tap play to review before submitting
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={removeAudio}
                                className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                                disabled={isLoading}
                                title="Remove audio"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                            <p className="mt-3 text-sm text-slate-600 flex items-center">
                              <span className="mr-2">✅</span>
                              Audio recorded successfully. You can add text or images for a comprehensive analysis.
                            </p>
                          </div>
                        ) : permissionDenied ? (
                          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-5">
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0">
                                <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                                </svg>
                              </div>
                              <div className="flex-1">
                                <h3 className="font-medium text-yellow-800">Microphone access denied</h3>
                                <p className="mt-1 text-sm text-yellow-700">
                                  Please grant microphone access in your browser to use voice recording.
                                </p>
                                <button
                                  onClick={startRecording}
                                  className="mt-3 text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
                                >
                                  Try again
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center w-full h-44 border-2 border-slate-300 rounded-xl bg-white transition-all duration-200 relative group">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <div className="p-3 bg-blue-100 rounded-full mb-4 group-hover:bg-blue-200 transition-colors">
                                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
                                </svg>
                              </div>
                              <p className="mb-2 text-base font-medium text-slate-700">
                                <span className="font-bold text-blue-600">Click to record</span> your voice
                              </p>
                              <p className="text-sm text-slate-500">Record up to 5 minutes</p>
                            </div>
                            
                            {/* Recording Controls */}
                            {isRecording ? (
                              <div className="absolute inset-0 bg-black/5 backdrop-blur-sm flex flex-col items-center justify-center p-6 rounded-xl">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
                                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
                                  </svg>
                                </div>
                                <p className="mb-4 text-lg font-semibold text-slate-800">
                                  Recording... {formatDuration(recordingDuration)}
                                </p>
                                <div className="w-full bg-slate-200 rounded-full h-2.5 mb-6">
                                  <div className="bg-red-600 h-2.5 rounded-full" style={{ width: `${Math.min(recordingDuration / 300 * 100, 100)}%` }}></div>
                                </div>
                                <div className="flex items-center space-x-4 w-full">
                                  <button
                                    onClick={stopRecording}
                                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                                    disabled={isLoading}
                                  >
                                    <div className="flex items-center justify-center">
                                      <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                      </svg>
                                      Stop Recording
                                    </div>
                                  </button>
                                  <button
                                    onClick={cancelRecording}
                                    className="flex-1 bg-slate-300 text-slate-700 font-semibold py-3 px-4 rounded-lg shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                                    disabled={isLoading}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={startRecording}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                                disabled={isLoading}
                              >
                                <div className="flex items-center justify-center">
                                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
                                  </svg>
                                  Start Recording
                                </div>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="button"
                    onClick={hasAcceptedTerms ? handleDetectScam : () => setShowTermsModal(true)}
                    disabled={isLoading || (!threatContent.trim() && !imagePreview && !audioBlob) || !hasAcceptedTerms || cooldownSeconds > 0 || !cooldownLoaded}
                    className={`w-full font-bold py-4 px-6 rounded-xl shadow-lg transition-all duration-200 focus:outline-none focus:ring-4 text-lg ${
                      hasAcceptedTerms && (threatContent.trim() || imagePreview || audioBlob) && !isLoading && cooldownSeconds === 0 && cooldownLoaded
                        ? 'bg-blue-600 hover:bg-blue-700 text-white transform hover:scale-[1.02] focus:ring-blue-300'
                        : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {!cooldownLoaded ? (
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading...
                      </div>
                    ) : isLoading ? (
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {audioBlob ? 'Analyzing voice recording...' : 'Analyzing with AI...'}
                      </div>
                    ) : cooldownSeconds > 0 ? (
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Wait {cooldownSeconds}s
                      </div>
                    ) : hasAcceptedTerms ? (
                      <div className="flex items-center justify-center">
                        <span className="mr-2">🔍</span>
                        Analyze
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <span className="mr-2">⚠️</span>
                        Accept Terms to Analyze
                      </div>
                    )}
                  </button>
                  
                  {!hasAcceptedTerms && (
                    <div className="text-center bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-700">
                        <span className="font-semibold">⚠️ Terms Required:</span> You must accept our terms and conditions before using this feature.{' '}
                        <button 
                          onClick={() => setShowTermsModal(true)} 
                          className="font-bold text-yellow-800 hover:text-yellow-900 underline transition-colors"
                        >
                          View Terms & Conditions
                        </button>
                      </p>
                    </div>
                  )}

                  {/* Error Display */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-6">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-lg font-semibold mb-2">❌ Analysis Error</h3>
                          <p className="text-sm">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Results Display */}
                  {analysisResult && !error && (
                    <ResultsDisplay 
                      analysisResult={analysisResult} 
                      threatContent={threatContent} 
                    />
                  )}

                  {/* Awaiting Analysis State */}
                  {!isLoading && !analysisResult && !error && (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
                      <div className="max-w-md mx-auto">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-700 mb-2">
                          {threatContent.trim() || imagePreview || audioBlob ? "Ready to Analyze" : "Upload Content to Start"}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {threatContent.trim() || imagePreview || audioBlob 
                            ? "Click the analyze button to start AI-powered scam detection" 
                            : "Add text, upload an image, or record a voice message to begin scam analysis"
                          }
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer - Aligned with landing page */}
        <footer className="mt-16 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm p-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-4 mb-6">
              <Image 
                src="/banner.jpg" 
                alt="MIMAROPA Regional Logos" 
                width={160} 
                height={48} 
                className="h-12 w-auto object-contain"
              />
              <span className="text-gray-400 text-2xl font-light">|</span>
              <span className="text-2xl font-bold text-blue-900">CyberSafe 4B</span>
            </div>
            <p className="text-sm text-slate-600 mb-2">
              &copy; 2025 CyberSafe 4B. All rights reserved.
            </p>
            <p className="text-sm text-slate-600 mb-4">
              Made with <span className="text-red-500">❤</span> by <a href="https://pinesprojects.hashnode.dev" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 transition-colors">Pinesprojects</a>
            </p>
          </div>
        </footer>

        {/* Floating Feedback Button */}
        {!showFeedbackModal && (
          <button
            onClick={() => setShowFeedbackModal(true)}
            className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 z-40 group"
            title="Send Feedback"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
            </svg>
            <span className="absolute right-full mr-3 top-1/2 transform -translate-y-1/2 bg-slate-900 text-white text-sm px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
              Send Feedback
            </span>
          </button>
        )}
      </div>
    </div>
  );
}


