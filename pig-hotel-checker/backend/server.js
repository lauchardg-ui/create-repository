const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const { parse } = require('node-html-parser');

const app = express();
const PORT = process.env.PORT || 3001;

// --- FIREWALL / SECURITY LAYER ---

// Helmet adds security headers (XSS protection, content-type sniffing, etc.)
app.use(helmet());

// Only allow requests from our mobile app
app.use(cors({
  origin: '*', // In production, lock this to your app's domain
  methods: ['GET'],
}));

// Rate limiting: max 30 requests per minute per IP
const rateLimiter = new RateLimiterMemory({
  points: 30,
  duration: 60,
});

app.use(async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch {
    res.status(429).json({ error: 'Too many requests. Please wait.' });
  }
});

// Strip all cookies and tracking from outbound requests
function sanitizedFetch(url) {
  return fetch(url, {
    headers: {
      'User-Agent': 'PigHotelChecker/1.0',
      'Accept': 'text/html',
    },
    redirect: 'follow',
  });
}

// --- PIG HOTEL DATA ---

const PIG_HOTELS = [
  { id: 'brockenhurst', name: 'THE PIG', location: 'Brockenhurst, New Forest', slug: 'the-pig-hotel' },
  { id: 'bath', name: 'THE PIG-near Bath', location: 'Pensford, Somerset', slug: 'the-pig-near-bath' },
  { id: 'wall', name: 'THE PIG-in the wall', location: 'Southampton', slug: 'the-pig-in-the-wall' },
  { id: 'beach', name: 'THE PIG-on the beach', location: 'Studland, Dorset', slug: 'the-pig-on-the-beach' },
  { id: 'combe', name: 'THE PIG-at Combe', location: 'Honiton, Devon', slug: 'the-pig-at-combe' },
  { id: 'bridge', name: 'THE PIG-at Bridge Place', location: 'Canterbury, Kent', slug: 'the-pig-at-bridge-place' },
  { id: 'harlyn', name: 'THE PIG-at Harlyn Bay', location: 'Padstow, Cornwall', slug: 'the-pig-at-harlyn-bay' },
  { id: 'downs', name: 'THE PIG-in the South Downs', location: 'Arundel, Sussex', slug: 'the-pig-in-the-south-downs' },
];

// Fetch availability for a given hotel and month
async function fetchHotelAvailability(hotel, year, month) {
  try {
    // The Pig uses a booking system; we check their availability pages
    const checkIn = `${year}-${String(month).padStart(2, '0')}-01`;
    const daysInMonth = new Date(year, month, 0).getDate();

    const availability = [];

    // Check availability by looking at their booking calendar endpoint
    const url = `https://www.thepighotel.com/availability/?property=${hotel.slug}&checkin=${checkIn}&nights=1`;
    const response = await sanitizedFetch(url);

    if (!response.ok) {
      // Return unknown availability if we can't reach the site
      for (let day = 1; day <= daysInMonth; day++) {
        availability.push({
          date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          available: 'unknown',
          rooms: [],
        });
      }
      return availability;
    }

    const html = await response.text();
    const root = parse(html);

    // Parse calendar availability from the page
    const calendarDays = root.querySelectorAll('[data-date], .calendar-day, .day-cell, td[class*="day"]');

    const parsedDates = new Set();

    for (const dayEl of calendarDays) {
      const dateAttr = dayEl.getAttribute('data-date');
      if (!dateAttr) continue;

      const isAvailable = !dayEl.classList.contains('unavailable') &&
                          !dayEl.classList.contains('sold-out') &&
                          !dayEl.classList.contains('disabled');

      const priceEl = dayEl.querySelector('.price, [class*="price"], [class*="rate"]');
      const price = priceEl ? priceEl.text.trim() : null;

      parsedDates.add(dateAttr);
      availability.push({
        date: dateAttr,
        available: isAvailable ? 'yes' : 'no',
        price: price,
        rooms: [],
      });
    }

    // Fill in any missing days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (!parsedDates.has(dateStr)) {
        availability.push({
          date: dateStr,
          available: 'unknown',
          rooms: [],
        });
      }
    }

    availability.sort((a, b) => a.date.localeCompare(b.date));
    return availability;

  } catch (error) {
    console.error(`Error fetching ${hotel.name}:`, error.message);
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => ({
      date: `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
      available: 'unknown',
      rooms: [],
    }));
  }
}

// Fetch room details for a specific hotel and date
async function fetchRoomDetails(hotel, checkIn, nights) {
  try {
    const url = `https://www.thepighotel.com/availability/?property=${hotel.slug}&checkin=${checkIn}&nights=${nights}`;
    const response = await sanitizedFetch(url);

    if (!response.ok) return [];

    const html = await response.text();
    const root = parse(html);

    const rooms = [];
    const roomCards = root.querySelectorAll('[class*="room"], [class*="Room"], .accommodation-card, .rate-card');

    for (const card of roomCards) {
      const nameEl = card.querySelector('h2, h3, h4, [class*="name"], [class*="title"]');
      const priceEl = card.querySelector('[class*="price"], [class*="rate"], [class*="Price"]');
      const descEl = card.querySelector('p, [class*="desc"], [class*="description"]');
      const linkEl = card.querySelector('a[href*="book"], a[href*="reserve"]');

      if (nameEl) {
        rooms.push({
          name: nameEl.text.trim(),
          price: priceEl ? priceEl.text.trim() : 'Price on request',
          description: descEl ? descEl.text.trim().substring(0, 200) : '',
          bookingUrl: linkEl ? linkEl.getAttribute('href') : null,
        });
      }
    }

    return rooms;
  } catch (error) {
    console.error(`Error fetching rooms for ${hotel.name}:`, error.message);
    return [];
  }
}

// --- API ROUTES ---

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', firewall: 'active' });
});

