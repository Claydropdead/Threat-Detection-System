"use client";

// Defines interfaces for scam indicator data structure
export interface IndicatorData {
  patterns: string[];
  severity: number;
  detected: boolean;
  confidence?: number;
  matches?: number;
}

// Interface for pattern match data
export interface IndicatorMatch {
  severity: number;
  confidence: number;
  matches: number;
}

// Type for a collection of indicators
export type CommonIndicators = {
  [key: string]: IndicatorData;
}

// Define interfaces for the expected response structure from the API
export interface ApiReportAgency {
  name: string;
  url: string; // Changed from link to url, to match API
  description?: string; // Optional description
}

export interface ApiComplaintFilingInfo {
  introduction: string;
  agencies: ApiReportAgency[];
}

// Interface for Audio Quality Assessment
export interface AudioQualityAssessment {
  quality?: string;
  issues?: string[];
  enhancementSuggestions?: string;
}

// Interface for Audio Content Details
export interface AudioContentDetails {
  format?: string;
  duration?: string;
  speakers?: number;
  languages?: string[];
  contentSummary?: string;
}

// Interface for Google Search Results
export interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
  formattedUrl: string;
}

// Interface for Fact-Check Results
export interface FactCheckResult {
  claim: string;
  keywords: string[];
  supportingArticles: GoogleSearchResult[];
  contradictingArticles: GoogleSearchResult[];
  factCheckSources: GoogleSearchResult[];
  credibilityScore: number; // 0-100, higher means more credible
  misinformationRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  summary: string;
}

export interface ScamDetectionResult {
  // Fields directly from API
  isScam: boolean;
  probability: number; // number, 0-100. Was scam_probability (string)
  confidence: string;  // "Low", "Medium", "High". Was ai_confidence
  explanation: string; // Was explanation_english
  riskLevel: string;   // "Low", "Medium", "High", "Very High". API provides this directly.
  advice: string;
  tutorialsAndTips: string[]; // Was how_to_avoid_scams
  complaintFilingInfo: ApiComplaintFilingInfo; // New structure, replaces where_to_report

  // Enhanced contextual fields for all content types (text, image, audio)
  status?: string; // Contextual display status that includes content type
  assessment?: string; // Assessment text that's contextually relevant to query
  contentType?: string; // Type of content analyzed (text, website, image, audio)
  riskSummary?: string; // Brief summary of risk findings
  indicators?: string[]; // Key risk indicators extracted from analysis
  detectedRiskCategories?: string[]; // Categories of risks detected
  contentPurpose?: string; // The purpose of the content being analyzed
  audienceTarget?: string; // Who the content is targeting
  audienceAnalysis?: string; // Detailed analysis of the target audience
  culturalContext?: string; // Cultural context, if relevant
  keyPoints?: string[]; // Key takeaways or points from the analysis
  
  // Fact-checking and misinformation detection
  factCheckResult?: FactCheckResult; // Results from Google Search fact-checking
  misinformationAnalysis?: string; // AI analysis of potential misinformation
  credibilityAssessment?: {
    score: number; // 0-100
    factors: string[]; // Factors affecting credibility
    verifiedClaims: string[]; // Claims that were verified
    unverifiedClaims: string[]; // Claims that couldn't be verified
    contradictedClaims: string[]; // Claims that were contradicted
  };
    // Analysis text from API - all treated as part of the unified content
  audioAnalysis?: string; // Audio content is analyzed using the same pipeline as text
  image_analysis?: string; // Image content is analyzed using the same pipeline as text
  extractedImageText?: string; // Text extracted from images via OCR for fact-checking
  // These fields are kept for backward compatibility with the API
  // but all content types (text, image, audio) now use the same risk calculation and indicator detection
  audioQualityAssessment?: AudioQualityAssessment; // Maintained for API compatibility
  audioContentVerification?: string; // Maintained for API compatibility
  contentDetails?: AudioContentDetails; // Maintained for API compatibility
  // Added back from previous version as per user request
  true_vs_false?: string;
}
