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
  'gemini-2.0-flash', // Primary model (fastest)
  'gemini-2.0',       // Fallback model 1 (high quality)
  'gemini-2.0-vision', // Fallback model 2 (for vision capabilities)
  'gemini-1.5-pro',   // Legacy fallback if 2.0 models are unavailable
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

// Extract keywords from text
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function extractKeywords(text: string): string[] {
  if (!text) return [];
  
  const keywords: string[] = [];
  const lowerText = text.toLowerCase();
  
  // Common threat-related keywords
  const threatKeywords = [
    'urgent', 'immediate', 'verify', 'account', 'banking', 'password',
    'prize', 'winner', 'lottery', 'investment', 'bitcoin', 'cryptocurrency',
    'gift card', 'payment', 'transfer', 'hack', 'suspicious', 'government',
    'bank', 'security', 'fraud', 'alert', 'access', 'limited time',
    'phishing', 'scam', 'warning', 'verify', 'social security', 'tax',
    'deepfake', 'ai-generated', 'social engineering', 'malware', 'cyber attack'
  ];
  
  threatKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      keywords.push(keyword);
    }
  });
  
  return keywords;
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
): Promise<any> {
  const prompt = `You are a balanced cybersecurity and content analysis specialist with expertise in Philippine digital threats and content verification. Your task is to objectively analyze the provided audio recording to determine if it contains genuine threats, fraud, or significant security risks while distinguishing between legitimate content and actual dangers.

${content.trim() ? `Additional context provided by user: "${content}"` : "No additional text context provided by the user."}
${imageBase64 ? "An image has also been provided for analysis alongside the audio, which may provide additional context or supplementary information." : ""}

INSTRUCTIONS FOR BALANCED AUDIO ANALYSIS:
Analyze the audio content objectively to determine its nature and any genuine security risks. Consider:

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

For audio content, provide a balanced risk assessment:
- GENUINE THREAT IDENTIFICATION: Only identify actual security threats, scams, or fraud attempts
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
- "safetyAdvice": string (provide balanced safety advice in English. For legitimate content, acknowledge its nature and provide general digital literacy advice rather than treating it as a threat).
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
  }    const prompt = `You are an elite cybersecurity, fraud detection, and risk assessment specialist with expertise in Philippine digital threats, global cyber attacks, and potentially harmful content. Your task is to thoroughly analyze the ${content.trim() ? "following text" : "provided image"} for any signs of threats, phishing, fraudulent activity, misinformation, dangerous content, or other potential risks. The user is likely in the Philippines and needs a comprehensive assessment of all potential hazards.

${content.trim() ? `Content to analyze: "${content}"` : "No text provided for analysis."}
${imageBase64 ? (content.trim() ? "An image has also been provided for analysis alongside the text." : "Only an image has been provided for analysis.") : ""}

SPECIAL INSTRUCTIONS FOR WEBSITE ANALYSIS AND RISK ASSESSMENT:
If the content appears to be a website URL or description of a website, provide an in-depth analysis including:
1. Website purpose identification - what the site claims to be for and its potential risks
2. Website legitimacy assessment - whether it appears to be what it claims with multiple verification points
3. Registration information analysis - domain age, ownership transparency, registration patterns that indicate risk
4. Content analysis - professional vs. suspicious elements, misleading information, dangerous content
5. Security indicators - https, certificates, privacy policies, data collection practices, permissions requested
6. Risk patterns analysis - comparison with known threat, phishing, and malicious website patterns
7. Target audience vulnerability assessment - why specific demographics might be at risk and impact level
8. Filipino-specific risk indicators - cultural, linguistic or regional factors that increase danger to local users
9. Technical risk assessment - potential malware, phishing infrastructure, suspicious redirects, data harvesting
10. Safe browsing recommendations specific to the identified risks
11. Content trustworthiness evaluation - accuracy, source credibility, factual consistency
12. Potential harm classification - financial, personal data, misinformation, illegal activities, malicious software

Conduct a comprehensive forensic analysis and risk assessment of the ${content.trim() ? "text" : "image"} with particular attention to all types of potential dangers including threats, misinformation, harmful content, privacy risks, technical vulnerabilities, and manipulation tactics prevalent in the Philippines and Southeast Asia. Consider language patterns, urgency indicators, request types, technical elements, contextual red flags, psychological manipulation tactics, and potential harm vectors. 

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
- "safetyAdvice": string (provide detailed, actionable safety advice in English specific to ALL risks identified. For high risk scenarios, include specific protective actions the user should take immediately. For medium-low risk, provide contextual safety practices. Include both immediate steps and longer-term protective measures).
- "safetyTutorials": array of strings (provide 6-8 detailed, actionable tutorials in English on how to identify and protect against ALL types of risks identified. Each tutorial should be comprehensive yet concise, include the reasoning behind it, examples of what to look for, and be directly relevant to the specific risks in the analyzed content. Cover different risk categories - not just threats but also misinformation, harmful content, technical risks, etc. Tailor to the Philippine context when relevant).
- "preventionStrategies": object with the following fields (provide strategies for different risk types):
    - "threatPrevention": array of strings (specific strategies for avoiding threats)
    - "misinformationDefense": array of strings (methods to verify information accuracy)
    - "privacyProtection": array of strings (ways to safeguard personal information)
    - "technicalSafeguards": array of strings (technical measures to protect devices/accounts)
    - "generalSafetyPractices": array of strings (broader digital safety practices)
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
    - "audienceAnalysis": object with the following fields:
        - "targetAudience": string (Who is the target audience for this content)
        - "vulnerabilityFactors": array of strings (Specific factors that might make the target audience vulnerable)
        - "potentialImpact": string (The potential effect or harm this content could have on its audience)
    - "trustworthinessIndicators": object with the following fields:
        - "positiveIndicators": array of strings (Elements that suggest the content may be legitimate or trustworthy)
        - "negativeIndicators": array of strings (Elements that raise concerns about trustworthiness)
        - "overallAssessment": string (Final evaluation of content trustworthiness)
    - "contentExplanation": string (A concise yet thorough explanation of what this content is, its purpose, legitimacy concerns, and ALL potential risks in plain language that non-technical users will understand. For websites, include what the site is for and potential dangers)
    - "contentExplanationTagalog": string (A natural Tagalog translation of the content explanation that ordinary Filipino users can easily understand)
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
  }  try {
    const body = await request.json();
    const { content, imageBase64, audioBase64, simulateOCR, simulatedOCRText } = body;  // Accept optional image and audio data    
    
    // Allow content to be empty if an image or audio is provided
    if ((!content || typeof content !== 'string') && !imageBase64 && !audioBase64) {
      return NextResponse.json({ message: 'Either text content, image, or audio recording is required' }, { status: 400 });
    }
    
    console.log(`🚀 Starting analysis with Gemini model fallback system (${GEMINI_MODELS.length} models available)`);
    
    // Use empty string if content is not provided but image/audio is
    const textContent = content || '';
      // Check cache first
    const cachedResponse = responseCache.get(textContent, imageBase64, audioBase64);
    if (cachedResponse) {
      console.log('✅ Returning cached response - skipping API call');
      return NextResponse.json(cachedResponse);
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
        analysis = await analyzeWithGemini(textContent, imageBase64);      }
        // Format the response to match the expected interface, with contextual assessment
        // Let Gemini determine content type - only use simple fallbacks if Gemini doesn't provide it
      const contentType = analysis.contentClassification?.contentType || 
                          (audioBase64 ? "Audio" : 
                           imageBase64 ? "Image" : "Content");
        // Generate assessment text based purely on Gemini's risk assessment
      const getAssessmentText = (isRisky: boolean, riskProb: number): string => {
        // Use simple, universal logic - let Gemini's explanation provide the details
        if (riskProb >= 75) return "High Risk Content";
        if (riskProb >= 50) return "Moderate Risk Content";
        if (riskProb >= 25) return "Low-Moderate Risk Content";
        return "Low Risk Content";
      };
        
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
      };
        const assessmentText = getAssessmentText(
        analysis.isRisky !== undefined ? analysis.isRisky : false, 
        analysis.overallRiskProbability || 0
      );
        const riskSummary = getRiskSummary(
        analysis.overallRiskProbability || 0,
        analysis.riskCategories || []
      );
      
      const formattedResponse = {
        // Required fields - make sure they are always present (updated for threat detection)
        isThreat: analysis.isRisky !== undefined ? analysis.isRisky : false,
        probability: analysis.overallRiskProbability !== undefined ? analysis.overallRiskProbability : 0,
        confidence: analysis.confidenceLevel || "Medium",
        explanation: analysis.detailedRiskAnalysis || "No detailed risk analysis available.",
        explanationTagalog: analysis.detailedRiskAnalysisTagalog || "Hindi available ang detalyadong pagsusuri ng panganib.",
        riskLevel: analysis.overallRiskLevel || "Low",
        advice: analysis.safetyAdvice || "No specific advice available.",
        tutorialsAndTips: analysis.safetyTutorials || 
          (analysis.preventionStrategies?.threatPrevention || 
           analysis.preventionStrategies?.generalSafetyPractices || []),
        // Model information
        modelInfo: {
          modelName: analysis.modelUsed || GEMINI_MODELS[0],
          backupModelsAvailable: GEMINI_MODELS.length - 1
        },

        // Contextual assessment fields
        status: getDisplayStatus(contentType, analysis.overallRiskLevel || "Low"),
        assessment: assessmentText,
        contentType: contentType,
        riskSummary: riskSummary,
        indicators: getDisplayIndicators(),
        detectedRiskCategories: riskCategories,        // Optional analysis fields - ensure audio analysis is always provided if audio was submitted
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
      
      return NextResponse.json(formattedResponse, { status: 200 });
    } catch (processingError: any) {
      console.error('Error processing API response:', processingError);      // Provide a fallback response when the API call succeeds but formatting fails
      const contentType = content.includes("http") ? "Website" : 
                          imageBase64 ? "Image" : 
                          audioBase64 ? "Audio" : "Message";
                          
      return NextResponse.json({
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
              name: "Digital Threat Shield Support",
              url: "#",
              description: "Contact our support team for assistance with content that fails to process properly."
            }
          ]
        }
      }, { status: 200 });
    }
  } catch (error: any) {
    console.error('Error in /api/detect-threat:', error);
    
    // Provide enhanced error information for model failures
    if (error.message.includes('All Gemini models failed')) {
      return NextResponse.json({ 
        message: `All Gemini models failed. We tried: ${GEMINI_MODELS.join(', ')}. Please try again later or contact support.`,
        modelsFailed: GEMINI_MODELS,
        originalError: error.message || 'Unknown error'
      }, { status: 503 }); // Service Unavailable
    }
    
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
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
