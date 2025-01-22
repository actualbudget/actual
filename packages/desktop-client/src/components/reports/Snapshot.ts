import html2canvas from 'html2canvas';

export const downloadSnapshot = async () => {
  const reportElement = document.getElementById('custom-report-content');
  if (reportElement) {
    const canvas = await html2canvas(reportElement);
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'custom-report.png';
    link.click();
  } else {
    console.error('Report container not found.');
  }
};
