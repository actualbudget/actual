// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif
#include "splib.h"
#include "Param.h"
#include "MessageBuilder.h"
#include "macros.h"
#include "ParserMessages.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

AllowedParams::AllowedParams(Param::Type p1,
			     Param::Type p2,
			     Param::Type p3,
			     Param::Type p4,
			     Param::Type p5,
			     Param::Type p6,
			     Param::Type p7,
			     Param::Type p8,
			     Param::Type p9,
			     Param::Type p10)
{
  init();
  allow(p1);
  allow(p2);
  allow(p3);
  allow(p4);
  allow(p5);
  allow(p6);
  allow(p7);
  allow(p8);
  allow(p9);
  allow(p10);
}

AllowedParams::AllowedParams(const Param::Type *v, int n)
{
  init();
  for (int i = 0; i < n; i++)
    allow(v[i]);
}

void AllowedParams::init()
{
  for (int i = 0; i < Syntax::nNames; i++)
    reservedNames_[i] = 0;
  mainMode_ = mdMode;
  silent_ = 0;
  mdc_ = 0;
  rni_ = 0;
  dso_ = 0;
  inclusions_ = 0;
  exclusions_ = 0;
  extraDelimiter_ = Param::invalid;
  group_ = Param::invalid;
  nameStart_ = Param::invalid;
  digit_ = Param::invalid;
  nmchar_ = Param::invalid;
  literal_ = Param::invalid;
}


void AllowedParams::allow(Param::Type p)
{
  switch (p) {
  case Param::invalid:
    break;
  case Param::silent:
    silent_ = 1;
    break;
  case Param::dso:
    dso_ = 1;
    break;
  case Param::mdc:
    mdc_ = 1;
    break;
  case Param::minus:
    ASSERT(mainMode_ == mdMode);
    mainMode_ = mdMinusMode;
    extraDelimiter_ = p;
    break;
  case Param::pero:
    ASSERT(mainMode_ == mdMode);
    mainMode_ = mdPeroMode;
    extraDelimiter_ = p;
    break;
  case Param::inclusions:
    inclusions_ = 1;
    break;
  case Param::exclusions:
    exclusions_ = 1;
    break;
  case Param::nameGroup:
  case Param::nameTokenGroup:
  case Param::modelGroup:
    ASSERT(group_ == Param::invalid);
    group_ = p;
    break;
  case Param::number:
    ASSERT(digit_ == Param::invalid);
    digit_ = p;
    break;
  case Param::minimumLiteral:
  case Param::tokenizedAttributeValueLiteral:
  case Param::attributeValueLiteral:
  case Param::systemIdentifier:
  case Param::paramLiteral:
    ASSERT(literal_ == Param::invalid);
    literal_ = p;
    break;
  case Param::name:
  case Param::entityName:
  case Param::paramEntityName:
    ASSERT(nameStart_ == Param::invalid);
    nameStart_ = p;
    break;
  case Param::attributeValue:
    ASSERT(nameStart_ == Param::invalid);
    nameStart_ = p;
    ASSERT(digit_ == Param::invalid);
    digit_ = p;
    ASSERT(nmchar_ == Param::invalid);
    nmchar_ = p;
    break;
  default:
    if (p < Param::indicatedReservedName) {
      ASSERT(nameStart_ == Param::invalid
	     || nameStart_ == Param::reservedName);
      ASSERT(rni_ == 0);
      nameStart_ = Param::reservedName;
      reservedNames_[p - Param::reservedName] = 1;
    }
    else {
      ASSERT(nameStart_ != Param::reservedName);
      rni_ = 1;
      reservedNames_[p - Param::indicatedReservedName] = 1;
    }
    break;
  }
}

AllowedParamsMessageArg::AllowedParamsMessageArg(
  const AllowedParams &allow,
  const ConstPtr<Syntax> &syntax)
: allow_(allow),
  syntax_(syntax)
{
}

MessageArg *AllowedParamsMessageArg::copy() const
{
  return new AllowedParamsMessageArg(*this);
}

void AllowedParamsMessageArg::append(MessageBuilder &builder) const
{
  Syntax::DelimGeneral delims[3];
  int nDelims = 0;
  if (allow_.mdc())
    delims[nDelims++] = Syntax::dMDC;
  if (allow_.dso())
    delims[nDelims++] = Syntax::dDSO;
  switch (allow_.mainMode()) {
  case mdMinusMode:
    delims[nDelims++] = Syntax::dMINUS;
    break;
  case mdPeroMode:
    delims[nDelims++] = Syntax::dPERO;
    break;
  default:
    break;
  }
  Boolean first = 1;
  int i;
  for (i = 0; i < nDelims; i++) {
    if (!first)
      builder.appendFragment(ParserMessages::listSep);
    else
      first = 0;
    const StringC &delim = syntax_->delimGeneral(delims[i]);
    builder.appendFragment(ParserMessages::delimStart);
    builder.appendChars(delim.data(), delim.size());
#if 0
    builder.appendFragment(ParserMessages::delimEnd);
#endif
  }
  const MessageFragment *fragment[5];
  int nFragments = 0;
  if (allow_.inclusions())
    fragment[nFragments++] = &ParserMessages::inclusions;
  if (allow_.exclusions())
    fragment[nFragments++] = &ParserMessages::exclusions;
  switch (allow_.literal()) {
  case Param::minimumLiteral:
    fragment[nFragments++] = &ParserMessages::minimumLiteral;
    break;
  case Param::attributeValueLiteral:
  case Param::tokenizedAttributeValueLiteral:
    fragment[nFragments++] = &ParserMessages::attributeValueLiteral;
    break;
  case Param::systemIdentifier:
    fragment[nFragments++] = &ParserMessages::systemIdentifier;
    break;
  case Param::paramLiteral:
    fragment[nFragments++] = &ParserMessages::parameterLiteral;
    break;
  }
  switch (allow_.nameStart()) {
  case Param::name:
  case Param::entityName:
  case Param::paramEntityName:
    fragment[nFragments++] = &ParserMessages::name;
    break;
  case Param::attributeValue:
    fragment[nFragments++] = &ParserMessages::attributeValue;
    break;
  }
  if (allow_.digit() == Param::number)
    fragment[nFragments++] = &ParserMessages::number;
  
  for (i = 0; i < nFragments; i++) {
    if (!first)
      builder.appendFragment(ParserMessages::listSep);
    else
      first = 0;
    builder.appendFragment(*fragment[i]);
  }
  if (allow_.rni() || allow_.nameStart() == Param::reservedName) {
    for (int i = 0; i < Syntax::nNames; i++) {
      if (allow_.reservedName(Syntax::ReservedName(i))) {
	if (!first)
	  builder.appendFragment(ParserMessages::listSep);
	else
	  first = 0;
	StringC str;
	if (allow_.rni())
	  str = syntax_->delimGeneral(Syntax::dRNI);
	str += syntax_->reservedName(Syntax::ReservedName(i));
	builder.appendChars(str.data(), str.size());
      }
    }
  }
}

#ifdef SP_NAMESPACE
}
#endif
