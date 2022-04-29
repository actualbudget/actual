/***************************************************************************
         ofx_container_security.cpp
                             -------------------
    copyright            : (C) 2002 by Benoit Gr�goire
    email                : benoitg@coeus.ca
***************************************************************************/
/**@file
 * \brief Implementation of OfxSecurityContainer for stocks, bonds, mutual
 funds, etc.
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
 *                     OfxSecurityContainer                                *
 ***************************************************************************/

OfxSecurityContainer::OfxSecurityContainer(LibofxContext *p_libofx_context, OfxGenericContainer *para_parentcontainer, string para_tag_identifier):
  OfxGenericContainer(p_libofx_context, para_parentcontainer, para_tag_identifier)
{
  memset(&data, 0, sizeof(data));
  type = "SECURITY";
}
OfxSecurityContainer::~OfxSecurityContainer()
{
}
void OfxSecurityContainer::add_attribute(const string identifier, const string value)
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
  else if (identifier == "SECNAME")
  {
    strncpy(data.secname, value.c_str(), sizeof(data.secname));
    data.secname_valid = true;
  }
  else if (identifier == "TICKER")
  {
    strncpy(data.ticker, value.c_str(), sizeof(data.ticker));
    data.ticker_valid = true;
  }
  else if (identifier == "UNITPRICE")
  {
    data.unitprice = ofxamount_to_double(value);
    data.unitprice_valid = true;
  }
  else if (identifier == "DTASOF")
  {
    data.date_unitprice = ofxdate_to_time_t(value);
    data.date_unitprice_valid = true;
  }
  else if (identifier == "CURDEF")
  {
    strncpy(data.currency, value.c_str(), OFX_CURRENCY_LENGTH);
    data.currency_valid = true;
  }
  else if (identifier == "MEMO" || identifier == "MEMO2")
  {
    strncpy(data.memo, value.c_str(), sizeof(data.memo));
    data.memo_valid = true;
  }
  else if (identifier == "FIID")
  {
    strncpy(data.fiid, value.c_str(), OFX_FIID_LENGTH);
    data.fiid_valid = true;
  }
  else
  {
    /* Redirect unknown identifiers to the base class */
    OfxGenericContainer::add_attribute(identifier, value);
  }
}
int  OfxSecurityContainer::gen_event()
{
  libofx_context->securityCallback(data);
  return true;
}

int  OfxSecurityContainer::add_to_main_tree()
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

