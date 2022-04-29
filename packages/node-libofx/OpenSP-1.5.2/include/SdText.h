// Copyright (c) 1995 James Clark
// See the file COPYING for copying permission.

#ifndef SdText_INCLUDED
#define SdText_INCLUDED 1

#ifdef __GNUG__
#pragma interface
#endif

#include "types.h"
#include "StringOf.h"
#include "Vector.h"
#include "Location.h"
#include <stddef.h>

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

struct SP_API SdTextItem {
  SdTextItem();
  SdTextItem(const SdTextItem &);
  void operator=(const SdTextItem &);
  ~SdTextItem();
  Location loc;
  size_t index;
};

class SP_API SdText {
public:
  SdText();
  SdText(const Location &loc, Boolean lita);
  void swap(SdText &);
  void addChar(SyntaxChar, const Location &);
  const String<SyntaxChar> &string() const;
  Boolean lita() const;
  Location endDelimLocation() const;
private:
  Boolean lita_;
  String<SyntaxChar> chars_;
  Vector<SdTextItem> items_;
  friend class SdTextIter;
};

class SP_API SdTextIter {
public:
  SdTextIter(const SdText &);
  Boolean next(const SyntaxChar *&, size_t &, Location &);
private:
  const SdText *ptr_;
  size_t itemIndex_;
};

inline
Boolean SdText::lita() const
{
  return lita_;
}

inline
const String<SyntaxChar> &SdText::string() const
{
  return chars_;
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not SdText_INCLUDED */
