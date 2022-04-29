// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef Named_INCLUDED
#define Named_INCLUDED 1

#include "StringC.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API Named {
public:
  Named(const StringC &name) : name_(name) { }
  virtual ~Named() { }
  const StringC &name() const { return name_; }
  const StringC *namePointer() const { return &name_; }
  void setName(const StringC &name) { name_ = name; }
  void swap(Named &to) { name_.swap(to.name_); }
private:
  StringC name_;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not Named_INCLUDED */
