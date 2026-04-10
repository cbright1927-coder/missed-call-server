const express = require('express');
const twilio = require('twilio');
const app = express();
app.use(express.urlencoded({ extended: false }));

const TWILIO_SID   = process.env.TWILIO_SID;
const TWILIO_TOKEN = process.env.TWILIO_TOKEN;

const client = twilio(TWILIO_SID, TWILIO_TOKEN);

const CLIENTS = [
  {
    twilioNumber: '+447863782938',
    name: "Test Business",
    message: "Hi! Sorry we missed your call. We will ring you back shortly!"
  }
];

app.post('/call', (req, res) => {
  const toNumber   = req.body.To;
  const fromNumber = req.body.From;
  const client_cfg = CLIENTS.find(c => c.twilioNumber === toNumber);
  if (!client_cfg) {
    console.log('Unknown number called:', toNumber);
    res.set('Content-Type', 'text/xml');
    res.send('<Response></Response>');
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
  res.send('<Response></Response>');
});

app.get('/', (req, res) => {
  res.send('Mis

