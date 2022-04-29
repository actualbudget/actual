// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef CopyOwner_INCLUDED
#define CopyOwner_INCLUDED 1

#include "Owner.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

template<class T>
class CopyOwner : public Owner<T> {
public:
  CopyOwner() { }
  CopyOwner(T *p) : Owner<T>(p) { }
  CopyOwner(const CopyOwner<T> &);
  void operator=(const CopyOwner<T> &o);
  void operator=(T *p) { Owner<T>::operator=(p); }
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not CopyOwner_INCLUDED */

#ifdef SP_DEFINE_TEMPLATES
#include "CopyOwner.cxx"
#endif
