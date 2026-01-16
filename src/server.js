require('dotenv').config();
const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const app = express();
const port = process.env.PORT || 8080;

// 1. Serve the Landing Page
app.use(express.static(path.join(__dirname, '../public')));

// 2. Stripe Webhook
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
app.post('/api/stripe-webhook', express.raw({type: 'application/json'}), (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        console.log(`💰 Payment received from: ${event.data.object.customer_details.email}`);
    }

    res.json({received: true});
});

// 3. GitHub Webhook (Triggers Helix)
app.use(express.json());
app.post('/api/github-webhook', (req, res) => {
    const event = req.headers['x-github-event'];
    
    if (event === 'check_run' && req.body.action === 'completed' && req.body.check_run.conclusion === 'failure') {
        console.log('🚨 Build Failure Detected. Waking up Helix...');
        
        const repoName = req.body.repository.full_name;
        const prNumber = req.body.check_run.check_suite.pull_requests[0]?.number;
        
        if(prNumber) {
            // Launches the Python agent
            exec(`python3 agents/helix.py --repo "${repoName}" --pr "${prNumber}"`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Helix Error: ${error.message}`);
                    return;
                }
                console.log(`Helix Output: ${stdout}`);
            });
        }
    }
    res.status(200).send('Webhook received');
});

app.listen(port, () => {
    console.log(`🐝 DevKoloni Hive running on port ${port}`);
});
