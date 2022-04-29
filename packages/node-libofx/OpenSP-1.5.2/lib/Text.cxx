// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif
#include "splib.h"
#include "Text.h"
// for memcmp()
#include <string.h>

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

Text::Text()
{
}

Text::~Text()
{
}

void Text::addChar(Char c, const Location &loc)
{
  if (items_.size() == 0
      || items_.back().type != TextItem::data
      || loc.origin().pointer() != items_.back().loc.origin().pointer()
      || loc.index() != (items_.back().loc.index()
			 + (chars_.size() - items_.back().index))) {
    items_.resize(items_.size() + 1);
    items_.back().loc = loc;
    items_.back().type = TextItem::data;
    items_.back().index = chars_.size();
  }
  chars_ += c;
}

void Text::addChars(const Char *p, size_t length, const Location &loc)
{
  if (items_.size() == 0
      || items_.back().type != TextItem::data
      || loc.origin().pointer() != items_.back().loc.origin().pointer()
      || loc.index() != (items_.back().loc.index()
			 + (chars_.size() - items_.back().index))) {
    items_.resize(items_.size() + 1);
    items_.back().loc = loc;
    items_.back().type = TextItem::data;
    items_.back().index = chars_.size();
  }
  chars_.append(p, length);
}

void Text::addCdata(const StringC &str,
		    const ConstPtr<Origin> &origin)
{
  addSimple(TextItem::cdata, Location(origin, 0));
  chars_.append(str.data(), str.size());
}

void Text::addSdata(const StringC &str,
		    const ConstPtr<Origin> &origin)
{
  addSimple(TextItem::sdata, Location(origin, 0));
  chars_.append(str.data(), str.size());
}

void Text::addNonSgmlChar(Char c, const Location &loc)
{
  addSimple(TextItem::nonSgml, loc);
  chars_ += c;
}

void Text::addCharsTokenize(const Char *str, size_t n, const Location &loc,
			    Char space)
{
  Location loci(loc);
  // FIXME speed this up
  for (size_t i = 0; i < n; loci += 1, i++) {
    if (str[i] == space && (size() == 0 || lastChar() == space))
      ignoreChar(str[i], loci);
    else
      addChar(str[i], loci);
  }
}

void Text::tokenize(Char space, Text &text) const
{
  TextIter iter(*this);
  TextItem::Type type;
  const Char *p;
  size_t n;
  const Location *loc;
  while (iter.next(type, p, n, loc)) {
    switch (type) {
    case TextItem::data:
      text.addCharsTokenize(p, n, *loc, space);
      break;
    case TextItem::sdata:
    case TextItem::cdata:
      {
	text.addEntityStart(*loc);
	text.addCharsTokenize(p, n, *loc, space);
	Location tem(*loc);
	tem += n;
	text.addEntityEnd(tem);
      }
      break;
    case TextItem::ignore:
      text.ignoreChar(*p, *loc);
      break;
    default:
      text.addSimple(type, *loc);
      break;
    }
  }
  if (text.size() > 0 && text.lastChar() == space)
    text.ignoreLastChar();
}

void Text::addSimple(TextItem::Type type, const Location &loc)
{
  items_.resize(items_.size() + 1);
  items_.back().loc = loc;
  items_.back().type = type;
  items_.back().index = chars_.size();
}

void Text::ignoreChar(Char c, const Location &loc)
{
  items_.resize(items_.size() + 1);
  items_.back().loc = loc;
  items_.back().type = TextItem::ignore;
  items_.back().c = c;
  items_.back().index = chars_.size();
}

void Text::ignoreLastChar()
{
  size_t lastIndex = chars_.size() - 1;
  size_t i;
  for (i = items_.size() - 1; items_[i].index > lastIndex; i--)
    ;
  // lastIndex >= items_[i].index
  if (items_[i].index != lastIndex) {
    items_.resize(items_.size() + 1);
    i++;
    for (size_t j = items_.size() - 1; j > i; j--)
      items_[j] = items_[j - 1];
    items_[i].index = lastIndex;
    items_[i].loc = items_[i - 1].loc;
    items_[i].loc += lastIndex - items_[i - 1].index;
  }
  
  items_[i].c = chars_[chars_.size() - 1];
  items_[i].type = TextItem::ignore;
  for (size_t j = i + 1; j < items_.size(); j++)
    items_[j].index = lastIndex;
  chars_.resize(chars_.size() - 1);
}

// All characters other than spaces are substed.

void Text::subst(const SubstTable &table, Char space)
{
  for (size_t i = 0; i < items_.size(); i++)
    if (items_[i].type == TextItem::data) {
      size_t lim = (i + 1 < items_.size()
		    ? items_[i + 1].index
		    : chars_.size());
      size_t j;
      for (j = items_[i].index; j < lim; j++) {
	Char c = chars_[j];
	if (c != space && c != table[c])
	  break;
      }
      if (j < lim) {
	size_t start = items_[i].index;
	StringC origChars(chars_.data() + start, lim - start);
	for (; j < lim; j++)
	  if (chars_[j] != space)
	    table.subst(chars_[j]);
	items_[i].loc = Location(new MultiReplacementOrigin(items_[i].loc,
							    origChars),
				 0);
      }
    }
}

void Text::clear()
{
  chars_.resize(0);
  items_.clear();
}

Boolean Text::startDelimLocation(Location &loc) const
{
  if (items_.size() == 0 || items_[0].type != TextItem::startDelim)
    return 0;
  loc = items_[0].loc;
  return 1;
}

