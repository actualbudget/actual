
type EnableBankingErrorResponse = {
    message:string,
    code:number,
    detail:any,
}



export async function handleEnableBankingError (response: Response) {
    if(response.status == 200){
        return await response.json();
    }
    //TODO
    console.log(response.status, await response.text())
    throw new Error("Not Implemented");
    
}