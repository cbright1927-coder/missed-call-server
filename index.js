const express = require('express');
const twilio = require('twilio');

const app = express();
app.use(express.urlencoded({ extended: false }));

// -----------------------------------------------
// PASTE YOUR TWILIO CREDENTIALS HERE
const TWILIO_SID   = process.env.TWILIO_SID;
const TWILIO_TOKEN = process.env.TWILIO_TOKEN;
// -----------------------------------------------

const client = twilio(TWILIO_SID, TWILIO_TOKEN);

// -----------------------------------------------
// YOUR CLIENTS — add or edit as needed
const CLIENTS = [
  {
    twilioNumber: '+447863782938
',
    name: "Joe's Plumbing",
    message: "Hi! Sorry we missed your call at Joe's Plumbing. We'll ring you back shortly — or reply here to book a visit."
  },
  {
    twilioNumber: '+447863782938
',
    name: "Sara's Hair Salon",
    message: "Hi! Thanks for calling Sara's Hair Salon. We're with a client right now — we'll call you back soon. Reply to book an appointment!"
  },
  {
    twilioNumber: '+447863782938
',
    name: "East Side Garage",
    message: "Hey! You've reached East Side Garage. We're busy in the workshop — we'll call you back ASAP."
  }
];
// -----------------------------------------------

app.post('/call', (req, res) => {
  const toNumber   = req.body.To;
  const fromNumber = req.body.From;

  const client_cfg = CLIENTS.find(c => c.twilioNumber === toNumber);

  if (!client_cfg) {
    console.log('Unknown number called:', toNumber);
    res.set('Content-Type', 'text/xml');
    res.send('');
    return;
  }

  console.log(`Missed call for ${client_cfg.name} from ${fromNumber}`);

  client.messages.create({
    body: client_cfg.message,
    from: toNumber,
    to:   fromNumber
  }).then(msg => {
    console.log('SMS sent:', msg.sid);
  }).catch(err => {
    console.error('SMS error:', err.message);
  });

  res.set('Content-Type', 'text/xml');
  res.send('');
});

app.get('/', (req, res) => {
  res.send('Missed call server is running.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
