// Copyright (c) 1995 James Clark
// See the file COPYING for copying permission.

#ifndef Markup_INCLUDED
#define Markup_INCLUDED 1

#ifdef __GNUG__
#pragma interface
#endif

#include "StringC.h"
#include "Syntax.h"
#include "Sd.h"
#include "Vector.h"
#include "Text.h"
#include "SdText.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class EntityOrigin;

struct SP_API MarkupItem {
  MarkupItem();
  MarkupItem(const MarkupItem &);
  ~MarkupItem();
  void operator=(const MarkupItem &);
  unsigned char type;
  unsigned char index;
  union {
    size_t nChars;
    ConstPtr<Origin> *origin; // type == entityStart
    Text *text;				  // type == literal
    SdText *sdText;			  // type == sdLiteral
  };
};

class InputSource;

class SP_API Markup {
public:
  enum Type {
    reservedName,
    sdReservedName,
    name,
    nameToken,
    attributeValue,
    number,
    comment,
    s,
    shortref,
    delimiter,
    refEndRe,
    entityStart,
    entityEnd,
    literal,
    sdLiteral
  };
  Markup();
  ~Markup();
  size_t size() const;
  void clear();
  void resize(size_t);
  void addDelim(Syntax::DelimGeneral);
  void addReservedName(Syntax::ReservedName, const InputSource *);
  void addReservedName(Syntax::ReservedName, const StringC &);
  void addSdReservedName(Sd::ReservedName, const InputSource *);
  void addSdReservedName(Sd::ReservedName, const Char *, size_t);
  void addS(Char);
  void addS(const InputSource *);
  void addRefEndRe();
  void addShortref(const InputSource *);
  void addCommentStart();
  void addCommentChar(Char);
  void addName(const InputSource *);
  void addName(const Char *, size_t);
  void addNameToken(const InputSource *);
  void addNumber(const InputSource *);
  void addAttributeValue(const InputSource *);
  void addEntityStart(const Ptr<EntityOrigin> &);
  void addEntityEnd();
  void addLiteral(const Text &);
  void addSdLiteral(const SdText &);
  void changeToAttributeValue(size_t index);
  void changeToSdReservedName(size_t index, Sd::ReservedName);
  void swap(Markup &);
private:
  StringC chars_;
  Vector<MarkupItem> items_;
  friend class MarkupIter;
};

class Location;

class SP_API MarkupIter {
public:
  MarkupIter(const Markup &);
  Markup::Type type() const;
  Boolean valid() const;
  void advance();
  // This updates a Location.
  void advance(Location &, const ConstPtr<Syntax> &);
  size_t index() const;
  const Char *charsPointer() const;
  size_t charsLength() const;
  const Text &text() const;
  const EntityOrigin *entityOrigin() const; // valid for type == entityStart
  const SdText &sdText() const;
  Syntax::DelimGeneral delimGeneral() const;
  Syntax::ReservedName reservedName() const;
  Sd::ReservedName sdReservedName() const;
private:
  const Char *chars_;
  Vector<MarkupItem>::const_iterator items_;
  size_t nItems_;
  size_t index_;
  size_t charIndex_;
};

inline
void Markup::clear()
{
  chars_.resize(0);
  items_.resize(0);
}

inline
size_t Markup::size() const
{
  return items_.size();
}

inline
Boolean MarkupIter::valid() const
{
  return index_ < nItems_;
}

inline
size_t MarkupIter::index() const
{
  return index_;
}

inline
Markup::Type MarkupIter::type() const
{
  return Markup::Type(items_[index_].type);
}

inline
const EntityOrigin *MarkupIter::entityOrigin() const
{
  return (*items_[index_].origin)->asEntityOrigin();
}

inline
const Char *MarkupIter::charsPointer() const
{
  return chars_ + charIndex_;
}

inline
size_t MarkupIter::charsLength() const
{
  return items_[index_].nChars;
}

inline
const Text &MarkupIter::text() const
{
  return *items_[index_].text;
}

inline
const SdText &MarkupIter::sdText() const
{
  return *items_[index_].sdText;
}

inline
Syntax::DelimGeneral MarkupIter::delimGeneral() const
{
  return Syntax::DelimGeneral(items_[index_].index);
}

inline
Syntax::ReservedName MarkupIter::reservedName() const
{
  return Syntax::ReservedName(items_[index_].index);
}

inline
Sd::ReservedName MarkupIter::sdReservedName() const
{
  return Sd::ReservedName(items_[index_].index);
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not Markup_INCLUDED */
