/***************************************************************************
                          ofx_sgml.cpp
                          -------------------
    copyright            : (C) 2002 by Benoit Gr�goire
    email                : benoitg@coeus.ca
***************************************************************************/
/**@file
   \brief OFX/SGML parsing functionnality.
   *
   Almost all of the SGML parser specific code is contained in this file (some is in messages.cpp and ofx_utilities.cpp).  To understand this file you must read the documentation of OpenSP's generic interface: see http://openjade.sourceforge.net/
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
#include <cassert>
#include "ParserEventGeneratorKit.h"
#include "libofx.h"
#include "ofx_utilities.hh"
#include "messages.hh"
#include "ofx_containers.hh"
#include "ofc_sgml.hh"

using namespace std;


extern SGMLApplication::OpenEntityPtr entity_ptr;
extern SGMLApplication::Position position;
extern OfxMainContainer * MainContainer;

/** \brief This object is driven by OpenSP as it parses the SGML from the ofx file(s)
 */
class OFCApplication : public SGMLApplication
{
private:
  OfxGenericContainer *curr_container_element; /**< The currently open object from ofx_proc_rs.cpp */
  OfxGenericContainer *tmp_container_element;
  bool is_data_element; /**< If the SGML element contains data, this flag is raised */
  string incoming_data; /**< The raw data from the SGML data element */
  LibofxContext * libofx_context;
public:
  OFCApplication (LibofxContext * p_libofx_context)
  {
    MainContainer = NULL;
    curr_container_element = NULL;
    is_data_element = false;
    libofx_context = p_libofx_context;
  }

