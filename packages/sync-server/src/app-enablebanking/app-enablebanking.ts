import https from 'https';

import express from 'express';

import { Request, Response } from 'express';

import { handleError } from '../app-gocardless/util/handle-error.js';
import { SecretName, secretsService } from '../services/secrets-service.js';
import { requestLoggerMiddleware } from '../util/middlewares.js';
import { BankSyncTransaction, type BankSyncResponse } from './models/bank-sync.js';


import { getJWT } from './utils.js';
import { enableBankingservice } from './services/enablebanking-services.js';

const app = express();
export { app as handlers };
app.use(express.json());
app.use(requestLoggerMiddleware);

app.post(
    '/configure',
    handleError(async (req, res) => {
        const { applicationId, secret } = req.body || {};
        console.log(req.body);
        
        secretsService.set(SecretName.enablebanking_applicationId,applicationId);
        secretsService.set(SecretName.enablebaanking_secret,secret);  
        const configured = applicationId != null && 
            secret != null;
    
        res.send({
          status: 'ok',
          data: {
            configured,
          },
        });
      }),
)

app.post(
  '/status',
  handleError(async (req, res) => {
    if (!!enableBankingservice.isConfigured()){
      res.send({
        status: 'ok',
        data: {
          configured: false
        },
      });
      return;
    }

    const applicationResponse = await enableBankingservice.getApplication();
    if(applicationResponse.status != 200){
      console.log("nope")
      res.send({
        status: 'ok',
        data: {
          configured: false
        },
      });
      return;
    }

    const resp = await applicationResponse.json();


    res.send({
      status: 'ok',
      data: {
        configured:resp['active'],
        application:resp
      },
    });
  }),
);

app.post('/get_balance',
    handleError(async (req:Request, res:Response)=> {
        const {account_uid} = req.body;
        const jwt = enableBankingservice.getJWT();

        console.log({account_uid,jwt})

        const baseHeaders = {
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json"
        }

        const accountBalancesResponse = await fetch(`https://api.enablebanking.com/accounts/${account_uid}/balances`, {
          headers: baseHeaders
        })
        console.log(await accountBalancesResponse.text())



        res.send({
          status: "ok",
        })
    }),
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
        console.log(params.toString())

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
      console.log(`found ${transactions.length} transactions:`)

      



      res.send({
        status: "ok",
        data:{transactions: {all:transactions.map(t => {
          const transaction: BankSyncTransaction = {...t};
          const isDebtor = t['credit_debit_indicator'] == 'DBIT'

          console.log(transaction)
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