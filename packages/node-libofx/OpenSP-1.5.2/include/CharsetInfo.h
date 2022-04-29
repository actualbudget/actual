// Copyright (c) 1994, 1997 James Clark
// See the file COPYING for copying permission.

#ifndef CharsetInfo_INCLUDED
#define CharsetInfo_INCLUDED 1
#ifdef __GNUG__
#pragma interface
#endif

#include <limits.h>
#include "UnivCharsetDesc.h"
#include "Boolean.h"
#include "types.h"
#include "StringC.h"
#include "ISet.h"
#include "CharMap.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API CharsetInfo {
public:
  CharsetInfo();
  CharsetInfo(const UnivCharsetDesc &);
  inline ~CharsetInfo() {}
  void set(const UnivCharsetDesc &);
  // Use only for characters guaranteed to me in the C basic execution
  // character set and which have been verified to be in this
  // character set.
  Char execToDesc(char) const;
  StringC execToDesc(const char *s) const;
  Boolean descToUniv(WideChar from, UnivChar &to) const;
  Boolean descToUniv(WideChar from, UnivChar &to, WideChar &alsoMax) const;
  // Return 0 for no matches, 1 for 1, 2 for more than 1
  // to gets the first character; toSet gets all the characters
  // if there's more than 1.
  unsigned univToDesc(UnivChar from, WideChar &to, ISet<WideChar> &toSet)
       const;
  unsigned univToDesc(UnivChar from, WideChar &to, ISet<WideChar> &toSet,
		      WideChar &count)
       const;
  void getDescSet(ISet<Char> &) const;
  int digitWeight(Char) const;
  int hexDigitWeight(Char) const;
  const UnivCharsetDesc &desc() const;
private:
  void init();
  UnivCharsetDesc desc_;
  CharMap<Unsigned32> inverse_;
  Char execToDesc_[UCHAR_MAX + 1];
};

inline
unsigned CharsetInfo::univToDesc(UnivChar from, WideChar &to,
				 ISet<WideChar> &toSet)
     const
{
  if (from <= charMax) {
    Unsigned32 n = inverse_[from];
    if (n == Unsigned32(-1))
      return 0;
    if (n != Unsigned32(-2)) {
      to = ((n + from) & ((Unsigned32(1) << 31) - 1));
      return 1;
    }
  }
  return desc_.univToDesc(from, to, toSet);
}

inline
unsigned CharsetInfo::univToDesc(UnivChar from, WideChar &to,
				 ISet<WideChar> &toSet, WideChar &count)
     const
{
  if (from <= charMax) {
    Char fromMax;
    Unsigned32 n = inverse_.getRange(from, fromMax);
    if (n == Unsigned32(-1)) {
      count = (fromMax - from) + 1;
      return 0;
    }
    if (n != Unsigned32(-2)) {
      to = ((n + from) & ((Unsigned32(1) << 31) - 1));
      count = (fromMax - from) + 1;
      return 1;
    }
  }
  return desc_.univToDesc(from, to, toSet, count);
}

inline
Boolean CharsetInfo::descToUniv(UnivChar from, WideChar &to) const
{
  return desc_.descToUniv(from, to);
}

inline
Char CharsetInfo::execToDesc(char c) const
{
  return execToDesc_[(unsigned char)c];
}

inline
Boolean CharsetInfo::descToUniv(WideChar from, UnivChar &to,
				WideChar &alsoMax) const
{
  return desc_.descToUniv(from, to, alsoMax);
}

inline
const UnivCharsetDesc &CharsetInfo::desc() const
{
  return desc_;
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not CharsetInfo_INCLUDED */
