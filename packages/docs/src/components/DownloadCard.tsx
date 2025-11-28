import type { ReactElement } from 'react';

type DownloadLink = {
  label: string;
  url: string;
};

type DownloadCardProps = {
  icon: ReactElement;
  platform: string;
  links: DownloadLink[];
};

export function DownloadCard({ icon, platform, links }: DownloadCardProps) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '1.5rem',
        border: '1px solid var(--ifm-color-emphasis-500)',
        borderRadius: '8px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100px',
          marginBottom: '1rem',
        }}
      >
        {icon}
      </div>
      <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>{platform}</h3>
      {links.map(link => (
        <a
          key={link.url}
          href={link.url}
          style={{ display: 'block', marginTop: '0.5rem' }}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}
