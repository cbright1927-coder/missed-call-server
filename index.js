const express = require('express');
const twilio = require('twilio');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const TWILIO_SID = process.env.TWILIO_SID;
const TWILIO_TOKEN = process.env.TWILIO_TOKEN;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const twilioClient = twilio(TWILIO_SID, TWILIO_TOKEN);

const axios = require('axios');

async function sendTelegram(message) {
  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    });
  } catch(e) {
    console.error('Telegram error:', e.message);
  }
}

let CLIENTS = [
  {
    twilioNumber: '+447863782938',
    name: "Test Business",
    message: "Hi! Sorry we missed your call. We will ring you back shortly!",
    active: true
  }
];

app.post('/call', (req, res) => {
  const toNumber = req.body.To;
  const fromNumber = req.body.From;
  const match = CLIENTS.find(c => c.twilioNumber === toNumber && c.active);
  if (!match) {
    console.log('Unknown or inactive number:', toNumber);
    res.set('Content-Type', 'text/xml');
    res.send('<Response></Response>');
    return;
  }
  console.log('Missed call for', match.name, 'from', fromNumber);
  twilioClient.messages.create({
    body: match.message,
    from: toNumber,
    to: fromNumber
  }).then(msg => console.log('SMS sent:', msg.sid))
    .catch(err => console.error('SMS error:', err.message));
  res.set('Content-Type', 'text/xml');
  res.send('<Response></Response>');
});

app.post('/sms', (req, res) => {
  const toNumber = req.body.To;
  const fromNumber = req.body.From;
  const body = (req.body.Body || '').trim().toUpperCase();
  const match = CLIENTS.find(c => c.twilioNumber === toNumber && c.active);
  if (!match) {
    res.set('Content-Type', 'text/xml');
    res.send('<Response></Response>');
    return;
  }
  if (body === 'CHANGE') {
    match.awaitingChange = true;
    twilioClient.messages.create({
      body: `Hi! What would you like your new auto-reply message to say? Just reply with your new message and we will update it straight away 😊`,
      from: toNumber,
      to: fromNumber
    }).catch(err => console.error('SMS error:', err.message));
  } else if (match.awaitingChange) {
    const oldMessage = match.message;
    match.message = req.body.Body.trim();
    match.awaitingChange = false;
    twilioClient.messages.create({
      body: `Perfect! Your auto-reply message has been updated to: "${match.message}" 🎉`,
      from: toNumber,
      to: fromNumber
    }).catch(err => console.error('SMS error:', err.message));
    sendTelegram(`✏️ <b>Client updated message — ${match.name}</b>\nOld: ${oldMessage}\nNew: ${match.message}`);
    console.log('Message updated for', match.name);
  }
  res.set('Content-Type', 'text/xml');
  res.send('<Response></Response>');
});

app.post('/add-client', (req, res) => {
  const { name, type, phone, twilioNumber, message } = req.body;
  if (!name || !twilioNumber) return res.json({ success: false, error: 'Missing fields' });

  const existing = CLIENTS.find(c => c.twilioNumber === twilioNumber);
  if (existing) {
    existing.active = true;
    existing.message = message || existing.message;
    console.log('Reactivated client:', name);
    return res.json({ success: true, action: 'reactivated' });
  }

  CLIENTS.push({
    twilioNumber,
    name,
    message: message || `Hi! Sorry we missed your call at ${name}. We will ring you back shortly!`,
    active: true,
    addedAt: new Date().toISOString()
  });

  console.log('Added new client:', name);
  sendTelegram(`✅ <b>New client added to BrightReply</b>\nName: ${name}\nNumber: ${twilioNumber}`);
  res.json({ success: true, action: 'added' });
});

app.post('/update-message', (req, res) => {
  const { twilioNumber, message } = req.body;
  const client = CLIENTS.find(c => c.twilioNumber === twilioNumber);
  if (!client) return res.json({ success: false, error: 'Client not found' });
  client.message = message;
  sendTelegram(`✏️ <b>Message updated — ${client.name}</b>\nNew message: ${message}`);
  res.json({ success: true });
});

app.get('/clients-full', (req, res) => {
  res.json({ clients: CLIENTS });
});
app.post('/cancel-client', (req, res) => {
  const { phone, twilioNumber } = req.body;
  const identifier = twilioNumber || phone;

  const client = CLIENTS.find(c => c.twilioNumber === identifier || c.phone === identifier);
  if (client) {
    client.active = false;
    console.log('Cancelled client:', client.name);
    sendTelegram(`❌ <b>Client deactivated on BrightReply</b>\nName: ${client.name}\nNumber: ${identifier}`);
    return res.json({ success: true });
  }

  res.json({ success: false, error: 'Client not found' });
});

app.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const payload = req.body.toString();
  let event;

  try {
    event = JSON.parse(payload);
  } catch(e) {
    return res.status(400).send('Invalid payload');
  }

  if (event.type === 'customer.subscription.deleted' || event.type === 'invoice.payment_failed') {
    const customerId = event.data.object.customer;
    console.log('Stripe cancellation/failure for customer:', customerId);
    await sendTelegram(
      `⚠️ <b>Stripe alert — ${event.type}</b>\n` +
      `Customer: ${customerId}\n` +
      `Check BrightSales to identify and cancel this client manually.`
    );
  }

  res.json({ received: true });
});

app.get('/clients', (req, res) => {
  res.json({ clients: CLIENTS });
});

app.get('/', (req, res) => {
  res.send('BrightReply server is running.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('BrightReply running on port', PORT);
  sendTelegram('📞 <b>BrightReply is online</b>\nMissed call server running.');
});