  /** \brief Callback: Start of an OFX element
   *
   An OpenSP callback, get's called when the opening tag of an OFX element appears in the file
  */
  void startElement (const StartElementEvent & event)
  {
    string identifier;
    CharStringtostring (event.gi, identifier);
    message_out(PARSER, "startElement event received from OpenSP for element " + identifier);

    position = event.pos;

    switch (event.contentType)
    {
    case StartElementEvent::empty:
      message_out(ERROR, "StartElementEvent::empty\n");
      break;
    case StartElementEvent::cdata:
      message_out(ERROR, "StartElementEvent::cdata\n");
      break;
    case StartElementEvent::rcdata:
      message_out(ERROR, "StartElementEvent::rcdata\n");
      break;
    case StartElementEvent::mixed:
      message_out(PARSER, "StartElementEvent::mixed");
      is_data_element = true;
      break;
    case StartElementEvent::element:
      message_out(PARSER, "StartElementEvent::element");
      is_data_element = false;
      break;
    default:
      message_out(ERROR, "Unknown SGML content type?!?!?!? OpenSP interface changed?");
    }

    if (is_data_element == false)
    {
      /*------- The following are OFC entities ---------------*/

      if (identifier == "OFC")
      {
        message_out (PARSER, "Element " + identifier + " found");
        MainContainer = new OfxMainContainer (libofx_context, curr_container_element, identifier);
        curr_container_element = MainContainer;
      }
      else if (identifier == "STATUS")
      {
        message_out (PARSER, "Element " + identifier + " found");
        curr_container_element = new OfxStatusContainer (libofx_context, curr_container_element, identifier);
      }
      else if (identifier == "ACCTSTMT")
      {
        message_out (PARSER, "Element " + identifier + " found");
        curr_container_element = new OfxStatementContainer (libofx_context, curr_container_element, identifier);
      }
      else if (identifier == "STMTRS")
      {
        message_out (PARSER, "Element " + identifier + " found");
        //STMTRS ignored, we will process it's attributes directly inside the STATEMENT,
        if (curr_container_element->type != "STATEMENT")
        {
          message_out(ERROR, "Element " + identifier + " found while not inside a STATEMENT container");
        }
        else
        {
          curr_container_element = new OfxPushUpContainer (libofx_context, curr_container_element, identifier);
        }
      }
      else if (identifier == "GENTRN" ||
               identifier == "STMTTRN")
      {
        message_out (PARSER, "Element " + identifier + " found");
        curr_container_element = new OfxBankTransactionContainer (libofx_context, curr_container_element, identifier);
      }
      else if (identifier == "BUYDEBT" ||
               identifier == "BUYMF" ||
               identifier == "BUYOPT" ||
               identifier == "BUYOTHER" ||
               identifier == "BUYSTOCK" ||
               identifier == "CLOSUREOPT" ||
               identifier == "INCOME" ||
               identifier == "INVEXPENSE" ||
               identifier == "JRNLFUND" ||
               identifier == "JRNLSEC" ||
               identifier == "MARGININTEREST" ||
               identifier == "REINVEST" ||
               identifier == "RETOFCAP" ||
               identifier == "SELLDEBT" ||
               identifier == "SELLMF" ||
               identifier == "SELLOPT" ||
               identifier == "SELLOTHER" ||
               identifier == "SELLSTOCK" ||
               identifier == "SPLIT" ||
               identifier == "TRANSFER" )
      {
        message_out (PARSER, "Element " + identifier + " found");
        curr_container_element = new OfxInvestmentTransactionContainer (libofx_context, curr_container_element, identifier);
      }
      /*The following is a list of OFX elements whose attributes will be processed by the parent container*/
      else if (identifier == "INVBUY" ||
               identifier == "INVSELL" ||
               identifier == "INVTRAN" ||
               identifier == "SECID")
      {
        message_out (PARSER, "Element " + identifier + " found");
        curr_container_element = new OfxPushUpContainer (libofx_context, curr_container_element, identifier);
      }

      /* The different types of accounts */
      else if (identifier == "ACCOUNT" ||
               identifier == "ACCTFROM" )
      {
        message_out (PARSER, "Element " + identifier + " found");
        curr_container_element = new OfxAccountContainer (libofx_context, curr_container_element, identifier);
      }
      else if (identifier == "SECINFO")
      {
        message_out (PARSER, "Element " + identifier + " found");
        curr_container_element = new OfxSecurityContainer (libofx_context, curr_container_element, identifier);
      }
      /* The different types of balances */
      else if (identifier == "LEDGERBAL" || identifier == "AVAILBAL")
      {
        message_out (PARSER, "Element " + identifier + " found");
        curr_container_element = new OfxBalanceContainer (libofx_context, curr_container_element, identifier);
      }
      else
      {
        /* We dont know this OFX element, so we create a dummy container */
        curr_container_element = new OfxDummyContainer(libofx_context, curr_container_element, identifier);
      }
    }
    else
    {
      /* The element was a data element.  OpenSP will call one or several data() callback with the data */
      message_out (PARSER, "Data element " + identifier + " found");
      /* There is a bug in OpenSP 1.3.4, which won't send endElement Event for some elements, and will instead send an error like "document type does not allow element "MESSAGE" here".  Incoming_data should be empty in such a case, but it will not be if the endElement event was skiped. So we empty it, so at least the last element has a chance of having valid data */
      if (incoming_data != "")
      {
        message_out (ERROR, "startElement: incoming_data should be empty! You are probably using OpenSP <= 1.3.4.  The following data was lost: " + incoming_data );
        incoming_data.assign ("");
      }
    }
  }

  /** \brief Callback: End of an OFX element
   *
   An OpenSP callback, get's called at the end of an OFX element (the closing tags are not always present in OFX) in the file.
  */
  void endElement (const EndElementEvent & event)
  {
    string identifier;
    bool end_element_for_data_element;

    CharStringtostring (event.gi, identifier);
    end_element_for_data_element = is_data_element;
    message_out(PARSER, "endElement event received from OpenSP for element " + identifier);

    position = event.pos;
    if (curr_container_element == NULL)
    {
      message_out (ERROR, "Tried to close a " + identifier + " without a open element (NULL pointer)");
      incoming_data.assign ("");
    }
    else     //curr_container_element != NULL
    {
      if (end_element_for_data_element == true)
      {
        incoming_data = strip_whitespace(incoming_data);

        curr_container_element->add_attribute (identifier, incoming_data);
        message_out (PARSER, "endElement: Added data '" + incoming_data + "' from " + identifier + " to " + curr_container_element->type + " container_element");
        incoming_data.assign ("");
        is_data_element = false;
      }
      else
      {
        if (identifier == curr_container_element->tag_identifier)
        {
          if (incoming_data != "")
          {
            message_out(ERROR, "End tag for non data element " + identifier + ", incoming data should be empty but contains: " + incoming_data + " DATA HAS BEEN LOST SOMEWHERE!");
          }

          if (identifier == "OFX")
          {
            /* The main container is a special case */
            tmp_container_element = curr_container_element;
            curr_container_element = curr_container_element->getparent ();
            MainContainer->gen_event();
            delete MainContainer;
            MainContainer = NULL;
            message_out (DEBUG, "Element " + identifier + " closed, MainContainer destroyed");
          }
          else
          {
            tmp_container_element = curr_container_element;
            curr_container_element = curr_container_element->getparent ();
            if (MainContainer != NULL)
            {
              tmp_container_element->add_to_main_tree();
              message_out (PARSER, "Element " + identifier + " closed, object added to MainContainer");
            }
            else
            {
              message_out (ERROR, "MainContainer is NULL trying to add element " + identifier);
            }
          }
        }
        else
        {
          message_out (ERROR, "Tried to close a " + identifier + " but a " + curr_container_element->type + " is currently open.");
        }
      }
    }
  }