Boolean Text::endDelimLocation(Location &loc) const
{
  if (items_.size() == 0)
    return 0;
  switch (items_.back().type) {
  case TextItem::endDelim:
  case TextItem::endDelimA:
    break;
  default:
    return 0;
  }
  loc = items_.back().loc;
  return 1;
}

Boolean Text::delimType(Boolean &lita) const
{
  if (items_.size() == 0)
    return 0;
  switch (items_.back().type) {
  case TextItem::endDelim:
    lita = 0;
    return 1;
  case TextItem::endDelimA:
    lita = 1;
    return 1;
  default:
    break;
  }
  return 0;
}

TextItem::TextItem()
{
}

TextItem::~TextItem()
{
}

TextItem::TextItem(const TextItem& from)
: type(from.type),
  c(from.c),
  loc(from.loc),
  index(from.index)
{
}

TextItem& TextItem::operator=(const TextItem& from)
{
  if (this != &from) {
    type = from.type;
    c = from.c;
    loc = from.loc;
    index = from.index;
  }
  return *this;
}

void Text::swap(Text &to)
{
  items_.swap(to.items_);
  chars_.swap(to.chars_);
}

TextIter::TextIter(const Text &text)
: ptr_(text.items_.begin()), text_(&text)
{
}

const Char *TextIter::chars(size_t &length) const
{
  if (ptr_->type == TextItem::ignore) {
    length = 1;
    return &ptr_->c;
  }
  else {
    const StringC &chars = text_->chars_;
    size_t charsIndex = ptr_->index;
    if (ptr_ + 1 != text_->items_.begin() + text_->items_.size())
      length = ptr_[1].index - charsIndex;
    else
      length = chars.size() - charsIndex;
    return chars.data() + charsIndex;
  }
}

Boolean TextIter::next(TextItem::Type &type, const Char *&str, size_t &length,
		       const Location *&loc)
{
  const TextItem *end = text_->items_.begin() + text_->items_.size();
  if (ptr_ == end)
    return 0;
  type = ptr_->type;
  loc = &ptr_->loc;
  if (type == TextItem::ignore) {
    str = &ptr_->c;
    length = 1;
  }
  else {
    const StringC &chars = text_->chars_;
    size_t charsIndex = ptr_->index;
    str = chars.data() + charsIndex;
    if (ptr_ + 1 != end)
      length = ptr_[1].index - charsIndex;
    else
      length = chars.size() - charsIndex;
  }
  ptr_++;
  return 1;
}

void Text::insertChars(const StringC &s, const Location &loc)
{
  chars_.insert(0, s);
  items_.resize(items_.size() + 1);
  for (size_t i = items_.size() - 1; i > 0; i--) {
    items_[i] = items_[i - 1];
    items_[i].index += s.size();
  }
  items_[0].loc = loc;
  items_[0].type = TextItem::data;
  items_[0].index = 0;
}

size_t Text::normalizedLength(size_t normsep) const
{
  size_t n = size();
  n += normsep;
  for (size_t i = 0; i < items_.size(); i++)
    switch (items_[i].type) {
    case TextItem::sdata:
    case TextItem::cdata:
      n += normsep;
      break;
    default:
      break;
    }
  return n;
}

// This is used to determine for a FIXED CDATA attribute
// whether a specified value if equal to the default value.

Boolean Text::fixedEqual(const Text &text) const
{
  if (string() != text.string())
    return 0;
  size_t j = 0;
  for (size_t i = 0; i < items_.size(); i++)
    switch (items_[i].type) {
    case TextItem::cdata:
    case TextItem::sdata:
      for (;;) {
	if (j >= text.items_.size())
	  return 0;
	if (text.items_[j].type == TextItem::nonSgml)
	  return 0;
	if (text.items_[j].type == TextItem::cdata
	    || text.items_[j].type == TextItem::sdata)
	  break;
	j++;
      }
      if (text.items_[j].index != items_[i].index
	  || (text.items_[j].loc.origin()->entityDecl()
	      != items_[i].loc.origin()->entityDecl()))
	return 0;
      break;
    case TextItem::nonSgml:
      for (;;) {
	if (j >= text.items_.size())
	  return 0;
	if (text.items_[j].type == TextItem::cdata
	    || text.items_[j].type == TextItem::sdata)
	  return 0;
	if (text.items_[j].type == TextItem::nonSgml)
	  break;
	j++;
      }
      if (text.items_[j].index != items_[i].index)
        return 0;
      break;
    default:
      break;
    }
  for (; j < text.items_.size(); j++)
    switch (text.items_[j].type) {
    case TextItem::cdata:
    case TextItem::sdata:
    case TextItem::nonSgml:
      return 0;
    default:
      break;
    }
  return 1;
}

Boolean Text::charLocation(size_t ind, const ConstPtr<Origin> *&origin, Index &index) const
{
  // Find the last item whose index <= ind.
  // Invariant:
  // indexes < i implies index <= ind
  // indexes >= lim implies index > ind
  // The first item will always have index 0.
  size_t i = 1;
  size_t lim = items_.size();
  while (i < lim) {
    size_t mid = i + (lim - i)/2;
    if (items_[mid].index > ind)
      lim = mid;
    else
      i = mid + 1;
  }
#if 0
  for (size_t i = 1; i < items_.size(); i++)
    if (items_[i].index > ind)
      break;
#endif
  i--;
  // If items_.size() == 0, then i == lim.
  if (i < lim) {
    origin = &items_[i].loc.origin();
    index = items_[i].loc.index() + (ind - items_[i].index);
  }
  return 1;
}

#ifdef SP_NAMESPACE
}
#endif
