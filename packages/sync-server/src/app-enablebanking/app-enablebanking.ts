import express from 'express';

import { Request, Response } from 'express';

import { handleError } from '../app-gocardless/util/handle-error.js';
import { requestLoggerMiddleware, validateSessionMiddleware } from '../util/middlewares.js';
import { BankSyncTransaction, type BankSyncResponse } from './models/bank-sync.js';

import { enableBankingservice } from './services/enablebanking-services.js';

const app = express();
app.use(requestLoggerMiddleware);
export { app as handlers };

app.use(express.json());
app.use(validateSessionMiddleware);

app.post(
    '/configure',
    handleError(async (req, res) => {
        const { applicationId, secret } = req.body || {};

        enableBankingservice.setupSecrets(applicationId, secret);
    
        res.send({
          status: 'ok',
        });
      }),
)

app.post(
  '/status',
  handleError(async (req, res) => {
    res.send({
      status: 'ok',
      data: {
        configured:await enableBankingservice.isConfigured()
      },
    });
  }),
);

app.post('/countries',
  handleError(async (req:Request, res:Response)=>{
    const application = await enableBankingservice.getApplication();
    res.send({
      status:"ok",
      data: application.countries
    })
  })
)

app.post("/get_aspsps",
  handleError(async (req:Request, res:Response)=>{
    res.send({
      status:"ok",
      data: (await enableBankingservice.getASPSPs()).aspsps
    })
  })
);

app.post("/start_auth",
  handleError(async (req:Request, res:Response)=>{
    const {aspsp, country} = req.body || {}
    const resp =await enableBankingservice.startAuth(country, aspsp, req.headers.origin, 3600);
    res.send({
      status:"ok",
      data: resp
    })
  })
)

app.post("/get_session",
  handleError(async (req:Request, res:Response)=>{
    const {state} = req.body || {};
      if(req.app.locals.enablebanking_cache === undefined){
        req.app.locals.enablebanking_cache = {};
      }

      if(!(state in req.app.locals.enablebanking_cache)){
        res.send({status:"ok"});
        return;
      }
    const session_id = req.app.locals.enablebanking_cache[state];

    const response = await enableBankingservice.getAccounts(session_id);

    res.send({
      status:"ok",
      data:response
    });
  })
)

app.post("/complete_auth", 
  handleError(async (req:Request, res:Response)=>{
  const {state, code} = req.body || {};

  const session_id = await enableBankingservice.authorizeSession(state,code);
  if(req.app.locals.enablebanking_cache === undefined){
    req.app.locals.enablebanking_cache = {};
  }
  
  req.app.locals.enablebanking_cache[state] = session_id;

  res.send({
    status:"ok"
  }
  )
}))

app.post("/get_accounts",
  handleError(async (req:Request, res:Response)=>{
    const {session_id} = req.body||{};
    const resp = await enableBankingservice.getAccounts(session_id);
    res.send({
      status:"ok",
      data:resp
    })
  })
);


app.post('/transactions',
  handleError(async (req:Request, res:Response)=> {

    const {
      startDate,
      endDate,
      accountId,
      includeBalance = true,
    } = req.body || {};
      const jwt = enableBankingservice.getJWT();

      const baseHeaders = {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json"
      }

      const params = new URLSearchParams();
      if(typeof startDate !== 'undefined'){
        params.set("date_from", startDate)
      }

      var finished = false;
      const transactions = [];
      while(!finished){

        const response: globalThis.Response = await fetch(`https://api.enablebanking.com/accounts/${accountId}/transactions?`+params.toString(), {
          headers: baseHeaders
        })
        const data = await response.json();
        transactions.push(...data['transactions'])
        if(data['continuation_key'] != null){
          params.set("continuation_key", data['continuation_key'])
        } else{
          finished = true;
        }
      }

      res.send({
        status: "ok",
        data:{transactions: {all:transactions.map(t => {
          const transaction: BankSyncTransaction = {...t};
          const isDebtor = t['credit_debit_indicator'] == 'DBIT'
          const payeeRole = isDebtor? 'creditor' : 'debtor';


          return {
            original_transaction:t,
            amount: t['transaction_amount']['amount'] * (isDebtor?-1:1),
            payeeName: t[payeeRole] == null? t['remittance_information'][0]: t[payeeRole]['name'],
            notes : t['remittance_information'].join(" "),
            date: t['transaction_date']
          }
        })}
      }
      })
  }),
);