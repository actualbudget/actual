// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef List_INCLUDED
#define List_INCLUDED 1

#include "IList.h"
#include "Link.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

template<class T>
class ListItem : public Link {
public:
  ListItem(const T &v) : value(v) { }
  T value;
};

template<class T> class ListIter;

template<class T>
class List {
public:
  List() { }
  void append(const T &item) { list_.append(new ListItem<T>(item)); }
  void insert(const T &item) { list_.insert(new ListItem<T>(item)); }
  const T &head() const { return list_.head()->value; }
  void remove(const T &);
  T get();
  int empty() const { return list_.empty(); }
  friend class ListIter<T>;
private:
  List(const List<T> &);	// undefined
  void operator=(const List<T> &); // undefined

  IList<ListItem<T> > list_;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not List_INCLUDED */

#ifdef SP_DEFINE_TEMPLATES
#include "List.cxx"
#endif
