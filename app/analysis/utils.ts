"use client";

/**
 * Extract potential threat indicators from explanation text
 * @param explanationText - The text to analyze for indicators
 * @returns Array of identified indicator strings
 */
export const extractThreatIndicators = (explanationText: string): string[] => {
  if (!explanationText) return [];
  
  // Common phrases that introduce lists of indicators in AI explanations
  const introductionPhrases = [
    "indicators include:", "red flags include:", "suspicious elements include:",
    "warning signs include:", "suspicious indicators include:", "concerning elements include:",
    "signs of a threat:", "threat indicators:", "suspicious patterns:", "red flags:",
    "concerning aspects:", "alarm bells include:", "suspicious factors:", "signs include:"
  ];
  
  // Try to find any section that might list indicators
  let indicators: string[] = [];
  
  // Look for standard bullet points or numbered lists
  const bulletMatches = explanationText.match(/[•\-\*]([^•\-\*\n]+)/g);
  if (bulletMatches && bulletMatches.length > 0) {
    indicators = bulletMatches.map(item => 
      item.replace(/^[•\-\*]\s*/, '').trim()
    ).filter(item => item.length > 5);
  }
  
  // Look for numbered lists
  const numberMatches = explanationText.match(/\d+\.\s+([^\n]+)/g);
  if (numberMatches && numberMatches.length > 0) {
    const numberedItems = numberMatches.map(item => 
      item.replace(/^\d+\.\s+/, '').trim()
    ).filter(item => item.length > 5);
    indicators = [...indicators, ...numberedItems];
  }
  
  // If no structured lists found, try to extract sentences after introduction phrases
  if (indicators.length === 0) {
    for (const phrase of introductionPhrases) {
      const index = explanationText.toLowerCase().indexOf(phrase);
      if (index !== -1) {
        const relevantText = explanationText.substring(index + phrase.length).trim();
        const sentences = relevantText.split(/[.!?]/).filter(s => s.trim().length > 5);
        if (sentences.length > 0) {
          indicators = sentences.slice(0, Math.min(5, sentences.length)).map(s => s.trim());
          break;
        }
      }
    }
  }
  
  // Look for key phrases like "This message contains..." or "I detected..."
  if (indicators.length === 0) {
    const keyPhrases = [
      "this message contains", "i detected", "this contains", 
      "suspicious due to", "appears to be", "this shows signs of",
      "this is likely", "red flag is", "contains elements of"
    ];
    
    for (const phrase of keyPhrases) {
      const regex = new RegExp(phrase + "\\s+([^.!?]+)[.!?]", "i");
      const match = explanationText.match(regex);
      if (match && match[1]) {
        indicators.push(match[1].trim());
      }
    }
  }
  
  // If still no indicators, extract key phrases from the beginning of the explanation
  if (indicators.length === 0) {
    const sentences = explanationText.split(/[.!?]/).filter(s => s.trim().length > 5);
    if (sentences.length > 0) {
      indicators = sentences.slice(0, Math.min(3, sentences.length)).map(s => s.trim());
    }
  }
  
  // Process the indicators to make them more concise (extract key phrases)
  const processedIndicators = indicators.map(indicator => {
    // Look for key phrases like "contains X" or "presents X"
    const phrasePatterns = [
      /contains\s+(\w+(\s+\w+){0,3})/i,
      /presents\s+(\w+(\s+\w+){0,3})/i,
      /includes\s+(\w+(\s+\w+){0,3})/i,
      /with\s+(\w+(\s+\w+){0,3})/i,
      /has\s+(\w+(\s+\w+){0,3})/i,
      /showing\s+(\w+(\s+\w+){0,3})/i,
      /claiming\s+(\w+(\s+\w+){0,3})/i,
      /uses\s+(\w+(\s+\w+){0,3})/i
    ];
    
    for (const pattern of phrasePatterns) {
      const match = indicator.match(pattern);
      if (match && match[1] && match[1].length > 5) {
        return match[1].trim();
      }
    }
    
    // If no pattern match, just take the first few words
    return indicator.split(/\s+/).slice(0, 4).join(" ")
      .replace(/[.,;:!?].*$/, "") // Remove endings with punctuation
      .replace(/^\W+|\W+$/, ""); // Trim non-word characters
  });
  
  // Deduplicate and limit the number of indicators
  return Array.from(new Set(processedIndicators))
    .filter(indicator => indicator.length > 3)
    .slice(0, 5)
    .map(indicator => {
      // Capitalize first letter
      return indicator.charAt(0).toUpperCase() + indicator.slice(1);
    });
};

/**
 * Extract numeric value from percentage string
 * @param percentStr - Percentage string (e.g., "75%", "75-100%")
 * @returns Numeric value (e.g., 75, 87.5)
 */
