import { FunctionPlugin, FunctionArgumentType } from 'hyperformula';
import { InterpreterState } from 'hyperformula/typings/interpreter/InterpreterState';
import { ProcedureAst } from 'hyperformula/typings/parser';

import { integerToAmount } from '../../shared/util';

export class CustomFunctionsPlugin extends FunctionPlugin {
  integerToAmount(ast: ProcedureAst, state: InterpreterState) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('INTEGER_TO_AMOUNT'),
      (integerAmount: number, decimalPlaces: number = 2) => {
        return integerToAmount(integerAmount, decimalPlaces);
      },
    );
  }
}

CustomFunctionsPlugin.implementedFunctions = {
  INTEGER_TO_AMOUNT: {
    method: 'integerToAmount',
    parameters: [
      { argumentType: FunctionArgumentType.NUMBER },
      {
        argumentType: FunctionArgumentType.NUMBER,
        optionalArg: true,
        defaultValue: 2,
      },
    ],
  },
};
