/***************************************************************************
         ofx_connect.cpp
                             -------------------
    copyright            : (C) 2005 by Ace Jones
    email                : acejones@users.sourceforge.net
***************************************************************************/
/**@file
 * \brief Code for ofxconnect utility.  C++ example code
 *
 * the purpose of the ofxconnect utility is to server as example code for
 * ALL functions of libOFX that have to do with creating OFX files.
 *
 * ofxconnect prints to stdout the created OFX file based on the options
 * you pass it
 *
 * currently it will only create the statement request file.  you can POST
 * this to an OFX server to request a statement from that financial
 * institution for that account.
 *
 * In the hopefully-not-to-distant future, ofxconnect will also make the
 * connection to the OFX server, post the data, and call ofxdump itself.
 */
/***************************************************************************
 *                                                                         *
 *   This program is free software; you can redistribute it and/or modify  *
 *   it under the terms of the GNU General Public License as published by  *
 *   the Free Software Foundation; either version 2 of the License, or     *
 *   (at your option) any later version.                                   *
 *                                                                         *
 ***************************************************************************/
#include <iostream>
#include <fstream>
#include <string>
#include "libofx.h"
#include <config.h>		/* Include config constants, e.g., VERSION TF */
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <cstring>
#include <cstdlib>
#include <string.h>
#ifdef HAVE_LIBCURL
#include <curl/curl.h>
#endif

#include "cmdline.h" /* Gengetopt generated parser */

#include "nodeparser.h"
#include "ofxpartner.h"

using namespace std;

#ifdef HAVE_LIBCURL
bool post(const char* request, const char* url, const char* filename)
{
  CURL *curl = curl_easy_init();
  if (! curl)
    return false;

  remove("tmpout");
  FILE* file = fopen(filename, "wb");
  if (! file )
  {
    curl_easy_cleanup(curl);
    return false;
  }

  curl_easy_setopt(curl, CURLOPT_URL, url);
  curl_easy_setopt(curl, CURLOPT_POSTFIELDS, request);

  struct curl_slist *headerlist = NULL;
  headerlist = curl_slist_append(headerlist, "Content-type: application/x-ofx");
  headerlist = curl_slist_append(headerlist, "Accept: */*, application/x-ofx");

  curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headerlist);
  curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, fwrite);
  curl_easy_setopt(curl, CURLOPT_WRITEDATA, (void *)file);

  CURLcode res = curl_easy_perform(curl);

  curl_easy_cleanup(curl);
  curl_slist_free_all (headerlist);

  fclose(file);

  return true;
}
#else
bool post(const char*, const char*, const char*)
{
  cerr << "ERROR: libox must be configured with libcurl to post this request directly" << endl;
  return false;
}
#endif

ostream& operator<<(ostream& os, const vector<string>& strvect)
{
  for ( vector<string>::const_iterator it = strvect.begin(); it != strvect.end(); ++it)
  {
    os << (*it) << endl;
  }
  return os;
}

