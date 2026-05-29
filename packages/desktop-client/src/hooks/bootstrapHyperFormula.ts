import {
  CustomFunctionsPlugin,
  customFunctionsTranslations,
} from '@actual-app/core/shared/formulas/customFunctions';
import { HyperFormula } from 'hyperformula';
import enUS from 'hyperformula/i18n/languages/enUS';

export function bootstrapHyperFormula() {
  try {
    HyperFormula.registerLanguage('enUS', enUS);
  } catch {
    // Already registered.
  }

  try {
    HyperFormula.registerFunctionPlugin(
      CustomFunctionsPlugin,
      customFunctionsTranslations,
    );
  } catch {
    // Already registered.
  }
}