// List all hotels
app.get('/api/hotels', (req, res) => {
  // Only return sanitized data - no internal slugs or scraping details
  const hotels = PIG_HOTELS.map(h => ({
    id: h.id,
    name: h.name,
    location: h.location,
  }));
  res.json(hotels);
});

// Get availability for all hotels in a given month
app.get('/api/availability/:year/:month', async (req, res) => {
  const year = parseInt(req.params.year);
  const month = parseInt(req.params.month);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12 || year < 2024 || year > 2030) {
    return res.status(400).json({ error: 'Invalid year or month' });
  }

  const results = {};
  const promises = PIG_HOTELS.map(async (hotel) => {
    const availability = await fetchHotelAvailability(hotel, year, month);
    results[hotel.id] = {
      name: hotel.name,
      location: hotel.location,
      days: availability,
    };
  });

  await Promise.all(promises);
  res.json({ year, month, hotels: results });
});

// Get availability for a single hotel
app.get('/api/availability/:hotelId/:year/:month', async (req, res) => {
  const hotel = PIG_HOTELS.find(h => h.id === req.params.hotelId);
  if (!hotel) return res.status(404).json({ error: 'Hotel not found' });

  const year = parseInt(req.params.year);
  const month = parseInt(req.params.month);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return res.status(400).json({ error: 'Invalid year or month' });
  }

  const availability = await fetchHotelAvailability(hotel, year, month);
  res.json({
    hotel: { id: hotel.id, name: hotel.name, location: hotel.location },
    year,
    month,
    days: availability,
  });
});

// Get room details for a specific hotel and date
app.get('/api/rooms/:hotelId/:checkIn', async (req, res) => {
  const hotel = PIG_HOTELS.find(h => h.id === req.params.hotelId);
  if (!hotel) return res.status(404).json({ error: 'Hotel not found' });

  const nights = parseInt(req.query.nights) || 1;
  const rooms = await fetchRoomDetails(hotel, req.params.checkIn, nights);

  res.json({
    hotel: { id: hotel.id, name: hotel.name, location: hotel.location },
    checkIn: req.params.checkIn,
    nights,
    rooms,
    bookingUrl: `https://www.thepighotel.com/availability/?property=${hotel.slug}&checkin=${req.params.checkIn}&nights=${nights}`,
  });
});

// --- START ---

app.listen(PORT, () => {
  console.log(`Pig Hotel Checker API running on port ${PORT}`);
  console.log(`Firewall: active (helmet, CORS, rate-limiting)`);
  console.log(`Proxying requests to thepighotel.com`);
});
