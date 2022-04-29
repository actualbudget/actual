// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef IList_INCLUDED
#define IList_INCLUDED 1

#include "IListBase.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

template<class T> class IListIter;

// This owns the objects that are put in it.

template<class T>
class IList : private IListBase {
public:
  IList() { }
  IList(T *p) : IListBase(p) { }
  ~IList() { clear(); }
  void append(T *p) { IListBase::append(p); }
  void insert(T *p) { IListBase::insert(p); }
  void remove(T *p) { IListBase::remove(p); }
  void swap(IList<T> &list) { IListBase::swap(list); }
  T *head() const { return (T *)IListBase::head(); }
  T *get() { return (T *)IListBase::get(); }
  IListBase::clear;
  IListBase::empty;
friend class IListIter<T>;
private:
  IList(const IList<T> &);	// undefined
  IList<T> &operator=(const IList<T> &); // undefined
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not IList_INCLUDED */
