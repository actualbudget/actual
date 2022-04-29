/***************************************************************************
                             ofx_partner.cpp
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

#ifdef HAVE_CONFIG_H
#include <config.h>
#endif

#include <libofx.h>

//#ifdef HAVE_LIBCURL
#include <curl/curl.h>
//#endif

#include "ofxpartner.h"
#include "nodeparser.h"

#include <sys/stat.h>

#include <iostream>
#include <string>
#include <vector>
#include <algorithm>
#include <string.h>

using std::string;
using std::vector;
using std::cout;
using std::endl;

namespace OfxPartner
{
bool post(const string& request, const string& url, const string& filename);

const string kBankFilename = "ofx-bank-index.xml";
const string kCcFilename = "ofx-cc-index.xml";
const string kInvFilename = "ofx-inv-index.xml";

void ValidateIndexCache(void)
{
  // TODO Check whether these files exist and are recent enough before getting them again

  struct stat filestats;
  if ( stat( kBankFilename.c_str(), &filestats ) || difftime(time(0), filestats.st_mtime) > 7.0 * 24.0 * 60.0 * 60.0 )
    post("T=1&S=*&R=1&O=0&TEST=0", "http://moneycentral.msn.com/money/2005/mnynet/service/ols/filist.aspx?SKU=3&VER=6", kBankFilename);
  if ( stat( kCcFilename.c_str(), &filestats ) || difftime(time(0), filestats.st_mtime) > 7.0 * 24.0 * 60.0 * 60.0 )
    post("T=2&S=*&R=1&O=0&TEST=0", "http://moneycentral.msn.com/money/2005/mnynet/service/ols/filist.aspx?SKU=3&VER=6", kCcFilename);
  if ( stat( kInvFilename.c_str(), &filestats ) || difftime(time(0), filestats.st_mtime) > 7.0 * 24.0 * 60.0 * 60.0 )
    post("T=3&S=*&R=1&O=0&TEST=0", "http://moneycentral.msn.com/money/2005/mnynet/service/ols/filist.aspx?SKU=3&VER=6", kInvFilename);
}

vector<string> BankNames(void)
{
  vector<string> result;

  // Make sure the index files are up to date
  ValidateIndexCache();

  xmlpp::DomParser parser;
  parser.set_substitute_entities();
  parser.parse_file(kBankFilename);
  if ( parser )
  {
    vector<string> names = NodeParser(parser).Path("fi/prov/name").Text();
    result.insert(result.end(), names.begin(), names.end());
  }
  parser.parse_file(kCcFilename);
  if ( parser )
  {
    vector<string> names = NodeParser(parser).Path("fi/prov/name").Text();
    result.insert(result.end(), names.begin(), names.end());
  }
  parser.parse_file(kInvFilename);
  if ( parser )
  {
    vector<string> names = NodeParser(parser).Path("fi/prov/name").Text();
    result.insert(result.end(), names.begin(), names.end());
  }

  // Add Innovision
  result.push_back("Innovision");

  // sort the list and remove duplicates, to return one unified list of all supported banks
  sort(result.begin(), result.end());
  result.erase(unique(result.begin(), result.end()), result.end());
  return result;
}

vector<string> FipidForBank(const string& bank)
{
  vector<string> result;

  xmlpp::DomParser parser;
  parser.set_substitute_entities();
  parser.parse_file(kBankFilename);
  if ( parser )
  {
    vector<string> fipids = NodeParser(parser).Path("fi/prov").Select("name", bank).Path("guid").Text();
    if ( ! fipids.back().empty() )
      result.insert(result.end(), fipids.begin(), fipids.end());
  }
  parser.parse_file(kCcFilename);
  if ( parser )
  {
    vector<string> fipids = NodeParser(parser).Path("fi/prov").Select("name", bank).Path("guid").Text();
    if ( ! fipids.back().empty() )
      result.insert(result.end(), fipids.begin(), fipids.end());
  }
  parser.parse_file(kInvFilename);
  if ( parser )
  {
    vector<string> fipids = NodeParser(parser).Path("fi/prov").Select("name", bank).Path("guid").Text();
    if ( ! fipids.back().empty() )
      result.insert(result.end(), fipids.begin(), fipids.end());
  }

  // the fipid for Innovision is 1.
  if ( bank == "Innovision" )
    result.push_back("1");

  sort(result.begin(), result.end());
  result.erase(unique(result.begin(), result.end()), result.end());

  return result;
}

OfxFiServiceInfo ServiceInfo(const std::string& fipid)
{
  OfxFiServiceInfo result;
  memset(&result, 0, sizeof(OfxFiServiceInfo));

  // Hard-coded values for Innovision test server
  if ( fipid == "1" )
  {
    strncpy(result.fid, "00000", OFX_FID_LENGTH - 1);
    strncpy(result.org, "ReferenceFI", OFX_ORG_LENGTH - 1);
    strncpy(result.url, "http://ofx.innovision.com", OFX_URL_LENGTH - 1);
    result.accountlist = 1;
    result.statements = 1;
    result.billpay = 1;
    result.investments = 1;

    return result;
  }

  string url = "http://moneycentral.msn.com/money/2005/mnynet/service/olsvcupd/OnlSvcBrandInfo.aspx?MSNGUID=&GUID=%1&SKU=3&VER=6";
  url.replace(url.find("%1"), 2, fipid);

  // TODO: Check whether this file exists and is recent enough before getting it again
  string guidfile = "fipid-%1.xml";
  guidfile.replace(guidfile.find("%1"), 2, fipid);

  struct stat filestats;
  if ( stat( guidfile.c_str(), &filestats ) || difftime(time(0), filestats.st_mtime) > 7.0 * 24.0 * 60.0 * 60.0 )
    post("", url.c_str(), guidfile.c_str());

  // Print the FI details
  xmlpp::DomParser parser;
  parser.set_substitute_entities();
  parser.parse_file(guidfile);
  if ( parser )
  {
    NodeParser nodes(parser);

    strncpy(result.fid, nodes.Path("ProviderSettings/FID").Text().back().c_str(), OFX_FID_LENGTH - 1);
    strncpy(result.org, nodes.Path("ProviderSettings/Org").Text().back().c_str(), OFX_ORG_LENGTH - 1);
    strncpy(result.url, nodes.Path("ProviderSettings/ProviderURL").Text().back().c_str(), OFX_URL_LENGTH - 1);
    result.accountlist = (nodes.Path("ProviderSettings/AcctListAvail").Text().back() == "1");
    result.statements = (nodes.Path("BankingCapabilities/Bank").Text().back() == "1");
    result.billpay = (nodes.Path("BillPayCapabilities/Pay").Text().back() == "1");
    result.investments = (nodes.Path("InvestmentCapabilities/BrkStmt").Text().back() == "1");
  }
  return result;
}

bool post(const string& request, const string& url, const string& filename)
{
#if 1 //#ifdef HAVE_LIBCURL
  CURL *curl = curl_easy_init();
  if (! curl)
    return false;

  remove(filename.c_str());
  FILE* file = fopen(filename.c_str(), "wb");
  if (! file )
  {
    curl_easy_cleanup(curl);
    return false;
  }

  curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
  if ( request.length() )
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, request.c_str());
  curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, fwrite);
  curl_easy_setopt(curl, CURLOPT_WRITEDATA, (void *)file);

  /*CURLcode res =*/
  curl_easy_perform(curl);

  curl_easy_cleanup(curl);

  fclose(file);

  return true;
#else
  request;
  url;
  filename;
  cerr << "ERROR: libox must be configured with libcurl to post this request" << endl;
  return false;
#endif
}

} // namespace OfxPartner


// vim:cin:si:ai:et:ts=2:sw=2:
