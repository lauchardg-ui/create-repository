import { NewRestaurant } from '../types/restaurant';

const TIMEOUT_BASE_URL = 'https://www.timeout.com';
const EATER_BASE_URL = 'https://www.eater.com';
const INFATUATION_BASE_URL = 'https://www.theinfatuation.com';

interface ScrapedRestaurant {
  name: string;
  cuisine: string;
  address: string;
  sourceUrl: string;
  source: 'timeout' | 'eater' | 'infatuation';
  openedDate?: string;
}

/**
 * Fetches newly opened restaurants from Timeout.
 * Uses their public pages for new restaurant listings.
 */
async function fetchTimeoutNewRestaurants(city: string): Promise<ScrapedRestaurant[]> {
  try {
    const url = `${TIMEOUT_BASE_URL}/${encodeURIComponent(city)}/restaurants/new-restaurants`;
    const response = await fetch(url);
    if (!response.ok) return [];

    const html = await response.text();
    return parseTimeoutHtml(html, city);
  } catch (error) {
    console.warn('Timeout fetch failed:', error);
    return [];
  }
}

function parseTimeoutHtml(html: string, city: string): ScrapedRestaurant[] {
  const restaurants: ScrapedRestaurant[] = [];

  // Extract restaurant entries from Timeout's listing page
  // Matches article/card patterns with restaurant names and details
  const articlePattern = /<article[^>]*>[\s\S]*?<\/article>/gi;
  const articles = html.match(articlePattern) || [];

  for (const article of articles) {
    const nameMatch = article.match(/<h3[^>]*>(.*?)<\/h3>/i);
    const linkMatch = article.match(/href="(\/[^"]*restaurants[^"]*)"/i);

    if (nameMatch) {
      restaurants.push({
        name: stripHtml(nameMatch[1]),
        cuisine: extractCuisineFromText(article),
        address: extractAddressFromText(article),
        sourceUrl: linkMatch ? `${TIMEOUT_BASE_URL}${linkMatch[1]}` : '',
        source: 'timeout',
      });
    }
  }

  return restaurants;
}

/**
 * Fetches newly opened restaurants from Eater.
 */
async function fetchEaterNewRestaurants(city: string): Promise<ScrapedRestaurant[]> {
  try {
    const citySlug = city.toLowerCase().replace(/\s+/g, '-');
    const url = `${EATER_BASE_URL}/${citySlug}/maps/best-new-restaurants`;
    const response = await fetch(url);
    if (!response.ok) return [];

    const html = await response.text();
    return parseEaterHtml(html);
  } catch (error) {
    console.warn('Eater fetch failed:', error);
    return [];
  }
}

function parseEaterHtml(html: string): ScrapedRestaurant[] {
  const restaurants: ScrapedRestaurant[] = [];

  const entryPattern = /<section[^>]*class="[^"]*c-mapstack__card[^"]*"[^>]*>[\s\S]*?<\/section>/gi;
  const entries = html.match(entryPattern) || [];

  for (const entry of entries) {
    const nameMatch = entry.match(/<h1[^>]*>(.*?)<\/h1>/i);
    const linkMatch = entry.match(/href="(https?:\/\/[^"]*)"/i);

    if (nameMatch) {
      restaurants.push({
        name: stripHtml(nameMatch[1]),
        cuisine: extractCuisineFromText(entry),
        address: extractAddressFromText(entry),
        sourceUrl: linkMatch ? linkMatch[1] : '',
        source: 'eater',
      });
    }
  }

  return restaurants;
}

/**
 * Fetches newly opened restaurants from The Infatuation.
 */
async function fetchInfatuationNewRestaurants(city: string): Promise<ScrapedRestaurant[]> {
  try {
    const citySlug = city.toLowerCase().replace(/\s+/g, '-');
    const url = `${INFATUATION_BASE_URL}/${citySlug}/guides/new-restaurants`;
    const response = await fetch(url);
    if (!response.ok) return [];

    const html = await response.text();
    return parseInfatuationHtml(html);
  } catch (error) {
    console.warn('Infatuation fetch failed:', error);
    return [];
  }
}

