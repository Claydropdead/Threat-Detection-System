import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// API key is now expected to be in an environment variable
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// OCR function to extract text from images using Google Vision API
async function extractTextFromImage(imageBase64: string): Promise<string> {
  // OCR functionality removed - Gemini 2.0 can analyze image content directly
  console.log('📷 OCR functionality removed - using Gemini for image analysis');
  return '';
}

// Define available Gemini 2.0 models in order of preference
const GEMINI_MODELS = [
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash-exp',
  'gemini-2.0-flash', 
  'gemini-2.0'       
];

// Function to get Gemini API URL with the first available model
function getGeminiApiUrl(modelName: string): string {
  return GEMINI_API_KEY 
    ? `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}` 
    : '';
}

// Construct the URL only if the API key is present
// Updated to use gemini-2.0-flash model for improved performance and capabilities
const GEMINI_API_URL = getGeminiApiUrl(GEMINI_MODELS[0]);

// In-memory cache with TTL (Time To Live)
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class ResponseCache {
  private cache = new Map<string, CacheEntry>();
  private readonly defaultTTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private readonly maxCacheSize = 1000; // Maximum number of cached entries
  private readonly cleanupThreshold = 0.8; // Clean up when cache reaches 80% capacity
  private readonly cleanupBatchSize = 0.2; // Remove 20% of entries during cleanup
  private cacheHits = 0;
  private cacheMisses = 0;
  private operationCount = 0; // Track operations for deterministic cleanup timing

  // Generate a hash key for the query parameters
  private generateKey(content: string, imageBase64?: string, audioBase64?: string): string {
    const data = {
      content: content.trim(),
      hasImage: !!imageBase64,
      hasAudio: !!audioBase64,
      // Include hashes of binary data to detect differences without storing full data
      imageHash: imageBase64 ? crypto.createHash('sha256').update(imageBase64).digest('hex').substring(0, 16) : null,
      audioHash: audioBase64 ? crypto.createHash('sha256').update(audioBase64).digest('hex').substring(0, 16) : null
    };
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  // Check if cache entry is still valid
  private isValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }
  // Clean up expired entries and manage cache size deterministically
  private cleanup(): void {
    const now = Date.now();
    let removedExpired = 0;
    
    // First pass: Remove all expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= entry.ttl) {
        this.cache.delete(key);
        removedExpired++;
      }
    }
    
    console.log(`🧹 Removed ${removedExpired} expired entries from cache`);
    
    // Second pass: If cache is still over capacity, remove oldest entries
    if (this.cache.size > this.maxCacheSize) {
      const entries = Array.from(this.cache.entries());
      // Sort by timestamp (oldest first) for deterministic removal
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const entriesToRemove = this.cache.size - this.maxCacheSize;
      const removedEntries = entries.slice(0, entriesToRemove);
      
      removedEntries.forEach(([key]) => this.cache.delete(key));
      console.log(`🧹 Removed ${entriesToRemove} oldest entries to maintain cache size limit`);
    }
  }

  // Perform maintenance check - deterministic based on cache size and operation count
  private performMaintenanceCheck(): void {
    this.operationCount++;
    
    // Check if we need cleanup based on deterministic conditions
    const shouldCleanup = 
      this.cache.size >= Math.floor(this.maxCacheSize * this.cleanupThreshold) || // Cache is 80% full
      this.operationCount % 100 === 0; // Every 100 operations for regular maintenance
    
    if (shouldCleanup) {
      this.cleanup();
      console.log(`🧹 Deterministic cache cleanup performed (size: ${this.cache.size}/${this.maxCacheSize}, operations: ${this.operationCount})`);
    }
  }  // Get cached response
  get(content: string, imageBase64?: string, audioBase64?: string): any | null {
    const key = this.generateKey(content, imageBase64, audioBase64);
    const entry = this.cache.get(key);
    
    if (entry && this.isValid(entry)) {
      this.cacheHits++;
      console.log('Cache hit for query:', content.substring(0, 100) + '...');
      // Perform maintenance check on every cache operation
      this.performMaintenanceCheck();
      return entry.data;
    }
    
    this.cacheMisses++;
    if (entry) {
      // Remove expired entry
      this.cache.delete(key);
    }
    
    // Perform maintenance check on every cache operation
    this.performMaintenanceCheck();
    return null;
  }  // Store response in cache
  set(content: string, data: any, imageBase64?: string, audioBase64?: string, ttl?: number): void {
    const key = this.generateKey(content, imageBase64, audioBase64);
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    };
    
    this.cache.set(key, entry);
    const contentPreview = content.length > 100 ? content.substring(0, 100) + '...' : content;
    console.log('💾 Cached response for query:', contentPreview);
    
    // Perform deterministic maintenance check after every set operation
    this.performMaintenanceCheck();
  }
  // Get cache statistics
  getStats(): { size: number; maxSize: number; hitRate: number; totalRequests: number; hits: number; misses: number } {
    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRate = totalRequests > 0 ? (this.cacheHits / totalRequests) * 100 : 0;
    
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate: Number(hitRate.toFixed(2)),
      totalRequests,
      hits: this.cacheHits,
      misses: this.cacheMisses
    };
  }  // Clear cache manually
  clear(): void {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.operationCount = 0;
    console.log('Cache cleared and statistics reset');
  }

  // Reset statistics only
  resetStats(): void {
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.operationCount = 0;
    console.log('Cache statistics reset successfully');
  }
}

// Global cache instance
const responseCache = new ResponseCache();

// Rate Limiting System for Gemini Models
interface RateLimitEntry {
  requests: number;
  windowStart: number;
}

interface ModelRateLimit {
  requestsPerMinute: number;
  requestsPerDay: number;
  burstLimit: number; // Maximum requests in a 10-second burst
}

// Rate limits for different Gemini 2.0 models (based on Google's official limits)
const MODEL_RATE_LIMITS: Record<string, ModelRateLimit> = {
  'gemini-2.0-flash-lite': {
    requestsPerMinute: 15,    // Conservative limit for free tier
    requestsPerDay: 1500,     // Daily limit for free tier
    burstLimit: 5             // Burst protection
  },
  'gemini-2.0-flash-exp': {
    requestsPerMinute: 10,    // More conservative for experimental model
    requestsPerDay: 1000,     // Lower daily limit
    burstLimit: 3             // Stricter burst control
  },
  'gemini-2.0-flash': {
    requestsPerMinute: 15,    // Standard limit
    requestsPerDay: 1500,     // Standard daily limit
    burstLimit: 5             // Standard burst limit
  },
  'gemini-2.0': {
    requestsPerMinute: 10,    // More conservative for base model
    requestsPerDay: 1000,     // Lower daily limit
    burstLimit: 3             // Stricter burst control
  }
};

class RateLimiter {
  private perMinuteRequests = new Map<string, RateLimitEntry>();
  private perDayRequests = new Map<string, RateLimitEntry>();
  private burstRequests = new Map<string, RateLimitEntry>();
  private globalMinuteRequests = new Map<string, RateLimitEntry>();
  
  // Cleanup interval for old entries
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up old entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    const oneMinute = 60 * 1000;
    const oneDay = 24 * 60 * 60 * 1000;
    const tenSeconds = 10 * 1000;

    // Clean up per-minute entries older than 1 minute
    for (const [key, entry] of this.perMinuteRequests.entries()) {
      if (now - entry.windowStart > oneMinute) {
        this.perMinuteRequests.delete(key);
      }
    }

    // Clean up per-day entries older than 1 day
    for (const [key, entry] of this.perDayRequests.entries()) {
      if (now - entry.windowStart > oneDay) {
        this.perDayRequests.delete(key);
      }
    }

    // Clean up burst entries older than 10 seconds
    for (const [key, entry] of this.burstRequests.entries()) {
      if (now - entry.windowStart > tenSeconds) {
        this.burstRequests.delete(key);
      }
    }

