// Copyright (c) 1994, 1997 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif
#include "splib.h"
#include "UnivCharsetDesc.h"
#include "macros.h"
#include "constant.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

UnivCharsetDesc::UnivCharsetDesc()
: charMap_(unsigned(1) << 31)
{
}

UnivCharsetDesc::UnivCharsetDesc(const Range *p, size_t n)
: charMap_(unsigned(1) << 31)
{
  set(p, n);
}

void UnivCharsetDesc::set(const Range *p, size_t n)
{
  for (size_t i = 0; i < n; i++) {
    const Range &r = p[i];
    Char max;
    if (r.count > charMax || r.descMin > charMax - r.count)
      max = charMax;
    else
      max = r.descMin + (r.count - 1);
    if (max - r.descMin > univCharMax
	|| r.univMin > univCharMax - (max - r.descMin))
      max = r.descMin + (univCharMax - r.univMin);
    addRange(r.descMin, max, r.univMin);
  }
}

void UnivCharsetDesc::addRange(WideChar descMin,
			       WideChar descMax,
			       UnivChar univMin)
{
  if (descMin <= charMax) {
    Char max = descMax > charMax ? charMax : descMax;
    charMap_.setRange(descMin, max, wrapChar(univMin, descMin));
  }
  if (descMax > charMax) {
    if (descMin > charMax)
      rangeMap_.addRange(descMin, descMax, univMin);
    else
      rangeMap_.addRange(charMax, descMax, univMin + (charMax - descMin));
  }
}

void UnivCharsetDesc::addBaseRange(const UnivCharsetDesc &baseSet,
				   WideChar descMin,
				   WideChar descMax,
				   WideChar baseMin,
				   ISet<WideChar> &baseMissing)
{
  UnivCharsetDescIter iter(baseSet);
  iter.skipTo(baseMin);
  WideChar baseMax = baseMin + (descMax - descMin);
  WideChar iDescMin, iDescMax;
  UnivChar iBaseMin;
  WideChar missingBaseMin = baseMin;
  Boolean usedAll = 0;
  while (iter.next(iDescMin, iDescMax, iBaseMin) && iDescMin <= baseMax) {
    //  baseMin   baseMax
    //          iDescMin iDescMax
    if (iDescMax >= baseMin) {
      WideChar min = baseMin > iDescMin ? baseMin : iDescMin;
      if (min > missingBaseMin)
	baseMissing.addRange(missingBaseMin, min - 1);
      WideChar max = baseMax < iDescMax ? baseMax : iDescMax;
      missingBaseMin = max + 1;
      if (missingBaseMin == 0)
	usedAll = 1;
      ASSERT(min <= max);
      addRange(descMin + (min - baseMin),
	       descMin + (max - baseMin),
	       iBaseMin + (min - iDescMin));
    }
  }
  if (!usedAll && baseMax >= missingBaseMin)
    baseMissing.addRange(missingBaseMin, baseMax);
}

unsigned UnivCharsetDesc::univToDesc(UnivChar to, WideChar &from,
				     ISet<WideChar> &fromSet,
				     WideChar &count) const
{
  unsigned ret = rangeMap_.inverseMap(to, from, fromSet, count);
  Char min = 0;
  do {
    Char max;
    Unsigned32 tem = charMap_.getRange(min, max);
    if (!noDesc(tem)) {
      UnivChar toMin = extractChar(tem, min);
      if (toMin <= to && to <= toMin + (max - min)) {
	Char n = min + (to - toMin);
	WideChar thisCount = max - n + 1;
	if (ret > 1) {
	  fromSet.add(n);
	  if (thisCount < count)
	    count = thisCount;
	  if (n < from)
	    from = n;
	}
	else if (ret == 1) {
	  fromSet.add(from);
	  fromSet.add(n);
	  ret = 2;
	  if (thisCount < count)
	    count = thisCount;
	  if (n < from)
	    from = n;
	}
	else {
	  count = thisCount;
	  from = n;
	  ret = 1;
	}
      }
      else if (ret == 0 && toMin > to && toMin - to < count)
	count = toMin - to;
    }
    min = max;
  } while (min++ != charMax);
  return ret;
}

UnivCharsetDescIter::UnivCharsetDescIter(const UnivCharsetDesc &desc)
: charMap_(&desc.charMap_), doneCharMap_(0), nextChar_(0),
  rangeMapIter_(desc.rangeMap_)
{
}

Boolean UnivCharsetDescIter::next(WideChar &descMin,
				  WideChar &descMax,
				  UnivChar &univMin)
{
  while (!doneCharMap_) {
    Char ch = nextChar_;
    Unsigned32 tem = charMap_->getRange(nextChar_, nextChar_);
    descMax = nextChar_;
    if (!UnivCharsetDesc::noDesc(tem)) {
      descMin = ch;
      descMax = nextChar_;
      univMin = UnivCharsetDesc::extractChar(tem, ch);
      if (nextChar_ == charMax)
        doneCharMap_ = 1;
      else
	nextChar_++;
      return 1;
    }
    if (nextChar_ == charMax)
      doneCharMap_ = 1;
    else
      nextChar_++;
  }
  return rangeMapIter_.next(descMin, descMax, univMin);
}

#ifdef SP_NAMESPACE
}
#endif
