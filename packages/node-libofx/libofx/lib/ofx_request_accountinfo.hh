/***************************************************************************
                          ofx_request_accountinfo.hh
                             -------------------
    copyright            : (C) 2005 by Ace Jones
    email                : acejones@users.sourceforge.net
***************************************************************************/
/**@file
 * \brief Declaration of OfxRequestAccountInfo create an OFX file
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

#ifndef OFX_REQ_ACCOUNTINFO_H
#define OFX_REQ_ACCOUNTINFO_H

#include <string>
#include "libofx.h"
#include "ofx_request.hh"

using namespace std;

/**
 * \brief An account information request
 *
 * This is an entire OFX aggregate, with all subordinate aggregates needed to log onto
 * the OFX server of a single financial institution and download a list of all accounts
 * for this user.
*/

class OfxAccountInfoRequest: public OfxRequest
{
public:
  /**
   * Creates the request aggregate to obtain an account list from this @p fi.
   *
   * @param fi The information needed to log on user into one financial
   *   institution
   */
  OfxAccountInfoRequest( const OfxFiLogin& fi );
};

#endif // OFX_REQ_ACCOUNTINFO_H
