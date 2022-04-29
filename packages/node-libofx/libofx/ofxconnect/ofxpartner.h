/***************************************************************************
                             ofx_partner.h 
                             -------------------
    copyright            : (C) 2005 by Ace Jones
    email                : acejones@users.sourceforge.net
***************************************************************************/
/**@file
 * \brief Methods for connecting to the OFX partner server to retrieve
 * OFX server information
*/
/***************************************************************************
 *                                                                         *
 *   This program is free software; you can redistribute it and/or modify  *
 *   it under the terms of the GNU General Public License as published by  *
 *   the Free Software Foundation; either version 2 of the License, or     *
 *   (at your option) any later version.                                   *
 *                                                                         *
 ***************************************************************************/

#ifndef OFXPARTNER_H
#define OFXPARTNER_H

#include <libofx.h>
#include <string>
#include <vector>

namespace OfxPartner
{
  void ValidateIndexCache(void);
  OfxFiServiceInfo ServiceInfo(const std::string& fipid);
  std::vector<std::string> BankNames(void);
  std::vector<std::string> FipidForBank(const std::string& bank);
}

#endif // OFXPARTNER_H
