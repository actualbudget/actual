type ClientVersionOptions = {
  packageVersion: string;
  isPlaywright: boolean;
  reviewId?: string;
  commitRef?: string;
};

export function getClientVersion({
  packageVersion,
  isPlaywright,
  reviewId,
  commitRef,
}: ClientVersionOptions): string {
  if (isPlaywright) {
    return '99.9.9';
  }

  if (reviewId) {
    return '.preview';
  }

  if (commitRef) {
    return `${packageVersion}+${commitRef.slice(0, 7)}`;
  }

  return packageVersion;
}
