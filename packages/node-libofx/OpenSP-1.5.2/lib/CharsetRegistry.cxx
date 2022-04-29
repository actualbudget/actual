// Copyright (c) 1994, 1997 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif
#include "splib.h"
#include "CharsetRegistry.h"
#include "CharsetInfo.h"
#include "StringC.h"
#include "types.h"
#include "macros.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

CharsetRegistry::Iter::~Iter()
{
}

class CharsetRegistryRangeIter : public CharsetRegistry::Iter {
public:
  CharsetRegistryRangeIter(const UnivCharsetDesc::Range *p, size_t n)
    : p_(p), n_(n) { }
  Boolean next(WideChar &min, WideChar &max, UnivChar &univ) {
    if (n_) {
      min = p_->descMin;
      max = p_->descMin + (p_->count - 1);
      univ = p_->univMin;
      p_++;
      n_--;
      return 1;
    }
    else
      return 0;
  }
private:
  const UnivCharsetDesc::Range *p_;
  size_t n_;
};

class CharsetRegistryDescIter : public CharsetRegistry::Iter {
public:
  CharsetRegistryDescIter(const unsigned short *p)
    : p_(p + 2), n_(p[0]), c_(p[1]) { }
  Boolean next(WideChar &min, WideChar &max, UnivChar &univ) {
    if (n_ == 0) {
      n_ = *p_;
      if (n_ == 0)
	return 0;
      p_++;
      c_ = *p_++;
    }
    int i = 1;
    for (; i < n_; i++)
      if (p_[i] != p_[i - 1] + 1)
	break;
    min = c_;
    max = min + (i - 1);
    univ = p_[0];
    p_ += i;
    c_ += i;
    n_ -= i;
    return 1;
  }
private:
  const unsigned short *p_;
  size_t n_;
  WideChar c_;
};

static struct {
  const char *esc;
  CharsetRegistry::ISORegistrationNumber number;
} escTable[] = {
  { "\x1B\x25\x40", CharsetRegistry::ISO646_ASCII_G0 },
  { "\x1B\x28\x40", CharsetRegistry::ISO646_ASCII_G0 },
  { "\x1B\x28\x42", CharsetRegistry::ISO646_ASCII_G0 }, // ASCII
  { "\x1B\x21\x40", CharsetRegistry::ISO646_C0 },
  { "\x1B\x2D\x41", CharsetRegistry::ISO8859_1 },
  { "\x1B\x2D\x42", CharsetRegistry::ISO8859_2 },
  { "\x1B\x2D\x43", CharsetRegistry::ISO8859_3 },
  { "\x1B\x2D\x44", CharsetRegistry::ISO8859_4 },
  { "\x1B\x2D\x4C", CharsetRegistry::ISO8859_5 },
  { "\x1B\x2D\x47", CharsetRegistry::ISO8859_6 },
  { "\x1B\x2D\x46", CharsetRegistry::ISO8859_7 },
  { "\x1B\x2D\x48", CharsetRegistry::ISO8859_8 },
  { "\x1B\x2D\x4D", CharsetRegistry::ISO8859_9 },
  { "\x1B\x28\x4A", CharsetRegistry::ISO646_JIS_G0 },
  { "\x1B\x28\x49", CharsetRegistry::JIS0201 },
  { "\x1B\x24\x42", CharsetRegistry::JIS0208 },
  { "\x1B\x26\x40\x1B\x24\x42", CharsetRegistry::JIS0208 },
  { "\x1B\x24\x28\x44", CharsetRegistry::JIS0212 },
  { "\x1B\x24\x41", CharsetRegistry::GB2312 },
  { "\x1B\x24\x28\x43", CharsetRegistry::KSC5601 },
  { "\x1B\x25\x2F\x40", CharsetRegistry::ISO10646_UCS2 },
  { "\x1B\x25\x2F\x41", CharsetRegistry::ISO10646_UCS4 },
  { "\x1B\x25\x2F\x43", CharsetRegistry::ISO10646_UCS2 },
  { "\x1B\x25\x2F\x44", CharsetRegistry::ISO10646_UCS4 },
  { "\x1B\x25\x2F\x45", CharsetRegistry::ISO10646_UCS2 },
  { "\x1B\x25\x2F\x46", CharsetRegistry::ISO10646_UCS4 },
};

static const UnivCharsetDesc::Range iso646_ascii[] = {
  { 0, 128, 0 },
};

static const UnivCharsetDesc::Range iso646_C0[] = {
  { 0, 32, 0 },
  { 127, 1, 127 },
};

static const UnivCharsetDesc::Range iso6429[] = {
  { 0, 32, 128 },
};

static const UnivCharsetDesc::Range iso8859_1[] = {
  { 32, 96, 160 },
};

static const UnivCharsetDesc::Range iso10646_ucs2[] = {
  { 0, 65536, 0 },
};

static const UnivCharsetDesc::Range iso10646_ucs4[] = {
  { 0, 0x80000000, 0 },
};

static struct {
  CharsetRegistry::ISORegistrationNumber number;
  const UnivCharsetDesc::Range *ranges;
  size_t nRanges;
} rangeTable[] = {
  { CharsetRegistry::ISO646_ASCII_G0, iso646_ascii, SIZEOF(iso646_ascii) },
  { CharsetRegistry::ISO646_C0, iso646_C0, SIZEOF(iso646_C0) },
  { CharsetRegistry::ISO6429, iso6429, SIZEOF(iso6429) },
  { CharsetRegistry::ISO8859_1, iso8859_1, SIZEOF(iso8859_1) },
  { CharsetRegistry::ISO10646_UCS2, iso10646_ucs2, SIZEOF(iso10646_ucs2) },
  { CharsetRegistry::ISO10646_UCS4, iso10646_ucs4, SIZEOF(iso10646_ucs4) },
};

