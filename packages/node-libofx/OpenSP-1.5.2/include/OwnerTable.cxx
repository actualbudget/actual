// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef OwnerTable_DEF_INCLUDED
#define OwnerTable_DEF_INCLUDED 1

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

// The uses of "this->" are for HP's compiler.

template<class T, class K, class HF, class KF>
OwnerTable<T, K, HF, KF>::~OwnerTable()
{
  for (size_t i = 0; i < this->vec_.size(); i++)
    delete this->vec_[i];
}

template<class T, class K, class HF, class KF>
void OwnerTable<T, K, HF, KF>::clear()
{
  for (size_t i = 0; i < this->vec_.size(); i++)
    delete this->vec_[i];
  PointerTable<T *, K, HF, KF>::clear();
}

template<class T, class K, class HF, class KF>
void
CopyOwnerTable<T, K, HF, KF>::operator=(const CopyOwnerTable<T, K, HF, KF> &t)
{
  this->clear();
  PointerTable<T *, K, HF, KF>::operator=(t);
  // FIXME This isn't exception safe.
  for (size_t i = 0; i < this->vec_.size(); i++)
    if (this->vec_[i])
      this->vec_[i] = this->vec_[i]->copy();
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not OwnerTable_DEF_INCLUDED */