    // Clean up global minute entries
    for (const [key, entry] of this.globalMinuteRequests.entries()) {
      if (now - entry.windowStart > oneMinute) {
        this.globalMinuteRequests.delete(key);
      }
    }
  }

  private getClientIdentifier(request: NextRequest): string {
    // Try to get the most reliable client identifier
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const clientIp = forwardedFor?.split(',')[0] || realIp || 'unknown';
    
    // Add user agent for additional uniqueness (but hash it for privacy)
    const userAgent = request.headers.get('user-agent') || '';
    const userAgentHash = crypto.createHash('sha256').update(userAgent).digest('hex').substring(0, 8);
    
    return `${clientIp}_${userAgentHash}`;
  }

  private updateCounter(map: Map<string, RateLimitEntry>, key: string, windowSize: number): number {
    const now = Date.now();
    const entry = map.get(key);

    if (!entry || now - entry.windowStart > windowSize) {
      // Start new window
      map.set(key, { requests: 1, windowStart: now });
      return 1;
    } else {
      // Increment existing window
      entry.requests++;
      return entry.requests;
    }
  }

  public async checkRateLimit(request: NextRequest, modelName: string): Promise<{
    allowed: boolean;
    remainingRequests: number;
    resetTime: number;
    limitType: string;
    retryAfter?: number;
  }> {
    const clientId = this.getClientIdentifier(request);
    const limits = MODEL_RATE_LIMITS[modelName];
    
    if (!limits) {
      console.warn(`⚠️ No rate limits defined for model: ${modelName}`);
      return { allowed: true, remainingRequests: 100, resetTime: Date.now() + 60000, limitType: 'none' };
    }

    const now = Date.now();
    
    // Check burst limit (10 seconds)
    const burstKey = `${clientId}_${modelName}_burst`;
    const burstRequests = this.updateCounter(this.burstRequests, burstKey, 10 * 1000);
    
    if (burstRequests > limits.burstLimit) {
      const entry = this.burstRequests.get(burstKey)!;
      const resetTime = entry.windowStart + 10 * 1000;
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime,
        limitType: 'burst',
        retryAfter: Math.ceil((resetTime - now) / 1000)
      };
    }

    // Check per-minute limit
    const minuteKey = `${clientId}_${modelName}_minute`;
    const minuteRequests = this.updateCounter(this.perMinuteRequests, minuteKey, 60 * 1000);
    
    if (minuteRequests > limits.requestsPerMinute) {
      const entry = this.perMinuteRequests.get(minuteKey)!;
      const resetTime = entry.windowStart + 60 * 1000;
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime,
        limitType: 'minute',
        retryAfter: Math.ceil((resetTime - now) / 1000)
      };
    }

    // Check per-day limit
    const dayKey = `${clientId}_${modelName}_day`;
    const dayRequests = this.updateCounter(this.perDayRequests, dayKey, 24 * 60 * 60 * 1000);
    
    if (dayRequests > limits.requestsPerDay) {
      const entry = this.perDayRequests.get(dayKey)!;
      const resetTime = entry.windowStart + 24 * 60 * 60 * 1000;
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime,
        limitType: 'daily',
        retryAfter: Math.ceil((resetTime - now) / 1000)
      };
    }

    // Check global rate limiting (prevent system overload)
    const globalKey = `global_${modelName}_minute`;
    const globalRequests = this.updateCounter(this.globalMinuteRequests, globalKey, 60 * 1000);
    const globalLimit = limits.requestsPerMinute * 10; // Allow 10x individual limit globally
    
    if (globalRequests > globalLimit) {
      const entry = this.globalMinuteRequests.get(globalKey)!;
      const resetTime = entry.windowStart + 60 * 1000;
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime,
        limitType: 'global',
        retryAfter: Math.ceil((resetTime - now) / 1000)
      };
    }

    // Calculate remaining requests (use the most restrictive limit)
    const remainingMinute = Math.max(0, limits.requestsPerMinute - minuteRequests);
    const remainingDay = Math.max(0, limits.requestsPerDay - dayRequests);
    const remainingBurst = Math.max(0, limits.burstLimit - burstRequests);
    
    const remainingRequests = Math.min(remainingMinute, remainingDay, remainingBurst);
    const resetTime = now + 60 * 1000; // Next minute for rate limit reset

    return {
      allowed: true,
      remainingRequests,
      resetTime,
      limitType: 'allowed'
    };
  }

  public getRateLimitStatus(request: NextRequest, modelName: string): {
    currentUsage: {
      perMinute: number;
      perDay: number;
      burst: number;
    };
    limits: ModelRateLimit;
  } {
    const clientId = this.getClientIdentifier(request);
    const limits = MODEL_RATE_LIMITS[modelName] || MODEL_RATE_LIMITS['gemini-2.0-flash-lite'];

    const minuteKey = `${clientId}_${modelName}_minute`;
    const dayKey = `${clientId}_${modelName}_day`;
    const burstKey = `${clientId}_${modelName}_burst`;

    return {
      currentUsage: {
        perMinute: this.perMinuteRequests.get(minuteKey)?.requests || 0,
        perDay: this.perDayRequests.get(dayKey)?.requests || 0,
        burst: this.burstRequests.get(burstKey)?.requests || 0
      },
      limits
    };
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter();

// Graceful shutdown cleanup
process.on('SIGTERM', () => {
  rateLimiter.destroy();
});

process.on('SIGINT', () => {
  rateLimiter.destroy();
});

interface ReportAgency {
  name: string;
  link: string;
}

// Interface for limited context information
interface ContextInfo {
  type: string;
  details: string;
  recommendations: string[];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ThreatDetectionResponse {
  status: string; // e.g., "Low Risk Detected"
  assessment: string; // e.g., "Likely Not a Threat"
  threat_probability: string; // e.g., "10%"
  ai_confidence: string; // e.g., "High"
  explanation_english: string;
  explanation_tagalog: string;
  advice: string;
  how_to_avoid_threats: string[];
  where_to_report: ReportAgency[];
  what_to_do_if_compromised: string[]; // Steps to take if you've been compromised (English)
  what_to_do_if_compromised_tagalog: string[]; // Steps to take if you've been compromised (Tagalog)
  true_vs_false: string; // How to differentiate between true and false information (English)
  true_vs_false_tagalog: string; // How to differentiate between true and false information (Tagalog)
  image_analysis?: string; // Optional analysis of image content if provided
  audio_analysis?: string; // Optional analysis of audio content if provided
  keywords?: string[]; // Key threat indicators extracted from the analysis
  content_type?: string; // Type of content analyzed (text, image, audio)
  detection_timestamp?: string; // ISO timestamp of when detection was performed
  limited_context?: ContextInfo; // Information about limited context scenarios
  raw_gemini_response?: string; // For debugging
  modelInfo?: { // Information about which Gemini model was used
    modelName: string;
    backupModelsAvailable: number;
  };
}

interface GeminiResponsePart {
  text: string;
}

interface GeminiResponseCandidate {
  content: {
    parts: GeminiResponsePart[];
    role: string;
  };
  // Add other candidate properties if needed, like finishReason, safetyRatings, etc.
}

interface GeminiApiResponse {
  candidates?: GeminiResponseCandidate[];
  // Add other top-level response properties if needed, like promptFeedback
}

// Map risk level to status
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function mapRiskLevelToStatus(riskLevel: string): string {
  switch (riskLevel?.toLowerCase()) {
    case 'very high':
      return 'High Risk Detected';
    case 'high':
      return 'High Risk Detected';
    case 'medium':
      return 'Medium Risk Detected';
    case 'low':
      return 'Low Risk Detected';
    default:
      return 'Normal Content';
  }
}

// Smart Content Analysis - Let Gemini determine what the content is
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function extractKeywords(text: string): string[] {
  // Remove predefined patterns - let Gemini AI decide what the content is
  // This function is kept for backward compatibility but returns empty array
  // All keyword extraction is now handled by Gemini AI in the analysis
  return [];
}

// Function to add model information to analysis results
function addModelInfoToResponse(jsonResponse: any, modelName: string): any {
  // Add the model name to the response
  jsonResponse.modelUsed = modelName;
  return jsonResponse;
}

// Function for audio analysis with Gemini - updated to match the same pattern as text/image analysis
// and with model fallback mechanism
async function analyzeWithGeminiAudio(content: string, audioBase64: string, imageBase64?: string): Promise<any> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API URL is not configured due to missing API key.');
  }
  
  // Try each model in sequence until one succeeds
  let lastError: Error | null = null;
  
  for (const modelName of GEMINI_MODELS) {
    console.log(`🔄 Attempting to use Gemini model: ${modelName}`);
    try {
      const apiUrl = getGeminiApiUrl(modelName);
      const result = await analyzeWithGeminiAudioUsingModel(content, audioBase64, imageBase64, apiUrl, modelName);
      console.log(`✅ Successfully used model: ${modelName}`);
      return addModelInfoToResponse(result, modelName);
    } catch (error) {
      console.error(`❌ Failed with model ${modelName}:`, error);
      lastError = error as Error;
      // Continue to the next model
    }
  }
  
  // If we reach here, all models failed
  throw lastError || new Error('All Gemini models failed to process the audio content');
}

