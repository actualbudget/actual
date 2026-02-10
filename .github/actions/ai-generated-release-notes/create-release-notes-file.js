#!/usr/bin/env node

import fs from 'fs';

import { buildReleaseNotesFileContent } from './build-file-content.js';

const summaryDataJson = process.env.SUMMARY_DATA;
const category = process.env.CATEGORY;

if (!summaryDataJson || !category) {
  console.log('Missing required environment variables');
  process.exit(1);
}

function setOutput(name, value) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

async function createReleaseNotesFile() {
  try {
    const summaryData = JSON.parse(summaryDataJson);

    console.log('Summary data:', summaryData);

    if (!summaryData) {
      console.log('No summary data available, cannot create file');
      setOutput('status', 'skipped');
      return;
    }

    console.log('Category value:', category);
    console.log('Category type:', typeof category);
    console.log('Category JSON stringified:', JSON.stringify(category));

    if (!category || category === 'null') {
      console.log('No valid category available, cannot create file');
      setOutput('status', 'skipped');
      return;
    }

    const { cleanCategory, fileContent } = buildReleaseNotesFileContent(
      summaryData,
      category,
    );
    console.log('Clean category:', cleanCategory);

    const fileName = `upcoming-release-notes/${summaryData.prNumber}.md`;

    console.log(`Prepared release notes file: ${fileName}`);
    console.log('File content:');
    console.log(fileContent);

    setOutput('status', 'generated');
    setOutput('file_name', fileName);
    setOutput(
      'file_content_base64',
      Buffer.from(fileContent, 'utf8').toString('base64'),
    );
  } catch (error) {
    console.log('Error creating release notes file:', error.message);
    process.exit(1);
  }
}

createReleaseNotesFile().catch(error => {
  console.log('Unhandled error:', error.message);
  process.exit(1);
});
