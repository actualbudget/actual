// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef RangeMap_INCLUDED
#define RangeMap_INCLUDED 1

#include "Vector.h"
#include "Boolean.h"
#include "ISet.h"
#include "types.h"
#include <stddef.h>

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

template<class From, class To>
struct RangeMapRange {
  From fromMin;
  From fromMax;
  To toMin;
};

template<class From, class To> class RangeMapIter;

template<class From, class To>
class RangeMap {
public:
  RangeMap();
  Boolean map(From, To &, From &alsoMax) const;
  // Return 0 for no matches, 1 for 1, 2 for more than 1.
  unsigned inverseMap(To, From &, ISet<WideChar> &, WideChar &count) const;
  void addRange(From, From, To);
private:
  Vector<RangeMapRange<From,To> > ranges_;
  friend class RangeMapIter<From,To>;
};

template<class From, class To>
class RangeMapIter {
public:
  RangeMapIter(const RangeMap<From,To> &map);
  Boolean next(From &fromMin, From &fromMax, To &toMin) {
    if (!count_)
      return 0;
    else {
      fromMin = ptr_->fromMin;
      fromMax = ptr_->fromMax;
      toMin = ptr_->toMin;
      ptr_++;
      count_--;
      return 1;
    }
  }
private:
  size_t count_;
  typename Vector<RangeMapRange<From,To> >::const_iterator ptr_;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not RangeMap_INCLUDED */

#ifdef SP_DEFINE_TEMPLATES
#include "RangeMap.cxx"
#endif
