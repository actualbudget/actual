import { toPng } from 'html-to-image';

export const downloadSnapshot = async () => {
  const reportElement = document.getElementById('custom-report-content');
  if (reportElement) {
    const dataUrl = await toPng(reportElement);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'custom-report.png';
    link.click();
  } else {
    console.error('Report container not found.');
  }
};
