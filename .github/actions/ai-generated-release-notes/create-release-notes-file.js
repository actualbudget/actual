#!/usr/bin/env node

import * as core from '@actions/core';

import { buildReleaseNotesFileContent } from './build-file-content.js';

const summaryDataJson = process.env.SUMMARY_DATA;
const category = process.env.CATEGORY;

if (!summaryDataJson || !category) {
  console.log('Missing required environment variables');
  process.exit(1);
}

async function createReleaseNotesFile() {
  try {
    const summaryData = JSON.parse(summaryDataJson);

    console.log('Summary data:', summaryData);

    if (!summaryData) {
      console.log('No summary data available, cannot create file');
      core.setOutput('status', 'skipped');
      return;
    }

    console.log('Category value:', category);
    console.log('Category type:', typeof category);
    console.log('Category JSON stringified:', JSON.stringify(category));

    if (!category || category === 'null') {
      console.log('No valid category available, cannot create file');
      core.setOutput('status', 'skipped');
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

    core.setOutput('status', 'generated');
    core.setOutput('file_name', fileName);
    core.setOutput(
      'file_content_base64',
      Buffer.from(fileContent, 'utf8').toString('base64'),
    );
  } catch (error) {
    console.log('Error creating release notes file:', error.message);
    process.exit(1);
  }
}

createReleaseNotesFile();
