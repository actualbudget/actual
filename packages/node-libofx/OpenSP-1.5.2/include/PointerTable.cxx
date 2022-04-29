// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef PointerTable_DEF_INCLUDED
#define PointerTable_DEF_INCLUDED 1

#include <stdlib.h>

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

template<class P, class K, class HF, class KF>
PointerTable<P, K, HF, KF>::PointerTable()
: used_(0), usedLimit_(0), null_(0)
{
}

template<class P, class K, class HF, class KF>
void PointerTable<P, K, HF, KF>::clear()
{
  vec_.clear();
  used_ = 0;
  usedLimit_ = 0;
}

template<class P, class K, class HF, class KF>
P PointerTable<P, K, HF, KF>::insert(P p, Boolean replace)
{
  size_t h;
  if (vec_.size() == 0) {
    vec_.assign(8, P(0));
    usedLimit_ = 4;
    h = startIndex(KF::key(*p));
  }
  else {
    for (h = startIndex(KF::key(*p)); vec_[h] != 0 ; h = nextIndex(h))
      if (KF::key(*vec_[h]) == KF::key(*p)) {
	if (replace) {
	  P tem(vec_[h]);
	  vec_[h] = p;
	  return tem;
	}
	else
	  return vec_[h];
      }
    if (used_ >= usedLimit_) {
      if (vec_.size() > size_t(-1)/2) {
	if (usedLimit_ == vec_.size() - 1)
	  abort();		// FIXME throw an exception
	else
	  usedLimit_ = vec_.size() - 1;
      }
      else {
	// rehash
	Vector<P> oldVec(vec_.size()*2, P(0));
	vec_.swap(oldVec);
	usedLimit_ = vec_.size() / 2;
	for (size_t i = 0; i < oldVec.size(); i++)
	  if (oldVec[i] != 0) {
	    size_t j;
	    for (j = startIndex(KF::key(*oldVec[i]));
		 vec_[j] != 0;
		 j = nextIndex(j))
	      ;
	    vec_[j] = oldVec[i];
	  }
	for (h = startIndex(KF::key(*p)); vec_[h] != 0; h = nextIndex(h))
	  ;
      }
    }
  }
  used_++;
  vec_[h] = p;
  return 0;
}

template<class P, class K, class HF, class KF>
const P &PointerTable<P, K, HF, KF>::lookup(const K &k) const
{
  if (used_ > 0) {
    for (size_t i = startIndex(k); vec_[i] != 0; i = nextIndex(i))
      if (KF::key(*vec_[i]) == k)
	return vec_[i];
  }
  return null_;
}

template<class P, class K, class HF, class KF>
P PointerTable<P, K, HF, KF>::remove(const K &k)
{
  if (used_ > 0) {
    for (size_t i = startIndex(k); vec_[i] != 0; i = nextIndex(i))
      if (KF::key(*vec_[i]) == k) {
	P p = vec_[i];
	do {
	  vec_[i] = P(0);
	  size_t j = i;
	  size_t r;
	  do {
	    i = nextIndex(i);
	    if (vec_[i] == 0)
	      break;
	    r = startIndex(KF::key(*vec_[i]));
	  } while ((i <= r && r < j) || (r < j && j < i) || (j < i && i <= r));
	  vec_[j] = vec_[i];
	} while (vec_[i] != 0);
	--used_;
	return p;
      }
  }
  return 0;
}

template<class P, class K, class HF, class KF>
void PointerTable<P, K, HF, KF>::swap(PointerTable<P, K, HF, KF> &to)
{
  vec_.swap(to.vec_);
  size_t tem = to.used_;
  to.used_ = used_;
  used_ = tem;
  tem = to.usedLimit_;
  to.usedLimit_ = usedLimit_;
  usedLimit_ = tem;
}

template<class P, class K, class HF, class KF>
PointerTableIter<P, K, HF, KF>::PointerTableIter(const PointerTable<P, K, HF, KF> &table)
: tablePtr_(&table), i_(0)
{
}

template<class P, class K, class HF, class KF>
const P &PointerTableIter<P, K, HF, KF>::next()
{
  for (; i_ < tablePtr_->vec_.size(); i_++)
    if (tablePtr_->vec_[i_] != 0)
      return tablePtr_->vec_[i_++];
  return tablePtr_->null_;
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not PointerTable_DEF_INCLUDED */
