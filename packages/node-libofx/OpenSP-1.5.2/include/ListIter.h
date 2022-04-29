// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef ListIter_INCLUDED
#define ListIter_INCLUDED 1

#include "List.h"
#include "IListIter.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

template<class T>
class ListIter {
public:
  ListIter(const List<T> &list) : iter_(list.list_) { }
  const T &cur() const { return iter_.cur()->value; }
  int done() const { return iter_.done(); }
  void next() { iter_.next(); }
private:
  IListIter<ListItem<T> > iter_;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not ListIter_INCLUDED */
