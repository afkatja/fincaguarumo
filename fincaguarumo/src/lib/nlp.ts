// NLP utility functions for processing review text
import natural from 'natural';

// Initialize stemmer and tokenizer
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;

// Common stopwords to remove
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
  'will', 'with', 'i', 'you', 'we', 'they', 'this', 'that', 'these', 'those',
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
  'had', 'having', 'do', 'does', 'did', 'doing', 'would', 'could', 'should',
  'may', 'might', 'must', 'can', 'shall', 'ought', 'need', 'dare'
]);

// Platform-specific boilerplate patterns to remove
const PLATFORM_BOILERPLATE = [
  // Airbnb
  /this host/i,
  /superhost/i,
  /entire home/i,
  /private room/i,
  /shared room/i,
  // Booking.com
  /excellent/i,
  /very good/i,
  /good/i,
  /fair/i,
  /poor/i,
  // Generic
  /reviewed on/i,
  /stayed in/i,
  /month year/i,
  /\d{1,2}\/\d{1,2}\/\d{2,4}/i,
  // Common phrases
  /would recommend/i,
  /highly recommend/i,
  /would stay again/i,
  /loved my stay/i,
  /great place/i,
  /nice place/i,
  /good value/i,
];

// Hospitality domain synonyms mapping
const HOSPITALITY_SYNONYMS: Record<string, string[]> = {
  location: ['near', 'close to', 'proximity to', 'walking distance', 'steps from', 'area', 'neighborhood', 'surroundings', 'position', 'situated', 'located'],
  cleanliness: ['clean', 'spotless', 'tidy', 'immaculate', 'pristine', 'hygienic', 'sanitary', 'neat', 'orderly'],
  views: ['view', 'vista', 'panorama', 'outlook', 'scenery', 'landscape', 'seascape', 'ocean view', 'mountain view', 'sunset', 'sunrise'],
  communication: ['host', 'hostess', 'owner', 'manager', 'responsive', 'communication', 'contact', 'reply', 'response', 'helpful', 'friendly', 'welcoming'],
  amenities: ['amenity', 'facility', 'equipment', 'supply', 'provided', 'available', 'kitchen', 'bathroom', 'bedroom', 'living room', 'wifi', 'internet', 'air conditioning', 'heater', 'pool', 'garden'],
  comfort: ['comfortable', 'cozy', 'relaxing', 'peaceful', 'quiet', 'serene', 'tranquil', 'restful', 'spacious', 'roomy'],
  value: ['value', 'price', 'cost', 'rate', 'fee', 'expensive', 'cheap', 'affordable', 'reasonable', 'worth', 'budget', 'economical'],
  privacy: ['private', 'privacy', 'secluded', 'isolated', 'remote', 'alone', 'undisturbed', 'peace and quiet'],
  noise: ['noise', 'quiet', 'silent', 'soundproof', 'quiet', 'peaceful'],
};

/**
 * Normalize review text by lowercasing, removing boilerplate, stopwords, and lemmatizing
 */
export function normalizeReviewText(text: string): string {
  if (!text) return '';

  // Convert to lowercase
  let normalized = text.toLowerCase();

  // Remove platform boilerplate
  for (const pattern of PLATFORM_BOILERPLATE) {
    normalized = normalized.replace(pattern, '');
  }

  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  // Tokenize
  const tokens = tokenizer.tokenize(normalized);

  // Remove stopwords and apply stemming
  const filteredTokens = tokens
    .filter((token: string) => !STOPWORDS.has(token) && token.length > 2)
    .map((token: string) => stemmer.stem(token));

  // Join back into text
  return filteredTokens.join(' ');
}

/**
 * Extract sentences from text
 */
export function extractSentences(text: string): string[] {
  if (!text) return [];
  
  // Simple sentence splitting (can be improved with more sophisticated NLP)
  return text
    .split(/[.!?]+/)
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length > 0);
}

/**
 * Extract noun phrases from text (simplified approach)
 */
export function extractNounPhrases(text: string): string[] {
  if (!text) return [];
  
  // Simple noun phrase extraction (sequences of nouns/adjectives)
  // In a real implementation, you'd use POS tagging
  const words = tokenizer.tokenize(text.toLowerCase());
  const nounPhrases: string[] = [];
  
  // Look for sequences of 2-3 words that might be noun phrases
  for (let i = 0; i < words.length - 1; i++) {
    // Bigrams
    const bigram = `${words[i]} ${words[i + 1]}`;
    nounPhrases.push(bigram);
    
    // Trigrams
    if (i < words.length - 2) {
      const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
      nounPhrases.push(trigram);
    }
  }
  
  return nounPhrases;
}

/**
 * Map extracted terms to standardized aspects using synonym mapping
 */
