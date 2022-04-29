/***************************************************************************
                          ofx_util.cpp
                             -------------------
    copyright            : (C) 2002 by Benoit Gr�goire
    email                : benoitg@coeus.ca
 ***************************************************************************/
/**@file
 * \brief Various simple functions for type conversion & al
 */
/***************************************************************************
 *                                                                         *
 *   This program is free software; you can redistribute it and/or modify  *
 *   it under the terms of the GNU General Public License as published by  *
 *   the Free Software Foundation; either version 2 of the License, or     *
 *   (at your option) any later version.                                   *
 *                                                                         *
 ***************************************************************************/
#include <config.h>
#include <iostream>
#include <assert.h>

#include "ParserEventGeneratorKit.h"
#include "SGMLApplication.h"
#include <ctime>
#include <cstdlib>
#include <string>
#include <locale.h>
#include "messages.hh"
#include "ofx_utilities.hh"

#ifdef __WIN32__
# define DIRSEP "\\"
#else
# define DIRSEP "/"
#endif


using namespace std;
/**
   Convert an OpenSP CharString directly to a C++ stream, to enable the use of cout directly for debugging.
*/
/*ostream &operator<<(ostream &os, SGMLApplication::CharString s)
  {
  for (size_t i = 0; i < s.len; i++)
  {
  os << ((char *)(s.ptr))[i*sizeof(SGMLApplication::Char)];
  }
  return os;
  }*/

/*wostream &operator<<(wostream &os, SGMLApplication::CharString s)
  {
  for (size_t i = 0; i < s.len; i++)
  {//cout<<i;
  os << wchar_t(s.ptr[i*MULTIPLY4]);
  }
  return os;
  }            */

/*wchar_t* CharStringtowchar_t(SGMLApplication::CharString source, wchar_t *dest)
  {
  size_t i;
  for (i = 0; i < source.len; i++)
  {
  dest[i]+=wchar_t(source.ptr[i*sizeof(SGMLApplication::Char)*(sizeof(char)/sizeof(wchar_t))]);
  }
  return dest;
  }*/

string CharStringtostring(const SGMLApplication::CharString source, string &dest)
{
  size_t i;
  dest.assign("");//Empty the provided string
  //  cout<<"Length: "<<source.len<<"sizeof(Char)"<<sizeof(SGMLApplication::Char)<<endl;
  for (i = 0; i < source.len; i++)
  {
    dest += (char)(((source.ptr)[i]));
    //    cout<<i<<" "<<(char)(((source.ptr)[i]))<<endl;
  }
  return dest;
}

string AppendCharStringtostring(const SGMLApplication::CharString source, string &dest)
{
  size_t i;
  for (i = 0; i < source.len; i++)
  {
    dest += (char)(((source.ptr)[i]));
  }
  return dest;
}

/* Since we don't know for an arbitrary date-time whether or not it represents daylight time and we have to tell mktime something, we tell it yes if the current environment's TZ uses daylight time. If mktime finds that the supplied date-time isn't in daylight time for that time zone, it will adjust the struct tm to reflect the same time-point in not-daylight time and correct the value of tm_isdst. We check for that change and if it happens restore timeptr's date and time values and call mktime again with the correct value of tm_isdst. */
static time_t
checked_mktime(struct tm* timeptr)
{
  int is_dst = timeptr->tm_isdst;

  // jwl: force emscription to calculate and set the `tm_idst`
  // variable. This is a bug in emscripten.
  timeptr->tm_isdst = -1;

  int min = timeptr->tm_min;
  int hour = timeptr->tm_hour;
  int mday = timeptr->tm_mday;
  int mon = timeptr->tm_mon;
  int year = timeptr->tm_year;
  time_t result = mktime(timeptr);
  if (is_dst == timeptr->tm_isdst) // mktime didn't change it, OK to use the result.
    return result;

  //Restore the date & time to what it was, but use the new isdst value:
  timeptr->tm_min = min;
  timeptr->tm_hour = hour;
  timeptr->tm_mday = mday;
  timeptr->tm_mon = mon;
  timeptr->tm_year = year;
  return mktime(timeptr);
}

