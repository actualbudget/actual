import { colors } from '../style';

const colourStyles = {
  control: styles => ({
    ...styles,
    backgroundColor: 'white',
    border: '1px solid rgb(208, 208, 208)',
    borderRadius: 4,
    outline: 0,
    marginLeft: -1,
    marginRight: 1,
    padding: '5px 3px',
    minHeight: 'auto',
  }),
  input: styles => ({
    ...styles,
    padding: 0,
    margin: 0,
  }),
  menu: (styles, { selectProps }) => ({
    ...styles,
    backgroundColor: colors.n1,
    marginTop: 2,
    zIndex: 5000,
    position: selectProps.embedded ? 'relative' : styles.position,
  }),
  groupHeading: styles => ({
    ...styles,
    color: colors.y9,
    textTransform: 'none',
    paddingLeft: '9px',
    fontSize: '100%',
    fontWeight: 'normal',
  }),
  option: (styles, { isFocused }) => ({
    ...styles,
    backgroundColor: isFocused ? colors.n5 : undefined,
    color: 'white',
    padding: '3px 20px',
    fontSize: 13,
  }),
  valueContainer: styles => ({ ...styles, padding: 'none' }),
  clearIndicator: styles => ({
    ...styles,
    padding: 'none',
    '> svg': { height: 15, width: 15 },
  }),
  multiValue: styles => ({ ...styles, backgroundColor: colors.b9 }),
};

export default colourStyles;
