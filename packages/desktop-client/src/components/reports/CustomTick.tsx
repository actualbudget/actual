const CustomTick = (value: string, test: boolean) => {
  if (!test) {
    return value;
  } else {
    return '...';
  }
};

export default CustomTick;
