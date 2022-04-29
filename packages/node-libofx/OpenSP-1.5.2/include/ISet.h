// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef ISet_INCLUDED
#define ISet_INCLUDED


#include <stddef.h>
#include "Vector.h"
#include "Boolean.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

template<class T> class ISetIter;

template<class T>
struct ISetRange {
  T min;
  T max;
};
  
template<class T>
class ISet {
public:
  ISet();
  ISet(const T *, size_t);
  ~ISet();
  Boolean contains(T) const;
  void remove(T);
  void add(T x) { addRange(x, x); }
  void addRange(T, T);
#if 0
  void add(const ISet<T> &);
#endif
  void check();
  void operator+=(T x) { addRange(x, x); }
  void clear();
  Boolean isSingleton() const {
    return r_.size() == 1 && r_[0].min == r_[0].max;
  }
  Boolean isEmpty() const { return r_.size() == 0; }
  void swap(ISet<T> &x) { r_.swap(x.r_); }
friend class ISetIter<T>;
private:
  Vector<ISetRange<T> > r_;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not ISet_INCLUDED */

#ifdef SP_DEFINE_TEMPLATES
#include "ISet.cxx"
#endif