static const unsigned short iso8859_2[] = {
#include "iso8859-2.h"
};
static const unsigned short iso8859_3[] = {
#include "iso8859-3.h"
};
static const unsigned short iso8859_4[] = {
#include "iso8859-4.h"
};
static const unsigned short iso8859_5[] = {
#include "iso8859-5.h"
};
static const unsigned short iso8859_6[] = {
#include "iso8859-6.h"
};
static const unsigned short iso8859_7[] = {
#include "iso8859-7.h"
};
static const unsigned short iso8859_8[] = {
#include "iso8859-8.h"
};
static const unsigned short iso8859_9[] = {
#include "iso8859-9.h"
};
static const unsigned short koi8_r[] = {
#include "koi8-r.h"
};
static const unsigned short iso646_jis_G0[] = {
#include "iso646-jis.h"
};
static const unsigned short jis0201[] = {
#include "jis0201.h"
};

#ifdef SP_MULTI_BYTE

static const unsigned short jis0208[] = {
#include "jis0208.h"
};
static const unsigned short jis0212[] = {
#include "jis0212.h"
};
static const unsigned short gb2312[] = {
#include "gb2312.h"
};
static const unsigned short ksc5601[] = {
#include "ksc5601.h"
};
static const unsigned short big5[] = {
#include "big5.h"
};

#endif /* SP_MULTI_BYTE */

static const struct {
  CharsetRegistry::ISORegistrationNumber number;
  const unsigned short *desc;
} descTable[] = {
  { CharsetRegistry::ISO8859_2, iso8859_2 },
  { CharsetRegistry::ISO8859_3, iso8859_3 },
  { CharsetRegistry::ISO8859_4, iso8859_4 },
  { CharsetRegistry::ISO8859_5, iso8859_5 },
  { CharsetRegistry::ISO8859_6, iso8859_6 },
  { CharsetRegistry::ISO8859_7, iso8859_7 },
  { CharsetRegistry::ISO8859_8, iso8859_8 },
  { CharsetRegistry::ISO8859_9, iso8859_9 },
  { CharsetRegistry::KOI8_R, koi8_r },
  { CharsetRegistry::ISO646_JIS_G0, iso646_jis_G0 },
  { CharsetRegistry::JIS0201, jis0201 },
#ifdef SP_MULTI_BYTE
  { CharsetRegistry::JIS0208, jis0208 },
  { CharsetRegistry::JIS0212, jis0212 },
  { CharsetRegistry::GB2312, gb2312 },
  { CharsetRegistry::KSC5601, ksc5601 },
  { CharsetRegistry::BIG5, big5 },
#endif
};


CharsetRegistry::ISORegistrationNumber
CharsetRegistry::getRegistrationNumber(const StringC &sequence,
				       const CharsetInfo &charset)
{
  // Canonicalize the escape sequence by mapping esc -> ESC,
  // removing leading zeros from escape sequences, and removing
  // initial spaces.
  StringC s;
  for (size_t i = 0; i < sequence.size(); i++) {
    Char c = sequence[i];
    if (c == charset.execToDesc('e'))
      s += charset.execToDesc('E');
    else if (c == charset.execToDesc('s'))
      s += charset.execToDesc('S');
    else if (c == charset.execToDesc('c'))
      s += charset.execToDesc('C');
    else if (charset.digitWeight(c) >= 0
	     && s.size() > 0
	     && s[s.size() - 1] == charset.execToDesc('0')
	     && (s.size() == 1
		 || charset.digitWeight(s[s.size() - 2]) >= 0))
      s[s.size() - 1] = c;
    else if (c != charset.execToDesc(' ') || s.size() > 0)
      s += c;
  }
  for (size_t i = 0; i < SIZEOF(escTable); i++) {
    StringC esc;
    for (const char *p = escTable[i].esc; *p; p++) {
      if (*p == 0x1B)
	esc += charset.execToDesc("ESC");
      else {
	static const char digits[] = "0123456789";
	int c = (unsigned char)*p >> 4;
	if (c >= 10)
	  esc += charset.execToDesc('1');
	esc += charset.execToDesc(digits[c % 10]);
	esc += charset.execToDesc('/');
	c = (*p & 0xf);
	if (c >= 10)
	  esc += charset.execToDesc('1');
	esc += charset.execToDesc(digits[c % 10]);
      }
      if (p[1])
	esc += charset.execToDesc(' ');
    }
    if (s == esc)
      return escTable[i].number;
  }
  return UNREGISTERED;
}

CharsetRegistry::Iter *CharsetRegistry::makeIter(ISORegistrationNumber number)
{
  for (size_t i = 0; i < SIZEOF(rangeTable); i++) {
    if (number == rangeTable[i].number)
      return new CharsetRegistryRangeIter(rangeTable[i].ranges, rangeTable[i].nRanges);
  }
  for (size_t i = 0; i < SIZEOF(descTable); i++) {
    if (number == descTable[i].number)
      return new CharsetRegistryDescIter(descTable[i].desc);
  }
  return 0;
}

#ifdef SP_NAMESPACE
}
#endif
