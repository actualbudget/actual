#!/usr/bin/env node

const fs = require('fs');
const https = require('https');

const commentBody = process.env.GITHUB_EVENT_COMMENT_BODY;
const prDetailsJson = process.env.PR_DETAILS;
const summaryDataJson = process.env.SUMMARY_DATA;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!commentBody || !prDetailsJson || !summaryDataJson || !openaiApiKey) {
  console.log('Missing required environment variables');
  process.exit(1);
}

function setOutput(name, value) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

try {
  const prDetails = JSON.parse(prDetailsJson);
  const summaryData = JSON.parse(summaryDataJson);

  if (!summaryData || !prDetails) {
    console.log('Missing data for categorization');
    setOutput('result', 'null');
    process.exit(0);
  }

  const data = JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are categorizing pull requests for release notes. You must respond with exactly one of these categories: "Features", "Enhancements", "Bugfixes", or "Maintenance". No other text or explanation.',
      },
      {
        role: 'user',
        content: `PR Title: ${prDetails.title}\n\nGenerated Summary: ${summaryData.summary}\n\nCodeRabbit Analysis:\n${commentBody}\n\nCategories:\n- Features: New functionality or capabilities\n- Bugfixes: Fixes for broken or incorrect behavior\n- Enhancements: Improvements to existing functionality\n- Maintenance: Code cleanup, refactoring, dependencies, etc.\n\nWhat category does this PR belong to?`,
      },
    ],
    max_tokens: 10,
    temperature: 0.1,
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
        console.log('OpenAI API error for categorization');
        setOutput('result', 'null');
        return;
      }

      try {
        const response = JSON.parse(responseData);
        console.log('OpenAI raw response:', JSON.stringify(response, null, 2));

        const rawContent = response.choices[0].message.content.trim();
        console.log('Raw content from OpenAI:', rawContent);

        let category;
        try {
          category = JSON.parse(rawContent);
          console.log('Parsed category:', category);
        } catch (parseError) {
          console.log(
            'JSON parse error, using raw content:',
            parseError.message,
          );
          category = rawContent;
        }

        // Validate the category response
        const validCategories = [
          'Features',
          'Bugfixes',
          'Enhancements',
          'Maintenance',
        ];
        if (validCategories.includes(category)) {
          console.log('OpenAI categorized as:', category);
          setOutput('result', category);
        } else {
          console.log('Invalid category from OpenAI:', category);
          console.log('Valid categories are:', validCategories);
          setOutput('result', 'null');
        }
      } catch (error) {
        console.log('Error parsing OpenAI response:', error.message);
        setOutput('result', 'null');
      }
    });
  });

  req.on('error', error => {
    console.log('Error in categorization:', error.message);
    setOutput('result', 'null');
  });

  req.write(data);
  req.end();
} catch (error) {
  console.log('Error in categorization:', error.message);
  setOutput('result', 'null');
}