// Helper function to analyze audio using a specific model
async function analyzeWithGeminiAudioUsingModel(
  content: string, 
  audioBase64: string, 
  imageBase64: string | undefined, 
  apiUrl: string,
  modelName: string
): Promise<any> {  const prompt = `You are an intelligent cybersecurity analyst with deep knowledge of Philippine digital threats and global online safety. Your PRIMARY MISSION is to understand WHY the user is asking about this audio content and WHAT the content actually is, rather than making assumptions based on surface patterns.

CRITICAL ANALYSIS FRAMEWORK:

STEP 1: USER INTENT UNDERSTANDING
First, analyze the user's submission to understand:
- WHY is the user asking about this audio content? (Are they suspicious? Curious? Seeking verification? Received it from someone?)
- WHAT is the user's relationship to this content? (Did they receive it, encounter it, or are they considering trusting it?)
- WHAT outcome is the user seeking? (Safety verification, explanation, identification, actionable advice?)
- WHAT is the user's apparent concern or question? (Is it safe? What is it? Should I trust it? Is this legitimate?)

STEP 2: ACTUAL AUDIO CONTENT IDENTIFICATION
Before making ANY risk assessments, thoroughly understand what this audio content ACTUALLY is:
- What type of audio communication is this really? (legitimate announcement, personal call, news report, etc.)
- What is the actual source and context?
- What legitimate purpose might this audio serve?
- NEVER judge audio content solely by keywords, voice characteristics, or surface patterns
- Research beyond first impressions to understand the true nature and purpose

STEP 3: PURPOSE-BASED RISK ASSESSMENT
Only after understanding both user intent AND actual audio content purpose:
- Assess risks based on what the audio ACTUALLY is and does
- Consider how the user's specific situation affects risk levels
- Distinguish between legitimate communications and actual threats
- Focus on real security risks rather than assumed dangers

USER AUDIO QUERY ANALYSIS:
User submitted: "${content.trim() ? content : "Audio content for analysis"}"

${content.trim() ? `Analyze this user input to understand:
1. What is the user asking about or concerned with regarding this audio?
2. What appears to be their intent or goal?
3. Are they seeking verification, explanation, or safety guidance about this audio?` : "No additional text context provided by the user."}

${imageBase64 ? "An image has also been provided for analysis alongside the audio, which may provide additional context or supplementary information." : ""}

COMPREHENSIVE CONTEXT AWARENESS ANALYSIS FOR AUDIO:
Before conducting your threat assessment, establish comprehensive contextual understanding by analyzing all available contextual dimensions:

1. TEMPORAL CONTEXT ANALYSIS:
   - Current date/time: ${new Date().toISOString()} (Philippine Time Zone)
   - Time-sensitive elements: Are there urgency indicators, deadlines, or references to current events in the audio?
   - Seasonal relevance: Does the audio relate to holidays, events, or time-specific periods in the Philippines?
   - Timing patterns: When was this audio likely recorded and distributed? Does the timing suggest legitimate or suspicious intent?

2. SITUATIONAL CONTEXT ANALYSIS:
   - Current events context: How does this audio relate to ongoing news, political situations, or social issues in the Philippines?
   - Economic context: Does this relate to current economic conditions or financial pressures affecting Filipinos?
   - Social context: Are there cultural events, social movements, or community issues that provide context?
   - Technology context: Does this leverage current voice technology trends or platform changes?

3. AUDIO-SPECIFIC CONTEXT ANALYSIS:
   - Recording quality: Professional vs. amateur recording, background noise, audio artifacts
   - Voice characteristics: Natural speech patterns, accent analysis, emotional state indicators
   - Communication setting: Private conversation, public announcement, broadcast, phone call context
   - Audio authenticity: Signs of editing, splicing, or artificial generation

4. COMMUNICATION CONTEXT ANALYSIS:
   - Speaker-listener relationship: What relationship does the audio imply between speaker and listener?
   - Communication purpose: Information sharing, persuasion, instruction, entertainment, or manipulation?
   - Response expectations: What actions or responses does the audio expect from listeners?
   - Channel appropriateness: Is the audio format appropriate for the claimed purpose?

5. CULTURAL AND LINGUISTIC CONTEXT ANALYSIS:
   - Philippine-specific elements: Local references, cultural practices, regional dialects
   - Language patterns: Filipino/Tagalog usage, code-switching, communication styles
   - Cultural vulnerabilities: Filipino cultural values or social dynamics being exploited
   - Local threat relevance: How this fits into known audio-based threats targeting Filipinos

INTELLIGENT AUDIO CONTENT ANALYSIS APPROACH:
Be smart in analyzing and determining what this audio content actually is. Do not rely on predefined patterns or assumptions. Instead:

1. AUDIO CONTENT IDENTIFICATION: First, intelligently determine what this audio actually is:
   - What type of audio communication is this? (phone call, voice message, announcement, speech, etc.)
   - What is the apparent context and setting?
   - What is the primary purpose and intent of the communication?
   - Who appears to be speaking and to whom?
   - What language(s) and communication style are being used?

2. CONTENT UNDERSTANDING: Deeply analyze what the audio is actually conveying:
   - What is the speaker actually trying to communicate or accomplish?
   - What explicit and implicit messages are being delivered?
   - Are there cultural, linguistic, or regional context factors?
   - What is the tone, urgency level, and communication approach?

3. BALANCED RISK ASSESSMENT: Only after understanding what the audio actually is, assess potential risks:
   - Based on what this audio actually is, what genuine risks might exist?
   - Are there indicators of deception, manipulation, or malicious intent?
   - What specific vulnerabilities or harm vectors are present?
   - How might different audiences be affected?

SMART ANALYSIS PRINCIPLES FOR AUDIO:
- Do not assume content is malicious based on keywords or surface patterns
- Consider legitimate uses and contexts for the type of audio identified
- Distinguish between normal persuasive communication and actual manipulation
- Recognize cultural and linguistic differences in Filipino communication styles
- Assess actual intent rather than assumed intent based on predefined categories
- Consider the full context and purpose of the audio communication

CONTEXT-AWARE AUDIO ANALYSIS METHODOLOGY:
Apply contextual intelligence throughout your audio analysis:
- Cross-reference audio content against multiple contextual dimensions simultaneously
- Identify context-specific risk factors unique to audio communications
- Assess how contextual factors affect audio authenticity and speaker credibility
- Consider context-dependent vulnerabilities specific to audio-based threats
- Evaluate audio legitimacy within its proper contextual framework
- Generate context-specific recommendations for audio content verification
- Account for contextual factors that affect voice-based threat probability and impact
- Recognize when limited audio context affects confidence levels and analysis quality

OBJECTIVE AUDIO ANALYSIS CONSIDERATIONS:
1. Voice characteristics: natural vs. synthetic speech patterns, audio quality indicators
2. Communication intent: legitimate information sharing vs. malicious manipulation
3. Actual risk indicators: direct requests for money/personal data, fraudulent claims, impersonation attempts
4. Content nature: distinguish between normal political speech, announcements, advertisements vs. actual threats
5. Cultural context: understand normal Filipino communication patterns vs. exploitation tactics
6. Technical assessment: signs of audio manipulation or deepfake technology
7. Voice authenticity: AI-generated speech detection, unnatural voice patterns

IMPORTANT: Distinguish between normal content and genuine threats:
- Public announcements, political speeches, news reports, and advertisements are typically LOW RISK unless they contain direct threat elements
- Normal persuasive language in legitimate contexts is NOT manipulation
- Government or official communications about law enforcement activities are typically legitimate
- Only flag content as HIGH RISK if it contains clear threat patterns like requests for money, personal data theft, impersonation, or fraudulent schemes

INTELLIGENT SAFETY ADVICE GENERATION:
When providing safety advice and recommendations, be smart and context-specific:
- ANALYZE THE USER'S QUERY: Understand what the user is specifically asking about or concerned with
- QUERY-SPECIFIC RECOMMENDATIONS: Provide advice that directly addresses the user's apparent question or concern
- CONTENT-SPECIFIC GUIDANCE: Generate advice based on what the audio content actually IS and what the user seems to want to know about it
- USER INTENT CONSIDERATION: If the user is asking "What is this?", "Is this safe?", "Should I trust this?", etc., tailor your advice to answer their specific question
- CONTEXTUAL RELEVANCE: For legitimate content (government announcements, news, advertisements), provide digital literacy advice appropriate to that content type AND the user's apparent concern
- THREAT-SPECIFIC ACTIONS: For actual threats, provide specific protective actions relevant to the particular threat identified AND the user's situation
- FILIPINO CONTEXT: Consider local digital habits, common services (GCash, Maya, remittances), cultural communication patterns
- AVOID GENERIC ADVICE: Do not use predefined safety tips - instead generate advice that directly addresses both the specific audio content analyzed AND the user's apparent query or concern
- ACTIONABLE RECOMMENDATIONS: Provide clear, specific steps the user should take based on their query and the audio content analysis

For audio content, provide a balanced risk assessment:
- GENUINE THREAT IDENTIFICATION: Only identify actual security threats, fraud attempts, or digital risks
- RISK PROBABILITY: Be conservative - only assign high risk percentages to clear threats
- CONTENT CLASSIFICATION: Properly categorize legitimate content types (announcements, speeches, news, etc.)
- BALANCED ASSESSMENT: Recognize that most content is not malicious

Provide a structured JSON response with the following fields:

- "isRisky": boolean (true ONLY if the content contains clear threats, fraud, or significant security risks - false for normal content including political speeches, announcements, advertisements, or general information).
- "riskCategories": array of strings (list ONLY genuine risk categories detected: "Threat", "Phishing", "Financial Fraud", "Identity Theft", "Impersonation", "Technical Threat". Do NOT include broad categories like "Misinformation" or "Manipulation" for normal political or persuasive content. If no genuine threats, provide empty array).
- "overallRiskProbability": number (a percentage from 0 to 100 indicating the likelihood of genuine security threats - be conservative and only assign high percentages to clear threats).
- "threatProbability": number (a percentage from 0 to 100 indicating the likelihood of it being an actual threat - most legitimate content should be 0-20%).
- "confidenceLevel": string (your confidence level in your assessment: "Low", "Medium", or "High").
- "detailedRiskAnalysis": string (a balanced explanation of your findings in English. For legitimate content like government announcements or political speeches, acknowledge their legitimate nature while noting any specific concerns. Only highlight genuine red flags and security threats, not normal persuasive techniques).
- "detailedRiskAnalysisTagalog": string (an accurate and natural-sounding Tagalog translation of the "detailedRiskAnalysis").
- "overallRiskLevel": string (categorize based on genuine security threats: "Low" for most legitimate content, "Medium" for concerning but not clearly malicious content, "High" only for clear threats, "Very High" or "Critical" only for immediate dangers).
- "riskBreakdown": object with the following fields (analyze each category conservatively - only populate if genuine threats exist):
    - "threatRisk": object with "level" (string), "probability" (number), "indicators" (array of strings) - only for actual threat attempts
    - "misinformationRisk": object with "level" (string), "probability" (number), "indicators" (array of strings) - only for deliberately false information, not political opinions
    - "privacyRisk": object with "level" (string), "probability" (number), "indicators" (array of strings) - only for actual privacy violations
    - "technicalRisk": object with "level" (string), "probability" (number), "indicators" (array of strings) - only for technical threats
    - "manipulationRisk": object with "level" (string), "probability" (number), "indicators" (array of strings) - only for malicious manipulation, not normal persuasion
    - "otherRisks": array of objects, each with "name" (string), "level" (string), "probability" (number), "indicators" (array of strings)
- "safetyAdvice": string (provide intelligent, context-specific safety advice in English based on what this audio content actually is and the specific risks you identified. DO NOT use generic predefined safety tips. Instead, generate advice that directly addresses: 1) the actual type of audio content (call, announcement, speech, etc.), 2) the genuine risks detected, 3) the apparent audience and context, 4) the user's specific query or concern, and 5) the Filipino digital and communication landscape. For legitimate content like government announcements, provide appropriate digital literacy guidance rather than treating it as a threat).
- "safetyTutorials": array of strings (provide 6-8 intelligent, context-specific tutorials in English that directly relate to the actual audio content analyzed and risks identified. DO NOT use generic predefined tips. Each tutorial should be tailored to: 1) the specific type of audio content analyzed, 2) the actual risks detected, 3) the apparent target audience, 4) the user's specific query or concern, and 5) the Filipino audio/voice communication context. Focus on teaching users how to recognize similar audio content in the future and make informed decisions. Include practical examples relevant to the analyzed audio).
- "preventionStrategies": object with the following fields (provide intelligent strategies based on actual audio content analysis, not predefined patterns):
    - "threatPrevention": array of strings (intelligent strategies specifically for avoiding the types of threats identified in this audio content, not generic advice)
    - "generalSafetyPractices": array of strings (practical safety measures for audio/voice communications relevant to the content type analyzed)
    - "verificationMethods": array of strings (specific methods to verify or fact-check similar audio content in the future)
- "contentClassification": object with the following fields:
    - "contentType": string (Classify what type of audio this is: public announcement, government speech, political statement, news report, advertisement, phone call, voice message, etc.)
    - "contentPurpose": string (Objective explanation of what this audio is trying to accomplish - focus on its apparent legitimate purpose)
    - "audienceAnalysis": object with the following fields:
        - "targetAudience": string (Who is the intended audience for this content)
        - "vulnerabilityFactors": array of strings (Only list factors if the content specifically targets vulnerable populations in a malicious way)
        - "potentialImpact": string (The realistic impact this content might have - be balanced and consider legitimate purposes)

- "audioAnalysis": string (Objective analysis of the voice recording including transcription of key statements, voice characteristics, and communication style - focus on describing what is heard rather than assuming malicious intent)
- "contentVerification": string (A balanced perspective on how to verify or fact-check the information presented in the audio, with appropriate skepticism for political claims while recognizing legitimate government communications)
- "contentVerificationTagalog": string (A natural Tagalog translation of the content verification explanation)
- "contentDetails": object with the following fields:
    - "format": string (The format of the audio: conversation, monologue, interview, advertisement, etc.)
    - "speakers": number (Estimated number of distinct speakers in the audio)
    - "languages": array of strings (Languages or dialects used in the audio)
    - "contentSummary": string (Concise summary of what the audio is about in plain language)
    - "voiceAuthenticity": object with the following fields:
        - "isLikelySynthetic": boolean (Whether the voice appears to be AI-generated or heavily edited)
        - "authenticityIndicators": array of strings (Evidence supporting your authenticity assessment)
        - "confidenceLevel": string (Confidence in your synthetic voice assessment: "Low", "Medium", or "High")

Ensure your entire response is ONLY the JSON object, with no additional text, comments, or markdown formatting like \`\`\`json ... \`\`\` around it. The JSON must be properly formatted with all string values properly escaped. Each required field must be present in your response even if some have minimal information due to audio limitations or ambiguity.`;  try {
    // Prepare the request body
    const requestBody: any = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0,
        topK: 1,
        topP: 0,
        maxOutputTokens: 8192,
        candidateCount: 1,
        stopSequences: [],
        responseMimeType: "application/json"
      }
    };

    // Add audio data to the request
    requestBody.contents[0].parts.push({
      inline_data: {
        mime_type: 'audio/webm', // Webm is the format we use for browser recordings
        data: audioBase64
      }
    });

    // If image is provided, add it to the request too
    if (imageBase64) {
      requestBody.contents[0].parts.push({
        inline_data: {
          mime_type: 'image/jpeg',
          data: imageBase64
        }
      });
    }

    console.log(`🔄 Making API request to Gemini model: ${modelName}`);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Gemini API Error Response for Audio Analysis:', errorBody);
      throw new Error(`Gemini API request failed with status ${response.status}: ${errorBody}`);
    }      const data: GeminiApiResponse = await response.json();
      console.log(`Gemini API Full Raw Response from ${modelName}:`, JSON.stringify(data, null, 2));
      
      // Extract the text content from the response
      const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textContent) {
        throw new Error('No text content found in Gemini response');
      }
    
    try {
      // Clean the text content to remove markdown backticks if present
      let cleanedTextContent = textContent.trim();
      if (cleanedTextContent.startsWith("```json")) {
        cleanedTextContent = cleanedTextContent.substring(7); // Remove ```json
      }
      if (cleanedTextContent.endsWith("```")) {
        cleanedTextContent = cleanedTextContent.substring(0, cleanedTextContent.length - 3); // Remove ```
      }
      cleanedTextContent = cleanedTextContent.trim(); // Trim any remaining whitespace

      // Parse the JSON response directly
      const jsonResponse = JSON.parse(cleanedTextContent);
      return jsonResponse;
    } catch (error) {
      console.error('Error parsing JSON from Gemini response:', error);
      throw new Error(`Failed to parse JSON from Gemini response: ${(error as Error).message}`);
    }

  } catch (error) {
    console.error('Error calling Gemini API for audio analysis:', error);
    throw error; // Re-throw the error to be caught by the POST handler
  }
}

async function analyzeWithGemini(content: string, imageBase64?: string): Promise<any> {
  if (!GEMINI_API_KEY) { // Check if the API key is missing
    throw new Error('Gemini API key is not configured.');
  }
  
  // Try each model in sequence until one succeeds
  let lastError: Error | null = null;
  
  for (const modelName of GEMINI_MODELS) {
    console.log(`🔄 Attempting to use Gemini model: ${modelName}`);
    try {
      const apiUrl = getGeminiApiUrl(modelName);
      const result = await analyzeWithGeminiUsingModel(content, imageBase64, apiUrl, modelName);
      console.log(`✅ Successfully used model: ${modelName}`);
      return addModelInfoToResponse(result, modelName);
    } catch (error) {
      console.error(`❌ Failed with model ${modelName}:`, error);
      lastError = error as Error;
      // Continue to the next model
    }
  }
  
  // If we reach here, all models failed
  throw lastError || new Error('All Gemini models failed to process the content');
}

