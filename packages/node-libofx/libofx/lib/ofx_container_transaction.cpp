/***************************************************************************
         ofx_container_account.cpp
                             -------------------
    copyright            : (C) 2002 by Benoit Gr�goire
    email                : benoitg@coeus.ca
***************************************************************************/
/**@file
 * \brief Implementation of  OfxTransactionContainer,
 OfxBankTransactionContainer and OfxInvestmentTransactionContainer.
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
#include "messages.hh"
#include "libofx.h"
#include "ofx_containers.hh"
#include "ofx_utilities.hh"

extern OfxMainContainer * MainContainer;

/***************************************************************************
 *                      OfxTransactionContainer                            *
 ***************************************************************************/

OfxTransactionContainer::OfxTransactionContainer(LibofxContext *p_libofx_context, OfxGenericContainer *para_parentcontainer, string para_tag_identifier):
  OfxGenericContainer(p_libofx_context, para_parentcontainer, para_tag_identifier)
{
  OfxGenericContainer * tmp_parentcontainer = parentcontainer;

  memset(&data, 0, sizeof(data));
  type = "TRANSACTION";
  /* Find the parent statement container*/
  while (tmp_parentcontainer != NULL && tmp_parentcontainer->type != "STATEMENT")
  {
    tmp_parentcontainer = tmp_parentcontainer->parentcontainer;
  }
  if (tmp_parentcontainer != NULL)
  {
    parent_statement = (OfxStatementContainer*)tmp_parentcontainer;
  }
  else
  {
    parent_statement = NULL;
    message_out(ERROR, "Unable to find the enclosing statement container this transaction");
  }
  if (parent_statement != NULL && parent_statement->data.account_id_valid == true)
  {
    strncpy(data.account_id, parent_statement->data.account_id, OFX_ACCOUNT_ID_LENGTH);
    data.account_id_valid = true;
  }
}
OfxTransactionContainer::~OfxTransactionContainer()
{

}

int OfxTransactionContainer::gen_event()
{
  if (data.unique_id_valid == true && MainContainer != NULL)
  {
    data.security_data_ptr = MainContainer->find_security(data.unique_id);
    if (data.security_data_ptr != NULL)
    {
      data.security_data_valid = true;
    }
  }
  libofx_context->transactionCallback(data);
  return true;
}

int  OfxTransactionContainer::add_to_main_tree()
{

  if (MainContainer != NULL)
  {
    return MainContainer->add_container(this);
  }
  else
  {
    return false;
  }
}


void OfxTransactionContainer::add_attribute(const string identifier, const string value)
{

  if (identifier == "DTPOSTED")
  {
    data.date_posted = ofxdate_to_time_t(value);
    data.date_posted_valid = true;
  }
  else if (identifier == "DTUSER")
  {
    data.date_initiated = ofxdate_to_time_t(value);
    data.date_initiated_valid = true;
  }
  else if (identifier == "DTAVAIL")
  {
    data.date_funds_available = ofxdate_to_time_t(value);
    data.date_funds_available_valid = true;
  }
  else if (identifier == "FITID")
  {
    strncpy(data.fi_id, value.c_str(), sizeof(data.fi_id));
    data.fi_id_valid = true;
  }
  else if (identifier == "CORRECTFITID")
  {
    strncpy(data.fi_id_corrected, value.c_str(), sizeof(data.fi_id));
    data.fi_id_corrected_valid = true;
  }
  else if (identifier == "CORRECTACTION")
  {
    data.fi_id_correction_action_valid = true;
    if (value == "REPLACE")
    {
      data.fi_id_correction_action = REPLACE;
    }
    else if (value == "DELETE")
    {
      data.fi_id_correction_action = DELETE;
    }
    else
    {
      data.fi_id_correction_action_valid = false;
    }
  }
  else if ((identifier == "SRVRTID") || (identifier == "SRVRTID2"))
  {
    strncpy(data.server_transaction_id, value.c_str(), sizeof(data.server_transaction_id));
    data.server_transaction_id_valid = true;
  }
  else if (identifier == "MEMO" || identifier == "MEMO2")
  {
    strncpy(data.memo, value.c_str(), sizeof(data.memo));
    data.memo_valid = true;
  }
  else
  {
    /* Redirect unknown identifiers to the base class */
    OfxGenericContainer::add_attribute(identifier, value);
  }
}// end OfxTransactionContainer::add_attribute()

void OfxTransactionContainer::add_account(OfxAccountData * account_data)
{
  if (account_data->account_id_valid == true)
  {
    data.account_ptr = account_data;
    strncpy(data.account_id, account_data->account_id, OFX_ACCOUNT_ID_LENGTH);
    data.account_id_valid = true;
  }
}

