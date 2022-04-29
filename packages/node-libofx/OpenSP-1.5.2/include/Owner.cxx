// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef Owner_DEF_INCLUDED
#define Owner_DEF_INCLUDED 1

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

template<class T>
Owner<T>::~Owner()
{
  if (p_)
    delete p_;
}

template<class T>
void Owner<T>::del()
{
  delete p_;
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not Owner_DEF_INCLUDED */
