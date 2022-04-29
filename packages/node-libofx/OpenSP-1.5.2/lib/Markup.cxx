// Copyright (c) 1995 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif

#include "splib.h"
#include "Markup.h"
#include "InputSource.h"
#include "Location.h"
#include "macros.h"
#include "Entity.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

MarkupItem::MarkupItem()
: type(Markup::delimiter), index(0)
{
}

MarkupItem::~MarkupItem()
{
  switch (type) {
  case Markup::entityStart:
    delete origin;
    break;
  case Markup::literal:
    delete text;
    break;
  case Markup::sdLiteral:
    delete sdText;
    break;
  }
}

MarkupItem::MarkupItem(const MarkupItem &item)
: type(item.type), index(item.index)
{
  switch (item.type) {
  case Markup::entityStart:
    origin = new ConstPtr<Origin>(*item.origin);
    break;
  case Markup::literal:
    text = new Text(*item.text);
    break;
  case Markup::sdLiteral:
    sdText = new SdText(*item.sdText);
    break;
  case Markup::delimiter:
    break;
  default:
    nChars = item.nChars;
    break;
  }
}

void MarkupItem::operator=(const MarkupItem &item)
{
  switch (type) {
  case Markup::entityStart:
    if (item.type == Markup::entityStart) {
      *origin = *item.origin;
      return;
    }
    delete origin;
    break;
  case Markup::literal:
    if (item.type == Markup::literal) {
      *text = *item.text;
      return;
    }
    delete text;
    break;
  case Markup::sdLiteral:
    if (item.type == Markup::sdLiteral) {
      *sdText = *item.sdText;
      return;
    }
    delete sdText;
    break;
  }
  type = item.type;
  index = item.index;
  switch (item.type) {
  case Markup::entityStart:
    origin = new ConstPtr<Origin>(*item.origin);
    break;
  case Markup::literal:
    text = new Text(*item.text);
    break;
  case Markup::sdLiteral:
    sdText = new SdText(*item.sdText);
    break;
  case Markup::delimiter:
    break;
  default:
    nChars = item.nChars;
    break;
  }
}

Markup::Markup() {}

Markup::~Markup() {}

void Markup::resize(size_t n)
{
  size_t chopChars = 0;
  for (size_t i = n; i < items_.size(); i++)
    switch (items_[i].type) {
    case Markup::reservedName:
    case Markup::sdReservedName:
    case Markup::name:
    case Markup::nameToken:
    case Markup::number:
    case Markup::attributeValue:
    case Markup::s:
    case Markup::comment:
    case Markup::shortref:
      chopChars += items_[i].nChars;
      break;
    }
  items_.resize(n);
  chars_.resize(chars_.size() - chopChars);
}

void Markup::addDelim(Syntax::DelimGeneral d)
{
  items_.resize(items_.size() + 1);
  MarkupItem &item = items_.back();
  item.type = Markup::delimiter;
  item.index = d;
}

void Markup::addReservedName(Syntax::ReservedName rn, const InputSource *in)
{
  items_.resize(items_.size() + 1);
  MarkupItem &item = items_.back();
  size_t length = in->currentTokenLength();
  item.nChars = length;
  item.type = Markup::reservedName;
  item.index = rn;
  chars_.append(in->currentTokenStart(), length);
}

void Markup::addReservedName(Syntax::ReservedName rn, const StringC &str)
{
  items_.resize(items_.size() + 1);
  MarkupItem &item = items_.back();
  item.nChars = str.size();
  item.type = Markup::reservedName;
  item.index = rn;
  chars_.append(str.data(), str.size());
}

void Markup::addSdReservedName(Sd::ReservedName rn, const InputSource *in)
{
  items_.resize(items_.size() + 1);
  MarkupItem &item = items_.back();
  size_t length = in->currentTokenLength();
  item.nChars = length;
  item.type = Markup::sdReservedName;
  item.index = rn;
  chars_.append(in->currentTokenStart(), length);
}

void Markup::addSdReservedName(Sd::ReservedName rn,
			       const Char *str, size_t length)
{
  items_.resize(items_.size() + 1);
  MarkupItem &item = items_.back();
  item.nChars = length;
  item.type = Markup::sdReservedName;
  item.index = rn;
  chars_.append(str, length);
}

void Markup::addS(Char c)
{
  if (items_.size() > 0) {
    MarkupItem &item = items_.back();
    if (item.type == Markup::s) {
      item.nChars += 1;
      chars_ += c;
      return;
    }
  }
  items_.resize(items_.size() + 1);
  MarkupItem &item = items_.back();
  item.type = Markup::s;
  item.nChars = 1;
  chars_ += c;
}

void Markup::addS(const InputSource *in)
{
  items_.resize(items_.size() + 1);
  MarkupItem &item = items_.back();
  size_t length = in->currentTokenLength();
  item.nChars = length;
  item.type = Markup::s;
  chars_.append(in->currentTokenStart(), length);
}

void Markup::addCommentStart()
{
  items_.resize(items_.size() + 1);
  MarkupItem &item = items_.back();
  item.type = Markup::comment;
  item.nChars = 0;
}

void Markup::addRefEndRe()
{
  items_.resize(items_.size() + 1);
  MarkupItem &item = items_.back();
  item.type = Markup::refEndRe;
}

void Markup::addCommentChar(Char c)
{
  items_.back().nChars += 1;
  chars_ += c;
}