/***************************************************************************
 *                      OfxBankTransactionContainer                        *
 ***************************************************************************/

OfxBankTransactionContainer::OfxBankTransactionContainer(LibofxContext *p_libofx_context, OfxGenericContainer *para_parentcontainer, string para_tag_identifier):
  OfxTransactionContainer(p_libofx_context, para_parentcontainer, para_tag_identifier)
{
  ;
}
void OfxBankTransactionContainer::add_attribute(const string identifier, const string value)
{
  if ( identifier == "TRNTYPE")
  {
    data.transactiontype_valid = true;
    if (value == "CREDIT")
    {
      data.transactiontype = OFX_CREDIT;
    }
    else if (value == "DEBIT")
    {
      data.transactiontype = OFX_DEBIT;
    }
    else if (value == "INT")
    {
      data.transactiontype = OFX_INT;
    }
    else if (value == "DIV")
    {
      data.transactiontype = OFX_DIV;
    }
    else if (value == "FEE")
    {
      data.transactiontype = OFX_FEE;
    }
    else if (value == "SRVCHG")
    {
      data.transactiontype = OFX_SRVCHG;
    }
    else if (value == "DEP")
    {
      data.transactiontype = OFX_DEP;
    }
    else if (value == "ATM")
    {
      data.transactiontype = OFX_ATM;
    }
    else if (value == "POS")
    {
      data.transactiontype = OFX_POS;
    }
    else if (value == "XFER")
    {
      data.transactiontype = OFX_XFER;
    }
    else if (value == "CHECK")
    {
      data.transactiontype = OFX_CHECK;
    }
    else if (value == "PAYMENT")
    {
      data.transactiontype = OFX_PAYMENT;
    }
    else if (value == "CASH")
    {
      data.transactiontype = OFX_CASH;
    }
    else if (value == "DIRECTDEP")
    {
      data.transactiontype = OFX_DIRECTDEP;
    }
    else if (value == "DIRECTDEBIT")
    {
      data.transactiontype = OFX_DIRECTDEBIT;
    }
    else if (value == "REPEATPMT")
    {
      data.transactiontype = OFX_REPEATPMT;
    }
    else if (value == "OTHER")
    {
      data.transactiontype = OFX_OTHER;
    }
    else
    {
      data.transactiontype_valid = false;
    }
  }//end TRANSTYPE
  else if (identifier == "TRNAMT")
  {
    data.amount = ofxamount_to_double(value);
    data.amount_valid = true;
    data.units = -data.amount;
    data.units_valid = true;
    data.unitprice = 1.00;
    data.unitprice_valid = true;
  }
  else if (identifier == "CHECKNUM")
  {
    strncpy(data.check_number, value.c_str(), sizeof(data.check_number));
    data.check_number_valid = true;
  }
  else if (identifier == "REFNUM")
  {
    strncpy(data.reference_number, value.c_str(), sizeof(data.reference_number));
    data.reference_number_valid = true;
  }
  else if (identifier == "SIC")
  {
    data.standard_industrial_code = atoi(value.c_str());
    data.standard_industrial_code_valid = true;
  }
  else if ((identifier == "PAYEEID") || (identifier == "PAYEEID2"))
  {
    strncpy(data.payee_id, value.c_str(), sizeof(data.payee_id));
    data.payee_id_valid = true;
  }
  else if (identifier == "NAME")
  {
    strncpy(data.name, value.c_str(), sizeof(data.name));
    data.name_valid = true;
  }
  else
  {
    /* Redirect unknown identifiers to base class */
    OfxTransactionContainer::add_attribute(identifier, value);
  }
}//end OfxBankTransactionContainer::add_attribute


/***************************************************************************
 *                    OfxInvestmentTransactionContainer                    *
 ***************************************************************************/

