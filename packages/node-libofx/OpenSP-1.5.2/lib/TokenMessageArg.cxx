// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif
#include "splib.h"
#include "TokenMessageArg.h"
#include "MessageBuilder.h"
#include "token.h"
#include "ParserMessages.h"
#include "Mode.h"
#include "ModeInfo.h"
#include "macros.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

TokenMessageArg::TokenMessageArg(Token token, Mode mode,
				 const ConstPtr<Syntax> &syntax,
				 const ConstPtr<Sd> &sd)
: token_(token), mode_(mode), syntax_(syntax), sd_(sd)
{
}

MessageArg *TokenMessageArg::copy() const
{
  return new TokenMessageArg(*this);
}

void TokenMessageArg::append(MessageBuilder &builder) const
{
  // FIXME translate function characters in delimiters into
  // &#NAME; form.
  if (token_ >= tokenFirstShortref) {
    builder.appendFragment(ParserMessages::shortrefDelim);
    return;
  }
  if (token_ == tokenEe) {
    builder.appendFragment(ParserMessages::entityEnd);
    return;
  }
  ModeInfo iter(mode_, *sd_);
  TokenInfo info;
  const MessageFragment *fragment = 0;
  while (iter.nextToken(&info))
    if (info.token == token_) {
      switch (info.type) {
      case TokenInfo::delimType:
      case TokenInfo::delimDelimType:
      case TokenInfo::delimSetType:
	{
	  const StringC &delim = syntax_->delimGeneral(info.delim1);
	  builder.appendFragment(ParserMessages::delimStart);
	  builder.appendChars(delim.data(), delim.size());
#if 0
	  fragment = &ParserMessages::delimEnd;
#endif
	}
	break;
      case TokenInfo::setType:
	switch (info.set) {
	case Syntax::digit:
	  fragment = &ParserMessages::digit;
	  break;
	case Syntax::nameStart:
	  fragment = &ParserMessages::nameStartCharacter;
	  break;
	case Syntax::sepchar:
	  fragment = &ParserMessages::sepchar;
	  break;
	case Syntax::s:
	  fragment = &ParserMessages::separator;
	  break;
	case Syntax::nmchar:
	  fragment = &ParserMessages::nameCharacter;
	  break;
	case Syntax::sgmlChar:
	  fragment = &ParserMessages::dataCharacter;
	  break;
	case Syntax::minimumData:
	  fragment = &ParserMessages::minimumDataCharacter;
	  break;
	case Syntax::significant:
	  fragment = &ParserMessages::significantCharacter;
	  break;
	default:
	  CANNOT_HAPPEN();
	}
	break;
      case TokenInfo::functionType:
	switch (info.function) {
	case Syntax::fRE:
	  fragment = &ParserMessages::recordEnd;
	  break;
	case Syntax::fRS:
	  fragment = &ParserMessages::recordStart;
	  break;
	case Syntax::fSPACE:
	  fragment = &ParserMessages::space;
	  break;
	}
	break;
      }
      break;
    }
  if (fragment)
    builder.appendFragment(*fragment);
}

#ifdef SP_NAMESPACE
}
#endif
