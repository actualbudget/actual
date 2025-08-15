import { SecretName, secretsService } from "../../services/secrets-service.js"
import { getJWT } from "../utils.js";


export const enableBankingservice = {
    isConfigured: () =>{
        const applicationId = secretsService.get(SecretName.enablebanking_applicationId);
        const secret = secretsService.get(SecretName.enablebaanking_secret);
        return applicationId == null || secret == null;
    },

    getJWT: () =>{
        const applicationId = secretsService.get(SecretName.enablebanking_applicationId);
        const secretKey = secretsService.get(SecretName.enablebaanking_secret);
        return getJWT(applicationId, secretKey)
    },

    fetch: async (endpoint: string) =>{
        const jwt = enableBankingservice.getJWT();
        const baseHeaders = {
            Authorization: `Bearer ${jwt}`,
            "Content-Type": "application/json"
          }
    
          const response = await fetch(`https://api.enablebanking.com/${endpoint}`, {
            headers: baseHeaders
          })
          return response;
    },

    getApplication: () => {
        return enableBankingservice.fetch("application");

    }
}