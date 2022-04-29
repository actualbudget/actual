/***************************************************************************
         ofx_container_main.cpp
                             -------------------
    copyright            : (C) 2002 by Benoit Grégoire
    email                : benoitg@coeus.ca
***************************************************************************/
/**@file
 * \brief Implementation of OfxMainContainer
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
#include <iostream>
#include "ParserEventGeneratorKit.h"
#include "messages.hh"
#include "libofx.h"
#include "ofx_containers.hh"

OfxMainContainer::OfxMainContainer(LibofxContext *p_libofx_context, OfxGenericContainer *para_parentcontainer, string para_tag_identifier):
  OfxGenericContainer(p_libofx_context, para_parentcontainer, para_tag_identifier)
{

//statement_tree_top=statement_tree.insert(statement_tree_top, NULL);
//security_tree_top=security_tree.insert(security_tree_top, NULL);

}
OfxMainContainer::~OfxMainContainer()
{
  message_out(DEBUG, "Entering the main container's destructor");
  tree<OfxGenericContainer *>::iterator tmp = security_tree.begin();

  while (tmp != security_tree.end())
  {
    message_out(DEBUG, "Deleting " + (*tmp)->type);
    delete (*tmp);
    ++tmp;
  }
  tmp = account_tree.begin();
  while (tmp != account_tree.end())
  {
    message_out(DEBUG, "Deleting " + (*tmp)->type);
    delete (*tmp);
    ++tmp;
  }
}
int OfxMainContainer::add_container(OfxGenericContainer * container)
{
  message_out(DEBUG, "OfxMainContainer::add_container for element " + container->tag_identifier + "; destroying the generic container");
  /* Call gen_event anyway, it could be a status container or similar */
  container->gen_event();
  delete container;
  return 0;
}

int OfxMainContainer::add_container(OfxSecurityContainer * container)
{
  message_out(DEBUG, "OfxMainContainer::add_container, adding a security");
  security_tree.insert(security_tree.begin(), container);
  return true;


}

int OfxMainContainer::add_container(OfxAccountContainer * container)
{
  message_out(DEBUG, "OfxMainContainer::add_container, adding an account");
  if ( account_tree.size() == 0)
  {
    message_out(DEBUG, "OfxMainContainer::add_container, account is the first account");
    account_tree.insert(account_tree.begin(), container);
  }
  else
  {
    message_out(DEBUG, "OfxMainContainer::add_container, account is not the first account");
    tree<OfxGenericContainer *>::sibling_iterator tmp =  account_tree.begin();
    tmp += (account_tree.number_of_siblings(tmp)); //Find last account
    account_tree.insert_after(tmp, container);
  }
  return true;
}

int OfxMainContainer::add_container(OfxStatementContainer * container)
{
  message_out(DEBUG, "OfxMainContainer::add_container, adding a statement");
  tree<OfxGenericContainer *>::sibling_iterator tmp =  account_tree.begin();
  //cerr<< "size="<<account_tree.size()<<"; num_sibblings="<<account_tree.number_of_siblings(tmp)<<endl;
  tmp += (account_tree.number_of_siblings(tmp)); //Find last account

  if (account_tree.is_valid(tmp))
  {
    message_out(DEBUG, "1: tmp is valid, Accounts are present");
    tree<OfxGenericContainer *>::iterator child = account_tree.begin(tmp);
    if (account_tree.number_of_children(tmp) != 0)
    {
      message_out(DEBUG, "There are already children for this account");
      account_tree.insert(tmp.begin(), container);

    }
    else
    {
      message_out(DEBUG, "There are no children for this account");
      account_tree.append_child(tmp, container);
    }
    container->add_account(&( ((OfxAccountContainer *)(*tmp))->data));
    return true;
  }
  else
  {
    message_out(ERROR, "OfxMainContainer::add_container, no accounts are present (tmp is invalid)");
    return false;
  }
}

int OfxMainContainer::add_container(OfxTransactionContainer * container)
{
  message_out(DEBUG, "OfxMainContainer::add_container, adding a transaction");

  if ( account_tree.size() != 0)
  {
    tree<OfxGenericContainer *>::sibling_iterator tmp =  account_tree.begin();
    //cerr<< "size="<<account_tree.size()<<"; num_sibblings="<<account_tree.number_of_siblings(tmp)<<endl;
    tmp += (account_tree.number_of_siblings(tmp)); //Find last account
    if (account_tree.is_valid(tmp))
    {
      message_out(DEBUG, "OfxMainContainer::add_container: tmp is valid, Accounts are present");
      account_tree.append_child(tmp, container);
      container->add_account(&(((OfxAccountContainer *)(*tmp))->data));
      return true;
    }
    else
    {
      message_out(ERROR, "OfxMainContainer::add_container: tmp is invalid!");
      return false;
    }
  }
  else
  {
    message_out(ERROR, "OfxMainContainer::add_container: the tree is empty!");
    return false;
  }
}

int  OfxMainContainer::gen_event()
{
  message_out(DEBUG, "Begin walking the trees of the main container to generate events");
  tree<OfxGenericContainer *>::iterator tmp = security_tree.begin();
  //cerr<<"security_tree.size(): "<<security_tree.size()<<endl;
  int i = 0;
  while (tmp != security_tree.end())
  {
    message_out(DEBUG, "Looping...");
    //cerr <<i<<endl;
    i++;
    (*tmp)->gen_event();
    ++tmp;
  }
  tmp = account_tree.begin();
  //cerr<<account_tree.size()<<endl;
  i = 0;
  while (tmp != account_tree.end())
  {
    //cerr<< "i="<<i<<"; depth="<<account_tree.depth(tmp)<<endl;
    i++;
    (*tmp)->gen_event();
    ++tmp;
  }
  message_out(DEBUG, "End walking the trees of the main container to generate events");

  return true;
}

OfxSecurityData *  OfxMainContainer::find_security(string unique_id)
{
  message_out(DEBUG, "OfxMainContainer::find_security() Begin.");

  tree<OfxGenericContainer *>::sibling_iterator tmp = security_tree.begin();
  OfxSecurityData * retval = NULL;
  while (tmp != security_tree.end() && retval == NULL)
  {
    if (((OfxSecurityContainer*)(*tmp))->data.unique_id == unique_id)
    {
      message_out(DEBUG, (string)"Security " + ((OfxSecurityContainer*)(*tmp))->data.unique_id + " found.");
      retval = &((OfxSecurityContainer*)(*tmp))->data;
    }
    ++tmp;
  }
  return retval;
}
