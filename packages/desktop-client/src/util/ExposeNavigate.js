import { useNavigate } from 'react-router-dom';

export default function ExposeNavigate() {
  let navigate = useNavigate();
  window.__navigate = navigate;
  return null;
}
