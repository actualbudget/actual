// Copyright (c) 1994, 1997 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif
#include "splib.h"
#include "CharsetInfo.h"
#include "ISet.h"
#include "constant.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

CharsetInfo::CharsetInfo(const UnivCharsetDesc &desc)
: desc_(desc)
{
  // FIXME remove mappings from desc for characters greater charMax
  init();
}

CharsetInfo::CharsetInfo()
{
  inverse_.setAll(unsigned(-1));
}

void CharsetInfo::set(const UnivCharsetDesc &desc)
{
  desc_ = desc;
  init();
}

void CharsetInfo::init()
{
  inverse_.setAll(Unsigned32(-1));

  UnivCharsetDescIter iter(desc_);
  
  WideChar descMin, descMax;
  UnivChar univMin;
  while (iter.next(descMin, descMax, univMin)) {
    if (univMin <= charMax) {
      Char univMax;
      if (charMax - univMin < descMax - descMin)
	univMax = charMax;
      else
	univMax = univMin + (descMax - descMin);
      Unsigned32 diff
	= ((descMin - univMin) & ((Unsigned32(1) << 31) - 1));
      for (;;) {
	Char max;
	Unsigned32 n = inverse_.getRange(univMin, max);
	if (max > univMax)
	  max = univMax;
	if (n == Unsigned32(-1))
	  inverse_.setRange(univMin, max, diff);
	else if (n != Unsigned32(-2))
	  inverse_.setRange(univMin, max, Unsigned32(-2));
	if (max == univMax)
	  break;
	univMin = max + 1;
      }
    }
  }
  // These are the characters that the ANSI C
  // standard guarantees will be in the basic execution
  // character set.
  static char execChars[] =
    "\t\n\r "
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "abcdefghijklmnopqrstuvwxyz"
    "0123456789"
    "!\"#%&'()*+,-./:"
    ";<=>?[\\]^_{|}~";
  // These are the corresponding ISO 646 codes.
  static char univCodes[] = {
    9, 10, 13, 32,
    65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77,
    78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90,
    97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109,
    110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122,
    48, 49, 50, 51, 52, 53, 54, 55, 56, 57,
    33, 34, 35, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 58,
    59, 60, 61, 62, 63, 91, 92, 93, 94, 95, 123, 124, 125, 126,
  };
  for (size_t i = 0; execChars[i] != '\0'; i++) {
    WideChar c;
    ISet<WideChar> set;
    if (univToDesc(univCodes[i], c, set) > 0 && c <= charMax)
      execToDesc_[(unsigned char)execChars[i]] = Char(c);
  }
}

void CharsetInfo::getDescSet(ISet<Char> &set) const
{
  UnivCharsetDescIter iter(desc_);
  WideChar descMin, descMax;
  UnivChar univMin;
  while (iter.next(descMin, descMax, univMin)) {
    if (descMin > charMax)
      break;
    if (descMax > charMax)
      descMax = charMax;
    set.addRange(Char(descMin), Char(descMax));
  }
}

int CharsetInfo::digitWeight(Char c) const
{
  for (int i = 0; i < 10; i++)
    if (c == execToDesc('0' + i))
      return i;
  return -1;
}

int CharsetInfo::hexDigitWeight(Char c) const
{
  for (int i = 0; i < 10; i++)
    if (c == execToDesc('0' + i))
      return i;
  for (int i = 0; i < 6; i++)
    if (c == execToDesc('a' + i) || c == execToDesc('A' + i))
      return i + 10;
  return -1;
}

StringC CharsetInfo::execToDesc(const char *s) const
{
  StringC result;
  while (*s != '\0')
    result += execToDesc(*s++);
  return result;
}

#ifdef SP_NAMESPACE
}
#endif
