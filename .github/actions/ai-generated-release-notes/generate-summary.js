#!/usr/bin/env node

const https = require('https');
const fs = require('fs');

const commentBody = process.env.GITHUB_EVENT_COMMENT_BODY;
const prDetailsJson = process.env.PR_DETAILS;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!commentBody || !prDetailsJson || !openaiApiKey) {
  console.log('Missing required environment variables');
  process.exit(1);
}

function setOutput(name, value) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

try {
  const prDetails = JSON.parse(prDetailsJson);

  if (!prDetails) {
    console.log('No PR details available, cannot generate summary');
    setOutput('result', 'null');
    process.exit(0);
  }

  console.log('CodeRabbit comment body:', commentBody);

  const data = JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are a technical writer helping to create concise release notes. Generate a maximum 15-word summary that describes what this PR does. Focus on the user-facing changes or bug fixes. Do not include "This PR" or similar phrases - just describe the change directly. Start with a base form verb (e.g., "Add" not "Adds", "Fix" not "Fixes", "Introduce" not "Introduces").',
      },
      {
        role: 'user',
        content: `PR Title: ${prDetails.title}\n\nCodeRabbit Analysis:\n${commentBody}\n\nPlease provide a concise summary (max 15 words) of what this PR accomplishes.`,
      },
    ],
    max_tokens: 50,
    temperature: 0.3,
  });

  const options = {
    hostname: 'api.openai.com',
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
  };

  const req = https.request(options, res => {
    let responseData = '';
    res.on('data', chunk => (responseData += chunk));
    res.on('end', () => {
      if (res.statusCode !== 200) {
        console.log(`OpenAI API error: ${res.statusCode} ${res.statusMessage}`);
        setOutput('result', 'null');
        return;
      }

      try {
        const response = JSON.parse(responseData);
        const summary = response.choices[0].message.content.trim();

        console.log('Generated summary:', summary);

        const result = {
          summary: summary,
          prNumber: prDetails.number,
          author: prDetails.author,
        };

        setOutput('result', JSON.stringify(result));
      } catch (error) {
        console.log('Error parsing OpenAI response:', error.message);
        setOutput('result', 'null');
      }
    });
  });

  req.on('error', error => {
    console.log('Error generating summary:', error.message);
    setOutput('result', 'null');
  });

  req.write(data);
  req.end();
} catch (error) {
  console.log('Error generating summary:', error.message);
  setOutput('result', 'null');
}
