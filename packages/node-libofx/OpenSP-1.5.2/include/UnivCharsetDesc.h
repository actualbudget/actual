// Copyright (c) 1994, 1997 James Clark
// See the file COPYING for copying permission.

#ifndef UnivCharsetDesc_INCLUDED
#define UnivCharsetDesc_INCLUDED 1
#ifdef __GNUG__
#pragma interface
#endif

#include <stddef.h>
#include "types.h"
#include "constant.h"
#include "CharMap.h"
#include "RangeMap.h"
#include "Boolean.h"
#include "ISet.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API UnivCharsetDesc {
public:
  struct SP_API Range {
    WideChar descMin;
    // Note that this is a count, as in the SGML declaration,
    // rather than a maximum.
    unsigned long count;
    UnivChar univMin;
  };
  enum {
    zero = 48,
    A = 65,
    a = 97,
    tab = 9,
    rs = 10,
    re = 13,
    space = 32,
    exclamation = 33,
    lessThan = 60,
    greaterThan = 62
    };
  UnivCharsetDesc();
  UnivCharsetDesc(const Range *, size_t);
  inline UnivCharsetDesc(const UnivCharsetDesc& x) :
	  charMap_(x.charMap_), rangeMap_(x.rangeMap_) {}
  inline ~UnivCharsetDesc() {}
  void set(const Range *, size_t);
  Boolean descToUniv(WideChar from, UnivChar &to) const;
  Boolean descToUniv(WideChar from, UnivChar &to, WideChar &alsoMax) const;
  // Return 0 for no matches, 1 for 1, 2 for more than 1
  unsigned univToDesc(UnivChar from, WideChar &to, ISet<WideChar> &toSet)
       const;
  unsigned univToDesc(UnivChar from, WideChar &to, ISet<WideChar> &toSet,
		      WideChar &count)
       const;
  void addRange(WideChar descMin, WideChar descMax, UnivChar univMin);
  void addBaseRange(const UnivCharsetDesc &baseSet,
		    WideChar descMin,
		    WideChar descMax,
		    WideChar baseMin,
		    ISet<WideChar> &baseMissing);
private:
  static Boolean noDesc(Unsigned32 n) {
    return (n & (unsigned(1) << 31));
  }
  static UnivChar extractChar(Unsigned32 n, Char ch) {
    return UnivChar((n + ch) & ((unsigned(1) << 31) - 1));
  }
  static Unsigned32 wrapChar(UnivChar univ, Char ch) {
    return Unsigned32((univ - ch) & ((unsigned(1) << 31) - 1));
  }
  // For characters <= charMax.<
  CharMap<Unsigned32> charMap_;
  // For characters > charMax.
  RangeMap<WideChar,UnivChar> rangeMap_;
  friend class UnivCharsetDescIter;
};

class SP_API UnivCharsetDescIter {
public:
  UnivCharsetDescIter(const UnivCharsetDesc &);
  Boolean next(WideChar &descMin, WideChar &descMax, UnivChar &univMin);
  void skipTo(WideChar);
private:
  const CharMap<Unsigned32> *charMap_;
  Char nextChar_;
  Boolean doneCharMap_;
  RangeMapIter<WideChar,UnivChar> rangeMapIter_;
};

inline
Boolean UnivCharsetDesc::descToUniv(WideChar from, UnivChar &to) const
{
  if (from > charMax) {
    WideChar tem;
    return rangeMap_.map(from, to, tem);
  }
  else {
    Unsigned32 tem = charMap_[from];
    if (noDesc(tem))
      return 0;
    else {
      to = extractChar(tem, from);
      return 1;
    } 
  }
}

inline
Boolean UnivCharsetDesc::descToUniv(WideChar from, UnivChar &to,
				    WideChar &alsoMax) const
{
  if (from > charMax)
    return rangeMap_.map(from, to, alsoMax);
  else {
    Char max;
    Unsigned32 tem = charMap_.getRange(from, max);
    alsoMax = max;
    if (noDesc(tem))
      return 0;
    else {
      to = extractChar(tem, from);
      return 1;
    }
  }
}

inline
unsigned UnivCharsetDesc::univToDesc(UnivChar from, WideChar &to,
				     ISet<WideChar> &toSet) const
{
  WideChar tem;
  return univToDesc(from, to, toSet, tem);
}

inline
void UnivCharsetDescIter::skipTo(WideChar ch)
{
  if (ch > charMax)
    doneCharMap_ = 1;
  else
    nextChar_ = ch;
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not UnivCharsetDesc_INCLUDED */
