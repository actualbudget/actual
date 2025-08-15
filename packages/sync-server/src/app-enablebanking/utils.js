import jws from 'jws';

  const getJWTHeader = (applicationId) => {
    return {
      
      typ: "JWT",
      alg: "RS256",
      kid: applicationId
    }
  }
  
  const getJWTBody = (exp) => {
    const timestamp = Math.floor((new Date()).getTime() / 1000)
    return {
      iss: "enablebanking.com",
      aud: "api.enablebanking.com",
      iat: timestamp,
      exp: timestamp + exp,
    }
  }
  
  
  export const getJWT = (applicationId, secretKey,exp = 3600) => {
    const jwtHeaders = getJWTHeader(applicationId)
    const jwtBody = getJWTBody(exp);

    return jws.sign({
      header:jwtHeaders,
      payload:jwtBody,
      secret:secretKey
    });
  }

  