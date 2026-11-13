import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import { Button } from '@actual-app/components/button';
import { SvgAdd } from '@actual-app/components/icons/v1';

import { useNavigate } from '#hooks/useNavigate';

export function AddTagButton() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Button
      variant="bare"
      aria-label={t('Add new tag')}
      style={{ margin: 10 }}
      onPress={() => void navigate(`/tags/new${location.search}`)}
    >
      <SvgAdd width={20} height={20} />
    </Button>
  );
}
