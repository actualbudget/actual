export const adjustTextSize = size => {
  if (size <= 400) {
    return '12px';
  } else if (size <= 600) {
    return '14px';
  } else {
    return '16px';
  }
};

export const adjustDonutTextSize = size => {
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

export const variableTextSize = (width: number, value: number) => {
  if (value < 100) {
    if (width < 9) {
      return '10px';
    } else if (width < 13) {
      return '11px';
    } else if (width < 16) {
      return '12px';
    } else if (width < 19) {
      return '13px';
    } else if (width < 22) {
      return '14px';
    } else if (width < 25) {
      return '15px';
    } else {
      return '16px';
    }
  } else if (value < 1000) {
    if (width < 23) {
      return '10px';
    } else if (width < 26) {
      return '11px';
    } else if (width < 29) {
      return '12px';
    } else if (width < 32) {
      return '13px';
    } else if (width < 35) {
      return '14px';
    } else if (width < 38) {
      return '15px';
    } else {
      return '16px';
    }
  } else if (value < 10000) {
    if (width < 30) {
      return '10px';
    } else if (width < 35) {
      return '11px';
    } else if (width < 40) {
      return '12px';
    } else if (width < 45) {
      return '13px';
    } else if (width < 50) {
      return '14px';
    } else if (width < 55) {
      return '15px';
    } else {
      return '16px';
    }
  } else {
    if (width < 36) {
      return '10px';
    } else if (width < 42) {
      return '11px';
    } else if (width < 48) {
      return '12px';
    } else if (width < 54) {
      return '13px';
    } else if (width < 60) {
      return '14px';
    } else if (width < 66) {
      return '15px';
    } else {
      return '16px';
    }
  }
};