/**
 * Converts a date from the YYYYMMDDHHMMSS.XXX[gmt offset:tz name] OFX format (see OFX 2.01 spec p.66) to a C time_t.
 * @param ofxdate date from the YYYYMMDDHHMMSS.XXX[gmt offset:tz name] OFX format
 * @return C time_t in the local time zone
 * @note
 * @li The library always returns the time in the systems local time
 * @li OFX defines the date up to the millisecond.  The library ignores those milliseconds, since ANSI C does not handle such precision cleanly.  The date provided by LibOFX is precise to the second, assuming that information this precise was provided in the ofx file.  So you wont know the millisecond you were ruined...

 * @note DEVIATION FROM THE SPECS : The OFX specifications (both version 1.6 and 2.02) state that a client should assume that if the server returns a date without � specific time, we assume it means 0h00 GMT.  As such, when we apply the local timezone and for example you are in the EST timezone, we will remove 5h, and the transaction will have occurred on the prior day!  This is probably not what the bank intended (and will lead to systematic errors), but the spec is quite explicit in this respect (Ref:  OFX 2.01 spec pp. 66-68)<BR><BR>
 * To solve this problem (since usually a time error is relatively unimportant, but date error is), and to avoid problems in Australia caused by the behaviour in libofx up to 0.6.4, it was decided starting with 0.6.5 to use the following behavior:<BR><BR>
 * -No specific time is given in the file (date only):  Considering that most banks seem to be sending dates in this format represented as local time (not compliant with the specs), the transaction is assumed to have occurred 11h59 (just before noon) LOCAL TIME.  This way, we should never change the date, since you'd have to travel in a timezone at least 11 hours backwards or 13 hours forward from your own to introduce mistakes.  However, if you are in timezone +13 or +14, and your bank meant the data to be interpreted by the spec, you will get the wrong date.  We hope that banks in those timezone will either represent in local time like most, or specify the timezone properly.<BR><BR>
 * -No timezone is specified, but exact time is, the same behavior is mostly used, as many banks just append zeros instead of using the short notation.  However, the time specified is used, even if 0 (midnight).<BR><BR>
 * -When a timezone is specified, it is always used to properly convert in local time, following the spec.
 *
 */
time_t ofxdate_to_time_t(const string ofxdate)
{
  struct tm time;
  double local_offset; /* in seconds */
  float ofx_gmt_offset; /* in fractional hours */
  char timezone[4]; /* Original timezone: the library does not expose this value*/
  char exact_time_specified = false;
  char time_zone_specified = false;
  string ofxdate_whole;
  time_t temptime;

  std::time(&temptime);
  local_offset = difftime(mktime(localtime(&temptime)), mktime(gmtime(&temptime)));
  /* daylight is set to 1 if the timezone indicated by the environment (either TZ or /etc/localtime) uses daylight savings time (aka summer time). We use it here to provisionally set tm_isdst. */
  time.tm_isdst = daylight;

  if (ofxdate.size() != 0)
  {
    ofxdate_whole = ofxdate.substr(0, ofxdate.find_first_not_of("0123456789"));
    if (ofxdate_whole.size() >= 8)
    {
      time.tm_year = atoi(ofxdate_whole.substr(0, 4).c_str()) - 1900;
      time.tm_mon = atoi(ofxdate_whole.substr(4, 2).c_str()) - 1;
      time.tm_mday = atoi(ofxdate_whole.substr(6, 2).c_str());

      if (ofxdate_whole.size() > 8)
      {
        if (ofxdate_whole.size() == 14)
        {
          /* if exact time is specified */
          exact_time_specified = true;
          time.tm_hour = atoi(ofxdate_whole.substr(8, 2).c_str());
          time.tm_min = atoi(ofxdate_whole.substr(10, 2).c_str());
          time.tm_sec = atoi(ofxdate_whole.substr(12, 2).c_str());
        }
        else
        {
          message_out(WARNING, "ofxdate_to_time_t():  Successfully parsed date part, but unable to parse time part of string " + ofxdate_whole + ". It is not in proper YYYYMMDDHHMMSS.XXX[gmt offset:tz name] format!");
        }
      }

    }
    else
    {
      /* Catch invalid string format */
      message_out(ERROR, "ofxdate_to_time_t():  Unable to convert time, string " + ofxdate + " is not in proper YYYYMMDDHHMMSS.XXX[gmt offset:tz name] format!");
      return checked_mktime(&time);
    }


    /* Check if the timezone has been specified */
    string::size_type startidx = ofxdate.find("[");
    string::size_type endidx;
    if (startidx != string::npos)
    {
      /* Time zone was specified */
      time_zone_specified = true;
      startidx++;
      endidx = ofxdate.find(":", startidx) - 1;
      ofx_gmt_offset = atof(ofxdate.substr(startidx, (endidx - startidx) + 1).c_str());
      startidx = endidx + 2;
      strncpy(timezone, ofxdate.substr(startidx, 3).c_str(), 4);
    }
    else
    {
      /* Time zone was not specified, assume GMT (provisionnaly) in case exact time is specified */
      ofx_gmt_offset = 0;
      time.tm_isdst = 0; //GMT doesn't use daylight time.
      strcpy(timezone, "GMT");
    }

    if (time_zone_specified == true)
    {
      /* If the timezone is specified always correct the timezone */
      /* If the timezone is not specified, but the exact time is, correct the timezone, assuming GMT following the spec */
      /* Correct the time for the timezone */
      time.tm_sec = time.tm_sec + (int)(local_offset - (ofx_gmt_offset * 60 * 60)); //Convert from fractionnal hours to seconds
    }
    else if (exact_time_specified == false)
    {
      /*Time zone data missing and exact time not specified, diverge from the OFX spec ans assume 11h59 local time */
      time.tm_hour = 11;
      time.tm_min = 59;
      time.tm_sec = 0;
    }
    return checked_mktime(&time);
  }
  else
  {
    message_out(ERROR, "ofxdate_to_time_t():  Unable to convert time, string is 0 length!");
    return 0; // MUST RETURN ZERO here because otherwise the uninitialized &time will be returned!
  }
  return checked_mktime(&time);
}

