// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef List_DEF_INCLUDED
#define List_DEF_INCLUDED 1

#include "IListIter.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

template<class T>
void List<T>::remove(const T &value)
{
  for (IListIter<ListItem<T> > iter(list_); !iter.done(); iter.next())
    if (iter.cur()->value == value) {
      list_.remove(iter.cur());
      delete iter.cur();
      break;
    }
}

template<class T>
T List<T>::get()
{
  ListItem<T> *p = list_.get();
  T temp(p->value);
  delete p;
  return temp;
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not List_DEF_INCLUDED */
