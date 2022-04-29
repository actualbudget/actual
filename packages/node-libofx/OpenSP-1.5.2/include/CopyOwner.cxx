// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef CopyOwner_DEF_INCLUDED
#define CopyOwner_DEF_INCLUDED 1

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

template<class T>
CopyOwner<T>::CopyOwner(const CopyOwner<T> &o)
: Owner<T>(o.pointer() ? o.pointer()->copy() : 0)
{
}
 
template<class T>
void CopyOwner<T>::operator=(const CopyOwner<T> &o)
{
  Owner<T>::operator=(o.pointer() ? o.pointer()->copy() : 0);
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not CopyOwner_DEF_INCLUDED */
