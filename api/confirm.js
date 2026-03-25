export const config = { runtime: 'edge' };

const ZAPIER   = 'https://hooks.zapier.com/hooks/catch/26412265/upxyvhc/';
const BOT      = 'REDACTED';
const DREW     = '6771551987';
const RYAN     = '8537328931';
const HEADERS  = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: HEADERS });
  if (req.method !== 'POST')    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS });

  // Read body fresh every request
  const text = await req.text();
  let d;
  try { d = JSON.parse(text); }
  catch(e) { return new Response(JSON.stringify({ error: 'Bad JSON', raw: text }), { status: 400, headers: HEADERS }); }

  const msg = `🚗 New Two2Global Booking!

Name: ${d.first_name} ${d.last_name}
Phone: ${d.phone}
Email: ${d.email}
Service: ${d.service_type}
Date: ${d.trip_date} at ${d.pickup_time}
From: ${d.pickup_location}
To: ${d.dropoff_location}
Passengers: ${d.passengers}
Notes: ${d.notes}
Submitted: ${d.submitted_at}`;

  const tg = (chatId) => fetch(`https://api.telegram.org/bot${BOT}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: msg })
  }).then(r => r.json());

  const [zap, drew, ryan] = await Promise.allSettled([
    fetch(ZAPIER, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).then(r => r.text()),
    tg(DREW),
    tg(RYAN)
  ]);

  return new Response(JSON.stringify({
    ok: true,
    zapier: zap.status   === 'fulfilled' ? 'sent' : zap.reason?.message,
    drew:   drew.status  === 'fulfilled' ? drew.value?.ok  : drew.reason?.message,
    ryan:   ryan.status  === 'fulfilled' ? ryan.value?.ok  : ryan.reason?.message
  }), { status: 200, headers: HEADERS });
}
