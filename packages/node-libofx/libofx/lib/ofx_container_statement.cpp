/***************************************************************************
         ofx_container_statement.cpp
                             -------------------
    copyright            : (C) 2002 by Benoit Gr�goire
    email                : benoitg@coeus.ca
***************************************************************************/
/**@file
 * \brief Implementation of OfxStatementContainer for bank statements,
credit cart statements, etc.
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
 *                    OfxStatementContainer                                *
 ***************************************************************************/

OfxStatementContainer::OfxStatementContainer(LibofxContext *p_libofx_context, OfxGenericContainer *para_parentcontainer, string para_tag_identifier):
  OfxGenericContainer(p_libofx_context, para_parentcontainer, para_tag_identifier)
{
  memset(&data, 0, sizeof(data));
  type = "STATEMENT";
}
OfxStatementContainer::~OfxStatementContainer()
{
  /*  while(transaction_queue.empty()!=true)
      {
        ofx_proc_transaction_cb(transaction_queue.front());
        transaction_queue.pop();
      }*/
}
void OfxStatementContainer::add_attribute(const string identifier, const string value)
{
  if (identifier == "CURDEF")
  {
    strncpy(data.currency, value.c_str(), OFX_CURRENCY_LENGTH);
    data.currency_valid = true;
  }
  else if (identifier == "MKTGINFO")
  {
    strncpy(data.marketing_info, value.c_str(), OFX_MARKETING_INFO_LENGTH);
    data.marketing_info_valid = true;
  }
  else if (identifier == "DTSTART")
  {
    data.date_start = ofxdate_to_time_t(value);
    data.date_start_valid = true;
  }
  else if (identifier == "DTEND")
  {
    data.date_end = ofxdate_to_time_t(value);
    data.date_end_valid = true;
  }
  else
  {
    OfxGenericContainer::add_attribute(identifier, value);
  }
}//end OfxStatementContainer::add_attribute()

void OfxStatementContainer::add_balance(OfxBalanceContainer* ptr_balance_container)
{
  if (ptr_balance_container->tag_identifier == "LEDGERBAL")
  {
    data.ledger_balance = ptr_balance_container->amount;
    data.ledger_balance_valid = ptr_balance_container->amount_valid;
    data.ledger_balance_date = ptr_balance_container->date;
    data.ledger_balance_date_valid = ptr_balance_container->date_valid;
  }
  else if (ptr_balance_container->tag_identifier == "AVAILBAL")
  {
    data.available_balance = ptr_balance_container->amount;
    data.available_balance_valid = ptr_balance_container->amount_valid;
    data.available_balance_date = ptr_balance_container->date;
    data.available_balance_date_valid = ptr_balance_container->date_valid;
  }
  else
  {
    message_out(ERROR, "OfxStatementContainer::add_balance(): the balance has unknown tag_identifier: " + ptr_balance_container->tag_identifier);
  }
}


int  OfxStatementContainer::add_to_main_tree()
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

int  OfxStatementContainer::gen_event()
{
  libofx_context->statementCallback(data);
  return true;
}


void OfxStatementContainer::add_account(OfxAccountData * account_data)
{
  if (account_data->account_id_valid == true)
  {
    data.account_ptr = account_data;
    strncpy(data.account_id, account_data->account_id, OFX_ACCOUNT_ID_LENGTH);
    data.account_id_valid = true;
  }
}
/*void OfxStatementContainer::add_transaction(const OfxTransactionData transaction_data)
{
  transaction_queue.push(transaction_data);
}*/
