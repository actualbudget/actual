/***************************************************************************
                          ofx_messages.cpp
                             -------------------
    copyright            : (C) 2002 by Benoit Gr�goire
    email                : benoitg@coeus.ca
***************************************************************************/
/**@file
 * \brief Message IO functionality
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
#include <stdlib.h>
#include <string>
#include "ParserEventGeneratorKit.h"
#include "ofx_utilities.hh"
#include "messages.hh"
#include "config.h"
#include "libofx.h"

SGMLApplication::OpenEntityPtr entity_ptr; /**< Global for determining the line number in OpenSP */
SGMLApplication::Position position; /**< Global for determining the line number in OpenSP */

int ofx_PARSER_msg = false; /**< If set to true, parser events will be printed to the console */
int ofx_DEBUG_msg = false;/**< If set to true, general debug messages will be printed to the console */
int ofx_DEBUG1_msg = false;/**< If set to true, debug level 1 messages will be printed to the console */
int ofx_DEBUG2_msg = false;/**< If set to true, debug level 2 messages will be printed to the console */
int ofx_DEBUG3_msg = false;/**< If set to true, debug level 3 messages will be printed to the console */
int ofx_DEBUG4_msg = false;/**< If set to true, debug level 4 messages will be printed to the console */
int ofx_DEBUG5_msg = false;/**< If set to true, debug level 5 messages will be printed to the console */
int ofx_STATUS_msg = false;/**< If set to true, status messages will be printed to the console */
int ofx_INFO_msg = false;/**< If set to true, information messages will be printed to the console */
int ofx_WARNING_msg = false;/**< If set to true, warning messages will be printed to the console */
int ofx_ERROR_msg = false;/**< If set to true, error messages will be printed to the console */
int ofx_show_position = true;/**< If set to true, the line number will be shown after any error */

void show_line_number()
{
  extern SGMLApplication::OpenEntityPtr entity_ptr;
  extern SGMLApplication::Position position;


  if (ofx_show_position == true)
  {
    SGMLApplication::Location *location = new SGMLApplication::Location(entity_ptr, position);
    cerr << "(Above message occurred on Line " << location->lineNumber << ", Column " << location->columnNumber << ")" << endl;
    delete location;
  }
}

/**
   Prints a message to stdout, if the corresponding message OfxMsgType given in the parameters is enabled
*/
int message_out(OfxMsgType error_type, const string message)
{


  switch  (error_type)
  {
  case DEBUG :
    if (ofx_DEBUG_msg == true)
    {
      cerr << "LibOFX DEBUG: " << message << "\n";
      show_line_number();
    }
    break;
  case DEBUG1 :
    if (ofx_DEBUG1_msg == true)
    {
      cerr << "LibOFX DEBUG1: " << message << "\n";
      show_line_number();
    }
    break;
  case DEBUG2 :
    if (ofx_DEBUG2_msg == true)
    {
      cerr << "LibOFX DEBUG2: " << message << "\n";
      show_line_number();
    }
    break;
  case DEBUG3 :
    if (ofx_DEBUG3_msg == true)
    {
      cerr << "LibOFX DEBUG3: " << message << "\n";
      show_line_number();
    }
    break;
  case DEBUG4 :
    if (ofx_DEBUG4_msg == true)
    {
      cerr << "LibOFX DEBUG4: " << message << "\n";
      show_line_number();
    }
    break;
  case DEBUG5 :
    if (ofx_DEBUG5_msg == true)
    {
      cerr << "LibOFX DEBUG5: " << message << "\n";
      show_line_number();
    }
    break;
  case STATUS :
    if (ofx_STATUS_msg == true)
    {
      cerr << "LibOFX STATUS: " << message << "\n";
      show_line_number();
    }
    break;
  case INFO :
    if (ofx_INFO_msg == true)
    {
      cerr << "LibOFX INFO: " << message << "\n";
      show_line_number();
    }
    break;
  case WARNING :
    if (ofx_WARNING_msg == true)
    {
      cerr << "LibOFX WARNING: " << message << "\n";
      show_line_number();
    }
    break;
  case ERROR :
    if (ofx_ERROR_msg == true)
    {
      cerr << "LibOFX ERROR: " << message << "\n";
      show_line_number();
    }
    break;
  case PARSER :
    if (ofx_PARSER_msg == true)
    {
      cerr << "LibOFX PARSER: " << message << "\n";
      show_line_number();
    }
    break;
  default:
    cerr << "LibOFX UNKNOWN ERROR CLASS, This is a bug in LibOFX\n";
    show_line_number();
  }

  return 0;
}