// Helper function to analyze content using a specific model
async function analyzeWithGeminiUsingModel(
  content: string, 
  imageBase64: string | undefined, 
  apiUrl: string,
  modelName: string
): Promise<any> {
  if (!apiUrl) { // Check if the URL is empty (meaning API key was missing)
    throw new Error('Gemini API URL is not configured due to missing API key.');
  }  const prompt = `You are an intelligent cybersecurity analyst with deep knowledge of Philippine digital threats and global online safety. Your PRIMARY MISSION is to understand WHY the user is asking about this content and WHAT the content actually is, rather than making assumptions based on surface patterns.

CRITICAL ANALYSIS FRAMEWORK:

STEP 1: USER INTENT UNDERSTANDING
First, analyze the user's submission to understand:
- WHY is the user asking about this content? (Are they suspicious? Curious? Seeking verification? Received it from someone?)
- WHAT is the user's relationship to this content? (Did they find it, receive it, encounter it, or are they considering using it?)
- WHAT outcome is the user seeking? (Safety verification, explanation, identification, actionable advice?)
- WHAT is the user's apparent concern or question? (Is it safe? What is it? Should I trust it? Is this legitimate?)

STEP 2: ACTUAL CONTENT IDENTIFICATION
Before making ANY risk assessments, thoroughly research and identify what this content ACTUALLY is:
- For URLs/domains: Research the actual purpose, legitimate uses, and reputation of the website/service
- For messages/text: Understand the actual context, source, and legitimate purpose
- For images: Analyze what is actually shown and its real-world context
- NEVER judge content solely by names, keywords, or surface appearance
- Research beyond first impressions to understand the true nature and purpose

STEP 3: PURPOSE-BASED RISK ASSESSMENT
Only after understanding both user intent AND actual content purpose:
- Assess risks based on what the content ACTUALLY is and does
- Consider how the user's specific situation affects risk levels
- Distinguish between legitimate tools/content and actual threats
- Focus on real security risks rather than assumed dangers

USER QUERY ANALYSIS:
User submitted: "${content.trim() ? content : "Image/media content"}"

${content.trim() ? `Analyze this user input to understand:
1. What is the user asking about or concerned with?
2. What appears to be their intent or goal?
3. What is their apparent technical knowledge level?
4. Are they seeking verification, explanation, or safety guidance?` : "No text provided for analysis."}

${imageBase64 ? (content.trim() ? "An image has also been provided for analysis alongside the text." : "Only an image has been provided for analysis.") : ""}

INTELLIGENT CONTENT RESEARCH AND ANALYSIS:
Before conducting your threat assessment, establish comprehensive contextual understanding by analyzing all available contextual dimensions:

1. TEMPORAL CONTEXT ANALYSIS:
   - Current date/time: ${new Date().toISOString()} (Philippine Time Zone)
   - Time-sensitive elements: Are there urgency indicators, deadlines, time-limited offers, or references to current events?
   - Seasonal relevance: Does the content relate to holidays, school years, tax seasons, or other time-specific periods in the Philippines?
   - Timing patterns: When was this content likely created and distributed? Does the timing suggest legitimate or suspicious intent?

2. SITUATIONAL CONTEXT ANALYSIS:
   - Current events context: How does this content relate to ongoing news, political situations, natural disasters, or social issues in the Philippines?
   - Economic context: Does this relate to current economic conditions, employment trends, or financial pressures affecting Filipinos?
   - Social context: Are there cultural events, social movements, or community issues that provide context for this content?
   - Technology context: Does this leverage current technology trends, app popularity, or digital platform changes?

3. USER BEHAVIORAL CONTEXT ANALYSIS:
   - Query intent analysis: What is the user trying to accomplish by submitting this content?
   - Information-seeking patterns: Is the user asking for verification, explanation, safety assessment, or something else?
   - Risk awareness level: Based on the query style, what appears to be the user's current cybersecurity awareness level?
   - Decision context: Is the user facing a time-sensitive decision about this content?

4. CONTENT DELIVERY CONTEXT ANALYSIS:
   - Platform indicators: What platform or medium was this content likely delivered through? (SMS, email, social media, website, etc.)
   - Distribution patterns: How is this type of content typically shared? (viral, targeted, mass distribution, etc.)
   - Audience targeting: Who is this content designed to reach and through what channels?
   - Engagement mechanisms: How does the content encourage user interaction or response?

5. GEOGRAPHICAL AND CULTURAL CONTEXT ANALYSIS:
   - Philippine-specific elements: References to local places, services, government agencies, cultural practices, or events
   - Language context: Filipino/Tagalog usage patterns, code-switching, regional dialects, or translation quality indicators
   - Local threat landscape: How does this content fit into known threat patterns targeting Filipinos?
   - Cultural vulnerabilities: Does this exploit Filipino cultural values, social dynamics, or community structures?

6. TECHNICAL CONTEXT ANALYSIS:
   - Device/platform context: What devices or platforms is this content optimized for?
   - Technical sophistication: What level of technical knowledge does creating/distributing this content require?
   - Infrastructure dependencies: What technical infrastructure or services does this content rely on?
   - Technical threat vectors: What technical risks are present based on the content format and delivery method?

7. PSYCHOLOGICAL CONTEXT ANALYSIS:
   - Emotional triggers: What emotions is this content designed to evoke? (fear, urgency, greed, curiosity, trust, etc.)
   - Cognitive biases exploited: Does this leverage authority bias, social proof, scarcity, reciprocity, or other psychological principles?
   - Vulnerability targeting: Does this specifically target psychological vulnerabilities common in certain demographics?
   - Persuasion techniques: What persuasion or influence methods are being employed?

8. COMMUNICATION CONTEXT ANALYSIS:
   - Sender-receiver relationship: What relationship does the content imply between sender and recipient?
   - Communication channel appropriateness: Is the channel used appropriate for the claimed purpose?
   - Message authenticity indicators: Are there signs of impersonation, spoofing, or false identity?
   - Response expectations: What actions or responses does the content expect from recipients?

INTELLIGENT CONTENT ANALYSIS APPROACH:
NEVER make assumptions based on surface patterns, names, or keywords. Instead, conduct intelligent research:

1. CONTENT IDENTIFICATION AND RESEARCH: First, intelligently determine what this content actually is:
   - For domain names/URLs: What is the actual purpose and function of this website/service?
   - What legitimate use cases exist for this type of content?
   - What is the source, origin, and intended purpose?
   - Who is the target audience and why?
   - What context clues help identify the true content nature?

2. EVIDENCE-BASED UNDERSTANDING: Deeply analyze the content's actual meaning and purpose:
   - What is this content actually trying to communicate or accomplish?
   - What explicit and implicit messages are being conveyed?
   - Are there cultural, linguistic, or regional context factors?
   - What technical elements or communication methods are being used?
   - How does this content function in its intended context?

3. INFORMED RISK ASSESSMENT: Only after understanding what the content actually IS and DOES:
   - Based on the ACTUAL purpose and function, what genuine risks might exist?
   - Are there indicators of deception, manipulation, or malicious intent?
   - What specific vulnerabilities or harm vectors are present?
   - How might different audiences be affected differently?
   - Does the content pose risks in its legitimate use or only when misused?

RESEARCH-BASED ANALYSIS PRINCIPLES:
- Research the actual purpose and function before assessing risk
- Consider legitimate uses and contexts for the type of content identified
- Distinguish between controversial/gray-area content and actual malicious threats
- Recognize that names, appearances, or keywords can be misleading
- Assess actual intent and function rather than assumed intent based on surface patterns
- Consider the full context and legitimate purpose of the communication/tool/service
- Understand that some legitimate tools may have controversial or dual-use purposes

EXAMPLE ANALYSIS APPROACH:
For a domain like "massgrave.dev":
- Research: What does this website actually do? What is its stated purpose?
- Context: Is this a known tool/service in certain communities?
- Function: What actual functionality does it provide?
- Legitimacy: Is this a legitimate tool that serves a real purpose?
- Risk Assessment: Based on what it ACTUALLY is, not what the name suggests

SMART ANALYSIS PRINCIPLES:
- Research the actual purpose and function before assessing risk
- Consider legitimate uses and contexts for the type of content identified
- Distinguish between controversial/gray-area content and actual malicious threats
- Recognize that names, appearances, or keywords can be misleading
- Assess actual intent and function rather than assumed intent based on surface patterns
- Consider the full context and legitimate purpose of the communication/tool/service
- Understand that some legitimate tools may have controversial or dual-use purposes

CONTEXT-AWARE ANALYSIS METHODOLOGY:
Apply contextual intelligence throughout your analysis:
- Cross-reference content against multiple contextual dimensions simultaneously
- Identify context-specific risk factors that may not be apparent without situational awareness
- Assess how contextual factors amplify or mitigate potential risks
- Consider context-dependent user vulnerabilities and appropriate protective measures
- Evaluate content legitimacy within its proper contextual framework
- Generate context-specific recommendations rather than generic advice
- Account for contextual factors that affect threat probability and impact severity
- Recognize when limited context affects confidence levels and analysis quality

CONTEXTUAL RISK ASSESSMENT FRAMEWORK:
When evaluating risks, consider how context affects:
- Threat likelihood: How contextual factors increase or decrease probability of actual threats
- Impact severity: How contextual factors affect potential harm to users
- User vulnerability: How contextual factors create or reduce user susceptibility
- Mitigation effectiveness: How contextual factors affect the success of protective measures
- Response urgency: How contextual factors affect the time-sensitivity of user actions
- Verification complexity: How contextual factors affect the difficulty of content verification

WEBSITE AND URL ANALYSIS:
If the content contains URLs or describes websites, provide intelligent analysis:
- Purpose identification: What the site/service actually does and why it exists
- Legitimacy assessment: Multiple verification approaches and credibility indicators
- Risk evaluation: Actual security concerns vs. assumed risks
- User guidance: Specific, actionable advice based on what the site actually is

PHILIPPINE CONTEXT AWARENESS:
Consider Filipino cultural and linguistic context intelligently:
- Normal communication patterns vs. exploitation tactics
- Legitimate local services, businesses, and government communications
- Cultural factors that might affect interpretation
- Regional communication styles and preferences

Conduct a comprehensive forensic analysis with particular attention to accurately identifying what the content is before assessing potential dangers. Be precise in distinguishing between legitimate content and actual threats, misinformation, harmful content, privacy risks, technical vulnerabilities, and manipulation tactics.

For all content, conduct a full-spectrum risk assessment:
- RISK IDENTIFICATION: Identify ALL potential risks - threats, phishing, fraud, misinformation, dangerous advice, harmful content, malicious links/software, privacy violations, etc.
- RISK PROBABILITY: Assess the likelihood of each identified risk using multiple indicators
- RISK SEVERITY: Evaluate the potential negative impact and consequences if the user engages with this content
- RISK URGENCY: Determine how immediately dangerous this content might be (immediate vs. latent risks)
- RISK CLASSIFICATION: Categorize the type of danger (financial, privacy, personal safety, misinformation, etc.)

For text content, especially analyze:
- CONTEXT PURPOSE: What is this text attempting to accomplish? Identify both stated and potential hidden purposes.
- CONTENT TYPE: Is this a message, email, website text, advertisement, news article, or something else?
- LANGUAGE ANALYSIS: Evaluate both English and Filipino language elements (Tagalog, Bisaya, etc.), including grammar, style, formality, and manipulation tactics
- TARGET IDENTIFICATION: Who is this content targeting and why? Assess vulnerability factors for the target audience
- CULTURAL ELEMENTS: Filipino-specific references, cultural touchpoints, or localized approaches that might be exploited
- TRUTH ASSESSMENT: Evaluate factual accuracy, source credibility, consistency, and potential misinformation
- REQUEST ANALYSIS: What is the content asking for? Identify explicit and implicit requests that pose risk
- TECHNICAL INDICATORS: Analyze URLs, formatting, technical elements for malicious components
- MANIPULATION TACTICS: Identify psychological tactics like urgency, authority abuse, scarcity, social proof, reciprocity
- THREAT MODELING: What would happen if a user fully trusted and acted on this content? Map potential harm vectors

INTELLIGENT SAFETY ADVICE GENERATION:
When providing safety advice and recommendations, be smart and context-specific:
- UNDERSTAND THE USER'S ACTUAL QUESTION: What is the user really asking? Do they want to know what something is, whether it's safe, or how to use it?
- RESEARCH-BASED RECOMMENDATIONS: Base your advice on what the content ACTUALLY is, not assumptions
- PURPOSE-AWARE GUIDANCE: For legitimate tools/services, explain their actual purpose and proper usage rather than treating them as threats
- USER-INTENT MATCHING: If the user is asking "What is this?", focus on explaining what it actually is and does
- CONTEXTUAL SAFETY: For legitimate but controversial tools, provide appropriate safety guidance about proper usage
- THREAT-SPECIFIC ACTIONS: For actual threats, provide specific protective actions
- FILIPINO CONTEXT: Consider local digital habits and services when relevant
- AVOID ASSUMPTION-BASED ADVICE: Don't provide warnings based on names or surface patterns alone
- RESEARCH-INFORMED RECOMMENDATIONS: Base all advice on understanding the actual content and user intent

USER INTENT RECOGNITION PATTERNS:
- "What is this?" / "Ano ito?" = User wants identification and explanation
- "Is this safe?" / "Safe ba ito?" = User wants safety assessment
- "Should I use this?" / "Dapat ba gamitin?" = User wants usage guidance  
- "Is this legitimate?" / "Totoo ba ito?" = User wants legitimacy verification
- "What does this do?" / "Ano ginagawa nito?" = User wants functionality explanation

CONTENT PURPOSE UNDERSTANDING MANDATE:
Before conducting ANY risk assessment, you MUST first understand what the content actually is:

1. DOMAIN/URL ANALYSIS PROTOCOL:
   - Research the actual website purpose and function
   - Identify legitimate use cases and user communities
   - Understand the service's actual business model and purpose
   - Consider the difference between controversial tools and malicious sites
   - Example: "massgrave.dev" is a Microsoft activation toolkit repository, not a malicious site despite the name

2. TEXT/MESSAGE ANALYSIS PROTOCOL:
   - Identify the actual source and context of the message
   - Understand the legitimate purpose behind the communication
   - Distinguish between normal business communications and actual threats
   - Consider cultural and linguistic context factors

3. IMAGE ANALYSIS PROTOCOL:
   - Understand what is actually depicted in the image
   - Consider the legitimate context where such images might appear
   - Distinguish between legitimate screenshots and manipulated content
   - Analyze the actual purpose of visual elements

MANDATORY PRE-ASSESSMENT QUESTIONS:
Before labeling ANY content as risky, ask yourself:
1. What is this content's ACTUAL purpose and function?
2. Who legitimately uses this type of content and why?
3. What would happen if this content is exactly what it appears to be?
4. Am I making assumptions based on names, keywords, or surface patterns?
5. What evidence do I have that this is actually malicious vs. simply unfamiliar?

For URLs and website descriptions, provide comprehensive explanation of what the website is for, whether it's legitimate, and what users should know about it in both English and Tagalog.

Provide a structured JSON response with the following fields:

- "isRisky": boolean (true if the content contains ANY potential risks, threats, harmful elements, or misinformation, false only if completely safe).
- "riskCategories": array of strings (list all risk categories detected: "Threat", "Phishing", "Misinformation", "Privacy Risk", "Malware", "Financial Risk", "Identity Theft Risk", "Manipulation", "Harmful Content", "Data Collection", etc. If none, provide empty array).
- "overallRiskProbability": number (a percentage from 0 to 100 indicating the overall likelihood of ANY risk being present, being precise in your assessment).
- "threatProbability": number (a percentage from 0 to 100 indicating the likelihood of it being a threat specifically).
- "confidenceLevel": string (your confidence level in your overall assessment: "Low", "Medium", or "High", based on the quality and quantity of indicators present).
- "detailedRiskAnalysis": string (a comprehensive explanation of your findings in English, highlighting ALL potential risks including threats, misinformation, harmful content, technical risks, manipulation tactics, etc. Clearly identify ALL red flags, linguistic patterns, technical indicators, suspicious elements, factual inaccuracies, and potential harm vectors. Include your reasoning process for each risk identified. Format for readability with clear sections, paragraphs and bullet points as needed).
- "detailedRiskAnalysisTagalog": string (an accurate and natural-sounding Tagalog translation of the "detailedRiskAnalysis" that preserves all technical details but adapts to local context).
- "overallRiskLevel": string (categorize the HIGHEST risk detected based on probability AND severity: "Low", "Medium", "High", "Very High", or "Critical").
- "riskBreakdown": object with the following fields (analyze each major risk category separately):
    - "threatRisk": object with "level" (string), "probability" (number), "indicators" (array of strings)
    - "misinformationRisk": object with "level" (string), "probability" (number), "indicators" (array of strings)
    - "privacyRisk": object with "level" (string), "probability" (number), "indicators" (array of strings)
    - "technicalRisk": object with "level" (string), "probability" (number), "indicators" (array of strings)
    - "manipulationRisk": object with "level" (string), "probability" (number), "indicators" (array of strings)
    - "otherRisks": array of objects, each with "name" (string), "level" (string), "probability" (number), "indicators" (array of strings)
- "safetyAdvice": string (provide intelligent, context-specific safety advice in English based on what this content actually is and the specific risks you identified. DO NOT use generic predefined safety tips. Instead, generate advice that directly addresses the actual content type, purpose, and genuine risks detected. For legitimate content, provide appropriate digital literacy guidance. For actual threats, provide specific protective actions. Tailor your advice to the Filipino context when relevant, considering local digital habits, services, and threat landscape).
- "safetyTutorials": array of strings (provide 6-8 intelligent, context-specific tutorials in English that directly relate to the actual content analyzed and risks identified. DO NOT use generic predefined tips. Each tutorial should be tailored to: 1) the specific type of content analyzed, 2) the actual risks detected, 3) the apparent target audience, and 4) the Filipino digital context. Focus on teaching users how to recognize similar content in the future and make informed decisions. Include practical examples relevant to the analyzed content).
- "preventionStrategies": object with the following fields (provide intelligent strategies based on actual content analysis, not predefined patterns):    - "threatPrevention": array of strings (intelligent strategies specifically for avoiding the types of threats identified in this content, not generic advice)
    - "misinformationDefense": array of strings (specific methods to verify the type of information presented in this content, tailored to its source and claims)
    - "privacyProtection": array of strings (contextual ways to safeguard personal information based on the specific privacy risks identified in this content)
    - "technicalSafeguards": array of strings (relevant technical measures based on the actual technical risks detected, not generic security advice)
    - "generalSafetyPractices": array of strings (broader digital safety practices that directly relate to the content type and context analyzed)
- "reportingInfo": object with the following fields:
    - "introduction": string (A detailed introduction in English on the importance of reporting ALL types of harmful content, the impact of reporting, and the general process. Include information on what evidence to gather before reporting different types of harmful content).
    - "agencies": array of objects, where each object has:
        - "name": string (The official name of the agency or organization, prioritizing Philippine agencies followed by relevant international bodies).
        - "riskTypes": array of strings (The types of risks this agency handles: "threats", "cybercrime", "misinformation", "harmful content", etc.)
        - "url": string (The direct URL to their complaint filing page or relevant information page. Verify this is a valid, working URL).
        - "description": string (A detailed description of which types of risks the agency handles, their jurisdiction, and any special reporting requirements or procedures. Prioritize agencies relevant to the Philippines).
- "contentEvaluation": string (Provide a detailed explanation in English on how to critically evaluate content safety and truthfulness, specifically related to the analyzed content. Include verification techniques for multiple risk dimensions - not just threats but also factual accuracy, source credibility, manipulation tactics, technical risks, etc. Include warning signs, critical thinking strategies, and content verification methods tailored to the specific types of risks identified. Use concrete examples where possible).
- "contentEvaluationTagalog": string (A natural, culturally-appropriate Tagalog translation of the "contentEvaluation" explanation that preserves all technical advice).
- "contentClassification": object with the following fields:
    - "contentType": string (Classify what type of content this is: website URL, social media post, SMS, email, advertisement, news, etc.)
    - "contentPurpose": string (Detailed explanation of what this content is trying to accomplish, including potential hidden purposes)
    - "contextualFactors": object with the following fields:
        - "temporalContext": object with the following fields:
            - "timeSensitivity": string (How time-sensitive is this content: "Critical", "Urgent", "Moderate", "Low", "None")
            - "timingAnalysis": string (Analysis of timing patterns and their significance)
            - "seasonalRelevance": array of strings (Seasonal or periodic factors that provide context)
        - "situationalContext": object with the following fields:
            - "currentEventsRelevance": string (How this content relates to current events or news)
            - "economicFactors": array of strings (Economic conditions or trends that provide context)
            - "socialFactors": array of strings (Social or cultural factors that provide context)
            - "technologyFactors": array of strings (Technology trends or platform changes that provide context)
        - "geographicalContext": object with the following fields:
            - "philippineSpecificElements": array of strings (Filipino cultural, linguistic, or regional elements identified)
            - "localThreatRelevance": string (How this fits into the Philippine threat landscape)
            - "culturalVulnerabilities": array of strings (Filipino cultural aspects that may be exploited)
        - "psychologicalContext": object with the following fields:
            - "emotionalTriggers": array of strings (Emotions this content is designed to evoke)
            - "cognitiveBiasesTargeted": array of strings (Psychological biases being exploited)
            - "persuasionTechniques": array of strings (Influence methods being employed)
        - "communicationContext": object with the following fields:
            - "deliveryChannel": string (Likely platform or medium used for distribution)
            - "relationshipImplied": string (Implied relationship between sender and recipient)
            - "authenticityIndicators": array of strings (Signs of genuine vs. impersonation)
        - "contextualRiskFactors": array of strings (Risk factors that emerge from contextual analysis)
        - "contextualProtectiveFactors": array of strings (Contextual factors that reduce risk or provide protection)
    - "audienceAnalysis": object with the following fields:
        - "targetAudience": string (Who is the target audience for this content)
        - "vulnerabilityFactors": array of strings (Specific factors that might make the target audience vulnerable)
        - "potentialImpact": string (The potential effect or harm this content could have on its audience)
        - "contextualVulnerabilities": array of strings (Additional vulnerabilities that emerge from contextual analysis)
    - "trustworthinessIndicators": object with the following fields:
        - "positiveIndicators": array of strings (Elements that suggest the content may be legitimate or trustworthy)
        - "negativeIndicators": array of strings (Elements that raise concerns about trustworthiness)
        - "contextualCredibilityFactors": array of strings (Credibility factors that emerge from contextual analysis)
        - "overallAssessment": string (Final evaluation of content trustworthiness)
    - "contentExplanation": string (A concise yet thorough explanation of what this content is, its purpose, legitimacy concerns, and ALL potential risks in plain language that non-technical users will understand. For websites, include what the site is for and potential dangers)
    - "contentExplanationTagalog": string (A natural Tagalog translation of the content explanation that ordinary Filipino users can easily understand)
    - "contextualAnalysisSummary": string (A comprehensive summary of how contextual factors affect the interpretation and risk assessment of this content)
    - "riskSummary": string (A brief, clear summary of ALL risks identified that a user should be aware of before engaging with this content)

${imageBase64 ? "When analyzing the provided image, perform a comprehensive risk assessment including: digital manipulation indicators, inconsistent lighting/shadows, misaligned text elements, false/edited logos, suspicious QR codes, harmful URLs, malicious instructions, dangerous advice, manipulated documents, false health claims, misleading statistics/charts, hidden data, steganography, malicious code embedding attempts, tracking pixels, inappropriate material, personal data exposure, confidential information, and visual persuasion techniques. Pay special attention to text in the image for risk indicators in both English and Filipino/Tagalog." : ""}

Additional analysis instructions:
1. For borderline cases, err on the side of caution and provide more detailed warnings and verification steps.
2. If you identify a novel threat technique not widely documented, highlight this in your analysis.
3. If the content appears to be testing your capabilities rather than a real threat, still provide a thorough analysis as if it were a genuine submission.
4. If the content is extremely short or ambiguous, note the limitations in your confidence assessment but provide best-effort analysis.
5. For content in Filipino languages/dialects other than Tagalog, identify the language if possible and include this information in your analysis.
6. If you detect a question like "Para saan ito?" (What is this for?) or "Ano ito?" (What is this?), focus your analysis on explaining the nature and purpose of the content/website in simple, accessible language in both English and Tagalog.
7. For website URLs, perform deeper domain analysis to determine its purpose, registration history, and security status if possible.
8. Pay special attention to Filipino cultural context that might make certain threats more effective in the Philippines (remittance services, OFW targeting, local payment systems).
9. Provide practical, step-by-step advice for typical Filipino internet users who may have varying levels of technical knowledge.
10. CONTEXT-AWARE ANALYSIS: Always consider how contextual factors (temporal, situational, cultural, psychological, technical) affect your risk assessment and recommendations.
11. CONTEXTUAL CONFIDENCE: Explicitly state when contextual limitations affect your analysis confidence and what additional context would improve assessment accuracy.
12. CONTEXTUAL RECOMMENDATIONS: Ensure all safety advice and recommendations are tailored to the specific contextual factors identified in your analysis.
13. CONTEXTUAL VERIFICATION: Provide context-specific verification methods that account for the particular circumstances and characteristics of the content analyzed.
14. CONTEXTUAL IMPACT ASSESSMENT: Consider how contextual factors amplify or mitigate potential risks and adjust your risk probability and severity assessments accordingly.

Ensure your entire response is ONLY the JSON object, with no additional text, comments, or markdown formatting like \`\`\`json ... \`\`\` around it. The JSON must be properly formatted and all string values properly escaped. Each field must be present in your response even if some have minimal information due to the nature of the content.

Text to analyze:
"""
${content}
"""`;  try {
    // Prepare the request body
    const requestBody: any = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0,
        topK: 1,
        topP: 0,
        maxOutputTokens: 8192,
        candidateCount: 1,
        stopSequences: [],
        responseMimeType: "application/json"
      }
    };

    // If image is provided, add it to the request
    if (imageBase64) {
      requestBody.contents[0].parts.push({
        inline_data: {
          mime_type: 'image/jpeg', // Assuming JPEG format - adjust as needed
          data: imageBase64
        }
      });
    }

    console.log(`🔄 Making API request to Gemini model: ${modelName}`);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Gemini API Error Response:', errorBody);
      throw new Error(`Gemini API request failed with status ${response.status}: ${errorBody}`);
    }
    
    const data: GeminiApiResponse = await response.json();
    console.log('Gemini API Full Raw Response Object:', JSON.stringify(data, null, 2));
    
    // Extract the text content from the response
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) {
      throw new Error('No text content found in Gemini response');
    }
    
    try {
      // Clean the text content to remove markdown backticks if present
      let cleanedTextContent = textContent.trim();
      if (cleanedTextContent.startsWith("```json")) {
        cleanedTextContent = cleanedTextContent.substring(7); // Remove ```json
      }
      if (cleanedTextContent.endsWith("```")) {
        cleanedTextContent = cleanedTextContent.substring(0, cleanedTextContent.length - 3); // Remove ```
      }
      cleanedTextContent = cleanedTextContent.trim(); // Trim any remaining whitespace

      // Parse the JSON response directly
      const jsonResponse = JSON.parse(cleanedTextContent);
      return jsonResponse;
    } catch (error) {
      console.error('Error parsing JSON from Gemini response:', error);
      throw new Error(`Failed to parse JSON from Gemini response: ${(error as Error).message}`);
    }

  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error; // Re-throw the error to be caught by the POST handler
  }
}

