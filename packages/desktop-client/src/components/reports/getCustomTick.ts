export const getCustomTick = (value: string, isPrivacyModeEnabled: boolean) => {
  if (isPrivacyModeEnabled) {
    return '...';
  } else {
    return value;
  }
};
