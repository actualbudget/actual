/***************************************************************************
         ofx_request_statement.cpp
                             -------------------
    copyright            : (C) 2005 by Ace Jones
    email                : acejones@users.sourceforge.net
***************************************************************************/
/**@file
 * \brief Implementation of libofx_request_statement to create an OFX file
 *   containing a request for a statement.
*/
/***************************************************************************
 *                                                                         *
 *   This program is free software; you can redistribute it and/or modify  *
 *   it under the terms of the GNU General Public License as published by  *
 *   the Free Software Foundation; either version 2 of the License, or     *
 *   (at your option) any later version.                                   *
 *                                                                         *
 ***************************************************************************/

#ifdef HAVE_CONFIG_H
#include <config.h>
#endif

#include <cstdlib>
#include <string>
#include "libofx.h"
#include "ofx_utilities.hh"
#include "ofx_request_statement.hh"

using namespace std;

char* libofx_request_statement( const OfxFiLogin* login, const OfxAccountData* account, time_t date_from )
{
  OfxStatementRequest strq( *login, *account, date_from );
  string request = OfxHeader(login->header_version) + strq.Output();

  unsigned size = request.size();
  char* result = (char*)malloc(size + 1);
  request.copy(result, size);
  result[size] = 0;

  return result;
}

OfxStatementRequest::OfxStatementRequest( const OfxFiLogin& fi, const OfxAccountData& account, time_t from ):
  OfxRequest(fi),
  m_account(account),
  m_date_from(from)
{
  Add( SignOnRequest() );

  if ( account.account_type == account.OFX_CREDITCARD )
    Add(CreditCardStatementRequest());
  else if ( account.account_type == account.OFX_INVESTMENT )
    Add(InvestmentStatementRequest());
  else
    Add(BankStatementRequest());
}

OfxAggregate OfxStatementRequest::BankStatementRequest(void) const
{
  OfxAggregate bankacctfromTag("BANKACCTFROM");
  bankacctfromTag.Add( "BANKID", m_account.bank_id );
  bankacctfromTag.Add( "ACCTID", m_account.account_number );
  if ( m_account.account_type ==  m_account.OFX_CHECKING )
    bankacctfromTag.Add( "ACCTTYPE", "CHECKING" );
  else if  ( m_account.account_type == m_account.OFX_SAVINGS )
    bankacctfromTag.Add( "ACCTTYPE", "SAVINGS" );
  else if  ( m_account.account_type == m_account.OFX_MONEYMRKT )
    bankacctfromTag.Add( "ACCTTYPE", "MONEYMRKT" );
  else if  ( m_account.account_type == m_account.OFX_CREDITLINE )
    bankacctfromTag.Add( "ACCTTYPE", "CREDITLINE" );
  else if  ( m_account.account_type == m_account.OFX_CMA )
    bankacctfromTag.Add( "ACCTTYPE", "CMA" );

  OfxAggregate inctranTag("INCTRAN");
  inctranTag.Add( "DTSTART", time_t_to_ofxdate( m_date_from ) );
  inctranTag.Add( "INCLUDE", "Y" );

  OfxAggregate stmtrqTag("STMTRQ");
  stmtrqTag.Add( bankacctfromTag );
  stmtrqTag.Add( inctranTag );

  return RequestMessage("BANK", "STMT", stmtrqTag);
}

OfxAggregate OfxStatementRequest::CreditCardStatementRequest(void) const
{
  /*
   QString dtstart_string = _dtstart.toString(Qt::ISODate).remove(QRegExp("[^0-9]"));

   return message("CREDITCARD","CCSTMT",Tag("CCSTMTRQ")
     .subtag(Tag("CCACCTFROM").element("ACCTID",accountnum()))
     .subtag(Tag("INCTRAN").element("DTSTART",dtstart_string).element("INCLUDE","Y")));
  }
  */
  OfxAggregate ccacctfromTag("CCACCTFROM");
  ccacctfromTag.Add( "ACCTID", m_account.account_number );

  OfxAggregate inctranTag("INCTRAN");
  inctranTag.Add( "DTSTART", time_t_to_ofxdate( m_date_from ) );
  inctranTag.Add( "INCLUDE", "Y" );

  OfxAggregate ccstmtrqTag("CCSTMTRQ");
  ccstmtrqTag.Add( ccacctfromTag );
  ccstmtrqTag.Add( inctranTag );

  return RequestMessage("CREDITCARD", "CCSTMT", ccstmtrqTag);
}

