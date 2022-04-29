// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef ISet_DEF_INCLUDED
#define ISet_DEF_INCLUDED 1

#include <stdlib.h>

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

template<class T>
ISet<T>::ISet()
{
}

template<class T>
ISet<T>::~ISet()
{
}

template<class T>
ISet<T>::ISet(const T *v, size_t n)
{
  for (size_t i = 0; i < n; i++)
    add(v[i]);
}

template<class T>
Boolean ISet<T>::contains(T x) const
{
  for (size_t i = 0; i < r_.size(); i++)
    if (r_[i].max >= x)
      return r_[i].min <= x ? 1 : 0;
  return 0;
}

template<class T>
void ISet<T>::addRange(T min, T max)
{
  size_t i;
  if (min == 0)
    i = 0;
  else {
    for (i = r_.size(); i > 0 && min - 1 <= r_[i - 1].max; i--)
      ;
  }
  // r_[i - 1].max < min - 1 <= r_[i].max
  if (i < r_.size() && (r_[i].min == 0 || max >= r_[i].min - 1)) {
    // we can coelesce
    if (min < r_[i].min)
      r_[i].min = min;
    if (max > r_[i].max) {
      r_[i].max = max;
      size_t j;
      for (j = i + 1; j < r_.size() && r_[i].max >= r_[j].min - 1; j++)
	r_[i].max = r_[j].max;
      // get rid of i + 1 ... j - 1 
      if (j > i + 1) {
	for (size_t k = j; k < r_.size(); k++)
	  r_[k - (j - i - 1)] = r_[k];
	r_.resize(r_.size() - (j - i - 1));
      }
    }
  }
  else {
    // r_[i - 1].max < min - 1
    // max + 1 < r_[i].min
    r_.resize(r_.size() + 1);
    for (size_t j = r_.size() - 1; j > i; j--)
      r_[j] = r_[j - 1];
    r_[i].max = max;
    r_[i].min = min;
  }
}

template<class T>
void ISet<T>::remove(T c)
{
  for (size_t i = 0; i < r_.size(); i++)
    if (r_[i].max >= c) {
      if (r_[i].min <= c) {
	if (r_[i].min == r_[i].max) {
	  while (++i < r_.size())
	    r_[i - 1] = r_[i];
	  r_.resize(r_.size() - 1);
	}
	else if (c == r_[i].min)
	  r_[i].min += 1;
	else if (c == r_[i].max)
	  r_[i].max -= 1;
	else {
	  r_.resize(r_.size() + 1);
	  // split the range
	  // subtracting 2 is safe since we know that the length is >= 2
	  for (size_t j = r_.size() - 2; j > i; j--)
	    r_[j + 1] = r_[j];
	  r_[i + 1].max = r_[i].max;
	  r_[i + 1].min = c + 1;
	  r_[i].max = c - 1;
	}
      }
      break;
    }
}

template<class T>
void ISet<T>::check()
{
  for (size_t i = 0; i < r_.size(); i++) {
    if (r_[i].min > r_[i].max)
      abort();
    // adjacent ranges must be coalesced
    if (i > 0 && r_[i].min - 1 <= r_[i - 1].max)
      abort();
  }
}

template<class T>
void ISet<T>::clear()
{
  r_.resize(0);
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not ISet_DEF_INCLUDED */
