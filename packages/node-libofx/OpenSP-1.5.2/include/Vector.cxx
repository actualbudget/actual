// Copyright (c) 1994, 1996 James Clark
// See the file COPYING for copying permission.

#ifndef Vector_DEF_INCLUDED
#define Vector_DEF_INCLUDED 1

#include <stddef.h>
#include <string.h>

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

template<class T>
Vector<T>::~Vector()
{
  if (ptr_) {
    erase(ptr_, ptr_ + size_);
    ::operator delete((void *)ptr_);
  }
}

#ifndef NC

template<class T>
Vector<T>::Vector(const Vector<T> &v)
: ptr_(0), size_(0), alloc_(0)
{
  insert(ptr_ + size_, v.ptr_, v.ptr_ + v.size_);
}

template<class T>
Vector<T>::Vector(size_t n, const T &t)
: ptr_(0), size_(0), alloc_(0)
{
  insert(ptr_ + size_, n, t);
}

template<class T>
Vector<T> &Vector<T>::operator=(const Vector<T> &v)
{
  if (&v != this) {
    size_t n = v.size_;
    if (n > size_) {
      n = size_;
      insert(ptr_ + size_, v.ptr_ + size_, v.ptr_ + v.size_);
    }
    else if (n < size_)
      erase(ptr_ + n, ptr_ + size_);
    while (n-- > 0)
      ptr_[n] = v.ptr_[n];
  }
  return *this;
}

template<class T>
void Vector<T>::assign(size_t n, const T &t)
{
  size_t sz = n;
  if (n > size_) {
    sz = size_;
    insert(ptr_ + size_, n - size_, t);
  }
  else if (n < size_)
    erase(ptr_ + n, ptr_ + size_);
  while (sz-- > 0)
    ptr_[sz] = t;
}

template<class T>
void Vector<T>::insert(const T *p, size_t n, const T &t)
{
  size_t i = p - ptr_;
  reserve(size_ + n);
  if (i != size_)
    memmove(ptr_ + i + n, ptr_ + i, (size_ - i)*sizeof(T));
  for (T *pp = ptr_ + i; n-- > 0; pp++) {
    (void)new (pp) T(t);
    size_++;
  }
}

template<class T>
void Vector<T>::insert(const T *p, const T *q1, const T *q2)
{
  size_t i = p - ptr_;
  size_t n = q2 - q1;
  reserve(size_ + n);
  if (i != size_)
    memmove(ptr_ + i + n, ptr_ + i, (size_ - i)*sizeof(T));
  for (T *pp = ptr_ + i; q1 != q2; q1++, pp++) {
    (void)new (pp) T(*q1);
    size_++;
  }
}

#endif

template<class T>
void Vector<T>::swap(Vector<T> &v)
{
  {
    T *tem = ptr_;
    ptr_ = v.ptr_;
    v.ptr_ = tem;
  }
  {
    size_t tem = size_;
    size_ = v.size_;
    v.size_ = tem;
  }
  {
    size_t tem = alloc_;
    alloc_ = v.alloc_;
    v.alloc_ = tem;
  }
}

template<class T>
void Vector<T>::append(size_t n)
{
  reserve(size_ + n);
  while (n-- > 0)
    (void)new (ptr_ + size_++) T;
}

template<class T>
T *Vector<T>::erase(const T *p1, const T *p2)
{
  typedef T X;
  for (const T *p = p1; p != p2; p++)
    ((X *)p)->~X();
  if (p2 != ptr_ + size_)
    memmove((T *)p1, p2, ((const T *)(ptr_ + size_) - p2)*sizeof(T));
  size_ -= p2 - p1;
  return (T *)p1;
}

template<class T>
void Vector<T>::reserve1(size_t size)
{
  // Try to preserve a consistent start in the
  // event of an out of memory exception.
  size_t newAlloc = alloc_*2;
  if (size > newAlloc)
    newAlloc += size;
  void *p = ::operator new(newAlloc * sizeof(T));
  alloc_ = newAlloc;
  if (ptr_) {
    memcpy(p, ptr_, size_*sizeof(T));
    ::operator delete((void *)ptr_);
  }
  ptr_ = (T *)p;
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not Vector_DEF_INCLUDED */