OfxAggregate OfxStatementRequest::InvestmentStatementRequest(void) const
{
  OfxAggregate invacctfromTag("INVACCTFROM");

  invacctfromTag.Add( "BROKERID", m_account.broker_id );
  invacctfromTag.Add( "ACCTID", m_account.account_number );

  OfxAggregate inctranTag("INCTRAN");
  inctranTag.Add( "DTSTART", time_t_to_ofxdate( m_date_from ) );
  inctranTag.Add( "INCLUDE", "Y" );

  OfxAggregate incposTag("INCPOS");
  incposTag.Add( "DTASOF", time_t_to_ofxdatetime( time(NULL) ) );
  incposTag.Add( "INCLUDE", "Y" );

  OfxAggregate invstmtrqTag("INVSTMTRQ");
  invstmtrqTag.Add( invacctfromTag );
  invstmtrqTag.Add( inctranTag );
  invstmtrqTag.Add( "INCOO", "Y" );
  invstmtrqTag.Add( incposTag );
  invstmtrqTag.Add( "INCBAL", "Y" );

  return RequestMessage("INVSTMT", "INVSTMT", invstmtrqTag);
}

char* libofx_request_payment( const OfxFiLogin* login, const OfxAccountData* account, const OfxPayee* payee, const OfxPayment* payment )
{
  OfxPaymentRequest strq( *login, *account, *payee, *payment );
  string request = OfxHeader(login->header_version) + strq.Output();

  unsigned size = request.size();
  char* result = (char*)malloc(size + 1);
  request.copy(result, size);
  result[size] = 0;

  return result;
}

OfxPaymentRequest::OfxPaymentRequest( const OfxFiLogin& fi, const OfxAccountData& account, const OfxPayee& payee, const OfxPayment& payment ):
  OfxRequest(fi),
  m_account(account),
  m_payee(payee),
  m_payment(payment)
{
  Add( SignOnRequest() );

  OfxAggregate bankacctfromTag("BANKACCTFROM");
  bankacctfromTag.Add( "BANKID", m_account.bank_id );
  bankacctfromTag.Add( "ACCTID", m_account.account_number );
  if ( m_account.account_type == m_account.OFX_CHECKING)
    bankacctfromTag.Add( "ACCTTYPE", "CHECKING" );
  else if  ( m_account.account_type == m_account.OFX_SAVINGS )
    bankacctfromTag.Add( "ACCTTYPE", "SAVINGS" );
  else if  ( m_account.account_type == m_account.OFX_MONEYMRKT )
    bankacctfromTag.Add( "ACCTTYPE", "MONEYMRKT" );
  else if  ( m_account.account_type ==  m_account.OFX_CREDITLINE )
    bankacctfromTag.Add( "ACCTTYPE", "CREDITLINE" );
  else if  ( m_account.account_type == m_account.OFX_CMA )
    bankacctfromTag.Add( "ACCTTYPE", "CMA" );

  OfxAggregate payeeTag("PAYEE");
  payeeTag.Add( "NAME", m_payee.name );
  payeeTag.Add( "ADDR1", m_payee.address1 );
  payeeTag.Add( "CITY", m_payee.city );
  payeeTag.Add( "STATE", m_payee.state );
  payeeTag.Add( "POSTALCODE", m_payee.postalcode );
  payeeTag.Add( "PHONE", m_payee.phone );

  OfxAggregate pmtinfoTag("PMTINFO");
  pmtinfoTag.Add( bankacctfromTag );
  pmtinfoTag.Add( "TRNAMT", m_payment.amount );
  pmtinfoTag.Add( payeeTag );
  pmtinfoTag.Add( "PAYACCT", m_payment.account );
  pmtinfoTag.Add( "DTDUE", m_payment.datedue );
  pmtinfoTag.Add( "MEMO", m_payment.memo );

  OfxAggregate pmtrqTag("PMTRQ");
  pmtrqTag.Add( pmtinfoTag );

  Add( RequestMessage("BILLPAY", "PMT", pmtrqTag) );
}

char* libofx_request_payment_status( const struct OfxFiLogin* login, const char* transactionid )
{
#if 0
  OfxAggregate pmtinqrqTag( "PMTINQRQ" );
  pmtinqrqTag.Add( "SRVRTID", transactionid );

  OfxRequest ofx(*login);
  ofx.Add( ofx.SignOnRequest() );
  ofx.Add( ofx.RequestMessage("BILLPAY", "PMTINQ", pmtinqrqTag) );

  string request = OfxHeader() + ofx.Output();

  unsigned size = request.size();
  char* result = (char*)malloc(size + 1);
  request.copy(result, size);
  result[size] = 0;
#else
  OfxAggregate payeesyncrq( "PAYEESYNCRQ" );
  payeesyncrq.Add( "TOKEN", "0" );
  payeesyncrq.Add( "TOKENONLY", "N" );
  payeesyncrq.Add( "REFRESH", "Y" );
  payeesyncrq.Add( "REJECTIFMISSING", "N" );

  OfxAggregate message( "BILLPAYMSGSRQV1" );
  message.Add( payeesyncrq );

  OfxRequest ofx(*login);
  ofx.Add( ofx.SignOnRequest() );
  ofx.Add( message );

  string request = OfxHeader(login->header_version) + ofx.Output();

  unsigned size = request.size();
  char* result = (char*)malloc(size + 1);
  request.copy(result, size);
  result[size] = 0;

#endif
  return result;
}

// vim:cin:si:ai:et:ts=2:sw=2:

