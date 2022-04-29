/***************************************************************************
         ofx_request_accountinfo.cpp
                             -------------------
    copyright            : (C) 2005 by Ace Jones
    email                : acejones@users.sourceforge.net
***************************************************************************/
/**@file
 * \brief Implementation of libofx_request_accountinfo to create an OFX file
 *   containing a request for all account info at this FI for this user.
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
#include "libofx.h"
#include "ofx_request_accountinfo.hh"

using namespace std;

char* libofx_request_accountinfo( const OfxFiLogin* login )
{
  OfxAccountInfoRequest strq( *login );
  string request = OfxHeader(login->header_version) + strq.Output();

  unsigned size = request.size();
  char* result = (char*)malloc(size + 1);
  request.copy(result, size);
  result[size] = 0;

  return result;
}

/*
<OFX>
<SIGNONMSGSRQV1>
<SONRQ>
<DTCLIENT>20050417210306
<USERID>GnuCash
<USERPASS>gcash
<LANGUAGE>ENG
<FI>
<ORG>ReferenceFI
<FID>00000
</FI>
<APPID>QWIN
<APPVER>1100
</SONRQ>
</SIGNONMSGSRQV1>

<SIGNUPMSGSRQV1>
<ACCTINFOTRNRQ>
<TRNUID>FFAAA4AA-A9B1-47F4-98E9-DE635EB41E77
<CLTCOOKIE>4

<ACCTINFORQ>
<DTACCTUP>19700101000000
</ACCTINFORQ>

</ACCTINFOTRNRQ>
</SIGNUPMSGSRQV1>
</OFX>
*/

OfxAccountInfoRequest::OfxAccountInfoRequest( const OfxFiLogin& fi ):
  OfxRequest(fi)
{
  Add( SignOnRequest() );

  OfxAggregate acctinforqTag("ACCTINFORQ");
  acctinforqTag.Add( "DTACCTUP", time_t_to_ofxdate( 0 ) );
  Add ( RequestMessage("SIGNUP", "ACCTINFO", acctinforqTag) );
}
