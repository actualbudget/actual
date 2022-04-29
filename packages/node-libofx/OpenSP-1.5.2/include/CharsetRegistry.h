// Copyright (c) 1997 James Clark
// See the file COPYING for copying permission.

#ifndef CharsetRegistry_INCLUDED
#define CharsetRegistry_INCLUDED 1
#ifdef __GNUG__
#pragma interface
#endif

#include "Boolean.h"
#include "types.h"
#include "StringC.h"
#include "CharsetInfo.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API CharsetRegistry {
public:
  class SP_API Iter {
  public:
    virtual ~Iter();
    virtual Boolean next(WideChar &min, WideChar &max, UnivChar &) = 0;
  };
  enum ISORegistrationNumber {
    UNREGISTERED = 0,
    ISO646_ASCII_G0 = 6,
    ISO646_C0 = 1,
    ISO6429 = 77,
    ISO8859_1 = 100,
    ISO8859_2 = 101,
    ISO8859_3 = 109,
    ISO8859_4 = 110,
    ISO8859_5 = 144,
    ISO8859_6 = 127,
    ISO8859_7 = 126,
    ISO8859_8 = 138,
    ISO8859_9 = 148,
    ISO646_JIS_G0 = 14,
    JIS0201 = 13,
    JIS0208 = 168,
    JIS0212 = 159,
    KSC5601 = 149,
    GB2312 = 58,
    ISO10646_UCS2 = 176,
    ISO10646_UCS4 = 177,
    KOI8_R = 65534, // not registered
    BIG5 = 65535 // not registered
  };
  static ISORegistrationNumber getRegistrationNumber(const StringC &desig,
						     const CharsetInfo &);
  static Iter *makeIter(ISORegistrationNumber);
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not CharsetRegistry_INCLUDED */
