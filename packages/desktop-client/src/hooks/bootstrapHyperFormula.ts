import {
  CustomFunctionsPlugin,
  customFunctionsTranslations,
} from '@actual-app/core/shared/formulas/customFunctions';
import { HyperFormula } from 'hyperformula';
import enUS from 'hyperformula/i18n/languages/enUS';

export function bootstrapHyperFormula() {
  if (!HyperFormula.getRegisteredLanguagesCodes().includes('enUS')) {
    HyperFormula.registerLanguage('enUS', enUS);
  }
  HyperFormula.registerFunctionPlugin(
    CustomFunctionsPlugin,
    customFunctionsTranslations,
  );
}