function parseInfatuationHtml(html: string): ScrapedRestaurant[] {
  const restaurants: ScrapedRestaurant[] = [];

  const cardPattern = /<div[^>]*class="[^"]*venue-card[^"]*"[^>]*>[\s\S]*?<\/div>/gi;
  const cards = html.match(cardPattern) || [];

  for (const card of cards) {
    const nameMatch = card.match(/<h[2-4][^>]*>(.*?)<\/h[2-4]>/i);
    const linkMatch = card.match(/href="(\/[^"]*)"/i);

    if (nameMatch) {
      restaurants.push({
        name: stripHtml(nameMatch[1]),
        cuisine: extractCuisineFromText(card),
        address: extractAddressFromText(card),
        sourceUrl: linkMatch ? `${INFATUATION_BASE_URL}${linkMatch[1]}` : '',
        source: 'infatuation',
      });
    }
  }

  return restaurants;
}

// --- Utilities ---

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '').trim();
}

function extractCuisineFromText(text: string): string {
  const cuisines = [
    'Italian', 'Japanese', 'Chinese', 'Mexican', 'Indian', 'Thai', 'French',
    'Korean', 'Vietnamese', 'Mediterranean', 'American', 'Spanish', 'Greek',
    'Turkish', 'Lebanese', 'Ethiopian', 'Peruvian', 'Brazilian', 'Caribbean',
    'British', 'Middle Eastern', 'African', 'Seafood', 'Pizza', 'Sushi',
    'Ramen', 'BBQ', 'Vegan', 'Vegetarian', 'Fusion', 'Tapas', 'Bistro',
  ];
  const plainText = stripHtml(text).toLowerCase();
  const found = cuisines.find((c) => plainText.includes(c.toLowerCase()));
  return found || 'Various';
}

function extractAddressFromText(text: string): string {
  const plainText = stripHtml(text);
  // Try to find address-like patterns (number + street name)
  const addressMatch = plainText.match(/\d+\s+[\w\s]+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Pl|Place)\b[^,]*/i);
  return addressMatch ? addressMatch[0].trim() : '';
}

/**
 * Main function: scrape all sources for new restaurants in a city.
 */
export async function scrapeNewRestaurants(city: string): Promise<ScrapedRestaurant[]> {
  const [timeoutResults, eaterResults, infatuationResults] = await Promise.allSettled([
    fetchTimeoutNewRestaurants(city),
    fetchEaterNewRestaurants(city),
    fetchInfatuationNewRestaurants(city),
  ]);

  const allResults: ScrapedRestaurant[] = [];

  if (timeoutResults.status === 'fulfilled') allResults.push(...timeoutResults.value);
  if (eaterResults.status === 'fulfilled') allResults.push(...eaterResults.value);
  if (infatuationResults.status === 'fulfilled') allResults.push(...infatuationResults.value);

  // Deduplicate by name similarity
  return deduplicateRestaurants(allResults);
}

function deduplicateRestaurants(restaurants: ScrapedRestaurant[]): ScrapedRestaurant[] {
  const seen = new Map<string, ScrapedRestaurant>();

  for (const r of restaurants) {
    const key = r.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!seen.has(key)) {
      seen.set(key, r);
    }
  }

  return Array.from(seen.values());
}

/**
 * Convert scraped results into NewRestaurant objects with generated IDs.
 */
export function toNewRestaurants(
  scraped: ScrapedRestaurant[],
  userLat: number,
  userLon: number
): NewRestaurant[] {
  return scraped.map((s, index) => ({
    id: `${s.source}-${Date.now()}-${index}`,
    name: s.name,
    cuisine: s.cuisine,
    priceLevel: 2 as const,
    latitude: userLat + (Math.random() - 0.5) * 0.02, // Approximate; real geocoding needed
    longitude: userLon + (Math.random() - 0.5) * 0.02,
    address: s.address,
    source: s.source,
    sourceUrl: s.sourceUrl,
    openedDate: s.openedDate,
    matchScore: 0,
    matchReasons: [],
    isNew: true,
    discoveredAt: new Date().toISOString(),
    notified: false,
  }));
}
