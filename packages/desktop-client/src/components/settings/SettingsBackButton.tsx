import { MobileBackButton } from '#components/mobile/MobileBackButton';
import { useNavigate } from '#hooks/useNavigate';

export function SettingsBackButton() {
  const navigate = useNavigate();

  return <MobileBackButton onPress={() => navigate('/settings')} />;
}
