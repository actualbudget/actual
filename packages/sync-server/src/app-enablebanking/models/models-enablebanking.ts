

export type GetApplicationResponse = {
    name: string;
    description?: string;
    kid: string;
    environment: Environment;
    redirect_urls: string[];
    active: boolean;
    countries: string[];
    services: Service[];
}

export type Environment = "PRODUCTION"|"SANDBOX";
export type Service = "AIS"|"PIS";

export type GetAspspsResponse = { aspsps: ASPSPData[]; }

export type ASPSPData = {
    name:string;
    country:string;
    logo:string;
    psu_types:PSUType[];
    auth_methods:AuthMethod[];
    maximum_consent_validity:number;
    sandbox?: SandboxInfo;
    beta:boolean;
    bic?:string;
    required_psu_headers?:string[];
    payments?:any[];
    group?:any;
}

export type PSUType = "business"|"personal";
export type AuthMethod = {
    name?:string;
    title?:string;
    psu_type:PSUType;
    credentials?: Credential[];
    approach: AuthenticationApproach;
    hidden_method: boolean;
}

export type Credential = {
    name: string;
    title: string;
    required: boolean;
    description?: string;
    template?: string;
}

export type AuthenticationApproach = "DECOUPLED" | "EMBEDDED" | "REDIRECT";

export type SandboxInfo = {users?:SandboxUser[]}

export type SandboxUser = {
    name?:string;
    password?:string;
    otp?:string
}

export type AuthenticationStartResponse = {
    redirect_url:string;
    state:string;
}

export type AuthenticationSessionResponse = {
    session_id:string;
    account_id:string;
}

export type EnableBankingToken = {
    bank_id: string;
    session_id: string;
    accounts: Account[];
};

export type Account = {
    account_id:string;
    name:string;
    institution:string;
    balance:number;
    
}