void Markup::addName(const InputSource *in)
{
  items_.resize(items_.size() + 1);
  MarkupItem &item = items_.back();
  size_t length = in->currentTokenLength();
  item.nChars = length;
  item.type = Markup::name;
  chars_.append(in->currentTokenStart(), length);
}

void Markup::addName(const Char *str, size_t length)
{
  items_.resize(items_.size() + 1);
  MarkupItem &item = items_.back();
  item.nChars = length;
  item.type = Markup::name;
  chars_.append(str, length);
}

void Markup::addNumber(const InputSource *in)
{
  items_.resize(items_.size() + 1);
  MarkupItem &item = items_.back();
  size_t length = in->currentTokenLength();
  item.nChars = length;
  item.type = Markup::number;
  chars_.append(in->currentTokenStart(), length);
}

void Markup::addNameToken(const InputSource *in)
{
  items_.resize(items_.size() + 1);
  MarkupItem &item = items_.back();
  size_t length = in->currentTokenLength();
  item.nChars = length;
  item.type = Markup::nameToken;
  chars_.append(in->currentTokenStart(), length);
}

void Markup::addAttributeValue(const InputSource *in)
{
  items_.resize(items_.size() + 1);
  MarkupItem &item = items_.back();
  size_t length = in->currentTokenLength();
  item.nChars = length;
  item.type = Markup::attributeValue;
  chars_.append(in->currentTokenStart(), length);
}

void Markup::addShortref(const InputSource *in)
{
  items_.resize(items_.size() + 1);
  MarkupItem &item = items_.back();
  size_t length = in->currentTokenLength();
  item.nChars = length;
  item.type = Markup::shortref;
  chars_.append(in->currentTokenStart(), length);
}

void Markup::addEntityStart(const Ptr<EntityOrigin> &origin)
{
  items_.resize(items_.size() + 1);
  MarkupItem &item = items_.back();
  item.type = Markup::entityStart;
  item.origin = new ConstPtr<Origin>(origin.pointer());
}

void Markup::addEntityEnd()
{
  items_.resize(items_.size() + 1);
  items_.back().type = Markup::entityEnd;
}

void Markup::addLiteral(const Text &text)
{
  items_.resize(items_.size() + 1);
  MarkupItem &item = items_.back();
  item.type = Markup::literal;
  item.text = new Text(text);
}

void Markup::addSdLiteral(const SdText &sdText)
{
  items_.resize(items_.size() + 1);
  MarkupItem &item = items_.back();
  item.type = Markup::sdLiteral;
  item.sdText = new SdText(sdText);
}

void Markup::changeToAttributeValue(size_t i)
{
  ASSERT(items_[i].type == Markup::name);
  items_[i].type = Markup::attributeValue;
}

void Markup::changeToSdReservedName(size_t i, Sd::ReservedName rn)
{
  ASSERT(items_[i].type == Markup::name);
  items_[i].type = Markup::sdReservedName;
  items_[i].index = rn;
}

void Markup::swap(Markup &to)
{
  chars_.swap(to.chars_);
  items_.swap(to.items_);
}

MarkupIter::MarkupIter(const Markup &m)
: chars_(m.chars_.data()),
  items_(m.items_.begin()),
  nItems_(m.items_.size()),
  index_(0),
  charIndex_(0)
{
}

void MarkupIter::advance(Location &loc,
			 const ConstPtr<Syntax> &syntax)
{
  switch (items_[index_].type) {
  case Markup::delimiter:
    loc += syntax->delimGeneral(delimGeneral()).size();
    break;
  case Markup::refEndRe:
    loc += 1;
    break;
  case Markup::reservedName:
  case Markup::sdReservedName:
  case Markup::name:
  case Markup::nameToken:
  case Markup::number:
  case Markup::attributeValue:
  case Markup::s:
  case Markup::shortref:
    loc += items_[index_].nChars;
    charIndex_ += items_[index_].nChars;
    break;
  case Markup::comment:
    loc += items_[index_].nChars + (2 * syntax->delimGeneral(Syntax::dCOM).size());
    charIndex_ += items_[index_].nChars;
    break;
  case Markup::entityStart:
    loc = Location(*items_[index_].origin, 0);
    break;
  case Markup::entityEnd:
    {
      ConstPtr<Origin> origin(loc.origin());
      loc = origin->parent();
      loc += origin->refLength();
    }
    break;
  case Markup::literal:
    {
      const Text &text = *items_[index_].text;
      text.endDelimLocation(loc);
      Boolean lita;
      text.delimType(lita);
      loc
	+= syntax->delimGeneral(lita ? Syntax::dLITA : Syntax::dLIT).size();
    }
    break;
  case Markup::sdLiteral:
    {
      const SdText &text = *items_[index_].sdText;
      loc = text.endDelimLocation();
      loc += 1;
    }
    break;
  }
  index_++;
}

void MarkupIter::advance()
{
  switch (items_[index_].type) {
  case Markup::reservedName:
  case Markup::sdReservedName:
  case Markup::name:
  case Markup::nameToken:
  case Markup::number:
  case Markup::attributeValue:
  case Markup::s:
  case Markup::comment:
  case Markup::shortref:
    charIndex_ += items_[index_].nChars;
    break;
  }
  index_++;
}

#ifdef SP_NAMESPACE
}
#endif
