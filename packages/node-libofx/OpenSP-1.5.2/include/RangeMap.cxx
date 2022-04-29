// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef RangeMap_DEF_INCLUDED
#define RangeMap_DEF_INCLUDED 1

#include "RangeMap.h"
#include "ISet.h"
#include "types.h"
#include "constant.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

template<class From, class To>
RangeMap<From, To>::RangeMap()
{
}

template<class From, class To>
Boolean RangeMap<From, To>::map(From from, To &to, From &alsoMax) const
{
  // FIXME use binary search
  for (size_t i = 0; i < ranges_.size(); i++) {
    const RangeMapRange<From,To> &r = ranges_[i];
    if (r.fromMin <= from && from <= r.fromMax) {
      to = r.toMin + (from - r.fromMin);
      alsoMax = r.fromMax;
      return 1;
    }
    if (r.fromMin > from) {
      alsoMax = r.fromMin - 1;
      return 0;
    }
  }
  alsoMax = From(-1);
  return 0;
}


typedef ISet<WideChar> RangeMap_dummy;

template<class From, class To>
unsigned RangeMap<From, To>::inverseMap(To to, From &from,
					ISet<WideChar> &fromSet,
					WideChar &count) const
{
  // FIXME use binary search
  unsigned ret = 0;
  count = wideCharMax;
  for (size_t i = 0; i < ranges_.size(); i++) {
    const RangeMapRange<From,To> &r = ranges_[i];
    if (r.toMin <= to && to <= r.toMin + (r.fromMax - r.fromMin)) {
      From n = r.fromMin + (to - r.toMin);
      WideChar thisCount = r.fromMax - n + 1;
      if (ret > 1) {
	fromSet.add(n);
	if (thisCount < count)
	  count = thisCount;
      }
      else if (ret == 1) {
	fromSet.add(from);
	fromSet.add(n);
	ret = 2;
	if (thisCount < count)
	  count = thisCount;
      }
      else {
	count = thisCount;
	from = n;
	ret = 1;
      }
    }
    else if (ret == 0 && r.toMin > to && (r.toMin - to < count))
      count = r.toMin - to;
  }
  return ret;
}

template<class From, class To>
RangeMapIter<From, To>::RangeMapIter(const RangeMap<From, To> &map)
: count_(map.ranges_.size()), ptr_(map.ranges_.begin())
{
}

// If the new range overlaps an existing one, the new
// one takes precedence.

template<class From, class To>
void RangeMap<From, To>::addRange(From fromMin, From fromMax, To toMin)
{
  // FIXME use binary search
  size_t i;
  for (i = ranges_.size(); i > 0; i--)
    if (fromMin > ranges_[i - 1].fromMax)
      break;
  // fromMin <= ranges[i].fromMax
  Boolean coalesced = 0;
  if (i > 0
      && ranges_[i - 1].fromMax + 1 == fromMin
      && ranges_[i - 1].toMin + (fromMin - ranges_[i - 1].fromMin) == toMin) {
    // coalesce with previous
    ranges_[i - 1].fromMax = fromMax;
    i--;
    coalesced = 1;
  }
  else if (i < ranges_.size() && fromMax >= ranges_[i].fromMin - 1) {
    // overlap
    if (fromMin <= ranges_[i].fromMin) {
      if (toMin + (ranges_[i].fromMin - fromMin) == ranges_[i].toMin) {
	ranges_[i].fromMin = fromMin;
	if (fromMax <= ranges_[i].fromMax)
	  return;
	ranges_[i].fromMax = fromMax;
	coalesced = 1;
      }
    }
    else {
      // fromMin > ranges_[i].fromMin
      if (ranges_[i].toMin + (fromMin - ranges_[i].fromMin) == toMin) {
	if (fromMax < ranges_[i].fromMax)
	  return;
	ranges_[i].fromMax = fromMax;
	coalesced = 1;
      }
    }
  }
  if (!coalesced) {
    // insert
    ranges_.resize(ranges_.size() + 1);
    for (size_t j = ranges_.size() - 1; j > i; j--)
      ranges_[j] = ranges_[j - 1];
    ranges_[i].fromMin = fromMin;
    ranges_[i].fromMax = fromMax;
    ranges_[i].toMin = toMin;
  }
  // Delete overlapping ranges starting at i + 1.
  size_t j;
  for (j = i + 1; j < ranges_.size(); j++) {
    if (fromMax < ranges_[j].fromMax) {
      if (fromMax >= ranges_[j].fromMin)
	ranges_[j].fromMin = fromMax + 1;
      break;
    }
  }
  if (j > i + 1) {
    // delete i + 1 ... j - 1
    // j -> i + 1
    // j - 1 -> i + 2
    size_t count = ranges_.size() - j;
    for (size_t k = 0; k < count; k++)
      ranges_[i + 1 + count] = ranges_[j + count];
    ranges_.resize(ranges_.size() - (j - (i + 1)));
  }
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not RangeMap_DEF_INCLUDED */
