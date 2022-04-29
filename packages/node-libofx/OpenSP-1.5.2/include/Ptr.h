// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef Ptr_INCLUDED
#define Ptr_INCLUDED 1

#include "Boolean.h"

// T must have Resource as a public base class
// T may be an incomplete type

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

template<class T>
class Ptr {
public:
  Ptr() : ptr_(0) { }
  Ptr(T *ptr);
  ~Ptr();
  Ptr(const Ptr<T> &);
  Ptr<T> &operator=(const Ptr<T> &);
  Ptr<T> &operator=(T *);
  T *pointer() const { return ptr_; }
  T *operator->() const { return ptr_; }
  T &operator*() const { return *ptr_; }
  void swap(Ptr<T> &p) {
    T *tem = p.ptr_;
    p.ptr_ = ptr_;
    ptr_ = tem;
  }
  Boolean isNull() const { return ptr_ == 0; }
  // operator const void *() const { return ptr_; }
  void clear();
  Boolean operator==(const Ptr<T> &p) const {
    return ptr_ == p.ptr_;
  }
  Boolean operator!=(const Ptr<T> &p) const {
    return ptr_ != p.ptr_;
  }
  Boolean operator==(const T *p) const {
    return ptr_ == p;
  }
  Boolean operator!=(const T *p) const {
    return ptr_ != p;
  }
private:
  T *ptr_;
};

template<class T>
class ConstPtr : private Ptr<T> {
public:
  ConstPtr() { }
  ConstPtr(T *ptr) : Ptr<T>(ptr) { }
  ConstPtr(const Ptr<T> &p) : Ptr<T>(p) { }
  ConstPtr(const ConstPtr<T> &p) : Ptr<T>(p) { }
  ConstPtr<T> &operator=(const Ptr<T> &p) {
    Ptr<T>::operator=(p); return *this;
  }
  ConstPtr<T> &operator=(const ConstPtr<T> &p) {
    Ptr<T>::operator=(p); return *this;
  }
  ConstPtr<T> &operator=(T *p) {
    Ptr<T>::operator=(p); return *this;
  }
  const T *pointer() const { return Ptr<T>::pointer(); }
  const T *operator->() const { return Ptr<T>::pointer(); }
  const T &operator*() const { return *Ptr<T>::pointer(); }
  void swap(ConstPtr<T> &p) { Ptr<T>::swap(p); }
  Ptr<T>::isNull;
  Ptr<T>::clear;
  Boolean operator==(const Ptr<T> &p) const { return Ptr<T>::operator==(p); }
  Boolean operator!=(const Ptr<T> &p) const { return Ptr<T>::operator!=(p); }
  Boolean operator==(const ConstPtr<T> &p) const {
    return Ptr<T>::operator==(p);
  }
  Boolean operator!=(const ConstPtr<T> &p) const {
    return Ptr<T>::operator!=(p);
  }
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not Ptr_INCLUDED */

#ifdef SP_DEFINE_TEMPLATES
#include "Ptr.cxx"
#endif
