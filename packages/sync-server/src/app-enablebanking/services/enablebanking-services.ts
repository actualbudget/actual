import { SecretName, secretsService } from "../../services/secrets-service.js"
import { Account, AuthenticationStartResponse, EnableBankingToken, GetApplicationResponse, GetAspspsResponse } from "../models/models-enablebanking.js";
import { handleEnableBankingError } from "../utils/errors.js";
import { getJWT } from "../utils/jwt.js";


export const enableBankingservice = {
    HOSTNAME: "https://api.enablebanking.com/",
    _activeAuths:{},
    store:{},
    setupSecrets: async (applicationId:string, secretKey:string) =>{
        // Check if we can get a jwt with provided data.
        var jwt: string;
        try{
            jwt = getJWT(applicationId, secretKey);
        } catch (error){
            // TODO: The only expected error is if the secretKey is not in the right format. Others should be
            // reported to dev. Pointing to internal server error.
            return false;
        }

        // Check if jwt is recognized by Enable Banking
        const responseData:GetApplicationResponse = await enableBankingservice.get("application", jwt);
        if(!responseData.active){
            return false;
        }
        secretsService.set(SecretName.enablebanking_applicationId, applicationId);
        secretsService.set(SecretName.enablebaanking_secret, secretKey);
        return true;

    },
    secretsAreSetup: () =>{
        const applicationId = secretsService.get(SecretName.enablebanking_applicationId);
        const secret = secretsService.get(SecretName.enablebaanking_secret);
        return !(applicationId == null || secret == null);
    },
    isConfigured: async () =>{
        if(!enableBankingservice.secretsAreSetup()){
            return false;
        }
        const responseData = await enableBankingservice.getApplication();
        return responseData.active;
    },

    getJWT: () =>{
        const applicationId = secretsService.get(SecretName.enablebanking_applicationId);
        const secretKey = secretsService.get(SecretName.enablebaanking_secret);
        return getJWT(applicationId, secretKey)
    },

    get: async <T>(endpoint: string, jwt?:string):Promise<T>|never =>{
        if(jwt == null){
            var jwt = enableBankingservice.getJWT();
        }
        const baseHeaders = {
            Authorization: `Bearer ${jwt}`,
            "Content-Type": "application/json"
          }

          const response = await fetch(`${enableBankingservice.HOSTNAME}${endpoint}`, {
            headers: baseHeaders
          })
          return await handleEnableBankingError(response) as T;
    },
    post: async <T>(endpoint: string, payload:any, jwt?:string):Promise<T>|never =>{
        if(jwt == null){
            var jwt = enableBankingservice.getJWT();
        }
        const baseHeaders = {
            Authorization: `Bearer ${jwt}`,
            "Content-Type": "application/json"
          }
    
          const response = await fetch(`${enableBankingservice.HOSTNAME}${endpoint}`, {
            headers: baseHeaders,
            method: "POST",
            body: JSON.stringify(payload)
          })
          return await handleEnableBankingError(response) as T;
    },

    getApplication: async ():Promise<GetApplicationResponse> | never => {
        return await enableBankingservice.get("application");

    },
    getASPSPs: async (country?:string):Promise<GetAspspsResponse> | never =>{
        const params:string[] = ["service=AIS"]
        if(country){
            params.push(`country=${country}`);
        }
        return await enableBankingservice.get(`aspsps?${params.join('&')}`)
    },

    startAuth: async (country:string, aspsp:string, host:string, exp:number):Promise<AuthenticationStartResponse> | never =>{
        const valid_until = new Date()
        valid_until.setSeconds(valid_until.getSeconds()+exp)

        const state = crypto.randomUUID();
        
        const body = {
            access: {
                valid_until: valid_until.toISOString()
            },
            aspsp: {
                name: aspsp,
                country: country
            },
            state,
            redirect_url: `${host.replace("http","https")}/enablebanking/auth_callback`

        }

        const resp = await enableBankingservice.post("auth",body);

        return {
            redirect_url: resp['url'],
            state
        };
    },

    authorizeSession: async (state:string, code:string)=>{
        const resp = await enableBankingservice.post("sessions",{code})

        return resp['session_id']
    },

    getSessionIdFromState: (state:string):string|never=>{
        if(state in enableBankingservice._activeAuths){
            return enableBankingservice._activeAuths[state]
        }
        return;
    },

    getAccounts: async (session_id:string):Promise<EnableBankingToken>|never=>{
        const session_response = await enableBankingservice.get(`/sessions/${session_id}`);
        const bank_id = [session_response['aspsp']['country'],session_response['aspsp']['name']].join("_");
        const accounts:Account[] = [];
        for(const account_id of session_response['accounts']){
            const account = await enableBankingservice.get(`/accounts/${account_id}/details`);
            const balance = await enableBankingservice.get(`/accounts/${account_id}/balances`);
            accounts.push({
                account_id,
                name:account['account_id']['iban'] as string,
                balance:balance['balances'][0]['balance_amount']['amount'],
                institution:session_response['aspsp']['name'] as string
            })
        }
        return {
            session_id,
            bank_id,
            accounts
        };
    },
}