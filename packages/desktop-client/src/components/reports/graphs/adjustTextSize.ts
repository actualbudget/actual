const adjustTextSize = size => {
  if (size <= 200) {
    return '12px';
  } else if (size <= 233) {
    return '14px';
  } else if (size <= 266) {
    return '16px';
  } else if (size <= 300) {
    return '18px';
  } else {
    return '20px';
  }
};

export default adjustTextSize;
