import { useSelector } from 'react-redux';

export default function useFeatureFlag(name) {
  return useSelector(state => state.prefs.local[`flags.${name}`]);
}
