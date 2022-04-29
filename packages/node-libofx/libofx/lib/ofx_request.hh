/***************************************************************************
                          ofx_request.hh
                             -------------------
    copyright            : (C) 2005 by Ace Jones
    email                : acejones@users.sourceforge.net
***************************************************************************/
/**@file
 * \brief Declaration of an OfxRequests to create an OFX file
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

#ifndef OFX_REQUEST_H
#define OFX_REQUEST_H

#include <string>
#include "libofx.h"
#include "ofx_aggregate.hh"

using namespace std;

/**
 * \brief A generic request
 *
 * This is an entire OFX aggregate, with all subordinate aggregates needed to log onto
 * the OFX server of a single financial institution and process a request.  The details
 * of the particular request are up to subclasses of this one.
*/
class OfxRequest: public OfxAggregate
{
public:
  /**
   * Creates the generic request aggregate.
   *
   * @param fi The information needed to log on user into one financial
   *   institution
   */
  OfxRequest(const OfxFiLogin& fi): OfxAggregate("OFX"), m_login(fi) {}

//protected:
public:
  /**
   * Creates a signon request aggregate, <SIGNONMSGSRQV1> & <SONRQ>, sufficient
   * to log this user into this financial institution.
   *
   * @return The request aggregate created
   */
  OfxAggregate SignOnRequest(void) const;

  /**
   * Creates a message aggregate
   *
   * @param msgtype The type of message. This will be prepended to "MSGSRQV1"
   *   to become the tagname of the overall aggregate
   * @param trntype The type of transactions being requested.  This will be
   *   prepended to "TRNRQ" to become the tagname of the subordinate aggregate.
   * @param aggregate The actual contents of the message, which will be a sub
   *   aggregate of the xxxTRNRQ aggregate.
   * @return The message aggregate created
   */
  OfxAggregate RequestMessage(const string& msgtype, const string& trntype, const OfxAggregate& aggregate ) const;

protected:
  OfxFiLogin m_login;
};

/**
 * @name Some general helper functions
 */
//@{

string time_t_to_ofxdatetime( time_t time );
string time_t_to_ofxdate( time_t time );
string OfxHeader(const char *hver);

//@}

#endif // OFX_REQUEST_H
