// Copyright (c) 2000 Matthias Clasen
// See the file COPYING for copying permission.

#include "splib.h"
#include "SubstTable.h"
#include <stdlib.h>

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

SubstTable::SubstTable()
: isSorted_(1)
{
  for (size_t i = 0; i < 256; i++)
    lo_[i] = i;
}

void SubstTable::addSubst(Char from, Char to)
{
  if (from < 256)
    lo_[from] = to;
  else { 
    for (size_t i = 0; i < map_.size(); i++)
      if (map_[i].from == from) {
        map_[i].to = to;
        return;
      }
    if (from != to) {
      isSorted_ = isSorted_ && (map_.size() == 0 || map_.back().from < from);
      map_.push_back(Pair(from, to));
    }
  }  
}

Char SubstTable::at(Char t) const
{
  if (!isSorted_) {
    sort();
#ifndef HAVE_MUTABLE
    ((SubstTable *)this)->
#endif
    isSorted_ = 1;
  }
  size_t min = 0;
  size_t max = map_.size() - 1;
  if (map_.size() == 0 || t < map_[min].from || t > map_[max].from)
    return t;
  if (t == map_[min].from)
    return map_[min].to;
  if (t == map_[max].from)
    return map_[max].to;
  for(;;) {
    size_t mid = (min + max) / 2;
    if (mid == min || mid == max)
      return t;
    if (t == map_[mid].from)
      return map_[mid].to;
    if (t < map_[mid].from)
      max = mid;
    else
      min = mid;
  }
}

extern "C" {

static
int comparePairs(const void *p1, const void *p2)
{
  return ((SubstTable::Pair *)p1)->from - ((SubstTable::Pair *)p2)->from;
}

}

void SubstTable::sort() const
{
  qsort((void *)&map_[0], map_.size(), sizeof(map_[0]), comparePairs);  
}

StringC SubstTable::inverse(Char c) const
{
  StringC res;
  bool cSeen = (c < 256);
  for (size_t i = 0; i < 256; i++) 
    if (lo_[i] == c)
      res += i;
  for (size_t i = 0; i < map_.size(); i++) {
    cSeen = cSeen || (map_[i].from == c);
    if (map_[i].to == c)
      res += map_[i].from;
  }
  if (!cSeen)
    res += c;
  return res;
}

void SubstTable::inverseTable(SubstTable &inverse) const
{
  for (size_t i = 0; i < 256; i++)
    inverse.lo_[i] = i;
  inverse.map_.resize(0);
  inverse.isSorted_ = 1;
  for (size_t i = 0; i < 256; i++)
    inverse.addSubst(lo_[i], i);
  for (size_t i = 0; i < map_.size(); i++)
    inverse.addSubst(map_[i].to, map_[i].from);
}

#ifdef SP_NAMESPACE
}
#endif
