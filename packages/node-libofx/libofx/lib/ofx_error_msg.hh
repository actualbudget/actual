/***************************************************************************
                          ofx_data_struct.h  -  description
                             -------------------
    begin                : Tue Mar 19 2002
    copyright            : (C) 2002 by Benoit Gr�goire
    email                : benoitg@coeus.ca
 ***************************************************************************/
/**@file
 *  \brief OFX error code management functionnality.
 */
/***************************************************************************
 *                                                                         *
 *   This program is free software; you can redistribute it and/or modify  *
 *   it under the terms of the GNU General Public License as published by  *
 *   the Free Software Foundation; either version 2 of the License, or     *
 *   (at your option) any later version.                                   *
 *                                                                         *
 ***************************************************************************/
#ifndef OFX_DATA_STRUCT_H
#define OFX_DATA_STRUCT_H

///An abstraction of an OFX error code sent by an OFX server.
struct ErrorMsg
{
  int code;           /**< The error's code */
  const char * name;        /**< The error's name */
  const char * description; /**< The long description of the error */
};

/// List known error codes.
/**
   The error_msgs_list table contains all past and present OFX error codes up to the OFX 2.01 specification
*/
const ErrorMsg error_msgs_list[] =
{
  {0, "Success", "The server successfully processed the request."},
  {1, "Client is up-to-date", "Based on the client timestamp, the client has the latest information. The response does not supply any additional information."},
  {2000, "General error", "Error other than those specified by the remaining error codes. (Note: Servers should provide a more specific error whenever possible. Error code 2000 should be reserved for cases in which a more specific code is not available.)"},
  {2001, "Invalid account", ""},
  {2002, "General account error", "Account error not specified by the remaining error codes."},
  {2003, "Account not found", "The specified account number does not correspond to one of the user's accounts."},
  {2004, "Account closed", "The specified account number corresponds to an account that has been closed."},
  {2005, "Account not authorized", "The user is not authorized to perform this action on the account, or the server does not allow this type of action to be performed on the account."},
  {2006, "Source account not found", "The specified account number does not correspond to one of the user's accounts."},
  {2007, "Source account closed", "The specified account number corresponds to an account that has been closed."},
  {2008, "Source account not authorized", "The user is not authorized to perform this action on the account, or the server does not allow this type of action to be performed on the account."},
  {2009, "Destination account not found", "The specified account number does not correspond to one of the user's accounts."},
  {2010, "Destination account closed", "The specified account number corresponds to an account that has been closed."},
  {2011, "Destination account not authorized", "The user is not authorized to perform this action on the account, or the server does not allow this type of action to be performed on the account."},
  {2012, "Invalid amount", "The specified amount is not valid for this action; for example, the user specified a negative payment amount."},
  {2014, "Date too soon", "The server cannot process the requested action by the date specified by the user."},
  {2015, "Date too far in future", "The server cannot accept requests for an action that far in the future."},
  {2016, "Transaction already committed", "Transaction has entered the processing loop and cannot be modified/cancelled using OFX. The transaction may still be cancelled or modified using other means (for example, a phone call to Customer Service)."},
  {2017, "Already canceled", "The transaction cannot be canceled or modified because it has already been canceled."},
  {2018, "Unknown server ID", "The specified server ID does not exist or no longer exists."},
  {2019, "Duplicate request", "A request with this <TRNUID> has already been received and processed."},
  {2020, "Invalid date", "The specified datetime stamp cannot be parsed; for instance, the datetime stamp specifies 25:00 hours."},
  {2021, "Unsupported version", "The server does not support the requested version. The version of the message set specified by the client is not supported by this server."},
  {2022, "Invalid TAN", "The server was unable to validate the TAN sent in the request."},
  {2023, "Unknown FITID", "The specified FITID/BILLID does not exist or no longer exists. [BILLID not found in the billing message sets]"},
  {2025, "Branch ID missing", "A <BRANCHID> value must be provided in the <BANKACCTFROM> aggregate for this country system, but this field is missing."},
  {2026, "Bank name doesn't match bank ID", "The value of <BANKNAME> in the <EXTBANKACCTTO> aggregate is inconsistent with the value of <BANKID> in the <BANKACCTTO> aggregate."},
  {2027, "Invalid date range", "Response for non-overlapping dates, date ranges in the future, et cetera."},
  {2028, "Requested element unknown", "One or more elements of the request were not recognized by the server or the server (as noted in the FI Profile) does not support the elements. The server executed the element transactions it understood and supported. For example, the request file included private tags in a <PMTRQ> but the server was able to execute the rest of the request."},
  {6500, "<REJECTIFMISSING>Y invalid without <TOKEN>", "This error code may appear <SYNCERROR> element of an <xxxSYNCRS> wrapper (in <PRESDLVMSGSRSV1> and V2 message set responses) or the <CODE> contained in any embedded transaction wrappers within a sync response. The corresponding sync request wrapper included <REJECTIFMISSING>Y with <REFRESH>Y or <TOKENONLY>Y, which is illegal."},
  {6501, "Embedded transactions in request failed to process: Out of date", "<REJECTIFMISSING>Y and embedded transactions appeared in the request sync wrapper and the provided <TOKEN> was out of date. This code should be used in the <SYNCERROR> of the response sync wrapper."},
  {6502, "Unable to process embedded transaction due to out-of-date <TOKEN>", "Used in response transaction wrapper for embedded transactions when <SYNCERROR>6501 appears in the surrounding sync wrapper."},
  {10000, "Stop check in process", "Stop check is already in process."},
  {10500, "Too many checks to process", "The stop-payment request <STPCHKRQ> specifies too many checks."},
  {10501, "Invalid payee", "Payee error not specified by the remainingerror codes."},
  {10502, "Invalid payee address", "Some portion of the payee's address is incorrect or unknown."},
  {10503, "Invalid payee account number", "The account number <PAYACCT> of the requested payee is invalid."},
  {10504, "Insufficient funds", "The server cannot process the request because the specified account does not have enough funds."},
  {10505, "Cannot modify element", "The server does not allow modifications to one or more values in a modification request."},
  {10506, "Cannot modify source account", "Reserved for future use."},
  {10507, "Cannot modify destination account", "Reserved for future use."},
  {10508, "Invalid frequency", "The specified frequency <FREQ> does not match one of the accepted frequencies for recurring transactions."},
  {10509, "Model already canceled", "The server has already canceled the specified recurring model."},
  {10510, "Invalid payee ID", "The specified payee ID does not exist or no longer exists."},
  {10511, "Invalid payee city", "The specified city is incorrect or unknown."},
  {10512, "Invalid payee state", "The specified state is incorrect or unknown."},
  {10513, "Invalid payee postal code", "The specified postal code is incorrect or unknown."},
  {10514, "Transaction already processed", "Transaction has already been sent or date due is past"},
  {10515, "Payee not modifiable by client", "The server does not allow clients to change payee information."},
  {10516, "Wire beneficiary invalid", "The specified wire beneficiary does not exist or no longer exists."},
  {10517, "Invalid payee name", "The server does not recognize the specified payee name."},
  {10518, "Unknown model ID", "The specified model ID does not exist or no longer exists."},
  {10519, "Invalid payee list ID", "The specified payee list ID does not exist or no longer exists."},
  {10600, "Table type not found", "The specified table type is not recognized or does not exist."},
  {12250, "Investment transaction download not supported (WARN)", "The server does not support investment transaction download."},
  {12251, "Investment position download not supported (WARN)", "The server does not support investment position download."},
  {12252, "Investment positions for specified date not available", "The server does not support investment positions for the specified date."},
  {12253, "Investment open order download not supported (WARN)", "The server does not support open order download."},
  {12254, "Investment balances download not supported (WARN)", "The server does not support investment balances download."},
  {12255, "401(k) not available for this account", "401(k) information requested from a non-401(k) account."},
  {12500, "One or more securities not found", "The server could not find the requested securities."},
  {13000, "User ID & password will be sent out-of-band (INFO)", "The server will send the user ID and password via postal mail, e-mail, or another means. The accompanying message will provide details."},
  {13500, "Unable to enroll user", "The server could not enroll the user."},
  {13501, "User already enrolled", "The server has already enrolled the user."},
  {13502, "Invalid service", "The server does not support the service <SVC> specified in the service-activation request."},
  {13503, "Cannot change user information", "The server does not support the <CHGUSERINFORQ> request."},
  {13504, "<FI> Missing or Invalid in <SONRQ>", "The FI requires the client to provide the <FI> aggregate in the <SONRQ> request, but either none was provided, or the one provided was invalid."},
  {14500, "1099 forms not available", "1099 forms are not yet available for the tax year requested."},
  {14501, "1099 forms not available for user ID", "This user does not have any 1099 forms available."},
  {14600, "W2 forms not available", "W2 forms are not yet available for the tax year requested."},
  {14601, "W2 forms not available for user ID", "The user does not have any W2 forms available."},
  {14700, "1098 forms not available", "1098 forms are not yet available for the tax year requested."},
  {14701, "1098 forms not available for user ID", "The user does not have any 1098 forms available."},
  {15000, "Must change USERPASS", "The user must change his or her <USERPASS> number as part of the next OFX request."},
  {15500, "Signon invalid", "The user cannot signon because he or she entered an invalid user ID or password."},
  {15501, "Customer account already in use", "The server allows only one connection at a time, and another user is already signed on. Please try again later."},
  {15502, "USERPASS lockout", "The server has received too many failed signon attempts for this user. Please call the FI's technical support number."},
  {15503, "Could not change USERPASS", "The server does not support the <PINCHRQ> request."},
  {15504, "Could not provide random data", "The server could not generate random data as requested by the <CHALLENGERQ>."},
  {15505, "Country system not supported", "The server does not support the country specified in the <COUNTRY> field of the <SONRQ> aggregate."},
  {15506, "Empty signon not supported", "The server does not support signons not accompanied by some other transaction."},
  {15507, "Signon invalid without supporting pin change request", "The OFX block associated with the signon does not contain a pin change request and should."},
  {15508, "Transaction not authorized", "Current user is not authorized to perform this action on behalf of the <USERID>."},
  {16500, "HTML not allowed", "The server does not accept HTML formatting in the request."},
  {16501, "Unknown mail To:", "The server was unable to send mail to the specified Internet address."},
  {16502, "Invalid URL", "The server could not parse the URL."},
  {16503, "Unable to get URL", "The server was unable to retrieve the information at this URL (e.g., an HTTP 400 or 500 series error)."},
  { -1, "Unknown code", "The description of this code is unknown to libOfx"}
};

///Retreive error code descriptions
/**
   The find_error_msg function will take an ofx error number, and return an ErrorMsg structure with detailled information about the error, including the error name and long description
 */
const ErrorMsg find_error_msg(int param_code)
{
  ErrorMsg return_val;
  int i;
  bool code_found = false;

  for (i = 0; i < 2000 && (code_found == false); i++)
  {
    if ((error_msgs_list[i].code == param_code) || (error_msgs_list[i].code == -1))
    {
      return_val = error_msgs_list[i];
      code_found = true;
    }
  }
  return return_val;
};

#endif
