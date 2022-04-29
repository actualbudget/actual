// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef IListBase_INCLUDED
#define IListBase_INCLUDED 1

#include "Link.h"
#include "Boolean.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API IListBase {
public:
  IListBase();
  IListBase(Link *);
  void  append(Link *);
  void insert(Link *);
  Link *head() const;
  Boolean empty() const;
  Link *get();
  void remove(Link *);
  void swap(IListBase &);
  void clear();
private:
  Link *head_;
friend class IListIterBase;
};

inline
IListBase::IListBase() : head_(0)
{
}

inline
IListBase::IListBase(Link *head) : head_(head)
{
}

inline
void IListBase::insert(Link *p)
{
  p->next_ = head_;
  head_ = p;
}

inline
Link *IListBase::head() const
{
  return head_;
}

inline
Boolean IListBase::empty() const
{
  return head_ == 0;
}

inline
Link *IListBase::get()
{
  Link *tem = head_;
  head_ = head_->next_;
  return tem;
}

inline
void IListBase::swap(IListBase &list)
{
  Link *tem = head_;
  head_ = list.head_;
  list.head_ = tem;
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not IListBase_INCLUDED */