OfxInvestmentTransactionContainer::OfxInvestmentTransactionContainer(LibofxContext *p_libofx_context, OfxGenericContainer *para_parentcontainer, string para_tag_identifier):
  OfxTransactionContainer(p_libofx_context, para_parentcontainer, para_tag_identifier)
{
  type = "INVESTMENT";
  data.transactiontype = OFX_OTHER;
  data.transactiontype_valid = true;

  data.invtransactiontype_valid = true;
  if (para_tag_identifier == "BUYDEBT")
  {
    data.invtransactiontype = OFX_BUYDEBT;
  }
  else if (para_tag_identifier == "BUYMF")
  {
    data.invtransactiontype = OFX_BUYMF;
  }
  else if (para_tag_identifier == "BUYOPT")
  {
    data.invtransactiontype = OFX_BUYOPT;
  }
  else if (para_tag_identifier == "BUYOTHER")
  {
    data.invtransactiontype = OFX_BUYOTHER;
  }
  else if (para_tag_identifier == "BUYSTOCK")
  {
    data.invtransactiontype = OFX_BUYSTOCK;
  }
  else if (para_tag_identifier == "CLOSUREOPT")
  {
    data.invtransactiontype = OFX_CLOSUREOPT;
  }
  else if (para_tag_identifier == "INCOME")
  {
    data.invtransactiontype = OFX_INCOME;
  }
  else if (para_tag_identifier == "INVEXPENSE")
  {
    data.invtransactiontype = OFX_INVEXPENSE;
  }
  else if (para_tag_identifier == "JRNLFUND")
  {
    data.invtransactiontype = OFX_JRNLFUND;
  }
  else if (para_tag_identifier == "JRNLSEC")
  {
    data.invtransactiontype = OFX_JRNLSEC;
  }
  else if (para_tag_identifier == "MARGININTEREST")
  {
    data.invtransactiontype = OFX_MARGININTEREST;
  }
  else if (para_tag_identifier == "REINVEST")
  {
    data.invtransactiontype = OFX_REINVEST;
  }
  else if (para_tag_identifier == "RETOFCAP")
  {
    data.invtransactiontype = OFX_RETOFCAP;
  }
  else if (para_tag_identifier == "SELLDEBT")
  {
    data.invtransactiontype = OFX_SELLDEBT;
  }
  else if (para_tag_identifier == "SELLMF")
  {
    data.invtransactiontype = OFX_SELLMF;
  }
  else if (para_tag_identifier == "SELLOPT")
  {
    data.invtransactiontype = OFX_SELLOPT;
  }
  else if (para_tag_identifier == "SELLOTHER")
  {
    data.invtransactiontype = OFX_SELLOTHER;
  }
  else if (para_tag_identifier == "SELLSTOCK")
  {
    data.invtransactiontype = OFX_SELLSTOCK;
  }
  else if (para_tag_identifier == "SPLIT")
  {
    data.invtransactiontype = OFX_SPLIT;
  }
  else if (para_tag_identifier == "TRANSFER")
  {
    data.invtransactiontype = OFX_TRANSFER;
  }
  else
  {
    message_out(ERROR, "This should not happen, " + para_tag_identifier + " is an unknown investment transaction type");
    data.invtransactiontype_valid = false;
  }
}

void OfxInvestmentTransactionContainer::add_attribute(const string identifier, const string value)
{
  if (identifier == "UNIQUEID")
  {
    strncpy(data.unique_id, value.c_str(), sizeof(data.unique_id));
    data.unique_id_valid = true;
  }
  else if (identifier == "UNIQUEIDTYPE")
  {
    strncpy(data.unique_id_type, value.c_str(), sizeof(data.unique_id_type));
    data.unique_id_type_valid = true;
  }
  else if (identifier == "UNITS")
  {
    data.units = ofxamount_to_double(value);
    data.units_valid = true;
  }
  else if (identifier == "UNITPRICE")
  {
    data.unitprice = ofxamount_to_double(value);
    data.unitprice_valid = true;
  }
  else if (identifier == "MKTVAL")
  {
    message_out(DEBUG, "MKTVAL of " + value + " ignored since MKTVAL should always be UNITS*UNITPRICE");
  }
  else if (identifier == "TOTAL")
  {
    data.amount = ofxamount_to_double(value);
    data.amount_valid = true;
  }
  else if (identifier == "DTSETTLE")
  {
    data.date_posted = ofxdate_to_time_t(value);
    data.date_posted_valid = true;
  }
  else if (identifier == "DTTRADE")
  {
    data.date_initiated = ofxdate_to_time_t(value);
    data.date_initiated_valid = true;
  }
  else if (identifier == "COMMISSION")
  {
    data.commission = ofxamount_to_double(value);
    data.commission_valid = true;
  }
  else if (identifier == "FEES")
  {
    data.fees = ofxamount_to_double(value);
    data.fees_valid = true;
  }
  else if (identifier == "OLDUNITS")
  {
    data.oldunits = ofxamount_to_double(value);
    data.oldunits_valid = true;
  }
  else if (identifier == "NEWUNITS")
  {
    data.newunits = ofxamount_to_double(value);
    data.newunits_valid = true;
  }
  else
  {
    /* Redirect unknown identifiers to the base class */
    OfxTransactionContainer::add_attribute(identifier, value);
  }
}//end OfxInvestmentTransactionContainer::add_attribute

