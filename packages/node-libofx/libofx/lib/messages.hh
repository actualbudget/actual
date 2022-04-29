/***************************************************************************
                          ofx_messages.h
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
#ifndef OFX_MESSAGES_H
#define OFX_MESSAGES_H

/** The OfxMsgType enum describe's the type of message being sent, so the
    application/user/library can decide if it will be printed to stdout */
enum OfxMsgType
{
  DEBUG,       /**< General debug messages */
  DEBUG1,      /**< Debug level 1 */
  DEBUG2,      /**< Debug level 2 */
  DEBUG3,      /**< Debug level 3 */
  DEBUG4,      /**< Debug level 4 */
  DEBUG5,      /**< Debug level 5 */
  STATUS = 10, /**< For major processing event (End of parsing, etc.) */
  INFO,        /**< For minor processing event */
  WARNING,     /**< Warning message */
  ERROR,       /**< Error message */
  PARSER       /**< Parser events */
};
using namespace std;
/// Message output function
int message_out(OfxMsgType type, const string message);

#endif
