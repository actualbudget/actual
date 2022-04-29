/***************************************************************************
         ofx_container_account.cpp
                             -------------------
    copyright            : (C) 2002 by Benoit Gr�goire
    email                : benoitg@coeus.ca
***************************************************************************/
/**@file
 * \brief Implementation of OfxAccountContainer for bank, credit card and
investment accounts.
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

#include <string>
#include "messages.hh"
#include "libofx.h"
#include "ofx_containers.hh"
#include "ofx_utilities.hh"

extern OfxMainContainer * MainContainer;

/***************************************************************************
 *                      OfxAccountContainer                                *
 ***************************************************************************/

OfxAccountContainer::OfxAccountContainer(LibofxContext *p_libofx_context, OfxGenericContainer *para_parentcontainer, string para_tag_identifier):
  OfxGenericContainer(p_libofx_context, para_parentcontainer, para_tag_identifier)
{
  memset(&data, 0, sizeof(data));
  type = "ACCOUNT";
  strcpy(bankid, "");
  strcpy(branchid, "");
  strcpy(acctid, "");
  strcpy(acctkey, "");
  strcpy(brokerid, "");
  if (para_tag_identifier == "CCACCTFROM")
  {
    /*Set the type for a creditcard account.  Bank account specific
    	OFX elements will set this attribute elsewhere */
    data.account_type = data.OFX_CREDITCARD;
    data.account_type_valid = true;
  }
  if (para_tag_identifier == "INVACCTFROM")
  {
    /*Set the type for an investment account.  Bank account specific
    	OFX elements will set this attribute elsewhere */
    data.account_type = data.OFX_INVESTMENT;
    data.account_type_valid = true;
  }
  if (parentcontainer != NULL && ((OfxStatementContainer*)parentcontainer)->data.currency_valid == true)
  {
    strncpy(data.currency, ((OfxStatementContainer*)parentcontainer)->data.currency, OFX_CURRENCY_LENGTH); /* In ISO-4217 format */
    data.currency_valid = true;
  }
}
OfxAccountContainer::~OfxAccountContainer()
{
  /*  if (parentcontainer->type == "STATEMENT")
      {
      ((OfxStatementContainer*)parentcontainer)->add_account(data);
      }
      ofx_proc_account_cb (data);*/
}

void OfxAccountContainer::add_attribute(const string identifier, const string value)
{
  if ( identifier == "BANKID")
  {
    strncpy(bankid, value.c_str(), OFX_BANKID_LENGTH);
    data.bank_id_valid = true;
    strncpy(data.bank_id, value.c_str(), OFX_BANKID_LENGTH);
  }
  else if ( identifier == "BRANCHID")
  {
    strncpy(branchid, value.c_str(), OFX_BRANCHID_LENGTH);
    data.branch_id_valid = true;
    strncpy(data.branch_id, value.c_str(), OFX_BRANCHID_LENGTH);
  }
  else if ( identifier == "ACCTID")
  {
    strncpy(acctid, value.c_str(), OFX_ACCTID_LENGTH);
    data.account_number_valid = true;
    strncpy(data.account_number, value.c_str(), OFX_ACCTID_LENGTH);
  }
  else if ( identifier == "ACCTKEY")
  {
    strncpy(acctkey, value.c_str(), OFX_ACCTKEY_LENGTH);
  }
  else if ( identifier == "BROKERID")     /* For investment accounts */
  {
    strncpy(brokerid, value.c_str(), OFX_BROKERID_LENGTH);
    data.broker_id_valid = true;
    strncpy(data.broker_id, value.c_str(), OFX_BROKERID_LENGTH);
  }
  else if ((identifier == "ACCTTYPE") || (identifier == "ACCTTYPE2"))
  {
    data.account_type_valid = true;
    if (value == "CHECKING")
    {
      data.account_type = data.OFX_CHECKING;
    }
    else if (value == "SAVINGS")
    {
      data.account_type = data.OFX_SAVINGS;
    }
    else if (value == "MONEYMRKT")
    {
      data.account_type = data.OFX_MONEYMRKT;
    }
    else if (value == "CREDITLINE")
    {
      data.account_type = data.OFX_CREDITLINE;
    }
    else if (value == "CMA")
    {
      data.account_type = data.OFX_CMA;
    }
    /* AccountType CREDITCARD is set at object creation, if appropriate */
    else
    {
      data.account_type_valid = false;
    }
  }
  else
  {
    /* Redirect unknown identifiers to the base class */
    OfxGenericContainer::add_attribute(identifier, value);
  }
}//end OfxAccountContainer::add_attribute()

int OfxAccountContainer::gen_event()
{
  libofx_context->accountCallback(data);
  return true;
}

int  OfxAccountContainer::add_to_main_tree()
{
  gen_account_id ();

  if (MainContainer != NULL)
  {
    return MainContainer->add_container(this);
  }
  else
  {
    return false;
  }
}

void OfxAccountContainer::gen_account_id(void)
{
  if (data.account_type == OfxAccountData::OFX_CREDITCARD)
  {
    strncat(data.account_id, acctid, OFX_ACCOUNT_ID_LENGTH - strlen(data.account_id));
    strncat(data.account_id, " ", OFX_ACCOUNT_ID_LENGTH - strlen(data.account_id));
    strncat(data.account_id, acctkey, OFX_ACCOUNT_ID_LENGTH - strlen(data.account_id));

    strncat(data.account_name, "Credit card ", OFX_ACCOUNT_NAME_LENGTH - strlen(data.account_name));
    strncat(data.account_name, acctid, OFX_ACCOUNT_NAME_LENGTH - strlen(data.account_name));
  }
  else if (data.account_type == OfxAccountData::OFX_INVESTMENT)
  {
    strncat(data.account_id, brokerid, OFX_ACCOUNT_ID_LENGTH - strlen(data.account_id));
    strncat(data.account_id, " ", OFX_ACCOUNT_ID_LENGTH - strlen(data.account_id));
    strncat(data.account_id, acctid, OFX_ACCOUNT_ID_LENGTH - strlen(data.account_id));

    strncat(data.account_name, "Investment account ", OFX_ACCOUNT_NAME_LENGTH - strlen(data.account_name));
    strncat(data.account_name, acctid, OFX_ACCOUNT_NAME_LENGTH - strlen(data.account_name));
    strncat(data.account_name, " at broker ", OFX_ACCOUNT_NAME_LENGTH - strlen(data.account_name));
    strncat(data.account_name, brokerid, OFX_ACCOUNT_NAME_LENGTH - strlen(data.account_name));
  }
  else
  {
    strncat(data.account_id, bankid, OFX_ACCOUNT_ID_LENGTH - strlen(data.account_id));
    strncat(data.account_id, " ", OFX_ACCOUNT_ID_LENGTH - strlen(data.account_id));
    strncat(data.account_id, branchid, OFX_ACCOUNT_ID_LENGTH - strlen(data.account_id));
    strncat(data.account_id, " ", OFX_ACCOUNT_ID_LENGTH - strlen(data.account_id));
    strncat(data.account_id, acctid, OFX_ACCOUNT_ID_LENGTH - strlen(data.account_id));

    strncat(data.account_name, "Bank account ", OFX_ACCOUNT_NAME_LENGTH - strlen(data.account_name));
    strncat(data.account_name, acctid, OFX_ACCOUNT_NAME_LENGTH - strlen(data.account_name));
  }
  //if (strlen(data.account_id) >= 0) // The strlen() is always non-negative
  {
    data.account_id_valid = true;
  }
}//end OfxAccountContainer::gen_account_id()
