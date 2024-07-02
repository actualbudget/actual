import {
  type NavigateFunction,
  useNavigate as useNavigateReactRouter,
} from 'react-router-dom';

export function useNavigate(): NavigateFunction {
  return useNavigateReactRouter();
}
