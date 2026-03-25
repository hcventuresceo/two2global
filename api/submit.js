export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ZAPIER_WEBHOOK = 'https://hooks.zapier.com/hooks/catch/26412265/upxyvhc/';
  const DREW_BOT_TOKEN = 'REDACTED';
  const DREW_CHAT_ID   = '6771551987';
  const RYAN_CHAT_ID   = '8537328931';

  const d = req.body;

  const message = [
    '🚗 New Two2Global Booking!',
    '',
    `Name: ${d.first_name} ${d.last_name}`,
    `Phone: ${d.phone}`,
    `Email: ${d.email}`,
    `Service: ${d.service_type}`,
    `Date: ${d.trip_date} at ${d.pickup_time}`,
    `From: ${d.pickup_location}`,
    `To: ${d.dropoff_location}`,
    `Passengers: ${d.passengers}`,
    `Hours: ${d.estimated_hours}`,
    `Notes: ${d.notes}`,
    `Submitted: ${d.submitted_at}`
  ].join('\n');

  const sendTelegram = (chatId) =>
    fetch(`https://api.telegram.org/bot${DREW_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message })
    }).then(r => r.json());

  const [zapier, drew, ryan] = await Promise.allSettled([
    fetch(ZAPIER_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(d)
    }).then(r => r.text()),
    sendTelegram(DREW_CHAT_ID),
    sendTelegram(RYAN_CHAT_ID)
  ]);

  return res.status(200).json({
    zapier: zapier.status === 'fulfilled' ? 'ok' : zapier.reason?.message,
    drew:   drew.status   === 'fulfilled' ? drew.value?.ok   : drew.reason?.message,
    ryan:   ryan.status   === 'fulfilled' ? ryan.value?.ok   : ryan.reason?.message
  });
}
