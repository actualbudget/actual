// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef ISetIter_INCLUDED
#define ISetIter_INCLUDED

#include <stddef.h>
#include "ISet.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

template<class T>
class ISetIter {
public:
  ISetIter(const ISet<T> &s) : p_(&s), i_(0) { }
  // min and max are not changed if 0 is returned.
  int next(T &min, T &max)
  {
    if (i_ < p_->r_.size()) {
      min = p_->r_[i_].min;
      max = p_->r_[i_].max;
      i_++;
      return 1;
    }
    else
      return 0;
  }
       
private:
  const ISet<T> *p_;
  size_t i_;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* ISetIter_INCLUDED */