export function mapToAspects(terms: string[]): Record<string, number> {
  const aspectCounts: Record<string, number> = {};
  
  // Initialize all aspects with zero count
  Object.keys(HOSPITALITY_SYNONYMS).forEach(aspect => {
    aspectCounts[aspect] = 0;
  });
  
  // Count occurrences of each aspect based on synonym matches
  terms.forEach(term => {
    Object.entries(HOSPITALITY_SYNONYMS).forEach(([aspect, synonyms]) => {
      // Check if term matches any synonym (exact match or contains)
      if (
        synonyms.some(synonym => 
          term === synonym || 
          term.includes(synonym) || 
          synonym.includes(term)
        )
      ) {
        aspectCounts[aspect] = (aspectCounts[aspect] || 0) + 1;
      }
    });
  });
  
  return aspectCounts;
}

/**
 * Calculate sentiment score for text (simplified)
 * Returns a score between -1 (negative) and 1 (positive)
 */
export function calculateSentiment(text: string): number {
  if (!text) return 0;
  
  // Simple sentiment lexicon (can be expanded)
  const positiveWords = new Set([
    'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'perfect',
    'love', 'loved', 'like', 'liked', 'best', 'better', 'awesome', 'brilliant',
    'outstanding', 'superb', 'magnificent', 'splendid', 'delightful', 'pleasing',
    'satisfied', 'happy', 'pleased', 'content', 'impressed', 'recommend',
  ]);
  
  const negativeWords = new Set([
    'bad', 'poor', 'terrible', 'awful', 'horrible', 'disappointing', 'worst',
    'hate', 'hated', 'dislike', 'disliked', 'worse', 'boring', 'uncomfortable',
    'dirty', 'noisy', 'slow', 'rude', 'unhelpful', 'unsatisfied', 'unhappy',
  ]);
  
  const words = tokenizer.tokenize(text.toLowerCase());
  let score = 0;
  let total = 0;
  
  words.forEach((word: string) => {
    if (positiveWords.has(word)) {
      score += 1;
      total++;
    } else if (negativeWords.has(word)) {
      score -= 1;
      total++;
    }
  });
  
  return total > 0 ? score / total : 0;
}

/**
 * Process reviews and extract aspects with scores
 */
export function processReviewsForAspects(reviews: Array<{ 
  text: string; 
  rating: number; 
  date: string | Date; 
  platform: string 
}>): Array<{ 
  aspect: string; 
  score: number; 
  mentionCount: number; 
  positiveMentions: number; 
  negativeMentions: number 
}> {
  // Normalize all reviews
  const normalizedReviews = reviews.map(review => ({
    ...review,
    normalizedText: normalizeReviewText(review.text),
    sentences: extractSentences(review.text),
    sentiment: calculateSentiment(review.text),
    recencyWeight: calculateRecencyWeight(new Date(review.date)),
  }));
  
  // Extract aspects from each review
  const allAspects: Record<string, {
    mentionCount: number;
    positiveMentions: number;
    negativeMentions: number;
    totalScore: number;
  }> = {};
  
  normalizedReviews.forEach(review => {
    // Extract noun phrases
    const nounPhrases = extractNounPhrases(review.normalizedText);
    
    // Map to aspects
    const aspects = mapToAspects(nounPhrases);
    
    // Update aspect counts
    Object.entries(aspects).forEach(([aspect, count]) => {
      if (!allAspects[aspect]) {
        allAspects[aspect] = {
          mentionCount: 0,
          positiveMentions: 0,
          negativeMentions: 0,
          totalScore: 0,
        };
      }
      
      allAspects[aspect].mentionCount += count;
      
      // Weight by sentiment and recency
      const weightedSentiment = review.sentiment * review.recencyWeight;
      if (weightedSentiment > 0) {
        allAspects[aspect].positiveMentions += count * (weightedSentiment + 1) / 2;
      } else {
        allAspects[aspect].negativeMentions += count * Math.abs(weightedSentiment) / 2;
      }
      
      // Add to total score (positive mentions minus negative mentions, log-scaled by mention count)
      const positivityRate = allAspects[aspect].positiveMentions / 
        Math.max(allAspects[aspect].positiveMentions + allAspects[aspect].negativeMentions, 1);
      allAspects[aspect].totalScore = 
        positivityRate * Math.log1p(allAspects[aspect].mentionCount);
    });
  });
  
  // Convert to array and sort by score
  return Object.entries(allAspects)
    .map(([aspect, data]) => ({
      aspect,
      score: data.totalScore,
      mentionCount: data.mentionCount,
      positiveMentions: data.positiveMentions,
      negativeMentions: data.negativeMentions,
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Calculate recency weight for a review (more recent = higher weight)
 */
function calculateRecencyWeight(date: Date): number {
  const now = new Date();
  const diffInDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
  
  // Reviews from the last 30 days get full weight, decaying afterwards
  if (diffInDays <= 30) {
    return 1;
  }
  
  // Exponential decay after 30 days
  return Math.exp(-0.01 * (diffInDays - 30));
}