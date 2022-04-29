// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef Ptr_DEF_INCLUDED
#define Ptr_DEF_INCLUDED 1

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

template<class T>
Ptr<T>::Ptr(T *ptr) : ptr_(ptr)
{
  if (ptr_)
    ptr_->ref();
}

template<class T>
Ptr<T>::~Ptr()
{
  if (ptr_) {
    if (ptr_->unref())
      delete ptr_;
    ptr_ = 0;
  }
}

template<class T>
Ptr<T>::Ptr(const Ptr<T> &p)
: ptr_(p.ptr_)
{
  if (p.ptr_)
    p.ptr_->ref();
}

template<class T>
Ptr<T> &Ptr<T>::operator=(const Ptr<T> &p)
{
  if (p.ptr_)
    p.ptr_->ref();
  if (ptr_ && ptr_->unref())
    delete ptr_;
  ptr_ = p.ptr_;
  return *this;
}

template<class T>
Ptr<T> &Ptr<T>::operator=(T *p)
{
  if (p)
    p->ref();
  if (ptr_ && ptr_->unref())
    delete ptr_;
  ptr_ = p;
  return *this;
}

template<class T>
void Ptr<T>::clear()
{
  if (ptr_) {
    if (ptr_->unref())
      delete ptr_;
    ptr_ = 0;
  }
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not Ptr_DEF_INCLUDED */