int main (int argc, char *argv[])
{
  gengetopt_args_info args_info;

  if (cmdline_parser (argc, argv, &args_info) != 0)
    exit(1) ;

  if ( argc == 1 )
  {
    cmdline_parser_print_help();
    exit(1);
  }

  if ( args_info.statement_req_given || args_info.accountinfo_req_given )
  {
    if ( (args_info.inputs_num > 0) )
    {
      cout << "file " << args_info.inputs[0] << endl;
    }
    else
    {
      cerr << "ERROR: You must specify an output file" << endl;
      exit(1);
    }
  }
  else if ( args_info.bank_fipid_given || args_info.bank_services_given )
  {
    if ( (args_info.inputs_num > 0) )
    {
      cout << "bank " << args_info.inputs[0] << endl;
    }
    else
    {
      cerr << "ERROR: You must specify an bank" << endl;
      exit(1);
    }
  }

  OfxFiLogin fi;
  memset(&fi, 0, sizeof(OfxFiLogin));
  bool ok = true;
  string url;

  if ( args_info.statement_req_given || args_info.accountinfo_req_given || args_info.payment_req_given || args_info.paymentinquiry_req_given )
  {
    // Get the FI Login information
    //

    if ( args_info.fipid_given )
    {
      cerr << "fipid " <<  args_info.fipid_arg << endl;
      cerr << "contacting partner server..." << endl;
      OfxFiServiceInfo svcinfo = OfxPartner::ServiceInfo(args_info.fipid_arg);
      cout << "fid " << svcinfo.fid << endl;
      strncpy(fi.fid, svcinfo.fid, OFX_FID_LENGTH - 1);
      cout << "org " << svcinfo.org << endl;
      strncpy(fi.org, svcinfo.org, OFX_ORG_LENGTH - 1);
      cout << "url " << svcinfo.url << endl;
      url = svcinfo.url;
    }
    if ( args_info.fid_given )
    {
      cerr << "fid " <<  args_info.fid_arg << endl;
      strncpy(fi.fid, args_info.fid_arg, OFX_FID_LENGTH - 1);
    }
    else if ( ! args_info.fipid_given )
    {
      cerr << "ERROR: --fid is required" << endl;
      ok = false;
    }

    if ( args_info.org_given )
    {
      cerr << "org " << args_info.org_arg << endl;
      strncpy(fi.org, args_info.org_arg, OFX_ORG_LENGTH - 1);
    }
    else if ( ! args_info.fipid_given )
    {
      cerr << "ERROR: --org is required" << endl;
      ok = false;
    }

    if ( args_info.user_given )
    {
      cerr << "user " << args_info.user_arg << endl;
      strncpy(fi.userid, args_info.user_arg, OFX_USERID_LENGTH - 1);
    }
    else
    {
      cerr << "ERROR: --user is required" << endl;
      ok = false;
    }

    if ( args_info.pass_given )
    {
      cerr << "pass " << args_info.pass_arg << endl;
      strncpy(fi.userpass, args_info.pass_arg, OFX_USERPASS_LENGTH - 1);
    }
    else
    {
      cerr << "ERROR: --pass is required" << endl;
      ok = false;
    }

    if ( args_info.url_given )
      url = args_info.url_arg;
  }

  if ( args_info.statement_req_given )
  {
    cerr << "Statement request" << endl;

    OfxAccountData account;
    memset(&account, 0, sizeof(OfxAccountData));

    if ( args_info.bank_given )
    {
      cerr << "bank " << args_info.bank_arg << endl;
      strncpy(account.bank_id, args_info.bank_arg, OFX_BANKID_LENGTH - 1);
    }
    else
    {
      if ( args_info.type_given && args_info.type_arg == 1 )
      {
        cerr << "ERROR: --bank is required for a bank request" << endl;
        ok = false;
      }
    }

    if ( args_info.broker_given )
    {
      cerr << "broker " << args_info.broker_arg << endl;
      strncpy(account.broker_id, args_info.broker_arg, OFX_BROKERID_LENGTH - 1);
    }
    else
    {
      if ( args_info.type_given && args_info.type_arg == 2 )
      {
        cerr << "ERROR: --broker is required for an investment statement request" << endl;
        ok = false;
      }
    }

    if ( args_info.acct_given )
    {
      cerr << "acct " << args_info.acct_arg << endl;
      strncpy(account.account_number, args_info.acct_arg, OFX_ACCTID_LENGTH - 1);
    }
    else
    {
      cerr << "ERROR: --acct is required for a statement request" << endl;
      ok = false;
    }

    if ( args_info.type_given )
    {
      cerr << "type " << args_info.type_arg << endl;
      switch (args_info.type_arg)
      {
      case 1:
        account.account_type = account.OFX_CHECKING;
        break;
      case 2:
        account.account_type = account.OFX_INVESTMENT;
        break;
      case 3:
        account.account_type = account.OFX_CREDITCARD ;
        break;
      default:
        cerr << "ERROR: --type is not valid.  Must be between 1 and 3" << endl;
        ok = false;
      }
    }
    else
    {
      cerr << "ERROR: --type is required for a statement request" << endl;
      ok = false;
    }

    if ( args_info.past_given )
    {
      cerr << "past " << args_info.past_arg << endl;
    }
    else
    {
      cerr << "ERROR: --past is required for a statement request" << endl;
      ok = false;
    }

    if ( ok )
    {
      char* request = libofx_request_statement( &fi, &account, time(NULL) - args_info.past_arg * 86400L );

      if ( url.length() && args_info.inputs_num > 0 )
        post(request, url.c_str(), args_info.inputs[0]);
      else
        cout << request;

      free(request);
    }
  }

  if ( args_info.paymentinquiry_req_given )
  {
    char tridstr[33];
    memset(tridstr, 0, 33);

    bool ok = true;

    if ( args_info.trid_given )
    {
      cerr << "trid " << args_info.trid_arg << endl;
      snprintf(tridstr, 32, "%i", args_info.trid_arg);
    }
    else
    {
      cerr << "ERROR: --trid is required for a payment inquiry request" << endl;
      ok = false;
    }

    if ( ok )
    {
      char* request = libofx_request_payment_status( &fi, tridstr );

      filebuf fb;
      fb.open ("query", ios::out);
      ostream os(&fb);
      os << request;
      fb.close();

      if ( url.length() && args_info.inputs_num > 0 )
        post(request, url.c_str(), args_info.inputs[0]);
      else
        cout << request;

      free(request);
    }
  }

  if ( args_info.payment_req_given )
  {
    OfxAccountData account;
    memset(&account, 0, sizeof(OfxAccountData));
    OfxPayee payee;
    memset(&payee, 0, sizeof(OfxPayee));
    OfxPayment payment;
    memset(&payment, 0, sizeof(OfxPayment));

    strcpy(payee.name, "MARTIN PREUSS");
    strcpy(payee.address1, "1 LAUREL ST");
    strcpy(payee.city, "SAN CARLOS");
    strcpy(payee.state, "CA");
    strcpy(payee.postalcode, "94070");
    strcpy(payee.phone, "866-555-1212");

    strcpy(payment.amount, "200.00");
    strcpy(payment.account, "1234");
    strcpy(payment.datedue, "20060301");
    strcpy(payment.memo, "This is a test");

    bool ok = true;

    if ( args_info.bank_given )
    {
      cerr << "bank " << args_info.bank_arg << endl;
      strncpy(account.bank_id, args_info.bank_arg, OFX_BANKID_LENGTH - 1);
    }
    else
    {
      if ( args_info.type_given && args_info.type_arg == 1 )
      {
        cerr << "ERROR: --bank is required for a bank request" << endl;
        ok = false;
      }
    }

    if ( args_info.broker_given )
    {
      cerr << "broker " << args_info.broker_arg << endl;
      strncpy(account.broker_id, args_info.broker_arg, OFX_BROKERID_LENGTH - 1);
    }
    else
    {
      if ( args_info.type_given && args_info.type_arg == 2 )
      {
        cerr << "ERROR: --broker is required for an investment statement request" << endl;
        ok = false;
      }
    }

    if ( args_info.acct_given )
    {
      cerr << "acct " << args_info.acct_arg << endl;
      strncpy(account.account_number, args_info.acct_arg, OFX_ACCTID_LENGTH - 1);
    }
    else
    {
      cerr << "ERROR: --acct is required for a statement request" << endl;
      ok = false;
    }

    if ( args_info.type_given )
    {
      cerr << "type " << args_info.type_arg << endl;
      switch (args_info.type_arg)
      {
      case 1:
        account.account_type = account.OFX_CHECKING;
        break;
      case 2:
        account.account_type = account.OFX_INVESTMENT;
        break;
      case 3:
        account.account_type = account.OFX_CREDITCARD ;
        break;
      default:
        cerr << "ERROR: --type is not valid.  Must be between 1 and 3" << endl;
        ok = false;
      }
    }
    else
    {
      cerr << "ERROR: --type is required for a statement request" << endl;
      ok = false;
    }

    if ( ok )
    {
      char* request = libofx_request_payment( &fi, &account, &payee, &payment );

      filebuf fb;
      fb.open ("query", ios::out);
      ostream os(&fb);
      os << request;
      fb.close();

      if ( url.length() && args_info.inputs_num > 0 )
        post(request, url.c_str(), args_info.inputs[0]);
      else
        cout << request;

      free(request);
    }

  }

  if ( args_info.accountinfo_req_given )
  {
    if ( ok )
    {
      char* request = libofx_request_accountinfo( &fi );

      if ( url.length() && args_info.inputs_num > 0 )
        post(request, url.c_str(), args_info.inputs[0]);
      else
        cout << request;

      free(request);
    }
  }

  if ( args_info.bank_list_given )
  {
    cout << OfxPartner::BankNames();
  }

  if ( args_info.bank_fipid_given && args_info.inputs_num > 0 )
  {
    cout << OfxPartner::FipidForBank(args_info.inputs[0]);
  }

  if ( args_info.bank_services_given && args_info.inputs_num > 0 )
  {
    OfxFiServiceInfo svcinfo = OfxPartner::ServiceInfo(args_info.inputs[0]);
    cout << "Account List? " << (svcinfo.accountlist ? "Yes" : "No") << endl;
    cout << "Statements? " << (svcinfo.statements ? "Yes" : "No") << endl;
    cout << "Billpay? " << (svcinfo.billpay ? "Yes" : "No") << endl;
    cout << "Investments? " << (svcinfo.investments ? "Yes" : "No") << endl;
  }

  if ( args_info.allsupport_given )
  {
    vector<string> banks = OfxPartner::BankNames();
    vector<string>::const_iterator it_bank = banks.begin();
    while ( it_bank != banks.end() )
    {
      vector<string> fipids = OfxPartner::FipidForBank(*it_bank);
      vector<string>::const_iterator it_fipid = fipids.begin();
      while ( it_fipid != fipids.end() )
      {
        if ( OfxPartner::ServiceInfo(*it_fipid).accountlist )
          cout << *it_bank << endl;
        ++it_fipid;
      }
      ++it_bank;
    }
  }

  return 0;
}


// vim:cin:si:ai:et:ts=2:sw=2:

