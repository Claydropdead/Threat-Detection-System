// Google Custom Search API integration for fact-checking and misinformation detection
// Uses intelligent keyword extraction to find supporting or contradictory articles

export interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
  formattedUrl: string;
}

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

export interface KeywordExtractionResult {
  primaryKeywords: string[];
  factCheckKeywords: string[];
  searchQueries: string[];
}

/**
 * Intelligently extracts keywords for fact-checking using semantic analysis
 */
export function extractIntelligentKeywords(content: string, contentType?: string): KeywordExtractionResult {
  if (!content) {
    return {
      primaryKeywords: [],
      factCheckKeywords: [],
      searchQueries: []
    };
  }

  // Smart semantic analysis - identify content structure and intent
  const semanticAnalysis = analyzeContentSemantics(content);
  
  // Extract contextually relevant entities
  const contextualEntities = extractContextualEntities(content, semanticAnalysis);
  
  // Extract verifiable statements using linguistic analysis
  const verifiableStatements = extractVerifiableStatements(content, semanticAnalysis);
  
  // Extract domain-specific claims based on content analysis
  const domainClaims = extractDomainSpecificClaims(content, semanticAnalysis);
  
  // Smart keyword prioritization based on verifiability potential
  const prioritizedKeywords = prioritizeByVerifiability([
    ...contextualEntities,
    ...verifiableStatements,
    ...domainClaims
  ], semanticAnalysis);
  
  // Generate intelligent fact-check queries
  const smartQueries = generateSmartQueries(prioritizedKeywords, semanticAnalysis, contentType);
  
  // Create fact-check keywords with semantic context
  const contextualFactCheckKeywords = generateContextualFactCheckTerms(prioritizedKeywords, semanticAnalysis);
  
  return {
    primaryKeywords: prioritizedKeywords.slice(0, 15),
    factCheckKeywords: contextualFactCheckKeywords.slice(0, 25),
    searchQueries: smartQueries.slice(0, 12)
  };
}

/**
 * Extract named entities (people, places, organizations)
 */
function extractNamedEntities(text: string): string[] {
  const entities: string[] = [];
    // Common patterns for named entities
  const patterns = [
    // People names (capitalized words, often with titles)
    /(?:(?:Dr|Mr|Ms|Mrs|President|CEO|Director|Minister)\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
    // Company/Organization names with common suffixes
    /([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*(?:\s+(?:Inc|Corp|LLC|Ltd|Company|Corporation|Organization|Foundation|University|Hospital|Bank|Group|Holdings|Enterprises|Technologies|Solutions|Systems|Services|Pharma|Bio|Medical|Research|Institute|Center|Academy))?)/g,
    // Place names (often preceded by prepositions)
    /(?:in|from|at|to|near|around|across|throughout)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
    // Product/Brand names (capitalized words)
    /([A-Z][a-zA-Z]+(?:[A-Z][a-z]*)*)/g,
    // Website domains and URLs
    /((?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g,
    // Specific health/medical terms
    /(COVID-19|coronavirus|FDA|CDC|WHO|NIH|vaccine|treatment|therapy|medication|drug|supplement)/gi,
    // Financial terms
    /(Bitcoin|cryptocurrency|forex|investment|stock|bond|mutual fund|ETF|401k|IRA|SEC|FINRA)/gi,
    // Enhanced cybersecurity and threat-specific patterns
    /(APT\s*\d+|Advanced Persistent Threat|malware|ransomware|spyware|adware|trojan|virus|worm|botnet|phishing|spear phishing|social engineering|zero[- ]?day|exploit|vulnerability|CVE-\d{4}-\d+|CERT|CISA|NSA|DHS|FBI|threat actor|cyber attack|data breach|security incident)/gi,
    // Specific cyber threat names and campaigns
    /(Dance of the Hillary|Operation\s+\w+|Stuxnet|WannaCry|NotPetya|SolarWinds|Log4j|Heartbleed|Spectre|Meltdown|KRACK|BlueBorne|EternalBlue|DoublePulsar)/gi,
    // Government agencies and cybersecurity organizations
    /(Bureau of Corrections|BuCor|Department of Justice|DOJ|National Security Agency|NSA|Cybersecurity and Infrastructure Security Agency|CISA|Federal Bureau of Investigation|FBI|Department of Homeland Security|DHS)/gi,
    // Technical indicators and file hashes
    /([a-fA-F0-9]{32}|[a-fA-F0-9]{40}|[a-fA-F0-9]{64}|[a-fA-F0-9]{128})/g,
    // IP addresses and network indicators
    /(\b(?:\d{1,3}\.){3}\d{1,3}\b|[a-fA-F0-9:]+::[a-fA-F0-9:]*)/g
  ];
  
  patterns.forEach(pattern => {
    const matches = [...text.matchAll(pattern)];
    matches.forEach(match => {
      if (match[1] && match[1].trim().length > 2) {
        entities.push(match[1].trim());
      }
    });
  });
  
  return [...new Set(entities)].filter(entity => 
    entity.length > 2 && 
    entity.length < 50 && // Avoid overly long matches
    !/^\d+$/.test(entity) // Exclude pure numbers
  );
}

/**
 * Extract claims and statements that can be fact-checked
 */
function extractClaims(text: string): string[] {
  const claims: string[] = [];
  
  // Look for claim indicators with more comprehensive patterns
  const claimPatterns = [
    // Research and study claims
    /(?:studies show|research proves|scientists discovered|experts say|according to|data shows|evidence suggests|research indicates|study finds|studies reveal|analysis shows)\s+([^.!?\n]+)/gi,
    
    // Proof and verification claims
    /(?:it is proven|it has been proven|proven to|guaranteed to|scientifically proven|clinically proven|medically proven|FDA approved|doctor recommended)\s+([^.!?\n]+)/gi,
    
    // Health and medical claims
    /(?:causes|prevents|cures|treats|reduces|increases|improves|eliminates|reverses|heals|strengthens|boosts|enhances|protects against)\s+([^.!?\n]+)/gi,
    
    // Statistical claims
    /(\d+(?:\.\d+)?%?\s+(?:of|increase|decrease|reduction|improvement|more|less|higher|lower|faster|slower)[^.!?\n]+)/gi,
    
    // Recent discovery claims
    /(?:new study|recent research|clinical trial|survey finds|breakthrough|discovery|latest research|new findings|recent analysis)\s+([^.!?\n]+)/gi,
    
    // Comparative claims
    /(?:better than|worse than|more effective than|safer than|faster than|stronger than|superior to|inferior to)\s+([^.!?\n]+)/gi,
    
    // Definitive statements
    /(?:the truth is|the fact is|it's a fact that|without a doubt|absolutely|definitely|certainly|undoubtedly)\s+([^.!?\n]+)/gi,
    
    // Warning claims
    /(?:warning|alert|danger|risk|threat|hazard|unsafe|toxic|harmful|dangerous)\s*:?\s*([^.!?\n]+)/gi
  ];
  
  claimPatterns.forEach(pattern => {
    const matches = [...text.matchAll(pattern)];
    matches.forEach(match => {
      if (match[1] && match[1].trim().length > 10) {
        claims.push(match[1].trim());
      }
    });
  });
  
  // Extract sentences that contain strong assertion words
  const sentences = text.split(/[.!?]+/);
  const assertionWords = ['always', 'never', 'all', 'every', 'none', 'only', 'guaranteed', 'certain', 'impossible', 'inevitable'];
  
  sentences.forEach(sentence => {
    const lowerSentence = sentence.toLowerCase();
    if (assertionWords.some(word => lowerSentence.includes(word)) && sentence.trim().length > 20) {
      claims.push(sentence.trim());
    }
  });
  
  return [...new Set(claims)].filter(claim => 
    claim.length > 10 && 
    claim.length < 200 // Avoid overly long claims
  );
}

/**
 * Extract numerical facts and statistics
 */
function extractNumericalFacts(text: string): string[] {
  const facts: string[] = [];
  
  const patterns = [
    /(\d+(?:\.\d+)?%[^.!?]*)/g,
    /(\$\d+(?:,\d{3})*(?:\.\d{2})?[^.!?]*)/g,
    /(\d+(?:,\d{3})*\s+(?:people|users|customers|deaths|cases|incidents)[^.!?]*)/g,
    /(\d+(?:\.\d+)?\s+(?:times|fold|percent|percentage)[^.!?]*)/g
  ];
  
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      facts.push(...matches.map(match => match.trim()));
    }
  });
  
  return facts;
}

/**
 * Extract health and medical claims
 */
function extractHealthClaims(text: string): string[] {
  const claims: string[] = [];
  
  const healthKeywords = [
    'covid', 'vaccine', 'medicine', 'treatment', 'cure', 'cancer', 'diabetes',
    'weight loss', 'supplement', 'vitamin', 'drug', 'medication', 'therapy',
    'healing', 'remedy', 'antioxidant', 'immune', 'detox', 'organic'
  ];
  
  healthKeywords.forEach(keyword => {
    const regex = new RegExp(`${keyword}[^.!?]*`, 'gi');
    const matches = text.match(regex);
    if (matches) {
      claims.push(...matches.map(match => match.trim()));
    }
  });
  
  return claims;
}

/**
 * Extract financial and investment claims
 */
function extractFinancialClaims(text: string): string[] {
  const claims: string[] = [];
  
  const patterns = [
    /(guaranteed returns?[^.!?]*)/gi,
    /(risk-free investment[^.!?]*)/gi,
    /(double your money[^.!?]*)/gi,
    /(cryptocurrency[^.!?]*)/gi,
    /(bitcoin[^.!?]*)/gi,
    /(forex[^.!?]*)/gi,
    /(\d+%\s+(?:profit|return|interest)[^.!?]*)/gi,
    /(make money fast[^.!?]*)/gi,
    /(passive income[^.!?]*)/gi
  ];
  
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      claims.push(...matches.map(match => match.trim()));
    }
  });
  
  return claims;
}

/**
 * Extract product and service claims
 */
function extractProductClaims(text: string): string[] {
  const claims: string[] = [];
  
  const patterns = [
    /(revolutionary[^.!?]*)/gi,
    /(breakthrough[^.!?]*)/gi,
    /(miracle[^.!?]*)/gi,
    /(secret[^.!?]*)/gi,
    /(exclusive[^.!?]*)/gi,
    /(limited time[^.!?]*)/gi,
    /(act now[^.!?]*)/gi,
    /(free trial[^.!?]*)/gi
  ];
  
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      claims.push(...matches.map(match => match.trim()));
    }
  });
  
  return claims;
}

/**
 * Generate intelligent search queries for fact-checking
 */
function generateSearchQueries(keywords: string[], contentType?: string): string[] {
  const queries: string[] = [];
  
  // Primary keywords combined with fact-check terms
  const factCheckTerms = ['fact check', 'debunked', 'verified', 'true or false', 'hoax', 'misinformation'];
  
  keywords.slice(0, 5).forEach(keyword => {
    factCheckTerms.forEach(term => {
      queries.push(`"${keyword}" ${term}`);
    });
  });
  
  // Specific queries based on content type
  if (contentType === 'health') {
    queries.push(...keywords.slice(0, 3).map(k => `"${k}" medical research study`));
    queries.push(...keywords.slice(0, 3).map(k => `"${k}" FDA approved`));
  } else if (contentType === 'financial') {
    queries.push(...keywords.slice(0, 3).map(k => `"${k}" SEC warning`));
    queries.push(...keywords.slice(0, 3).map(k => `"${k}" investment scam`));
  } else if (contentType === 'news') {
    queries.push(...keywords.slice(0, 3).map(k => `"${k}" news verification`));
    queries.push(...keywords.slice(0, 3).map(k => `"${k}" fact checker`));
  }
  
  // Credible source queries
  const credibleSources = ['site:snopes.com', 'site:factcheck.org', 'site:politifact.com', 'site:reuters.com', 'site:apnews.com'];
  credibleSources.forEach(source => {
    if (keywords.length > 0) {
      queries.push(`${keywords[0]} ${source}`);
    }
  });
  
  return [...new Set(queries)]; // Remove duplicates
}

/**
 * Perform Google Custom Search with intelligent queries
 */
