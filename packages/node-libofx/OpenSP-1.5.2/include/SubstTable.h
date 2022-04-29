// Copyright (c) 1994 James Clark, 2000 Matthias Clasen
// See the file COPYING for copying permission.

#ifndef SubstTable_INCLUDED
#define SubstTable_INCLUDED

#include "types.h"
#include "StringC.h"
#include "Vector.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API SubstTable {
public:
  SubstTable();
  void addSubst(Char from, Char to);
  void subst(Char &) const;
  void subst(StringC &) const;
  Char operator[](Char from) const;
  void sort() const;
  Char at(Char from) const;
  StringC inverse(Char to) const;
  void inverseTable(SubstTable &) const;
  struct Pair {
    Pair() {}
    Pair(Char f, Char t) : from(f), to(t) {}
    Char from;
    Char to;
  };
private:
  Char lo_[256];
  mutable Vector<Pair> map_; 
  mutable bool isSorted_;
};

inline
void SubstTable::subst(StringC &str) const
{
  for (size_t i = 0; i < str.size(); i++)
    subst(str[i]);
}

inline
Char SubstTable::operator[](Char t) const
{
  if (t < 256)
    return lo_[t];
  else 
    return at(t);
}

inline 
void SubstTable::subst(Char &c) const
{
  c = operator[](c);
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* SubstTable_INCLUDED */
