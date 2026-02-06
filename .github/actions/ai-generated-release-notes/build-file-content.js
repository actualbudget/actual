export function buildReleaseNotesFileContent(summaryData, category) {
  const cleanCategory =
    typeof category === 'string'
      ? category.replace(/^["']|["']$/g, '')
      : category;

  const fileContent = `---
category: ${cleanCategory}
authors: [${summaryData.author}]
---

${summaryData.summary}`;

  return { cleanCategory, fileContent };
}