  /** \brief Callback: Data from an OFX element
   *
   An OpenSP callback, get's called when the raw data of an OFX element appears in the file.  Is usually called more than once for a single element, so we must concatenate the data.
  */
  void data (const DataEvent & event)
  {
    string tmp;
    position = event.pos;
    AppendCharStringtostring (event.data, incoming_data);
    message_out(PARSER, "data event received from OpenSP, incoming_data is now: " + incoming_data);
  }

  /** \brief Callback: SGML parse error
   *
   An OpenSP callback, get's called when a parser error has occurred.
  */
  void error (const ErrorEvent & event)
  {
    string message;
    string string_buf;
    OfxMsgType error_type = ERROR;

    position = event.pos;
    message = message + "OpenSP parser: ";
    switch (event.type)
    {
    case SGMLApplication::ErrorEvent::quantity:
      message = message + "quantity (Exceeding a quantity limit):";
      error_type = ERROR;
      break;
    case SGMLApplication::ErrorEvent::idref:
      message = message + "idref (An IDREF to a non-existent ID):";
      error_type = ERROR;
      break;
    case SGMLApplication::ErrorEvent::capacity:
      message = message + "capacity (Exceeding a capacity limit):";
      error_type = ERROR;
      break;
    case SGMLApplication::ErrorEvent::otherError:
      message = message + "otherError (misc parse error):";
      error_type = ERROR;
      break;
    case SGMLApplication::ErrorEvent::warning:
      message = message + "warning (Not actually an error.):";
      error_type = WARNING;
      break;
    case SGMLApplication::ErrorEvent::info:
      message =  message + "info (An informationnal message.  Not actually an error):";
      error_type = INFO;
      break;
    default:
      message = message + "OpenSP sent an unknown error to LibOFX (You probably have a newer version of OpenSP):";
    }
    message =	message + "\n" + CharStringtostring (event.message, string_buf);
    message_out (error_type, message);
  }

  /** \brief Callback: Receive internal OpenSP state
   *
   An Internal OpenSP callback, used to be able to generate line number.
  */
  void openEntityChange (const OpenEntityPtr & para_entity_ptr)
  {
    message_out(DEBUG, "openEntityChange()\n");
    entity_ptr = para_entity_ptr;

  };

private:
};

/**
   ofc_proc_sgml will take a list of files in command line format.  The first file must be the DTD, and then any number of OFX files.
*/
int ofc_proc_sgml(LibofxContext * libofx_context, int argc, char * const* argv)
{
  message_out(DEBUG, "Begin ofx_proc_sgml()");
  assert(argc >= 3);
  message_out(DEBUG, argv[0]);
  message_out(DEBUG, argv[1]);
  message_out(DEBUG, argv[2]);

  ParserEventGeneratorKit parserKit;
  parserKit.setOption (ParserEventGeneratorKit::showOpenEntities);
  EventGenerator *egp =	parserKit.makeEventGenerator (argc, argv);
  egp->inhibitMessages (true);	/* Error output is handled by libofx not OpenSP */
  OFCApplication *app = new OFCApplication(libofx_context);
  unsigned nErrors = egp->run (*app); /* Begin parsing */
  delete egp;
  return nErrors > 0;
}
