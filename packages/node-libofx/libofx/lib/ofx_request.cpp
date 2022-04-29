/***************************************************************************
         ofx_request.cpp
                             -------------------
    copyright            : (C) 2005 by Ace Jones
    email                : acejones@users.sourceforge.net
***************************************************************************/
/**@file
 * \brief Implementation of an OfxRequests to create an OFX file
 *   containing a generic request .
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

#include <cstring>
#include <string>
#include "messages.hh"
#include "libofx.h"
#include "ofx_request.hh"

using namespace std;

string time_t_to_ofxdatetime( time_t time )
{
  static char buffer[51];

  strftime( buffer, 50, "%Y%m%d%H%M%S.000", localtime(&time) );
  buffer[50] = 0;

  return string(buffer);
}

string time_t_to_ofxdate( time_t time )
{
  static char buffer[51];

  strftime( buffer, 50, "%Y%m%d", localtime(&time) );
  buffer[50] = 0;

  return string(buffer);
}

string OfxHeader(const char *hver)
{
  if (hver == NULL || hver[0] == 0)
    hver = "102";

  if (strcmp(hver, "103") == 0)
    /* TODO: check for differences in version 102 and 103 */
    return string("OFXHEADER:100\r\n"
                  "DATA:OFXSGML\r\n"
                  "VERSION:103\r\n"
                  "SECURITY:NONE\r\n"
                  "ENCODING:USASCII\r\n"
                  "CHARSET:1252\r\n"
                  "COMPRESSION:NONE\r\n"
                  "OLDFILEUID:NONE\r\n"
                  "NEWFILEUID:")
           + time_t_to_ofxdatetime( time(NULL) )
           + string("\r\n\r\n");
  else
    return string("OFXHEADER:100\r\n"
                  "DATA:OFXSGML\r\n"
                  "VERSION:102\r\n"
                  "SECURITY:NONE\r\n"
                  "ENCODING:USASCII\r\n"
                  "CHARSET:1252\r\n"
                  "COMPRESSION:NONE\r\n"
                  "OLDFILEUID:NONE\r\n"
                  "NEWFILEUID:")
           + time_t_to_ofxdatetime( time(NULL) )
           + string("\r\n\r\n");
}

OfxAggregate OfxRequest::SignOnRequest(void) const
{
  OfxAggregate fiTag("FI");
  fiTag.Add( "ORG", m_login.org );
  if ( strlen(m_login.fid) > 0 )
    fiTag.Add( "FID", m_login.fid );

  OfxAggregate sonrqTag("SONRQ");
  sonrqTag.Add( "DTCLIENT", time_t_to_ofxdatetime( time(NULL) ) );
  sonrqTag.Add( "USERID", m_login.userid);
  sonrqTag.Add( "USERPASS", m_login.userpass);
  sonrqTag.Add( "LANGUAGE", "ENG");
  sonrqTag.Add( fiTag );
  if ( strlen(m_login.appid) > 0 )
    sonrqTag.Add( "APPID", m_login.appid);
  else
    sonrqTag.Add( "APPID", "QWIN");
  if ( strlen(m_login.appver) > 0 )
    sonrqTag.Add( "APPVER", m_login.appver);
  else
    sonrqTag.Add( "APPVER", "1400");

  if ( strlen(m_login.clientuid) > 0 )
    sonrqTag.Add( "CLIENTUID", m_login.clientuid);

  OfxAggregate signonmsgTag("SIGNONMSGSRQV1");
  signonmsgTag.Add( sonrqTag );

  return signonmsgTag;
}

OfxAggregate OfxRequest::RequestMessage(const string& _msgType, const string& _trnType, const OfxAggregate& _request) const
{
  OfxAggregate trnrqTag( _trnType + "TRNRQ" );
  trnrqTag.Add( "TRNUID", time_t_to_ofxdatetime( time(NULL) ) );
  trnrqTag.Add( "CLTCOOKIE", "1" );
  trnrqTag.Add( _request );

  OfxAggregate result( _msgType + "MSGSRQV1" );
  result.Add( trnrqTag );

  return result;
}
