// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef IQueue_INCLUDED
#define IQueue_INCLUDED 1

#include "Boolean.h"
#include "Link.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class IQueueBase {
public:
  IQueueBase() : last_(0) { }
  ~IQueueBase() { }
  Boolean empty() const { return last_ == 0; }
  Link *get() {
    Link *tem = last_->next_;
    if (tem == last_)
      last_ = 0;
    else
      last_->next_ = tem->next_;
    return tem;
  }
  void append(Link *p) {
    if (last_) {
      p->next_ = last_->next_;
      last_ = last_->next_ = p;
    }
    else
      last_ = p->next_ = p;
  }
  void swap(IQueueBase &with) {
    Link *tem = last_;
    last_ = with.last_;
    with.last_ = tem;
  }
private:
  Link *last_;

};

template<class T>
class IQueue : private IQueueBase {
public:
  IQueue() { }
  ~IQueue() { clear(); }
  void clear();
  T *get() { return (T *)IQueueBase::get(); }
  void append(T *p) { IQueueBase::append(p); }
  Boolean empty() const { return IQueueBase::empty(); }
  void swap(IQueue<T> &to) { IQueueBase::swap(to); }
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not IQueue_INCLUDED */

#ifdef SP_DEFINE_TEMPLATES
#include "IQueue.cxx"
#endif