export async function performFactCheckSearch(content: string, contentType?: string): Promise<FactCheckResult> {
  const apiKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CX;
  
  if (!apiKey || !cx) {
    throw new Error('Google Search API credentials not configured');
  }
  
  const keywords = extractIntelligentKeywords(content, contentType);
  const allResults: GoogleSearchResult[] = [];
    // Search with different queries to get comprehensive results
  // Limit to 3 queries for better performance and rate limit compliance
  const maxQueries = Math.min(3, keywords.searchQueries.length);
  
  for (let i = 0; i < maxQueries; i++) {
    const query = keywords.searchQueries[i];
    try {
      const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=5`;
      
      console.log(`🔍 Fact-check search ${i + 1}/${maxQueries}: "${query}"`);
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        if (data.items) {
          const results: GoogleSearchResult[] = data.items.map((item: any) => ({
            title: item.title,
            link: item.link,
            snippet: item.snippet,
            displayLink: item.displayLink,
            formattedUrl: item.formattedUrl
          }));
          allResults.push(...results);
          console.log(`✅ Found ${results.length} results for query: "${query}"`);
        } else {
          console.log(`ℹ️ No results found for query: "${query}"`);
        }
      } else {
        console.warn(`⚠️ Search API error ${response.status} for query: "${query}"`);
      }
      
      // Add delay to respect rate limits (200ms between requests)
      if (i < maxQueries - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error('❌ Error searching with query:', query, error);
    }
  }
  
  // Categorize results
  const factCheckSources = allResults.filter(result => 
    isFactCheckSource(result.displayLink) || 
    containsFactCheckTerms(result.title) || 
    containsFactCheckTerms(result.snippet)
  );
  
  const supportingArticles = allResults.filter(result => 
    !factCheckSources.includes(result) && 
    containsSupportiveTerms(result.snippet, keywords.primaryKeywords)
  );
  
  const contradictingArticles = allResults.filter(result => 
    !factCheckSources.includes(result) && 
    !supportingArticles.includes(result) &&
    containsContradictoryTerms(result.snippet)
  );
  
  // Calculate credibility score
  const credibilityScore = calculateCredibilityScore(factCheckSources, supportingArticles, contradictingArticles);
  
  // Determine misinformation risk
  const misinformationRisk = determineMisinformationRisk(credibilityScore, factCheckSources, contradictingArticles);
  
  // Generate summary
  const summary = generateFactCheckSummary(keywords.primaryKeywords, factCheckSources, supportingArticles, contradictingArticles, misinformationRisk);
  
  return {
    claim: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
    keywords: keywords.primaryKeywords,
    supportingArticles: supportingArticles.slice(0, 5),
    contradictingArticles: contradictingArticles.slice(0, 5),
    factCheckSources: factCheckSources.slice(0, 5),
    credibilityScore,
    misinformationRisk,
    summary
  };
}

/**
 * Check if a domain is a known fact-checking source
 */
function isFactCheckSource(domain: string): boolean {
  const factCheckDomains = [
    // Traditional fact-checkers
    'snopes.com', 'factcheck.org', 'politifact.com', 'fullfact.org',
    'factchecker.in', 'checkyourfact.com', 'truthorfiction.com',
    'hoax-slayer.net', 'leadstories.com', 'factly.in',
    'factcrescendo.com', // Added based on our results
    
    // News organizations with fact-checking
    'reuters.com', 'apnews.com', 'bbc.com', 'cnn.com', 'npr.org',
    'washingtonpost.com', 'nytimes.com', 'cnbctv18.com',
    
    // Government cybersecurity sources
    'us-cert.cisa.gov', 'cisa.gov', 'cyber.gov', 'nist.gov', 'fbi.gov',
    'dhs.gov', 'ncsc.gov.uk', 'cyber.gc.ca',
    
    // Cybersecurity organizations and research
    'sans.org', 'cert.org', 'mitre.org', 'first.org',
    
    // Cybersecurity news and analysis
    'krebs.com', 'krebsonsecurity.com', 'securityweek.com', 'darkreading.com',
    'threatpost.com', 'bleepingcomputer.com', 'thehackernews.com',
    'securityboulevard.com', 'infosecurity-magazine.com',
    
    // Social media verification (when used for fact-checking)
    'facebook.com', 'linkedin.com', 'twitter.com', // When experts post debunking content
    
    // Academic and research institutions
    'arxiv.org', 'ieee.org', 'acm.org'
  ];
  
  return factCheckDomains.some(fcDomain => domain.toLowerCase().includes(fcDomain));
}

/**
 * Check if text contains fact-checking terms
 */
function containsFactCheckTerms(text: string): boolean {
  const factCheckTerms = [
    'fact check', 'debunked', 'false claim', 'misleading', 'unsubstantiated',
    'verified', 'true', 'false', 'hoax', 'misinformation', 'disinformation'
  ];
  
  const lowerText = text.toLowerCase();
  return factCheckTerms.some(term => lowerText.includes(term));
}

/**
 * Check if text contains supportive terms for the keywords
 */
function containsSupportiveTerms(text: string, keywords: string[]): boolean {
  const supportiveTerms = [
    'confirmed', 'verified', 'proven', 'research shows', 'study confirms',
    'experts agree', 'evidence suggests', 'data indicates'
  ];
  
  const lowerText = text.toLowerCase();
  const hasKeywords = keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
  const hasSupportiveTerms = supportiveTerms.some(term => lowerText.includes(term));
  
  return hasKeywords && hasSupportiveTerms;
}

/**
 * Check if text contains contradictory terms
 */
function containsContradictoryTerms(text: string): boolean {
  const contradictoryTerms = [
    'debunked', 'false', 'misleading', 'unproven', 'no evidence',
    'disproven', 'myth', 'hoax', 'scam', 'fraudulent', 'fake'
  ];
  
  const lowerText = text.toLowerCase();
  return contradictoryTerms.some(term => lowerText.includes(term));
}

/**
 * Calculate credibility score based on search results
 */
function calculateCredibilityScore(
  factCheckSources: GoogleSearchResult[],
  supportingArticles: GoogleSearchResult[],
  contradictingArticles: GoogleSearchResult[]
): number {
  let score = 50; // Start with neutral score
  
  // Fact-check sources heavily influence score
  factCheckSources.forEach(source => {
    if (containsContradictoryTerms(source.snippet)) {
      score -= 20; // Fact-checkers saying it's false - stronger penalty
    } else if (containsSupportiveTerms(source.snippet, [])) {
      score += 10; // Fact-checkers confirming it
    }
    
    // Bonus penalty for explicit debunking terms
    const snippet = source.snippet.toLowerCase();
    if (snippet.includes('hoax') || snippet.includes('fake') || snippet.includes('false') || 
        snippet.includes('debunked') || snippet.includes('misinformation')) {
      score -= 15; // Additional penalty for explicit debunking
    }
  });
  
  // Supporting articles add credibility
  score += Math.min(supportingArticles.length * 2, 15);
  
  // Contradicting articles reduce credibility
  score -= Math.min(contradictingArticles.length * 3, 20);
  
  // Ensure score is within bounds
  return Math.max(0, Math.min(100, score));
}

/**
 * Determine misinformation risk level
 */
function determineMisinformationRisk(
  credibilityScore: number,
  factCheckSources: GoogleSearchResult[],
  contradictingArticles: GoogleSearchResult[]
): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  // Check if fact-checkers explicitly debunked this
  const explicitlyDebunked = factCheckSources.some(source => 
    containsContradictoryTerms(source.snippet)
  );
  
  if (explicitlyDebunked) {
    return 'CRITICAL';
  }
  
  if (credibilityScore < 25 || contradictingArticles.length >= 3) {
    return 'HIGH';
  } else if (credibilityScore < 50 || contradictingArticles.length >= 1) {
    return 'MEDIUM';
  } else {
    return 'LOW';
  }
}

/**
 * Generate a summary of the fact-check results
 */
function generateFactCheckSummary(
  keywords: string[],
  factCheckSources: GoogleSearchResult[],
  supportingArticles: GoogleSearchResult[],
  contradictingArticles: GoogleSearchResult[],
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
): string {
  let summary = `Fact-check analysis for: ${keywords.slice(0, 3).join(', ')}\n\n`;
  
  // Analyze the types of sources found
  const debunkingSources = factCheckSources.filter(source => 
    source.snippet.toLowerCase().includes('hoax') || 
    source.snippet.toLowerCase().includes('false') ||
    source.snippet.toLowerCase().includes('debunked') ||
    source.snippet.toLowerCase().includes('fake')
  );
  
  const verifyingSources = factCheckSources.filter(source => 
    source.snippet.toLowerCase().includes('confirmed') || 
    source.snippet.toLowerCase().includes('verified') ||
    source.snippet.toLowerCase().includes('authentic')
  );
  
  if (factCheckSources.length > 0) {
    summary += `Found ${factCheckSources.length} fact-checking source(s):\n`;
    
    if (debunkingSources.length > 0) {
      summary += `• ${debunkingSources.length} source(s) explicitly debunk these claims\n`;
    }
    
    if (verifyingSources.length > 0) {
      summary += `• ${verifyingSources.length} source(s) verify these claims\n`;
    }
    
    summary += '\n';
  }
  
  if (supportingArticles.length > 0) {
    summary += `Found ${supportingArticles.length} supporting article(s)\n`;
  }
  
  if (contradictingArticles.length > 0) {
    summary += `Found ${contradictingArticles.length} contradicting article(s)\n`;
  }
  
  switch (risk) {
    case 'CRITICAL':
      summary += '\n🚨 CRITICAL MISINFORMATION RISK: This content contains claims that have been explicitly debunked by fact-checkers. The claims should be considered false or highly misleading.';
      break;
    case 'HIGH':
      summary += '\n⚠️ HIGH MISINFORMATION RISK: Strong evidence suggests these claims may be false or misleading. Exercise caution and verify with multiple sources.';
      break;
    case 'MEDIUM':
      summary += '\n🔍 MEDIUM MISINFORMATION RISK: Mixed evidence found. Some claims may be questionable. Verify with additional authoritative sources.';
      break;
    case 'LOW':
      summary += '\n✅ LOW MISINFORMATION RISK: Available evidence appears to support these claims, but always verify important information.';
      break;
  }
  
  return summary;
}

/**
 * Smart semantic analysis of content to understand context and intent
 */
function analyzeContentSemantics(content: string) {
  const text = content.toLowerCase();
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  return {
    // Content classification based on linguistic patterns
    contentDomain: classifyContentDomain(text),
    
    // Identify assertion strength and confidence markers
    assertionLevel: analyzeAssertionLevel(text),
    
    // Detect information sourcing and attribution
    sourceAttribution: detectSourceAttribution(text),
    
    // Identify temporal markers (recent, breaking, new, etc.)
    temporalMarkers: detectTemporalMarkers(text),
    
    // Detect authority claims and official language
    authorityMarkers: detectAuthorityMarkers(text),
    
    // Analyze sentence complexity and structure
    linguisticComplexity: analyzeLinguisticComplexity(sentences),
    
    // Identify emotional language and urgency markers
    emotionalTone: analyzeEmotionalTone(text),
    
    // Detect statistical and numerical claims
    quantitativeClaims: detectQuantitativeClaims(text)
  };
}

/**
 * Classify content domain using semantic markers
 */
function classifyContentDomain(text: string): string[] {
  const domains = [];
  
  // Health/Medical domain indicators
  if (/health|medical|disease|treatment|cure|vaccine|symptom|diagnosis|therapy|clinical|patient|doctor|hospital|pharmaceutical/.test(text)) {
    domains.push('health');
  }
  
  // Technology/Cybersecurity domain
  if (/cyber|hack|malware|virus|security|data breach|phishing|technology|digital|online|internet|computer|software/.test(text)) {
    domains.push('technology');
  }
  
  // Financial domain
  if (/money|investment|financial|bank|crypto|bitcoin|trading|profit|loss|market|economic|finance/.test(text)) {
    domains.push('financial');
  }
  
  // Government/Official domain
  if (/government|official|agency|department|bureau|ministry|public|administration|policy|regulation|law/.test(text)) {
    domains.push('government');
  }
  
  // News/Media domain
  if (/news|report|journalist|media|broadcast|press|breaking|announced|confirmed|sources say/.test(text)) {
    domains.push('news');
  }
  
  // Science/Research domain
  if (/study|research|scientist|experiment|data|analysis|findings|evidence|peer review|academic/.test(text)) {
    domains.push('science');
  }
  
  return domains.length > 0 ? domains : ['general'];
}

/**
 * Analyze assertion level and confidence markers
 */
function analyzeAssertionLevel(text: string): 'low' | 'medium' | 'high' | 'extreme' {
  const strongAssertions = /definitely|certainly|absolutely|guaranteed|proven|undoubtedly|without doubt|for sure|100%/.test(text);
  const weakAssertions = /might|maybe|possibly|potentially|could be|appears|seems|suggests|indicates/.test(text);
  const moderateAssertions = /likely|probably|expected|believed|reported|according to|studies show/.test(text);
  
  if (strongAssertions) return 'extreme';
  if (moderateAssertions && !weakAssertions) return 'high';
  if (weakAssertions && !moderateAssertions) return 'low';
  return 'medium';
}

/**
 * Detect source attribution patterns
 */
function detectSourceAttribution(text: string): string[] {
  const sources = [];
  
  // News sources
  const newsMatches = text.match(/(?:according to|reported by|announced by|confirmed by|stated by)\s+([^.!?]+)/gi);
  if (newsMatches) sources.push(...newsMatches);
  
  // Research attribution
  const researchMatches = text.match(/(?:study by|research from|analysis by|findings from)\s+([^.!?]+)/gi);
  if (researchMatches) sources.push(...researchMatches);
  
  // Official attribution
  const officialMatches = text.match(/(?:official statement|government announcement|agency report|department says)\s+([^.!?]*)/gi);
  if (officialMatches) sources.push(...officialMatches);
  
  return sources;
}

/**
 * Detect temporal urgency markers
 */
function detectTemporalMarkers(text: string): string[] {
  const markers = [];
  
  if (/breaking|urgent|immediate|emergency|alert|now|today|happening/.test(text)) {
    markers.push('urgent');
  }
  
  if (/recent|latest|new|just|yesterday|this week|recently/.test(text)) {
    markers.push('recent');
  }
  
  if (/coming|future|will|upcoming|expected|planned/.test(text)) {
    markers.push('future');
  }
  
  return markers;
}

/**
 * Detect authority and credibility markers
 */
function detectAuthorityMarkers(text: string): string[] {
  const markers = [];
  
  if (/official|government|agency|department|ministry|bureau|administration/.test(text)) {
    markers.push('government');
  }
  
  if (/expert|specialist|professional|doctor|professor|researcher|scientist/.test(text)) {
    markers.push('expert');
  }
  
  if (/certified|approved|licensed|authorized|verified|validated/.test(text)) {
    markers.push('certified');
  }
  
  if (/warning|alert|advisory|notice|bulletin|announcement/.test(text)) {
    markers.push('advisory');
  }
  
  return markers;
}

/**
 * Analyze linguistic complexity
 */
function analyzeLinguisticComplexity(sentences: string[]): 'simple' | 'moderate' | 'complex' {
  const avgLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
  const complexWords = sentences.join(' ').match(/\w{8,}/g)?.length || 0;
  const totalWords = sentences.join(' ').split(/\s+/).length;
  
  if (avgLength > 100 && complexWords / totalWords > 0.3) return 'complex';
  if (avgLength > 50 || complexWords / totalWords > 0.2) return 'moderate';
  return 'simple';
}

/**
 * Analyze emotional tone and urgency
 */
function analyzeEmotionalTone(text: string): string[] {
  const tones = [];
  
  if (/dangerous|threat|risk|warning|beware|caution|alarm/.test(text)) {
    tones.push('warning');
  }
  
  if (/amazing|incredible|revolutionary|breakthrough|miracle|secret/.test(text)) {
    tones.push('promotional');
  }
  
  if (/urgent|emergency|immediate|critical|act now|limited time/.test(text)) {
    tones.push('urgent');
  }
  
  if (/neutral|objective|analysis|report|study|research/.test(text)) {
    tones.push('neutral');
  }
  
  return tones.length > 0 ? tones : ['neutral'];
}

/**
 * Detect quantitative claims
 */
function detectQuantitativeClaims(text: string): string[] {
  const claims = [];
  
  // Percentage claims
  const percentages = text.match(/\d+(?:\.\d+)?%/g);
  if (percentages) claims.push(...percentages);
  
  // Money amounts
  const money = text.match(/\$\d+(?:,\d{3})*(?:\.\d{2})?/g);
  if (money) claims.push(...money);
  
  // Statistical claims
  const stats = text.match(/\d+(?:,\d{3})*\s+(?:people|cases|deaths|users|patients|victims)/gi);
  if (stats) claims.push(...stats);
  
  return claims;
}

/**
 * Extract contextually relevant entities based on semantic analysis
 */
function extractContextualEntities(content: string, semantics: any): string[] {
  const entities: string[] = [];
  
  // Extract exact proper nouns and specific claims first
  const exactClaims = extractExactClaims(content);
  entities.push(...exactClaims);
  
  // Extract named entities with improved precision
  const namedEntities = extractNamedEntities(content);
  entities.push(...namedEntities);
  
  // Extract domain-specific terms
  semantics.contentDomain.forEach((domain: string) => {
    if (domain === 'technology') {
      // Extract specific threat names, not just general terms
      const threatNames = content.match(/(?:"[^"]*(?:dance|operation|apt|campaign|attack|malware)[^"]*"|\b(?:Dance of the Hillary|Operation\s+\w+|APT\s*\d+)\b)/gi);
      if (threatNames) entities.push(...threatNames.map(t => t.replace(/"/g, '')));
      
      // Extract technical indicators
      const techTerms = content.match(/(?:IP addresses?|CVE-\d+|vulnerability|exploit|malware|threat actor)/gi);
      if (techTerms) entities.push(...techTerms);
    }
    
    if (domain === 'government') {
      // Extract specific agency names and official terms
      const agencies = content.match(/(?:Bureau of Corrections|Department of Homeland Security|FBI|CISA|Cybersecurity Division)/gi);
      if (agencies) entities.push(...agencies);
      
      // Extract official document indicators
      const officialTerms = content.match(/(?:memorandum|directive|bulletin|advisory|classification)/gi);
      if (officialTerms) entities.push(...officialTerms);
    }
  });
  
  return [...new Set(entities)].filter(entity => 
    entity.length > 2 && 
    entity.length < 100 &&
    !isCommonWord(entity)
  );
}

/**
 * Extract exact claims that should be fact-checked
 */
function extractExactClaims(content: string): string[] {
  const claims: string[] = [];
  
  // Extract quoted phrases - these are often specific claims
  const quotedClaims = content.match(/"[^"]{10,100}"/g);
  if (quotedClaims) {
    claims.push(...quotedClaims.map(claim => claim.replace(/"/g, '')));
  }
  
  // Extract specific assertions with numbers or technical details
  const technicalClaims = content.match(/(?:has already compromised \d+|identified a new|poses an imminent threat|confirmed by|according to)[^.!?]{10,150}/gi);
  if (technicalClaims) {
    claims.push(...technicalClaims);
  }
  
  // Extract attack/threat names specifically mentioned
  const threatClaims = content.match(/(?:known as|called|identified as|named)\s+"?([^".!?]{5,50})"?/gi);
  if (threatClaims) {
    claims.push(...threatClaims.map(claim => {
      const match = claim.match(/(?:known as|called|identified as|named)\s+"?([^".!?]{5,50})"?/i);
      return match ? match[1].trim() : claim;
    }));
  }
  
  return claims.filter(claim => claim.length > 5);
}

/**
 * Check if a word is too common to be useful for fact-checking
 */
function isCommonWord(word: string): boolean {
  const commonWords = [
    'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'this', 'that', 'these', 'those', 'all', 'any', 'some',
    'system', 'network', 'security', 'data', 'information', 'content', 'text'
  ];
  
  return commonWords.includes(word.toLowerCase()) || word.length < 3;
}

/**
 * Extract verifiable statements using linguistic analysis
 */
function extractVerifiableStatements(content: string, semantics: any): string[] {
  const statements: string[] = [];
  
  // High-assertion statements are more verifiable
  if (semantics.assertionLevel === 'extreme' || semantics.assertionLevel === 'high') {
    const sentences = content.split(/[.!?]+/);
    sentences.forEach(sentence => {
      if (sentence.trim().length > 20 && sentence.trim().length < 200) {
        // Check for verifiable claim patterns
        if (/(?:study shows|research proves|data reveals|analysis confirms|experts say|officials announce|reports indicate)/i.test(sentence)) {
          statements.push(sentence.trim());
        }
      }
    });
  }
  
  // Statements with source attribution are verifiable
  semantics.sourceAttribution.forEach((source: string) => {
    if (source.length > 10 && source.length < 150) {
      statements.push(source);
    }
  });
  
  // Quantitative claims are verifiable
  semantics.quantitativeClaims.forEach((claim: string) => {
    const context = extractClaimContext(content, claim);
    if (context && context.length > 10) {
      statements.push(context);
    }
  });
  
  return [...new Set(statements)];
}

/**
 * Extract domain-specific claims based on content analysis
 */
function extractDomainSpecificClaims(content: string, semantics: any): string[] {
  const claims: string[] = [];
  
  semantics.contentDomain.forEach((domain: string) => {
    if (domain === 'health') {
      const healthClaims = content.match(/(?:cures?|treats?|prevents?|causes?|reduces?|increases?|improves?|eliminates?)\s+[^.!?]{10,100}/gi);
      if (healthClaims) claims.push(...healthClaims);
    }
    
    if (domain === 'technology') {
      const techClaims = content.match(/(?:hacks?|breaches?|attacks?|threatens?|protects?|secures?|encrypts?|decrypts?)\s+[^.!?]{10,100}/gi);
      if (techClaims) claims.push(...techClaims);
    }
    
    if (domain === 'financial') {
      const finClaims = content.match(/(?:guarantees?|profits?|returns?|earns?|loses?|gains?|invests?|trades?)\s+[^.!?]{10,100}/gi);
      if (finClaims) claims.push(...finClaims);
    }
  });
  
  return [...new Set(claims)];
}

/**
 * Extract context around a specific claim
 */
function extractClaimContext(content: string, claim: string): string | null {
  const index = content.toLowerCase().indexOf(claim.toLowerCase());
  if (index === -1) return null;
  
  const start = Math.max(0, index - 50);
  const end = Math.min(content.length, index + claim.length + 50);
  
  return content.substring(start, end).trim();
}

/**
 * Prioritize keywords by verifiability potential
 */
function prioritizeByVerifiability(keywords: string[], semantics: any): string[] {
  return keywords
    .map(keyword => ({
      keyword,
      score: calculateVerifiabilityScore(keyword, semantics)
    }))
    .sort((a, b) => b.score - a.score)
    .map(item => item.keyword);
}

/**
 * Calculate verifiability score for a keyword
 */
function calculateVerifiabilityScore(keyword: string, semantics: any): number {
  let score = 0;
  
  // Higher score for high-assertion content
  if (semantics.assertionLevel === 'extreme') score += 10;
  else if (semantics.assertionLevel === 'high') score += 7;
  else if (semantics.assertionLevel === 'medium') score += 4;
  
  // Higher score for content with source attribution
  if (semantics.sourceAttribution.length > 0) score += 8;
  
  // Higher score for urgent/recent content
  if (semantics.temporalMarkers.includes('urgent')) score += 6;
  if (semantics.temporalMarkers.includes('recent')) score += 4;
  
  // Higher score for authority claims
  if (semantics.authorityMarkers.length > 0) score += 5;
  
  // Higher score for specific domains
  if (semantics.contentDomain.includes('health')) score += 7;
  if (semantics.contentDomain.includes('financial')) score += 6;
  if (semantics.contentDomain.includes('government')) score += 5;
  
  // Higher score for quantitative claims
  if (semantics.quantitativeClaims.some((claim: string) => keyword.includes(claim))) score += 8;
  
  // Length bonus for substantial keywords
  if (keyword.length > 10 && keyword.length < 100) score += 3;
  
  return score;
}

/**
 * Generate smart, context-aware search queries using advanced AI-assisted analysis
 * This function now prioritizes ACTUAL CLAIMS over generic keywords
 */
/**
 * Dynamically analyze content to understand what type of fact-checking is needed
 */
function analyzeContentForFactChecking(keywords: string[], semantics: any): any {
  const fullText = keywords.join(' ').toLowerCase();
  
  // Determine content domain based on actual content analysis
  let domain = 'general';
  if (/health|medical|virus|disease|treatment|cure|medicine|vaccine|symptom/.test(fullText)) {
    domain = 'health';
  } else if (/cyber|hack|breach|malware|virus|security|threat|attack/.test(fullText)) {
    domain = 'cybersecurity';
  } else if (/government|official|agency|department|policy|law|regulation/.test(fullText)) {
    domain = 'government';
  } else if (/financial|investment|money|bank|scam|fraud|profit/.test(fullText)) {
    domain = 'financial';
  }
  
  // Determine if content is recent/timely
  const isRecent = /recent|today|yesterday|this week|breaking|urgent|new|latest/.test(fullText);
  
  // Determine content type based on actual content
  let contentType = 'general';
  if (/announce|announcement|declared|issued|statement/.test(fullText)) {
    contentType = 'announcement';
  } else if (/claim|says|reported|alleged|according/.test(fullText)) {
    contentType = 'claim';
  } else if (/happened|occurred|event|incident/.test(fullText)) {
    contentType = 'event';
  } else if (/policy|rule|regulation|law|requirement/.test(fullText)) {
    contentType = 'policy';
  }
  
  return {
    domain,
    contentType,
    isRecent,
    complexity: semantics.linguisticComplexity || 'moderate',
    urgency: semantics.temporalMarkers?.includes('urgent') || false
  };
}

/**
 * Extract searchable concepts from content dynamically
 */
function extractSearchableConcepts(keywords: string[], contentAnalysis: any): any[] {
  const concepts: any[] = [];
  const fullText = keywords.join(' ');
  
  // Extract meaningful phrases (not just individual words)
  const phrases = extractMeaningfulPhrases(fullText);
  
  phrases.forEach(phrase => {
    if (phrase.length > 10 && phrase.length < 150) {
      const concept = {
        text: phrase,
        type: determineConceptType(phrase, contentAnalysis),
        domain: determineConceptDomain(phrase),
        confidence: calculateConceptConfidence(phrase, keywords)
      };
      
      // Only include high-confidence concepts
      if (concept.confidence > 0.3) {
        concepts.push(concept);
      }
    }
  });
  
  // Sort by confidence and return top concepts
  return concepts
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 6);
}

/**
 * Extract meaningful phrases from text using natural language patterns
 * FIXED: Generate shorter, more focused search terms
 */
function extractMeaningfulPhrases(text: string): string[] {
  const phrases: string[] = [];
  
  // Extract short, focused key phrases (2-4 words max)
  const words = text.split(/\s+/);
  
  // Look for specific named entities and important terms
  const importantTerms: string[] = [];
  
  // Extract proper nouns and specific names
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    // Capture specific names and entities
    if (word.match(/^[A-Z]/)) {
      let phrase = word;
      // Look ahead for multi-word names (max 3 words)
      for (let j = i + 1; j < Math.min(i + 3, words.length); j++) {
        if (words[j].match(/^[A-Z]/) || words[j].toLowerCase().match(/^(of|the|de|la|del)$/)) {
          phrase += ' ' + words[j];
        } else {
          break;
        }
      }
      if (phrase.length > 3 && phrase.length < 50) {
        importantTerms.push(phrase);
      }
    }
  }
  
  // Extract key concepts and actions
  const conceptPatterns = [
    /(?:cyber\s*attack|cyberattack)/gi,
    /(?:malware|virus|breach|hack)/gi,
    /(?:bureau|department|agency|office)/gi,
    /(?:health\s*office|health\s*department)/gi,
    /(?:face\s*mask|facemask|mask)/gi,
    /(?:announcement|policy|statement)/gi,
    /(?:dance\s*of\s*the\s*hillary|hillary)/gi
  ];
  
  conceptPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach((match: string) => {
        if (match.length < 50) {
          importantTerms.push(match.trim());
        }
      });
    }
  });
  
  // Add simple focused phrases
  importantTerms.forEach(term => {
    if (term.length > 2 && term.length < 50) {
      phrases.push(term);
    }
  });
    return [...new Set(phrases)]; // Remove duplicates
}

/**
 * Determine the type of concept based on content
 */
function determineConceptType(phrase: string, contentAnalysis: any): string {
  const lowerPhrase = phrase.toLowerCase();
  
  if (/announce|declared|confirmed|issued|stated|reported/.test(lowerPhrase)) {
    return 'announcement';
  } else if (/policy|rule|regulation|mandatory|required/.test(lowerPhrase)) {
    return 'policy';
  } else if (/claim|says|alleged|according|reportedly/.test(lowerPhrase)) {
    return 'claim';
  } else if (/happened|occurred|event|incident/.test(lowerPhrase)) {
    return 'event';
  } else {
    return contentAnalysis.contentType || 'general';
  }
}

/**
 * Determine the domain of a concept
 */
function determineConceptDomain(phrase: string): string {
  const lowerPhrase = phrase.toLowerCase();
  
  if (/health|medical|virus|disease|treatment|cure|medicine|vaccine|symptom|mask|facemask/.test(lowerPhrase)) {
    return 'health';
  } else if (/cyber|hack|breach|malware|virus|security|threat|attack/.test(lowerPhrase)) {
    return 'cybersecurity';
  } else if (/government|official|agency|department|policy|law|regulation|city|office/.test(lowerPhrase)) {
    return 'government';
  } else if (/financial|investment|money|bank|scam|fraud|profit/.test(lowerPhrase)) {
    return 'financial';
  } else {
    return 'general';
  }
}

/**
 * Calculate confidence score for a concept based on how well it matches the original keywords
 */
function calculateConceptConfidence(phrase: string, keywords: string[]): number {
  const phraseWords = phrase.toLowerCase().split(/\s+/);
  const keywordSet = new Set(keywords.map(k => k.toLowerCase()));
  
  let matchCount = 0;
  let totalWords = phraseWords.length;
  
  phraseWords.forEach(word => {
    if (keywordSet.has(word) || [...keywordSet].some(k => k.includes(word) || word.includes(k))) {
      matchCount++;
    }
  });
  
  // Higher confidence for phrases that contain more of the original keywords
  const wordMatch = matchCount / totalWords;
  
  // Boost confidence for meaningful content
  let meaningBoost = 0;
  if (phrase.length > 20 && phrase.length < 100) meaningBoost += 0.2;
  if (/announce|declare|confirm|state|report|require/.test(phrase.toLowerCase())) meaningBoost += 0.3;
  if (/health|government|official|agency/.test(phrase.toLowerCase())) meaningBoost += 0.2;
  
  return Math.min(1.0, wordMatch + meaningBoost);
}

/**
 * Extract location context from keywords
 */
function extractLocationContext(keywords: string[]): string | null {
  const locationKeywords = keywords.filter(k => 
    /(?:Philippines|Manila|Cebu|Davao|Quezon|Cagayan|Oro|Baguio|Iloilo|Bacolod|city|province|region|municipality)/i.test(k)
  );
  
  if (locationKeywords.length > 0) {
    // Return the most specific location found
    const sortedBySpecificity = locationKeywords.sort((a, b) => b.length - a.length);
    return sortedBySpecificity[0];
  }
  
  return null;
}

function generateSmartQueries(keywords: string[], semantics: any, contentType?: string): string[] {
  const queries: string[] = [];
  
  // Dynamic content analysis to understand what we're really searching for
  const contentAnalysis = analyzeContentForFactChecking(keywords, semantics);
  
  console.log('🧠 Dynamic content analysis:', contentAnalysis);
  
  // CORE STRATEGY: Generate queries based on actual content understanding, not predefined patterns
  
  // 1. EXTRACT KEY SEARCHABLE CONCEPTS
  const searchableConcepts = extractSearchableConcepts(keywords, contentAnalysis);
  console.log('🔍 Searchable concepts identified:', searchableConcepts);
    // 2. GENERATE SHORTER, MORE FOCUSED QUERIES
  // Instead of using long concept text, extract key terms
  const keyTerms: string[] = [];
  
  searchableConcepts.forEach(concept => {
    // Extract just the most important 1-3 words from each concept
    const conceptWords = concept.text.split(/\s+/);
    const shortTerms = conceptWords.slice(0, 3).filter((word: string) => word.length > 3);
    keyTerms.push(...shortTerms);
  });
  
  // Also add important keywords directly
  const importantKeywords = keywords.filter(k => k.length > 4).slice(0, 5);
  keyTerms.push(...importantKeywords);
  
  // Remove duplicates and get unique terms
  const uniqueTerms = [...new Set(keyTerms)].slice(0, 6);
  
  // Generate simple, effective queries
  uniqueTerms.forEach(term => {
    if (term.length > 3 && term.length < 30) {
      // Basic fact-checking queries
      queries.push(`"${term}" fact check`);
      queries.push(`"${term}" news`);
      queries.push(`"${term}" verification`);
      
      // Domain-specific queries
      if (contentAnalysis.domain === 'cybersecurity') {
        queries.push(`"${term}" cyber security`);
        queries.push(`"${term}" threat report`);
      } else if (contentAnalysis.domain === 'health') {
        queries.push(`"${term}" health official`);
      } else if (contentAnalysis.domain === 'government') {
        queries.push(`"${term}" government official`);
      }
    }
  });
    // 3. FALLBACK: Use simple keyword-based queries if no concepts found
  if (queries.length === 0) {
    const topKeywords = keywords.filter((k: string) => k.length > 3).slice(0, 4);
    topKeywords.forEach((keyword: string) => {
      queries.push(`"${keyword}" fact check`);
      queries.push(`"${keyword}" news`);
      queries.push(`"${keyword}" verification`);
    });
  }
  
  console.log('🔍 Generated dynamic intelligent queries:', queries.slice(0, 12));
  
  return [...new Set(queries)].slice(0, 12); // Remove duplicates and limit
}

/**
 * Generate contextual fact-check terms
 */
function generateContextualFactCheckTerms(keywords: string[], semantics: any): string[] {
  const terms: string[] = [];
  
  keywords.slice(0, 8).forEach(keyword => {
    // Basic fact-check terms
    terms.push(`"${keyword}" fact check`);
    terms.push(`"${keyword}" verified`);
    terms.push(`"${keyword}" debunked`);
    
    // Context-specific terms
    if (semantics.assertionLevel === 'extreme') {
      terms.push(`"${keyword}" proven false`);
      terms.push(`"${keyword}" definitely true`);
    }
    
    if (semantics.temporalMarkers.includes('urgent')) {
      terms.push(`"${keyword}" urgent warning real`);
      terms.push(`"${keyword}" emergency hoax`);
    }
    
    if (semantics.authorityMarkers.includes('government')) {
      terms.push(`"${keyword}" government confirmed`);
      terms.push(`"${keyword}" official statement`);
    }
    
    // Domain-specific verification terms
    semantics.contentDomain.forEach((domain: string) => {
      if (domain === 'health') {
        terms.push(`"${keyword}" medical fact check`);
        terms.push(`"${keyword}" health misinformation`);
      } else if (domain === 'technology') {
        terms.push(`"${keyword}" cyber security verified`);
        terms.push(`"${keyword}" tech hoax debunked`);
      }
    });
  });
  
  return [...new Set(terms)];
}

/**
 * Extract specific entities and named references from keywords
 */
function extractSpecificEntities(keywords: string[]): string[] {
  const entities: string[] = [];
  
  keywords.forEach(keyword => {
    // Look for proper nouns and specific names
    if (keyword.length > 3 && /[A-Z]/.test(keyword)) {
      entities.push(keyword);
    }
    
    // Extract quoted phrases and specific technical terms
    const quotedMatches = keyword.match(/"([^"]+)"/g);
    if (quotedMatches) {
      quotedMatches.forEach(match => {
        entities.push(match.replace(/"/g, ''));
      });
    }
  });
  
  return [...new Set(entities)];
}

/**
 * Extract exact phrases that should be searched as complete units
 */
function extractExactPhrases(keywords: string[]): string[] {
  const phrases: string[] = [];
  
  keywords.forEach(keyword => {
    // Multi-word phrases that should be searched together
    if (keyword.includes(' ') && keyword.length > 10) {
      phrases.push(keyword);
    }
    
    // Technical terms and attack names
    if (/(?:dance of|operation|apt|campaign|attack|threat)/i.test(keyword)) {
      phrases.push(keyword);
    }
  });
  
  return [...new Set(phrases)];
}

/**
 * Determine if an entity appears to be a cyber threat name
 */
function isCyberThreatName(entity: string): boolean {
  const threatIndicators = [
    /dance of/i, /operation/i, /apt/i, /campaign/i, 
    /attack/i, /malware/i, /trojan/i, /ransomware/i,
    /exploit/i, /vulnerability/i
  ];
  
  return threatIndicators.some(pattern => pattern.test(entity));
}

/**
 * Determine if an entity appears to be an organization name
 */
function isOrganizationName(entity: string): boolean {
  const orgIndicators = [
    /bureau/i, /department/i, /division/i, /agency/i,
    /corporation/i, /company/i, /organization/i, /institute/i,
    /center/i, /foundation/i
  ];
  
  return orgIndicators.some(pattern => pattern.test(entity));
}

/**
 * Intelligently determines if content needs fact-checking based on semantic analysis
 * This is the core smart decision-making function that replaces rigid keyword patterns
 */
export function shouldPerformIntelligentFactCheck(content: string, analysisResult?: any): {
  shouldFactCheck: boolean;
  confidence: number;
  reasons: string[];
  contentType: string;
} {
  if (!content || content.length < 15) {
    return {
      shouldFactCheck: false,
      confidence: 0,
      reasons: ['Content too short for meaningful fact-checking'],
      contentType: 'general'
    };
  }

  // Perform intelligent semantic analysis
  const semanticAnalysis = analyzeContentSemantics(content);
  
  let factCheckScore = 0;
  const reasons: string[] = [];
  let contentType = 'general';

  // 1. HIGH PRIORITY: Content with strong assertion claims (BuCor memo type content)
  if (semanticAnalysis.assertionLevel === 'extreme') {
    factCheckScore += 25;
    reasons.push('Content makes very strong claims that need verification');
  } else if (semanticAnalysis.assertionLevel === 'high') {
    factCheckScore += 15;
    reasons.push('Content makes confident assertions');
  }

  // 2. Authority claims (government, expert, official sources)
  if (semanticAnalysis.authorityMarkers.length > 0) {
    factCheckScore += 20;
    reasons.push('Content claims authority or official source');
    if (semanticAnalysis.authorityMarkers.includes('government')) {
      contentType = 'government';
      factCheckScore += 10; // Extra boost for government content
    }
  }

  // 3. Domain-specific content that's often targeted for misinformation
  semanticAnalysis.contentDomain.forEach(domain => {
    switch (domain) {
      case 'health':
        factCheckScore += 18;
        reasons.push('Health/medical content requires verification');
        contentType = 'health';
        break;
      case 'technology':
        factCheckScore += 15;
        reasons.push('Technology/cybersecurity content needs validation');
        contentType = 'technology';
        break;
      case 'financial':
        factCheckScore += 16;
        reasons.push('Financial content requires careful verification');
        contentType = 'financial';
        break;
      case 'government':
        factCheckScore += 17;
        reasons.push('Government content needs verification');
        contentType = 'government';
        break;
      case 'news':
        factCheckScore += 12;
        reasons.push('News content benefits from fact-checking');
        contentType = 'news';
        break;
      case 'science':
        factCheckScore += 14;
        reasons.push('Scientific content requires verification');
        contentType = 'science';
        break;
    }
  });

  // 4. Temporal urgency markers (breaking, urgent, immediate)
  if (semanticAnalysis.temporalMarkers.includes('urgent')) {
    factCheckScore += 15;
    reasons.push('Urgent content often used in misinformation');
  }
  if (semanticAnalysis.temporalMarkers.includes('recent')) {
    factCheckScore += 8;
    reasons.push('Recent claims benefit from verification');
  }

  // 5. Source attribution analysis
  if (semanticAnalysis.sourceAttribution.length > 0) {
    factCheckScore += 12;
    reasons.push('Content cites sources that can be verified');
  }

  // 6. Quantitative claims (statistics, percentages, numbers)
  if (semanticAnalysis.quantitativeClaims.length > 0) {
    factCheckScore += 10;
    reasons.push('Contains numerical claims that can be verified');
  }
  // 7. Emotional urgency (fear, excitement, outrage)
  if (semanticAnalysis.emotionalTone.includes('urgent') || semanticAnalysis.emotionalTone.includes('warning')) {
    factCheckScore += 12;
    reasons.push('Emotional urgency often indicates misinformation patterns');
  }
  // 8. Enhanced AI analysis integration for smarter decisions
  if (analysisResult) {
    if (analysisResult.overallRiskProbability > 50) {
      factCheckScore += 20;
      reasons.push('High AI risk probability indicates verification needed');
    } else if (analysisResult.overallRiskProbability > 0) {
      factCheckScore += Math.min(analysisResult.overallRiskProbability * 0.3, 15);
      reasons.push('AI detected risk indicators warrant verification');
    }
    
    if (analysisResult.riskCategories?.includes('Misinformation')) {
      factCheckScore += 25;
      reasons.push('AI identified potential misinformation');
    }
    
    if (analysisResult.riskCategories?.includes('Scam')) {
      factCheckScore += 18;
      reasons.push('AI detected scam patterns requiring verification');
    }

    if (analysisResult.isRisky) {
      factCheckScore += 12;
      reasons.push('Content flagged as risky by AI analysis');
    }
    
    // Boost for specific content types that often contain verifiable claims
    if (analysisResult.contentType?.toLowerCase().includes('government') || 
        analysisResult.contentType?.toLowerCase().includes('official')) {
      factCheckScore += 15;
      reasons.push('Official content type requires verification');
    }
    
    if (analysisResult.contentType?.toLowerCase().includes('news') || 
        analysisResult.contentType?.toLowerCase().includes('announcement')) {
      factCheckScore += 12;
      reasons.push('News/announcement content benefits from fact-checking');
    }
  }

  // 9. Special patterns for cybersecurity warnings (like BuCor memo)
  const cybersecurityPatterns = /(?:cyber.{0,10}attack|malware|hacking|security.{0,10}breach|phishing|data.{0,10}breach|virus|trojan|ransomware)/gi;
  if (cybersecurityPatterns.test(content)) {
    factCheckScore += 18;
    reasons.push('Cybersecurity warning content needs verification');
    contentType = 'technology';
  }

  // 10. Official memo/document patterns
  const officialDocPatterns = /(?:memorandum|memo|circular|advisory|bulletin|directive|notice|alert|warning|announcement)/gi;
  if (officialDocPatterns.test(content)) {
    factCheckScore += 15;
    reasons.push('Official document format needs verification');
  }

  // 11. Health emergency patterns
  const healthEmergencyPatterns = /(?:outbreak|pandemic|epidemic|vaccine|treatment|cure|symptom|disease|virus|infection)/gi;
  if (healthEmergencyPatterns.test(content)) {
    factCheckScore += 16;
    reasons.push('Health emergency content requires verification');
    contentType = 'health';
  }

  // Normalize score to 0-100 and determine decision
  const normalizedScore = Math.min(factCheckScore, 100);
  const shouldFactCheck = normalizedScore >= 25; // Lower threshold for more aggressive fact-checking
  const confidence = normalizedScore;

  // If no specific content type detected, use semantic analysis
  if (contentType === 'general' && semanticAnalysis.contentDomain.length > 0) {
    contentType = semanticAnalysis.contentDomain[0];
  }

  return {
    shouldFactCheck,
    confidence,
    reasons: reasons.length > 0 ? reasons : ['Content analyzed for verification needs'],
    contentType
  };
}

/**
 * Extract contextual claims that need fact-checking (Enhanced version)
 */
function extractContextualClaims(keywords: string[], semantics: any): string[] {
  // Use the new dynamic approach
  const contentAnalysis = analyzeContentForFactChecking(keywords, semantics);
  const searchableConcepts = extractSearchableConcepts(keywords, contentAnalysis);
  
  // Return the text of the most confident concepts as claims
  return searchableConcepts
    .filter(concept => concept.confidence > 0.4)
    .map(concept => concept.text)
    .slice(0, 8);
}

/**
 * Determine if an entity is health-related
 */
function isHealthRelated(entity: string): boolean {
  const healthIndicators = [
    /covid|vaccine|virus|disease|medical|health|treatment|cure|symptom|diagnosis|pharmaceutical|clinical|patient|doctor|hospital/i,
    /medicine|therapy|drug|medication|supplement|vitamin|antioxidant|immune|detox|organic/i
  ];
  
  return healthIndicators.some(pattern => pattern.test(entity));
}

/**
 * Determine if an entity is financial-related
 */
function isFinancialRelated(entity: string): boolean {
  const financialIndicators = [
    /investment|bitcoin|cryptocurrency|forex|trading|profit|money|financial|bank|credit|loan|insurance/i,
    /stock|bond|mutual fund|etf|401k|ira|sec|finra|scam|fraud|ponzi|pyramid/i
  ];
  
  return financialIndicators.some(pattern => pattern.test(entity));
}

/**
 * Get smart authoritative sources based on content domain
 */
function getSmartAuthoritativeSources(contentDomains: string[]): string[] {
  let sources: string[] = [];
  
  // Base fact-checking sources
  const baseSources = [
    'site:snopes.com', 'site:factcheck.org', 'site:politifact.com'
  ];
  sources.push(...baseSources);
  
  // Domain-specific authoritative sources
  contentDomains.forEach(domain => {
    switch (domain) {
      case 'technology':
        sources.push(
          'site:cisa.gov', 'site:fbi.gov', 'site:dhs.gov', 'site:nist.gov',
          'site:mitre.org', 'site:cert.org', 'site:sans.org',
          'site:krebsonsecurity.com', 'site:bleepingcomputer.com'
        );
        break;
      case 'health':
        sources.push(
          'site:cdc.gov', 'site:fda.gov', 'site:who.int', 'site:nih.gov',
          'site:mayoclinic.org', 'site:webmd.com', 'site:healthline.com'
        );
        break;
      case 'financial':
        sources.push(
          'site:sec.gov', 'site:finra.org', 'site:ftc.gov',
          'site:investopedia.com', 'site:morningstar.com'
        );
        break;
      case 'government':
        sources.push(
          'site:gov.ph', 'site:doj.gov.ph', 'site:bsp.gov.ph',
          'site:whitehouse.gov', 'site:state.gov'
        );
        break;
      case 'news':
        sources.push(
          'site:reuters.com', 'site:ap.org', 'site:bbc.com',
          'site:cnn.com', 'site:npr.org'
        );
        break;
    }
  });
  
  return [...new Set(sources)]; // Remove duplicates
}
