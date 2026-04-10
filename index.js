const express = require('express');
const twilio = require('twilio');
const app = express();
app.use(express.urlencoded({ extended: false }));

const TWILIO_SID = process.env.TWILIO_SID;
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
  const toNumber = req.body.To;
  const fromNumber = req.body.From;
  const match = CLIENTS.find(c => c.twilioNumber === toNumber);
  if (!match) {
    console.log('Unknown number:', toNumber);
    res.set('Content-Type', 'text/xml');
    res.send('<Response></Response>');
    return;
  }
  console.log('Sending SMS for ' + match.name);
  client.messages.create({
    body: match.message,
    from: toNumber,
    to: fromNumber
  }).then(msg => console.log('SMS sent:', msg.sid))
    .catch(err => console.error('Error:', err.message));
  res.set('Content-Type', 'text/xml');
  res.send('<Response></Response>');
});

app.get('/', (req, res) => {
  res.send('Server is running');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Running on port ' + PORT));
