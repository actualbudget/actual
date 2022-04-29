// Copyright (c) 1994 James Clark, 2000 Matthias Clasen
// See the file COPYING for copying permission.

#ifndef XcharMap_INCLUDED
#define XcharMap_INCLUDED 1

#include "types.h"
#include "Resource.h"
#include "Ptr.h"
#include "constant.h"
#include "CharMap.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

template<class T>
class SharedXcharMap : public Resource {
public:
  SharedXcharMap();
  SharedXcharMap(T defaultValue);
  T *ptr() { return v + 1; }
private:
#ifdef SP_MULTI_BYTE
  T v[2 + 0xffff];
#else
  T v[2 + 0xff];
#endif
};

template<class T>
class XcharMap {
public:
  XcharMap();
  XcharMap(T defaultValue);
  T operator[](Xchar c) const;
  void setRange(Char min, Char max, T val);
  void setChar(Char c, T val);
  void setEe(T val);
  void clear();
private:
  T *ptr_;
  Ptr<SharedXcharMap<T> > sharedMap_;
#ifdef SP_MULTI_BYTE
  Ptr<CharMapResource<T> > hiMap_;
#endif
};


template<class T>
inline  
T XcharMap<T>::operator[](Xchar c) const 
{ 
#ifdef SP_MULTI_BYTE
  if (c > 0xffff) 
    return hiMap_->operator[]((Char)c);
#endif
  return ptr_[c]; 
}

template<class T>
inline 
void XcharMap<T>::setChar(Char c, T val) 
{ 
#ifdef SP_MULTI_BYTE
  if (c > 0xffff) {
    hiMap_->setChar(c, val);
    return;
  }
#endif
  ptr_[c] = val;  
}

template<class T>
inline 
void XcharMap<T>::setEe(T val)
{ 
  ptr_[-1] = val; 
}

template<class T>
inline 
void XcharMap<T>::clear() 
{ 
  ptr_ = 0; 
  sharedMap_.clear(); 
#ifdef SP_MULTI_BYTE
  hiMap_.clear(); 
#endif
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not XcharMap_INCLUDED */

#ifdef SP_DEFINE_TEMPLATES
#include "XcharMap.cxx"
#endif