export async function POST(request: NextRequest) {
  // Debug environment variables at runtime
  console.log('🔍 Environment Variable Debug:', {
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY ? 'Present' : 'Missing',
    NODE_ENV: process.env.NODE_ENV || 'Not set',
    // Show first few characters of keys if present (for debugging)
    GEMINI_API_KEY_PREFIX: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 8) + '...' : 'N/A'
  });

  if (!GEMINI_API_KEY) {
    console.error('Gemini API key is not configured. Please set GEMINI_API_KEY environment variable.');
    return NextResponse.json({ message: 'API key not configured. Please contact support.' }, { status: 500 });
  }
  // Parse request body first
  const body = await request.json();
  const { content, imageBase64, audioBase64, simulateOCR, simulatedOCRText } = body;  // Accept optional image and audio data    
  
  // Allow content to be empty if an image or audio is provided
  if ((!content || typeof content !== 'string') && !imageBase64 && !audioBase64) {
    return NextResponse.json({ message: 'Either text content, image, or audio recording is required' }, { status: 400 });
  }

  // Determine which model will be used (first available model) for rate limiting
  const modelToUse = GEMINI_MODELS[0]; // Primary model for rate limiting check
  
  // Apply rate limiting before processing
  console.log(`🛡️ Checking rate limits for model: ${modelToUse}`);
  const rateLimitResult = await rateLimiter.checkRateLimit(request, modelToUse);
  
  // Define rate limit headers function for use throughout the function
  const getRateLimitHeaders = () => ({
    'X-RateLimit-Limit': MODEL_RATE_LIMITS[modelToUse]?.requestsPerMinute.toString() || '15',
    'X-RateLimit-Remaining': rateLimitResult.remainingRequests.toString(),
    'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
  });
  
  if (!rateLimitResult.allowed) {
    console.warn(`⚠️ Rate limit exceeded for ${modelToUse}: ${rateLimitResult.limitType} limit`);
    
    // Return rate limit response with appropriate headers
    const response = NextResponse.json({
      message: `Rate limit exceeded. You have made too many requests.`,
      error: `Rate limit exceeded: ${rateLimitResult.limitType}`,
      limitType: rateLimitResult.limitType,
      retryAfter: rateLimitResult.retryAfter,
      resetTime: new Date(rateLimitResult.resetTime).toISOString(),
      modelUsed: modelToUse
    }, { status: 429 }); // Too Many Requests
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', MODEL_RATE_LIMITS[modelToUse]?.requestsPerMinute.toString() || '15');
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remainingRequests.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
    response.headers.set('Retry-After', rateLimitResult.retryAfter?.toString() || '60');
    
    return response;
  }
  
  console.log(`✅ Rate limit check passed. Remaining requests: ${rateLimitResult.remainingRequests}`);
  
  console.log(`🚀 Starting analysis with Gemini model fallback system (${GEMINI_MODELS.length} models available)`);
  
  // Use empty string if content is not provided but image/audio is
  const textContent = content || '';

  try {// Check cache first
    const cachedResponse = responseCache.get(textContent, imageBase64, audioBase64);
    if (cachedResponse) {
      console.log('✅ Returning cached response - skipping API call');
      const response = NextResponse.json(cachedResponse);
      
      // Add rate limit headers even for cached responses
      const rateLimitHeaders = getRateLimitHeaders();
      response.headers.set('X-RateLimit-Limit', rateLimitHeaders['X-RateLimit-Limit']);
      response.headers.set('X-RateLimit-Remaining', rateLimitHeaders['X-RateLimit-Remaining']);
      response.headers.set('X-RateLimit-Reset', rateLimitHeaders['X-RateLimit-Reset']);
      response.headers.set('X-Cache-Status', 'HIT');
      
      return response;
    }
    
    console.log('🔄 Cache miss - proceeding with API analysis');
      try {      let analysis;
      let extractedImageText = ''; // Store text extracted from image for future use
        // Extract text from image if present
      if (imageBase64) {
        if (simulateOCR && simulatedOCRText) {
          console.log('🧪 Using simulated OCR text for testing');
          extractedImageText = simulatedOCRText;
        } else {
          extractedImageText = await extractTextFromImage(imageBase64);
        }
      }
      
      if (audioBase64) {
        // Handle audio analysis using the same approach as text/image analysis
        analysis = await analyzeWithGeminiAudio(textContent, audioBase64, imageBase64);
          // Only provide minimal fallbacks if Gemini doesn't respond - let Gemini provide all content
        if (!analysis.mainExplanation && !analysis.audioAnalysis) {
          analysis.mainExplanation = analysis.detailedRiskAnalysis || "Content analyzed by AI.";
          analysis.audioAnalysis = analysis.mainExplanation;
        } else if (!analysis.audioAnalysis) {
          analysis.audioAnalysis = analysis.mainExplanation;
        } else if (!analysis.mainExplanation) {
          analysis.mainExplanation = analysis.audioAnalysis;
        }
        
        // Minimal fallback for essential fields - let Gemini determine content
        if (!analysis.detailedRiskAnalysis) {
          analysis.detailedRiskAnalysis = analysis.mainExplanation || analysis.audioAnalysis || 
            "Content has been analyzed.";
        }
        
        // Only add fallback if Gemini didn't provide Tagalog explanation
        if (!analysis.detailedRiskAnalysisTagalog) {
          analysis.detailedRiskAnalysisTagalog = "Sinuri ang nilalaman.";
        }
          // Let Gemini determine risk categories - no fallback patterns
        if (!analysis.riskCategories) {
          analysis.riskCategories = []; 
        }
          // Let Gemini determine content classification - minimal fallbacks only
        if (!analysis.contentClassification) {
          analysis.contentClassification = {};
        }
        
        // Only set basic fallbacks if Gemini didn't provide them
        if (!analysis.contentClassification.contentType) {
          analysis.contentClassification.contentType = audioBase64 ? "Audio" : "Content";
        }
        
        if (!analysis.contentClassification.contentPurpose) {
          analysis.contentClassification.contentPurpose = analysis.contentPurpose || 
                                                          analysis.contentDetails?.contentSummary || 
                                                          "Communication";
        }
        
        if (!analysis.contentClassification.audienceAnalysis) {
          analysis.contentClassification.audienceAnalysis = {};
        }
        
        if (!analysis.contentClassification.audienceAnalysis.targetAudience) {
          analysis.contentClassification.audienceAnalysis.targetAudience = analysis.audienceTarget || "General audience";
        }
      } else {
        // Standard text/image analysis
        analysis = await analyzeWithGemini(textContent, imageBase64);      }        // Dynamic intelligent scoring system - relies on Gemini's analysis
        const calculateIntelligentRiskScore = (geminiAnalysis: any, userQuery: string): number => {          // Use Gemini's assessment as the primary score
          const baseScore = geminiAnalysis.overallRiskProbability || 0;
          
          // Dynamic adjustment based on Gemini's risk breakdown analysis
          const riskBreakdown = geminiAnalysis.riskBreakdown || {};
          let riskIntensityMultiplier = 1.0;
          
          // Calculate dynamic risk intensity based on Gemini's detailed analysis
          const riskTypes = ['threatRisk', 'misinformationRisk', 'privacyRisk', 'technicalRisk', 'manipulationRisk'];
          let highRiskCount = 0;
          let totalRiskProbability = 0;
          let validRiskTypes = 0;
          
          riskTypes.forEach(riskType => {
            if (riskBreakdown[riskType] && typeof riskBreakdown[riskType].probability === 'number') {
              const probability = riskBreakdown[riskType].probability;
              totalRiskProbability += probability;
              validRiskTypes++;
              
              if (probability >= 70) {
                highRiskCount++;
              }
            }
          });
          
          // Adjust multiplier based on multiple high-risk areas
          if (validRiskTypes > 0) {
            const averageRiskProbability = totalRiskProbability / validRiskTypes;
            riskIntensityMultiplier = 0.8 + (averageRiskProbability / 100) * 0.4; // Range: 0.8 to 1.2
            
            // Additional boost for multiple high-risk areas
            if (highRiskCount >= 2) {
              riskIntensityMultiplier += 0.1;
            }
          }
          
          // Apply Gemini's confidence level to the scoring
          const confidenceMultiplier: { [key: string]: number } = {
            "High": 1.0,
            "Medium": 0.95,
            "Low": 0.85
          };
          
          const confidence = geminiAnalysis.confidenceLevel || "Medium";
          const confidenceAdjustment = confidenceMultiplier[confidence] || 0.95;
          
          // Analyze user query context for minimal contextual adjustment
          const queryContext = analyzeUserQueryContext(userQuery);
          let contextualAdjustment = 1.0;
          
          // Slight adjustments based on query context and Gemini's findings
          if (queryContext.isVerificationRequest && baseScore > 60) {
            contextualAdjustment = 1.02; // Very slight increase for verification on risky content
          } else if (queryContext.isIdentificationRequest && geminiAnalysis.riskCategories?.length > 0) {
            contextualAdjustment = 1.01; // Minimal boost for identification with detected risks
          }
            // Calculate final score using dynamic multipliers
          const finalScore = Math.round(baseScore * riskIntensityMultiplier * confidenceAdjustment * contextualAdjustment);
          
          // Ensure the score stays within reasonable bounds
          return Math.max(0, Math.min(100, finalScore));
        };
        
        // Helper function to analyze user query context
        function analyzeUserQueryContext(query: string): {
          isVerificationRequest: boolean;
          isIdentificationRequest: boolean;
          isSafetyInquiry: boolean;
          isActionRequest: boolean;
          queryType: string;
        } {
          const lowerQuery = query.toLowerCase();
          
          return {
            isVerificationRequest: /is this (safe|legit|real|true)|verify|check|legitimate|authentic/i.test(query),
            isIdentificationRequest: /what is|ano ito|para saan|identify|explain|describe/i.test(query),
            isSafetyInquiry: /safe|secure|trust|dangerous|harmful|scam|fraud/i.test(query),
            isActionRequest: /should i|dapat ba|pwede ba|can i|mag|gawin/i.test(query),
            queryType: lowerQuery.includes('what') ? 'identification' :
                       lowerQuery.includes('safe') ? 'safety' :
                       lowerQuery.includes('should') ? 'action' :
                       lowerQuery.includes('scam') ? 'threat_assessment' : 'general'
          };
        }

        // Format the response to match the expected interface, with contextual assessment
        // Let Gemini determine content type - only use simple fallbacks if Gemini doesn't provide it
        const contentType = analysis.contentClassification?.contentType || 
                            (audioBase64 ? "Audio" : 
                             imageBase64 ? "Image" : "Content");
        
        // Calculate intelligent risk score
        const intelligentRiskScore = calculateIntelligentRiskScore(analysis, textContent);
        const queryContext = analyzeUserQueryContext(textContent);
          // Generate assessment text based on Gemini's analysis and user query context
        const getIntelligentAssessmentText = (
          isRisky: boolean, 
          riskProb: number, 
          riskCategories: string[], 
          contentType: string,
          userQuery: string,
          geminiAnalysis: any
        ): string => {
          // Use Gemini's overall risk level if available
          const geminiRiskLevel = geminiAnalysis.overallRiskLevel;
          
          // For identification requests, use Gemini's content purpose/explanation
          if (queryContext.isIdentificationRequest) {
            const contentPurpose = geminiAnalysis.contentClassification?.contentPurpose;
            const contentExplanation = geminiAnalysis.contentClassification?.contentExplanation;
            
            if (riskProb >= 70) {
              return contentExplanation ? 
                `${contentType}: ${contentExplanation.split('.')[0]} - High Risk Detected` :
                `${contentType}: High-Risk Content Identified`;
            }
            if (riskProb >= 40) {
              return contentExplanation ?
                `${contentType}: ${contentExplanation.split('.')[0]} - Some Concerns` :
                `${contentType}: Content Identified with Concerns`;
            }
            return contentPurpose ?
              `${contentType}: ${contentPurpose}` :
              `${contentType}: Content Identified`;
          }
          
          // For safety inquiries, focus on Gemini's risk assessment
          if (queryContext.isSafetyInquiry) {
            if (geminiRiskLevel === "Very High" || geminiRiskLevel === "Critical") {
              return "High Risk - Not Safe";
            }
            if (geminiRiskLevel === "High") {
              return "Moderate-High Risk - Exercise Caution";
            }
            if (geminiRiskLevel === "Medium") {
              return "Moderate Risk - Some Concerns";
            }
            return "Low Risk - Generally Safe";
          }
          
          // For action requests, base on Gemini's risk assessment
          if (queryContext.isActionRequest) {
            if (riskProb >= 70) return "Do Not Proceed - High Risk";
            if (riskProb >= 50) return "Proceed with Extreme Caution";
            if (riskProb >= 25) return "Verify Before Proceeding";
            return "Safe to Proceed with Normal Precautions";
          }
          
          // Default assessment based on Gemini's overall risk level
          if (geminiRiskLevel) {
            return `${geminiRiskLevel} Risk Content`;
          }
          
          // Fallback based on probability if no risk level provided
          if (riskProb >= 80) return "Very High Risk Content";
          if (riskProb >= 60) return "High Risk Content";
          if (riskProb >= 35) return "Moderate Risk Content";
          if (riskProb >= 15) return "Low-Moderate Risk Content";
          return "Low Risk Content";
        };
          // Dynamic contextual risk summary based on Gemini's analysis
        const getContextualRiskSummary = (
          prob: number, 
          categories: string[], 
          contentType: string, 
          contentPurpose: string,
          userQuery: string,
          geminiAnalysis: any
        ): string => {
          // Analyze user's intent from their query
          const isAskingWhatItIs = /what is|ano ito|para saan|what's this/i.test(userQuery);
          const isAskingSafety = /safe|secure|trust|scam|legit/i.test(userQuery);
          const isAskingAction = /should i|dapat ba|pwede ba/i.test(userQuery);
          
          // Use Gemini's risk summary if available
          const geminiRiskSummary = geminiAnalysis.riskSummary;
          if (geminiRiskSummary && geminiRiskSummary.length > 0) {
            // Adapt Gemini's summary to user's query context
            if (isAskingWhatItIs) {
              return `🔍 ${geminiRiskSummary}`;
            }
            if (isAskingSafety) {
              return `🔒 ${geminiRiskSummary}`;
            }
            if (isAskingAction) {
              return `⚡ ${geminiRiskSummary}`;
            }
            return geminiRiskSummary;
          }
          
          // Dynamic fallback based on Gemini's overall assessment
          const riskLevel = geminiAnalysis.overallRiskLevel || "Low";
          
          if (riskLevel === "Very High" || riskLevel === "Critical") {
            if (isAskingWhatItIs) {
              return `🔴 This content appears to be very risky - Avoid interaction`;
            }
            return `🔴 Critical risk detected - Exercise extreme caution`;
          }
          
          if (riskLevel === "High") {
            if (isAskingSafety) {
              return "🚨 Not safe - High risk indicators present";
            }
            if (isAskingAction) {
              return "🚨 Recommended action: Do not proceed without verification";
            }
            return "🚨 High risk indicators detected - Proceed with caution";
          }
          
          if (riskLevel === "Medium") {
            if (isAskingWhatItIs && contentPurpose) {
              return `⚠️ This appears to be ${contentPurpose.toLowerCase()} with some concerning elements`;
            }
            return "⚠️ Some risk factors identified - Review carefully";
          }
          
          if (riskLevel === "Low") {
            if (isAskingSafety) {
              return "✓ Generally appears safe with minimal concerns";
            }
            if (isAskingWhatItIs && contentPurpose) {
              return `✅ This appears to be ${contentPurpose.toLowerCase()} and seems safe`;
            }
            return "✓ Low risk based on analysis";
          }
          
          // Final fallback
          return "✅ Content appears safe based on analysis";
        };
          // Dynamic display status based on Gemini's analysis and user query
        const getIntelligentDisplayStatus = (
          contentType: string, 
          riskLevel: string, 
          userQuery: string,
          riskCategories: string[],
          geminiAnalysis: any
        ): string => {
          // Use Gemini's content explanation for identification queries
          const isIdentificationQuery = /what is|ano ito|para saan|identify/i.test(userQuery);
          
          if (isIdentificationQuery) {
            const contentPurpose = geminiAnalysis.contentClassification?.contentPurpose;
            const contentExplanation = geminiAnalysis.contentClassification?.contentExplanation;
            
            // Use Gemini's explanation if available
            if (contentExplanation) {
              const shortExplanation = contentExplanation.split('.')[0];
              if (riskLevel === "High" || riskLevel === "Very High" || riskLevel === "Critical") {
                return `${contentType}: ${shortExplanation} - High Risk`;
              }
              return `${contentType}: ${shortExplanation}`;
            }
            
            // Use content purpose as fallback
            if (contentPurpose) {
              return `${contentType}: ${contentPurpose}`;
            }
            
            // Generic identification response
            return `${contentType}: Content Identified`;
          }
          
          // For safety queries, use Gemini's risk assessment
          if (/safe|secure|trust/i.test(userQuery)) {
            const safetyStatus = geminiAnalysis.overallRiskLevel || riskLevel;
            return `${contentType}: Safety Assessment - ${safetyStatus} Risk`;
          }
          
          // Default analysis status
          if (contentType === "Audio") {
            return "Voice Recording Analysis";
          }
          
          return `${contentType} Analysis`;
        };
        
        // Helper functions for query context
        function generateQuerySpecificAdvice(query: string, analysis: any): string {
          const intent = queryContext.queryType;
          
          switch (intent) {
            case "identification":
              return analysis.contentClassification?.contentExplanation || "Content has been identified and analyzed.";
            case "safety":
              return analysis.safetyAdvice || "Safety assessment completed.";            case "action":
              return generateActionRecommendation(intelligentRiskScore, analysis.riskCategories || [], analysis);
            case "threat_assessment":
              return analysis.detailedRiskAnalysis || "Threat assessment completed.";
            default:
              return analysis.safetyAdvice || "Analysis completed.";
          }
        }        function generateActionRecommendation(riskScore: number, riskCategories: string[], geminiAnalysis: any): string {
          // Use Gemini's safety advice if available
          const safetyAdvice = geminiAnalysis.safetyAdvice;
          if (safetyAdvice && safetyAdvice.length > 0) {
            // Extract actionable parts from Gemini's advice
            const actionableAdvice = safetyAdvice.split('.')[0];
            if (actionableAdvice.length > 0) {
              return actionableAdvice + ".";
            }
          }
          
          // Use Gemini's overall risk level for recommendations
          const riskLevel = geminiAnalysis.overallRiskLevel;
          if (riskLevel === "Very High" || riskLevel === "Critical") {
            return "❌ Do not proceed. Critical risk detected.";
          }
          if (riskLevel === "High") {
            return "⚠️ Proceed with extreme caution. Verify through other sources first.";
          }
          if (riskLevel === "Medium") {
            return "⚠️ Exercise caution. Consider additional verification.";
          }
          if (riskLevel === "Low") {
            return "✓ Generally safe to proceed with normal precautions.";
          }
          
          // Fallback based on score
          if (riskScore >= 70) {
            return "❌ Do not proceed. High risk detected.";
          }
          if (riskScore >= 50) {
            return "⚠️ Proceed with extreme caution. Verify through other sources first.";
          }
          if (riskScore >= 25) {
            return "⚠️ Exercise caution. Consider additional verification.";
          }
          return "✅ Safe to proceed based on current analysis.";
        }
        
      // Generate display status based on content type and risk level
      const getDisplayStatus = (contentType: string, overallRiskLevel: string): string => {
        // Don't include the risk level in the title - this will be shown by the risk percentage display
        let contentPrefix = contentType ? `${contentType} Analysis` : "Analysis Results";
        
        // For Audio specifically, always use "Voice Recording Analysis"
        if (contentType === "Audio") {
          contentPrefix = "Voice Recording Analysis";
        }
        
        return contentPrefix;
      };
        // Get risk categories in a readable format
      const riskCategories = analysis.riskCategories || [];      // Generate contextual risk summary - let Gemini's assessment drive the message
      const getRiskSummary = (prob: number, categories: string[]): string => {
        if (prob < 25) return "✅ Content appears safe based on AI analysis";
        if (prob >= 75) return "🔴 High risk content identified by AI analysis";
        if (prob >= 50) return "🚨 Significant risk indicators detected by AI";
        
        // For moderate risk, use simple generic message - let Gemini's explanation provide details
        return "⚠️ Some concerns identified - review AI analysis for details";
      };
        // Get indicators from Gemini's analysis only - no hardcoded patterns
      const getDisplayIndicators = (): string[] => {
        const indicators: string[] = [];
        
        // Only use indicators that Gemini actually provided in the analysis
        if (analysis.riskBreakdown?.threatRisk?.indicators?.length > 0) {
          const threatIndicators = analysis.riskBreakdown.threatRisk.indicators;
          indicators.push(...threatIndicators.slice(0, 2));
        }
        
        // Add other risk type indicators only if Gemini provided them
        ['misinformationRisk', 'privacyRisk', 'technicalRisk', 'manipulationRisk'].forEach(riskType => {
          if (analysis.riskBreakdown?.[riskType]?.indicators?.length > 0) {
            const topIndicator = analysis.riskBreakdown[riskType].indicators[0];
            if (topIndicator && !indicators.includes(topIndicator)) {
              indicators.push(topIndicator);
            }
          }
        });
        
        // If Gemini didn't provide specific indicators, use a simple completion message
        if (indicators.length === 0) {
          indicators.push("AI analysis completed");
        }
        
        return indicators.slice(0, 5); // Limit to 5 indicators
      };        const assessmentText = getIntelligentAssessmentText(
          analysis.isRisky !== undefined ? analysis.isRisky : false, 
          intelligentRiskScore,
          analysis.riskCategories || [],
          contentType,
          textContent,
          analysis
        );
          const contextualRiskSummary = getContextualRiskSummary(
          intelligentRiskScore,
          analysis.riskCategories || [],
          contentType,
          analysis.contentClassification?.contentPurpose || "",
          textContent,
          analysis
        );
          const intelligentDisplayStatus = getIntelligentDisplayStatus(
          contentType,
          analysis.overallRiskLevel || "Low",
          textContent,
          analysis.riskCategories || [],
          analysis
        );
        const formattedResponse = {
        // Required fields - make sure they are always present (updated for threat detection)
        isThreat: analysis.isRisky !== undefined ? analysis.isRisky : false,
        probability: intelligentRiskScore, // Use intelligent score instead of raw Gemini score
        confidence: analysis.confidenceLevel || "Medium",
        explanation: analysis.detailedRiskAnalysis || "No detailed risk analysis available.",
        explanationTagalog: analysis.detailedRiskAnalysisTagalog || "Hindi available ang detalyadong pagsusuri ng panganib.",
        riskLevel: analysis.overallRiskLevel || "Low",
        advice: analysis.safetyAdvice || "No specific advice available.",
        tutorialsAndTips: analysis.safetyTutorials || 
          (analysis.preventionStrategies?.threatPrevention || 
           analysis.preventionStrategies?.generalSafetyPractices || []),
        
        // Enhanced contextual fields
        status: intelligentDisplayStatus,
        assessment: assessmentText,
        contentType: contentType,
        riskSummary: contextualRiskSummary,
        indicators: getDisplayIndicators(),
        detectedRiskCategories: riskCategories,
        
        // Additional context for user query relevance
        queryContext: {
          userIntent: queryContext.queryType,
          relevantAdvice: generateQuerySpecificAdvice(textContent, analysis),
          actionRecommendation: generateActionRecommendation(intelligentRiskScore, analysis.riskCategories || [], analysis)
        },
        
        // Model information
        modelInfo: {
          modelName: analysis.modelUsed || GEMINI_MODELS[0],
          backupModelsAvailable: GEMINI_MODELS.length - 1
        },// Optional analysis fields - ensure audio analysis is always provided if audio was submitted
        audioAnalysis: audioBase64 ? (analysis.audioAnalysis || analysis.mainExplanation || "Audio content analyzed for potential risks and threat patterns.") : null,
        image_analysis: imageBase64 ? (analysis.imageAnalysis || analysis.contentClassification?.contentExplanation || null) : null,
        // Audience analysis for audio content specifically
        audienceAnalysis: audioBase64 ? (analysis.contentClassification?.audienceAnalysis?.targetAudience || "General audience") : null,        // Audio-specific fields - let Gemini provide the content
        keyPoints: audioBase64 ? (analysis.keyPoints || [
          "Content analyzed by AI for potential risks"
        ]) : null,
        
        // Voice authenticity information for audio content
        voiceAuthenticity: audioBase64 ? (analysis.contentDetails?.voiceAuthenticity || {
          isLikelySynthetic: false,
          authenticityIndicators: ["Standard analysis performed"],
          confidenceLevel: "Medium"
        }) : null,
          // Additional contextual fields
        contentPurpose: analysis.contentClassification?.contentPurpose || null,
        
        // OCR extraction information for transparency (when image contains text)
        extractedImageText: extractedImageText || null,
        audienceTarget: analysis.contentClassification?.audienceAnalysis?.targetAudience || null,        // Additional fields requested by users
        true_vs_false: analysis.contentEvaluation || analysis.contentVerification || null,
        true_vs_false_tagalog: analysis.contentEvaluationTagalog || analysis.contentVerificationTagalog || null,
        
        // Additional audio verification fields
        audioContentVerification: audioBase64 ? (analysis.contentVerification || analysis.contentEvaluation || null) : null,
        audioContentVerificationTagalog: audioBase64 ? (analysis.contentVerificationTagalog || analysis.contentEvaluationTagalog || null) : null,
        
        // Reporting information - include context-specific reporting advice
        complaintFilingInfo: {
          introduction: analysis.reportingInfo?.introduction || 
            `Report suspicious ${contentType.toLowerCase()} content to relevant authorities to protect yourself and others.`,
          agencies: analysis.reportingInfo?.agencies || 
            [
              {
                name: "Federal Trade Commission (FTC)",
                url: "https://www.consumer.ftc.gov/features/scam-alerts",
                description: "For reporting digital threats, identity theft, and fraudulent business practices in the US."
              },
              {
                name: "Internet Crime Complaint Center (IC3)",
                url: "https://www.ic3.gov",
                description: "For reporting internet-related criminal complaints in the US."
              }
            ]        }
      };
      
      // Update model information in the response
      formattedResponse.modelInfo = {
        modelName: analysis.modelUsed || GEMINI_MODELS[0], // Use the model that was actually used
        backupModelsAvailable: GEMINI_MODELS.length - 1
      };
        // Cache the successful response before returning
      responseCache.set(textContent, formattedResponse, imageBase64, audioBase64);
        // Create response with rate limit headers
      const response = NextResponse.json(formattedResponse, { status: 200 });
      
      // Add rate limit headers
      const rateLimitHeaders = getRateLimitHeaders();
      response.headers.set('X-RateLimit-Limit', rateLimitHeaders['X-RateLimit-Limit']);
      response.headers.set('X-RateLimit-Remaining', rateLimitHeaders['X-RateLimit-Remaining']);
      response.headers.set('X-RateLimit-Reset', rateLimitHeaders['X-RateLimit-Reset']);
      response.headers.set('X-Cache-Status', 'MISS');
      
      return response;} catch (processingError: any) {
      console.error('Error processing API response:', processingError);      // Provide a fallback response when the API call succeeds but formatting fails
      const contentType = content.includes("http") ? "Website" : 
                          imageBase64 ? "Image" : 
                          audioBase64 ? "Audio" : "Message";
                          
      const fallbackResponse = NextResponse.json({
        isThreat: false,
        probability: 0,
        confidence: "Low",
        explanation: "We encountered an issue processing this content. Please try again or submit different content for analysis.",
        explanationTagalog: "May naganap na problema sa pagproseso ng nilalaman. Pakisubukang muli o magsumite ng ibang nilalaman para sa pagsusuri.",
        riskLevel: "Low",
        status: `${contentType}: Analysis Incomplete`,
        assessment: "Analysis Incomplete",
        contentType: contentType,
        riskSummary: "⚠️ Unable to complete risk assessment for this content",
        indicators: ["Processing error", "Analysis incomplete"],
        detectedRiskCategories: [],
        advice: `We recommend resubmitting your ${contentType.toLowerCase()} content for analysis.`,
        tutorialsAndTips: [
          `Verify the format of your ${contentType.toLowerCase()} content.`, 
          "Try with a smaller or clearer sample.", 
          "Ensure the content is in a supported language.",
          "Remove any encrypted or heavily formatted elements.",
          "If the issue persists, please contact support."
        ],
        modelInfo: {
          modelName: "unknown",
          backupModelsAvailable: GEMINI_MODELS.length - 1,
          modelsAttempted: GEMINI_MODELS
        },
        complaintFilingInfo: {
          introduction: "Since analysis is incomplete, we can't provide specific reporting guidance.",
          agencies: [
            {
              name: "CyberSafe 4B Support",
              url: "#",
              description: "Contact our support team for assistance with content that fails to process properly."
            }
          ]        }
      }, { status: 200 });
        // Add rate limit headers even for processing error responses
      const rateLimitHeaders = getRateLimitHeaders();
      fallbackResponse.headers.set('X-RateLimit-Limit', rateLimitHeaders['X-RateLimit-Limit']);
      fallbackResponse.headers.set('X-RateLimit-Remaining', rateLimitHeaders['X-RateLimit-Remaining']);
      fallbackResponse.headers.set('X-RateLimit-Reset', rateLimitHeaders['X-RateLimit-Reset']);
      fallbackResponse.headers.set('X-Cache-Status', 'ERROR');
      
      return fallbackResponse;
    }
  } catch (error: any) {
    console.error('Error in /api/detect-threat:', error);
    
    // Provide enhanced error information for model failures
    if (error.message.includes('All Gemini models failed')) {
      const response = NextResponse.json({ 
        message: `All Gemini models failed. We tried: ${GEMINI_MODELS.join(', ')}. Please try again later or contact support.`,
        modelsFailed: GEMINI_MODELS,
        originalError: error.message || 'Unknown error'
      }, { status: 503 }); // Service Unavailable
        // Add rate limit headers even for error responses
      const rateLimitHeaders = getRateLimitHeaders();
      response.headers.set('X-RateLimit-Limit', rateLimitHeaders['X-RateLimit-Limit']);
      response.headers.set('X-RateLimit-Remaining', rateLimitHeaders['X-RateLimit-Remaining']);
      response.headers.set('X-RateLimit-Reset', rateLimitHeaders['X-RateLimit-Reset']);
      
      return response;
    }
    
    const response = NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
    
    // Add rate limit headers even for error responses
    const rateLimitHeaders = getRateLimitHeaders();
    response.headers.set('X-RateLimit-Limit', rateLimitHeaders['X-RateLimit-Limit']);
    response.headers.set('X-RateLimit-Remaining', rateLimitHeaders['X-RateLimit-Remaining']);
    response.headers.set('X-RateLimit-Reset', rateLimitHeaders['X-RateLimit-Reset']);
    
    return response;
  }
}

// Cache management endpoints
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'stats':
      const stats = responseCache.getStats();
      return NextResponse.json({
        cache: stats,
        message: `Cache contains ${stats.size} entries (max: ${stats.maxSize}). Hit rate: ${stats.hitRate}%`
      });
    
    case 'clear':
      responseCache.clear();
      return NextResponse.json({ message: 'Cache cleared successfully and statistics reset' });
    
    case 'reset-stats':
      responseCache.resetStats();
      return NextResponse.json({ message: 'Cache statistics reset successfully' });
      
    case 'models':
      return NextResponse.json({ 
        models: GEMINI_MODELS,
        primary: GEMINI_MODELS[0],
        fallback: GEMINI_MODELS.slice(1),
        apiConfigured: !!GEMINI_API_KEY
      });
    
    default:
      return NextResponse.json({ 
        message: 'Cache management endpoint',
        availableActions: ['stats', 'clear', 'reset-stats'],
        usage: {
          stats: '/api/detect-threat?action=stats',
          clear: '/api/detect-threat?action=clear',
          'reset-stats': '/api/detect-threat?action=reset-stats'
        }
      });
  }
}
