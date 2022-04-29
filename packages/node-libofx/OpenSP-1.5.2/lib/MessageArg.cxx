// Copyright (c) 1994 James Clark, 1999 Matthias Clasen
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif
#include "splib.h"
#include "MessageArg.h"
#include "MessageBuilder.h"
#include "ParserMessages.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

MessageArg::MessageArg()
{
}

MessageArg::~MessageArg()
{
}

StringMessageArg::StringMessageArg(const StringC &s)
: s_(s)
{
}

MessageArg *StringMessageArg::copy() const
{
  return new StringMessageArg(*this);
}

void StringMessageArg::append(MessageBuilder &builder) const
{
  builder.appendChars(s_.data(), s_.size());
}

NumberMessageArg::NumberMessageArg(unsigned long n)
: n_(n)
{
}

MessageArg *NumberMessageArg::copy() const
{
  return new NumberMessageArg(*this);
}

void NumberMessageArg::append(MessageBuilder &builder) const
{
  builder.appendNumber(n_);
}


OrdinalMessageArg::OrdinalMessageArg(unsigned long n)
: n_(n)
{
}

MessageArg *OrdinalMessageArg::copy() const
{
  return new OrdinalMessageArg(*this);
}

void OrdinalMessageArg::append(MessageBuilder &builder) const
{
  builder.appendOrdinal(n_);
}

RTTI_DEF0(OtherMessageArg)

OtherMessageArg::OtherMessageArg()
{
}

void OtherMessageArg::append(MessageBuilder &builder) const
{
  builder.appendOther(this);
}

StringVectorMessageArg::StringVectorMessageArg(const Vector<StringC> &v)
: v_(v)
{
}

MessageArg *StringVectorMessageArg::copy() const
{
  return new StringVectorMessageArg(*this);
}

void StringVectorMessageArg::append(MessageBuilder &builder) const
{
  for (size_t i = 0; i < v_.size(); i++) {
    if (i > 0)
      builder.appendFragment(ParserMessages::listSep);
    builder.appendChars(v_[i].data(), v_[i].size());
  }
}

#ifdef SP_NAMESPACE
}
#endif
