export const config = { runtime: 'edge' };

// All secrets loaded from Vercel environment variables — never hardcoded
const BOT    = process.env.TELEGRAM_BOT_TOKEN;
const DREW   = process.env.TELEGRAM_DREW_CHAT_ID;
const RYAN   = process.env.TELEGRAM_RYAN_CHAT_ID;
const ZAPIER = process.env.ZAPIER_WEBHOOK_URL;
const ORIGIN = process.env.ALLOWED_ORIGIN || 'https://two2global.vercel.app';

const HEADERS = {
  'Access-Control-Allow-Origin': ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff'
};

// Basic input sanitization — strip tags, limit length
function sanitize(val, maxLen = 200) {
  if (typeof val !== 'string') return '';
  return val.replace(/<[^>]*>/g, '').trim().slice(0, maxLen);
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: HEADERS });
  if (req.method !== 'POST')   return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS });

  // Verify request comes from our domain
  const origin  = req.headers.get('origin')  || '';
  const referer = req.headers.get('referer') || '';
  const trusted = origin.includes('two2global') || referer.includes('two2global');
  if (!trusted) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: HEADERS });
  }

  // Enforce content-type
  const ct = req.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    return new Response(JSON.stringify({ error: 'Bad content type' }), { status: 415, headers: HEADERS });
  }

  // Parse and validate body
  let d = {};
  try {
    const text = await req.text();
    if (!text || text.length > 5000) throw new Error('Invalid payload size');
    d = JSON.parse(text);
  } catch(e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS });
  }

  // Require minimum fields
  if (!d.first_name || !d.phone) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: HEADERS });
  }

  // Sanitize all fields
  const safe = {
    first_name:       sanitize(d.first_name),
    last_name:        sanitize(d.last_name),
    phone:            sanitize(d.phone, 20),
    email:            sanitize(d.email, 100),
    service_type:     sanitize(d.service_type),
    trip_date:        sanitize(d.trip_date, 30),
    pickup_time:      sanitize(d.pickup_time, 20),
    pickup_location:  sanitize(d.pickup_location),
    dropoff_location: sanitize(d.dropoff_location),
    passengers:       sanitize(d.passengers, 10),
    notes:            sanitize(d.notes, 500),
    submitted_at:     sanitize(d.submitted_at, 50),
  };

  const msg = [
    '🚗 New Two2Global Booking!',
    '',
    `Name: ${safe.first_name} ${safe.last_name}`,
    `Phone: ${safe.phone}`,
    `Email: ${safe.email}`,
    `Service: ${safe.service_type}`,
    `Date: ${safe.trip_date} at ${safe.pickup_time}`,
    `From: ${safe.pickup_location}`,
    `To: ${safe.dropoff_location}`,
    `Passengers: ${safe.passengers}`,
    `Notes: ${safe.notes}`,
    `Submitted: ${safe.submitted_at}`
  ].join('\n');

  const tg = (chatId) => fetch(`https://api.telegram.org/bot${BOT}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: msg })
  });

  await Promise.allSettled([
    tg(DREW),
    tg(RYAN),
    fetch(ZAPIER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(safe)
    })
  ]);

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: HEADERS });
}
