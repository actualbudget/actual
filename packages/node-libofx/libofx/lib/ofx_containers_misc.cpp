/***************************************************************************
         ofx_proc_rs.cpp
                             -------------------
    copyright            : (C) 2002 by Benoit Grégoire
    email                : benoitg@coeus.ca
***************************************************************************/
/**@file
 * \brief LibOFX internal object code.
 *
 * These objects will process the elements returned by ofx_sgml.cpp and add them to their data members.
 * \warning Object documentation is not yet done.
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

#include <iostream>
#include <stdlib.h>
#include <string>
#include "messages.hh"
#include "libofx.h"
#include "ofx_error_msg.hh"
#include "ofx_utilities.hh"
#include "ofx_containers.hh"

extern OfxMainContainer * MainContainer;

/***************************************************************************
 *                         OfxDummyContainer                               *
 ***************************************************************************/

OfxDummyContainer::OfxDummyContainer(LibofxContext *p_libofx_context, OfxGenericContainer *para_parentcontainer, string para_tag_identifier):
  OfxGenericContainer(p_libofx_context, para_parentcontainer, para_tag_identifier)
{
  type = "DUMMY";
  message_out(INFO, "Created OfxDummyContainer to hold unsupported aggregate " + para_tag_identifier);
}
void OfxDummyContainer::add_attribute(const string identifier, const string value)
{
  message_out(DEBUG, "OfxDummyContainer for " + tag_identifier + " ignored a " + identifier + " (" + value + ")");
}

/***************************************************************************
 *                         OfxPushUpContainer                              *
 ***************************************************************************/

OfxPushUpContainer::OfxPushUpContainer(LibofxContext *p_libofx_context, OfxGenericContainer *para_parentcontainer, string para_tag_identifier):
  OfxGenericContainer(p_libofx_context, para_parentcontainer, para_tag_identifier)
{
  type = "PUSHUP";
  message_out(DEBUG, "Created OfxPushUpContainer to hold aggregate " + tag_identifier);
}
void OfxPushUpContainer::add_attribute(const string identifier, const string value)
{
  //message_out(DEBUG, "OfxPushUpContainer for "+tag_identifier+" will push up a "+identifier+" ("+value+") to a "+ parentcontainer->type + " container");
  if (parentcontainer)
    parentcontainer->add_attribute(identifier, value);
}

/***************************************************************************
 *                         OfxStatusContainer                              *
 ***************************************************************************/

OfxStatusContainer::OfxStatusContainer(LibofxContext *p_libofx_context, OfxGenericContainer *para_parentcontainer, string para_tag_identifier):
  OfxGenericContainer(p_libofx_context, para_parentcontainer, para_tag_identifier)
{
  memset(&data, 0, sizeof(data));
  type = "STATUS";
  if (parentcontainer != NULL)
  {
    strncpy(data.ofx_element_name, parentcontainer->tag_identifier.c_str(), OFX_ELEMENT_NAME_LENGTH);
    data.ofx_element_name_valid = true;
  }

}
OfxStatusContainer::~OfxStatusContainer()
{
  message_out(DEBUG, "Entering the status's container's destructor");

  libofx_context->statusCallback(data);

  if ( data.server_message_valid )
    delete [] data.server_message;
}

void OfxStatusContainer::add_attribute(const string identifier, const string value)
{
  ErrorMsg error_msg;

  if ( identifier == "CODE")
  {
    data.code = atoi(value.c_str());
    error_msg = find_error_msg(data.code);
    data.name = error_msg.name;//memory is already allocated
    data.description = error_msg.description;//memory is already allocated
    data.code_valid = true;
  }
  else if (identifier == "SEVERITY")
  {
    data.severity_valid = true;
    if (value == "INFO")
    {
      data.severity = OfxStatusData::INFO;
    }
    else if (value == "WARN")
    {
      data.severity = OfxStatusData::WARN;
    }
    else if (value == "ERROR")
    {
      data.severity = OfxStatusData::ERROR;
    }
    else
    {
      message_out(ERROR, "WRITEME: Unknown severity " + value + " inside a " + type + " container");
      data.severity_valid = false;
    }
  }
  else if ((identifier == "MESSAGE") || (identifier == "MESSAGE2"))
  {
    data.server_message = new char[value.length()+1];
    strcpy(data.server_message, value.c_str());
    data.server_message_valid = true;
  }
  else
  {
    /* Redirect unknown identifiers to the base class */
    OfxGenericContainer::add_attribute(identifier, value);
  }
}



/***************************************************************************
 * OfxBalanceContainer  (does not directly abstract a object in libofx.h)  *
 ***************************************************************************/

OfxBalanceContainer::OfxBalanceContainer(LibofxContext *p_libofx_context, OfxGenericContainer *para_parentcontainer, string para_tag_identifier):
  OfxGenericContainer(p_libofx_context, para_parentcontainer, para_tag_identifier)
{
  amount_valid = false;
  date_valid = false;
  type = "BALANCE";
}

OfxBalanceContainer::~OfxBalanceContainer()
{
  if (parentcontainer->type == "STATEMENT")
  {
    ((OfxStatementContainer*)parentcontainer)->add_balance(this);
  }
  else
  {
    message_out (ERROR, "I completed a " + type + " element, but I haven't found a suitable parent to save it");
  }
}
void OfxBalanceContainer::add_attribute(const string identifier, const string value)
{
  if (identifier == "BALAMT")
  {
    amount = ofxamount_to_double(value);
    amount_valid = true;
  }
  else if (identifier == "DTASOF")
  {
    date = ofxdate_to_time_t(value);
    date_valid = true;
  }
  else
  {
    /* Redirect unknown identifiers to the base class */
    OfxGenericContainer::add_attribute(identifier, value);
  }
}
