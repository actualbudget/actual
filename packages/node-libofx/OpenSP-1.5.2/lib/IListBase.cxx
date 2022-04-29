// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#include "splib.h"
#include "IListBase.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

void IListBase::append(Link *p)
{
  Link **pp;
  for (pp = &head_; *pp; pp = &(*pp)->next_)
    ;
  *pp = p;
}

void IListBase::remove(Link *p)
{
  for (Link **pp = &head_; *pp; pp = &(*pp)->next_)
    if (*pp == p) {
      *pp = p->next_;
      break;
    }
}

void IListBase::clear()
{
  while (!empty())
    delete get();
}

#ifdef SP_NAMESPACE
}
#endif