export const extractPercentage = (percentStr: string): number => {
  // Handle direct numeric values or ranges
  if (!percentStr) return 0;
  
  if (percentStr.includes('-')) {
    // Handle ranges like "75-100%" by using the average
    const [min, max] = percentStr.split('-').map(part => {
      const match = part.match(/(\d+(?:\.\d+)?)/);
      return match ? parseFloat(match[1]) : 0;
    });
    return (min + max) / 2;
  }
  
  // Handle exact percentages
  const match = percentStr.match(/(\d+(?:\.\d+)?)%/);
  if (match) return parseFloat(match[1]);
  
  // If it's just a number without % sign
  const numericMatch = percentStr.match(/(\d+(?:\.\d+)?)/);
  return numericMatch ? parseFloat(numericMatch[1]) : 0;
};

/**
 * Get color and style classes based on percentage value
 * @param percent - Risk percentage (0-100)
 * @returns Object with style classes for various UI elements
 */
export const getColorByPercentage = (percent: number) => {
  // Ensure we use consistent risk level thresholds everywhere in the app
  if (percent >= 75) return {
    color: 'red',
    containerClasses: 'bg-gradient-to-br from-rose-100 via-red-100 to-pink-100 border-rose-300',
    textClasses: 'text-slate-800',
    badgeClasses: 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg',
    barColor: 'bg-gradient-to-r from-red-400 to-rose-500',
    icon: '🚨',
    label: 'Very High Risk'
  };
  if (percent >= 50) return {
    color: 'orange',
    containerClasses: 'bg-gradient-to-br from-orange-100 via-amber-100 to-yellow-100 border-orange-300',
    textClasses: 'text-slate-800',
    badgeClasses: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg',
    barColor: 'bg-gradient-to-r from-orange-400 to-amber-400',
    icon: '⚠️',
    label: 'High Risk'
  };
  if (percent >= 25) return {
    color: 'yellow',
    containerClasses: 'bg-gradient-to-br from-yellow-100 via-amber-100 to-lime-100 border-yellow-300',
    textClasses: 'text-slate-800',
    badgeClasses: 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-lg',
    barColor: 'bg-gradient-to-r from-yellow-400 to-amber-400',
    icon: '⚠️',
    label: 'Moderate Risk'
  };
  return {
    color: 'green',
    containerClasses: 'bg-gradient-to-br from-green-100 via-emerald-100 to-teal-100 border-green-300',
    textClasses: 'text-slate-800',
    badgeClasses: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg',
    barColor: 'bg-gradient-to-r from-green-400 to-emerald-400',
    icon: '✅',
    label: 'Low Risk'
  };
};

/**
 * Get appropriate styles based on risk level
 * @param status - Status string from API
 * @param scamProbability - Probability string from API
 * @returns Object with style classes for various UI elements
 */
export const getStatusStyles = (status: string | undefined, scamProbability?: string) => {
  // If we have a scam probability percentage, use it to determine color
  if (scamProbability) {
    const percent = extractPercentage(scamProbability);
    return getColorByPercentage(percent);
  }
  
  // Fallback to status-based styling if no percentage is available
  // Parse the status string to extract consistent risk levels
  const lowerStatus = status?.toLowerCase() || "";
  if (lowerStatus.includes('very high risk')) {
    return getColorByPercentage(75); // Use consistent threshold for very high risk
  } else if (lowerStatus.includes('high risk') && !lowerStatus.includes('very') && !lowerStatus.includes('medium')) {
    return getColorByPercentage(50); // Use consistent threshold for high risk
  } else if (lowerStatus.includes('moderate risk') || lowerStatus.includes('medium risk')) {
    return getColorByPercentage(25); // Use consistent threshold for moderate risk
  } else if (lowerStatus.includes('low risk')) {
    return getColorByPercentage(10); // Use consistent threshold for low risk  } else if (lowerStatus.includes('normal conversation')) {
    return {
      containerClasses: 'bg-gradient-to-br from-blue-100 via-sky-100 to-cyan-100 border-blue-300',
      textClasses: 'text-slate-800',
      badgeClasses: 'bg-blue-500 text-white',
      barColor: 'bg-blue-500',
      icon: '💬',
      label: 'Normal Conversation'
    };
  }
  return { // Default / Fallback
    containerClasses: 'bg-gradient-to-br from-gray-100 via-slate-100 to-zinc-100 border-gray-300',
    textClasses: 'text-slate-800',
    badgeClasses: 'bg-gray-500 text-white',
    barColor: 'bg-gray-500',
    icon: 'ℹ️',
    label: 'Unknown'
  };
};