/**
 * Convert a C++ string containing an amount of money as specified by the OFX standard and convert it to a double float.
 *\note The ofx number format is the following:  "." or "," as decimal separator, NO thousands separator.
 */
double ofxamount_to_double(const string ofxamount)
{
  //Replace commas and decimal points for atof()
  string::size_type idx;
  string tmp = ofxamount;

  idx = tmp.find(',');
  if (idx == string::npos)
  {
    idx = tmp.find('.');
  }

  if (idx != string::npos)
  {
    tmp.replace(idx, 1, 1, ((localeconv())->decimal_point)[0]);
  }

  return atof(tmp.c_str());
}

/**
Many weird caracters can be present inside a SGML element, as a result on the transfer protocol, or for any reason.  This function greatly enhances the reliability of the library by zapping those gremlins (backspace,formfeed,newline,carriage return, horizontal and vertical tabs) as well as removing whitespace at the begining and end of the string.  Otherwise, many problems will occur during stringmatching.
*/
string strip_whitespace(const string para_string)
{
  size_t index;
  size_t i;
  string temp_string = para_string;
  if (temp_string.empty())
    return temp_string; // so that size()-1 is allowed below

  const char *whitespace = " \b\f\n\r\t\v";
  const char *abnormal_whitespace = "\b\f\n\r\t\v";//backspace,formfeed,newline,cariage return, horizontal and vertical tabs
  message_out(DEBUG4, "strip_whitespace() Before: |" + temp_string + "|");

  for (i = 0;
       i <= temp_string.size()
       && temp_string.find_first_of(whitespace, i) == i
       && temp_string.find_first_of(whitespace, i) != string::npos;
       i++);
  temp_string.erase(0, i); //Strip leading whitespace

  for (i = temp_string.size() - 1;
       (i > 0)
       && (temp_string.find_last_of(whitespace, i) == i)
       && (temp_string.find_last_of(whitespace, i) != string::npos);
       i--);
  temp_string.erase(i + 1, temp_string.size() - (i + 1)); //Strip trailing whitespace

  while ((index = temp_string.find_first_of(abnormal_whitespace)) != string::npos)
  {
    temp_string.erase(index, 1); //Strip leading whitespace
  };

  message_out(DEBUG4, "strip_whitespace() After:  |" + temp_string + "|");

  return temp_string;
}


std::string get_tmp_dir()
{
  // Tries to mimic the behaviour of
  // http://developer.gnome.org/doc/API/2.0/glib/glib-Miscellaneous-Utility-Functions.html#g-get-tmp-dir
  char *var;
  var = getenv("TMPDIR");
  if (var) return var;
  var = getenv("TMP");
  if (var) return var;
  var = getenv("TEMP");
  if (var) return var;
#ifdef __WIN32__
  return "C:\\";
#else
  return "/tmp";
#endif
}

int mkTempFileName(const char *tmpl, char *buffer, unsigned int size)
{

  std::string tmp_dir = get_tmp_dir();

  strncpy(buffer, tmp_dir.c_str(), size);
  assert((strlen(buffer) + strlen(tmpl) + 2) < size);
  strcat(buffer, DIRSEP);
  strcat(buffer, tmpl);
  return 0;
}



