// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef Owner_INCLUDED
#define Owner_INCLUDED 1

// A pointer that owns the object pointed to.
// T must be of class type.
// This is coded so that T need not yet have been defined.

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

template<class T>
class Owner {
public:
  Owner() : p_(0) { }
  Owner(T *p) : p_(p) { }
  virtual ~Owner();
  void operator=(T *p) {
    if (p_) del();
    p_ = p;
  }
  operator int() const { return p_ != 0; }
  T *pointer() const { return p_; }
  T *operator->() const { return p_; }
  T &operator*() const { return *p_; }
  void swap(Owner<T> &x) {
    T *tem = p_;
    p_ = x.p_;
    x.p_ = tem;
  }
  T *extract() {
    T *tem = p_;
    p_ = 0;
    return tem;
  }
  void clear() {
    if (p_) {
      del();
      p_ = 0;
    }
  }
private:
  Owner(const Owner<T> &);	// undefined
  void operator=(const Owner<T> &o); // undefined
  void del();
  T *p_;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not Owner_INCLUDED */

#ifdef SP_DEFINE_TEMPLATES
#include "Owner.cxx"
#endif
