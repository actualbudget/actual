// Copyright (c) 1994, 1996 James Clark
// See the file COPYING for copying permission.

#ifndef StringOf_INCLUDED
#define StringOf_INCLUDED 1

// The file is called StringOf to distinguish it from string.h on
// case-insensitive file systems.

// This offers a subset of the interface offered by the standard C++
// basic_string class as defined in the Jan 96 WP.
// Code in SP currently assumes that size_type is size_t.

#include <stddef.h>
#include <string.h>
#include "Boolean.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

template<class T>
class String {
public:
  typedef size_t size_type;
  typedef T *iterator;
  typedef const T *const_iterator;
  String();
  ~String() { if (ptr_) delete [] ptr_; }
  String(const T *, size_t);
  String(const String<T> &);
  String<T> &operator=(const String<T> &);
  size_t size() const { return length_; }
  String<T> &assign(const T *, size_t);
  String<T> &insert(size_t i, const String<T> &s);
  void swap(String<T> &str);
  T operator[](size_t i) const { return ptr_[i]; }
  T &operator[](size_t i) { return ptr_[i]; }
  iterator begin() { return ptr_; }
  const_iterator begin() const { return ptr_; }
  const T *data() const { return ptr_; }
  String<T> &operator+=(T c) {
    if (length_ >= alloc_)
      grow(1);
    ptr_[length_++] = c;
    return *this;
  }
  String<T> &operator+=(const String<T> &s) {
    append(s.ptr_, s.length_);
    return *this;
  }
  String<T> &append(const T *, size_t);
  Boolean operator==(const String<T> &s) const {
    return (length_ == s.length_
	    && (length_ == 0
		|| (*ptr_ == *s.ptr_
		    && (memcmp(ptr_ + 1, s.ptr_ + 1, (length_ - 1)*sizeof(T))
			== 0))));
  }
  Boolean operator!=(const String<T> &str) const {
    return !(*this == str);
  }
  void resize(size_t n);
private:
  void grow(size_t);
  T *ptr_;
  size_t length_;
  size_t alloc_;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not StringOf_INCLUDED */

#ifdef SP_DEFINE_TEMPLATES
#include "StringOf.cxx"
#endif
