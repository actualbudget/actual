// Copyright (c) 1994, 1995 James Clark
// See the file COPYING for copying permission.

#include "splib.h"
#include "Parser.h"
#include "MessageArg.h"
#include "token.h"
#include "macros.h"
#include "ParserMessages.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

Boolean Parser::parseAttributeSpec(Mode mode,
				   AttributeList &atts,
				   Boolean &netEnabling,
				   Ptr<AttributeDefinitionList> &newAttDef)

{
  unsigned specLength = 0;
  AttributeParameter::Type curParm;

  if (!parseAttributeParameter(mode, 0, curParm, netEnabling))
    return 0;
  while (curParm != AttributeParameter::end) {
    switch (curParm) {
    case AttributeParameter::name:
      {
	Text text;
	text.addChars(currentInput()->currentTokenStart(),
		      currentInput()->currentTokenLength(),
		      currentLocation());
	size_t nameMarkupIndex;
	if (currentMarkup())
	  nameMarkupIndex = currentMarkup()->size() - 1;
	text.subst(*syntax().generalSubstTable(), syntax().space());
	if (!parseAttributeParameter(mode == piPasMode ? asMode : mode, 1, curParm, netEnabling))
	  return 0;
	if (curParm == AttributeParameter::vi) {
	  specLength += text.size() + syntax().normsep();
	  if (!parseAttributeValueSpec(mode == piPasMode ? asMode : mode, text.string(), atts,	
				       specLength, newAttDef))
	    return 0;
	  // setup for next attribute
	  if (!parseAttributeParameter(mode, 0, curParm, netEnabling))
	    return 0;
	}
	else {
	  if (currentMarkup())
	    currentMarkup()->changeToAttributeValue(nameMarkupIndex);
	  if (!handleAttributeNameToken(text, atts, specLength))
	    return 0;
	}
      }
      break;
    case AttributeParameter::nameToken:
      {
	Text text;
	text.addChars(currentInput()->currentTokenStart(),
		      currentInput()->currentTokenLength(),
		      currentLocation());
	text.subst(*syntax().generalSubstTable(), syntax().space());
	if (!handleAttributeNameToken(text, atts, specLength))
	  return 0;
	if (!parseAttributeParameter(mode, 0, curParm, netEnabling))
	  return 0;
      }
      break;
    case AttributeParameter::recoverUnquoted:
      {
	if (!atts.recoverUnquoted(currentToken(), currentLocation(), *this)) {
	  // Don't treat it as an unquoted attribute value.
	  currentInput()->endToken(1);
	  if (!atts.handleAsUnterminated(*this))
	    message(ParserMessages::attributeSpecCharacter,
		    StringMessageArg(currentToken()));
	  return 0;
	}
	if (!parseAttributeParameter(mode, 0, curParm, netEnabling))
	  return 0;
      }
      break;
    default:
      CANNOT_HAPPEN();
    }
  }
  atts.finish(*this);
  if (specLength > syntax().attsplen())
    message(ParserMessages::attsplen,
	    NumberMessageArg(syntax().attsplen()),
	    NumberMessageArg(specLength));
  return 1;
}

Boolean Parser::handleAttributeNameToken(Text &text,
					 AttributeList &atts,
					 unsigned &specLength)
{
  unsigned index;
  if (!atts.tokenIndex(text.string(), index)) {
    if (atts.handleAsUnterminated(*this))
      return 0;
    atts.noteInvalidSpec();
    message(ParserMessages::noSuchAttributeToken,
	    StringMessageArg(text.string()));
  }
  else if (sd().www() && !atts.tokenIndexUnique(text.string(), index)) {
    atts.noteInvalidSpec();
    message(ParserMessages::attributeTokenNotUnique,
	    StringMessageArg(text.string()));
  }
  else {
    if (!sd().attributeOmitName())
      message(ParserMessages::attributeNameShorttag);
    else if (options().warnMissingAttributeName)
      message(ParserMessages::missingAttributeName);
    atts.setSpec(index, *this);
    atts.setValueToken(index, text, *this, specLength);
  }
  return 1;
}

Boolean Parser::parseAttributeValueSpec(Mode mode,
					const StringC &name,
					AttributeList &atts,
					unsigned &specLength,
					Ptr<AttributeDefinitionList> &newAttDef)
{
  Markup *markup = currentMarkup();
  Token token = getToken(mode);
  if (token == tokenS) {
    if (markup) {
      do {
	markup->addS(currentChar());
	token = getToken(mode);
      } while (token == tokenS);
    }
    else {
      do {
	token = getToken(mode);
      } while (token == tokenS);
    }
  }
  unsigned index;
  if (!atts.attributeIndex(name, index)) {
    if (newAttDef.isNull())
      newAttDef = new AttributeDefinitionList(atts.def());
    AttributeDefinition *newDef = 0;
    if (!inInstance()) {
      // We are parsing a data attribute specification
      Ptr<Notation> notation;
      Dtd::NotationIter notationIter(currentDtdNonConst().notationIter());
      for (;;) {
        notation = notationIter.next();
        if (notation.isNull()
            || atts.def() == notation->attributeDef())
	  break;
      }
      ASSERT(!notation.isNull());
      if (!notation->defined()) {
        Notation *nt =
          lookupCreateNotation(syntax().rniReservedName(Syntax::rIMPLICIT));
        ConstPtr<AttributeDefinitionList> common = nt->attributeDef();
        if (!common.isNull() && common->attributeIndex(name, index)) {
          newDef = common->def(index)->copy();
          newDef->setSpecified(1);
        }
      }
      if (!newDef) {
        Notation *nt =
          lookupCreateNotation(syntax().rniReservedName(Syntax::rALL));
        ConstPtr<AttributeDefinitionList> common = nt->attributeDef();
        if (!common.isNull() && common->attributeIndex(name, index)) {
          newDef = common->def(index)->copy();
          newDef->setSpecified(0);
        }
      }
    }
    if (!newDef) {
      if (!implydefAttlist())
        message(ParserMessages::noSuchAttribute, StringMessageArg(name));
      newDef = new ImpliedAttributeDefinition(name,
                                              new CdataDeclaredValue);
    }
    newAttDef->append(newDef);
    atts.changeDef(newAttDef);
    index = atts.size() - 1;
  }
  atts.setSpec(index, *this);
  Text text;
  switch (token) {
  case tokenUnrecognized:
    if (reportNonSgmlCharacter())
      return 0;
    // fall through
  case tokenEtago:
  case tokenStago:
  case tokenNestc:
    message(ParserMessages::unquotedAttributeValue);
    extendUnquotedAttributeValue();
    if (markup)
      markup->addAttributeValue(currentInput());
    text.addChars(currentInput()->currentTokenStart(),
		  currentInput()->currentTokenLength(),
		  currentLocation());
    break;
  case tokenEe:
    if (mode != piPasMode) {
      message(ParserMessages::attributeSpecEntityEnd);
      return 0;
    }
  case tokenTagc:
  case tokenDsc:
  case tokenVi:
    message(ParserMessages::attributeValueExpected);
    return 0;
  case tokenNameStart:
  case tokenDigit:
  case tokenLcUcNmchar:
    if (!sd().attributeValueNotLiteral())
      message(ParserMessages::attributeValueShorttag);
    else if (options().warnAttributeValueNotLiteral)
      message(ParserMessages::attributeValueNotLiteral);
    extendNameToken(syntax().litlen() >= syntax().normsep()
		    ? syntax().litlen() - syntax().normsep()
		    : 0,
		    ParserMessages::attributeValueLength);
    if (markup)
      markup->addAttributeValue(currentInput());
    text.addChars(currentInput()->currentTokenStart(),
		  currentInput()->currentTokenLength(),
		  currentLocation());
    break;
  case tokenLit:
  case tokenLita:
    Boolean lita;
    lita = (token == tokenLita);
    if (!(atts.tokenized(index)
	  ? parseTokenizedAttributeValueLiteral(lita, text)
	  : parseAttributeValueLiteral(lita, text)))
      return 0;
    if (markup)
      markup->addLiteral(text);
    break;
  default:
      CANNOT_HAPPEN();
  }
  return atts.setValue(index, text, *this, specLength);
}


Boolean Parser::parseAttributeParameter(Mode mode,
					Boolean allowVi,
					AttributeParameter::Type &result,
					Boolean &netEnabling)
{
  Token token = getToken(mode);
  Markup *markup = currentMarkup();
  if (mode == piPasMode) {
    for (;;) {
      switch (token) {
      case tokenCom:
        if (!parseComment(comMode))
	  return 0;
	if (options().warnPsComment)
	  message(ParserMessages::psComment);
	// fall through
      case tokenS:
        token = getToken(mode);
	continue;
      default:
        break;
      }
      break;
    }
  }
  else if (markup) {
    while (token == tokenS) {
      markup->addS(currentChar());
      token = getToken(mode);
    }
  }
  else {
    while (token == tokenS)
      token = getToken(mode);
  }
  switch (token) {
  case tokenUnrecognized:
    if (reportNonSgmlCharacter())
      return 0;
    extendUnquotedAttributeValue();
    result = AttributeParameter::recoverUnquoted;
    break;
  case tokenEe:
    if (mode != piPasMode) {
      message(ParserMessages::attributeSpecEntityEnd);
      return 0;
    }
    result = AttributeParameter::end;
    break;
  case tokenEtago:
  case tokenStago:
    if (!sd().startTagUnclosed())
      message(ParserMessages::unclosedStartTagShorttag);
    result = AttributeParameter::end;
    currentInput()->ungetToken();
    netEnabling = 0;
    break;
  case tokenNestc:
    if (markup)
      markup->addDelim(Syntax::dNESTC);
    switch (sd().startTagNetEnable()) {
    case Sd::netEnableNo:
      message(ParserMessages::netEnablingStartTagShorttag);
      break;
    case Sd::netEnableImmednet:
      if (getToken(econnetMode) != tokenNet) 
	message(ParserMessages::nestcWithoutNet);
      currentInput()->ungetToken();
      break;
    case Sd::netEnableAll:
      break;
    }
    netEnabling = 1;
    result = AttributeParameter::end;
    break;
  case tokenTagc:
    if (markup)
      markup->addDelim(Syntax::dTAGC);
    netEnabling = 0;
    result = AttributeParameter::end;
    break;
  case tokenDsc:
    if (markup)
      markup->addDelim(Syntax::dDSC);
    result = AttributeParameter::end;
    break;
  case tokenNameStart:
    extendNameToken(syntax().namelen(), ParserMessages::nameTokenLength);
    if (markup)
      markup->addName(currentInput());
    result = AttributeParameter::name;
    break;
  case tokenDigit:
  case tokenLcUcNmchar:
    extendNameToken(syntax().namelen(), ParserMessages::nameTokenLength);
    if (markup)
      markup->addName(currentInput());
    result = AttributeParameter::nameToken;
    break;
  case tokenLit:
  case tokenLita:
    message(allowVi
	    ? ParserMessages::attributeSpecLiteral
	    : ParserMessages::attributeSpecNameTokenExpected);
    return 0;
  case tokenVi:
    if (!allowVi) {
      message(ParserMessages::attributeSpecNameTokenExpected);
      return 0;
    }
    if (markup)
      markup->addDelim(Syntax::dVI);
    result = AttributeParameter::vi;
    break;
  default:
    CANNOT_HAPPEN();
  }
  return 1;
}

void Parser::extendUnquotedAttributeValue()
{
  InputSource *in = currentInput();
  size_t length = in->currentTokenLength();
  const Syntax &syn = syntax();
  for (;;) {
    Xchar c = in->tokenChar(messenger());
    if (syn.isS(c)
	|| !syn.isSgmlChar(c)
	|| c == InputSource::eE
	|| c == syn.delimGeneral(Syntax::dTAGC)[0])
      break;
    length++;
  }
  in->endToken(length);
}

Boolean Parser::parseAttributeValueLiteral(Boolean lita, Text &text)
{
  size_t maxLength = (syntax().litlen() > syntax().normsep()
		      ? syntax().litlen() - syntax().normsep()
		      : 0);
  if (parseLiteral(lita ? alitaMode : alitMode, aliteMode,
		   maxLength,
		   ParserMessages::attributeValueLength,
		   literalNonSgml
 		   | (wantMarkup() ? unsigned(literalDelimInfo) : 0),
		   text)) {
    if (text.size() == 0
	&& syntax().normsep() > syntax().litlen())
      message(ParserMessages::attributeValueLengthNeg,
	      NumberMessageArg(syntax().normsep() - syntax().litlen()));
    return 1;
  }
  else
    return 0;
}

Boolean Parser::parseTokenizedAttributeValueLiteral(Boolean lita, Text &text)
{
  size_t maxLength = (syntax().litlen() > syntax().normsep()
		      ? syntax().litlen() - syntax().normsep()
		      : 0);
  if (parseLiteral(lita ? talitaMode : talitMode, taliteMode,
		   maxLength,
		   ParserMessages::tokenizedAttributeValueLength,
		   literalSingleSpace
		   | (wantMarkup() ? unsigned(literalDelimInfo) : 0),
		   text)) {
    if (text.size() == 0
	&& syntax().normsep() > syntax().litlen())
      message(ParserMessages::tokenizedAttributeValueLengthNeg,
	      NumberMessageArg(syntax().normsep() - syntax().litlen()));
    return 1;
  }
  else
    return 0;
}


Boolean Parser::skipAttributeSpec()
{
  AttributeParameter::Type parm;
  Boolean netEnabling;
  if (!parseAttributeParameter(tagMode, 0, parm, netEnabling))
    return 0;
  while (parm != AttributeParameter::end) {
    if (parm == AttributeParameter::name) {
      size_t nameMarkupIndex = 0;
      if (currentMarkup())
	nameMarkupIndex = currentMarkup()->size() - 1;
      if (!parseAttributeParameter(tagMode, 1, parm, netEnabling))
	return 0;
      if (parm == AttributeParameter::vi) {
	Token token = getToken(tagMode);
	while (token == tokenS) {
	  if (currentMarkup())
	    currentMarkup()->addS(currentChar());
	  token = getToken(tagMode);
	}
	switch (token) {
	case tokenUnrecognized:
	  if (!reportNonSgmlCharacter())
	    message(ParserMessages::attributeSpecCharacter,
		    StringMessageArg(currentToken()));
	  return 0;
	case tokenEe:
	  message(ParserMessages::attributeSpecEntityEnd);
	  return 0;
	case tokenEtago:
	case tokenStago:
	case tokenNestc:
	case tokenTagc:
	case tokenDsc:
	case tokenVi:
	  message(ParserMessages::attributeValueExpected);
	  return 0;
	case tokenNameStart:
	case tokenDigit:
	case tokenLcUcNmchar:
	  if (!sd().attributeValueNotLiteral())
	    message(ParserMessages::attributeValueShorttag);
	  extendNameToken(syntax().litlen() >= syntax().normsep()
			  ? syntax().litlen() - syntax().normsep()
			  : 0,
			  ParserMessages::attributeValueLength);
	  if (currentMarkup())
	    currentMarkup()->addAttributeValue(currentInput());
	  break;
	case tokenLit:
	case tokenLita:
	  {
	    Text text;
	    if (!parseLiteral(token == tokenLita ? talitaMode : talitMode,
			      taliteMode,
			      syntax().litlen(),
			      ParserMessages::tokenizedAttributeValueLength,
			      (currentMarkup() ? literalDelimInfo : 0)
			      | literalNoProcess,
			      text))
	      return 0;
	    if (currentMarkup())
	      currentMarkup()->addLiteral(text);
	  }
	  break;
	default:
	  CANNOT_HAPPEN();
	}
	if (!parseAttributeParameter(tagMode, 0, parm, netEnabling))
	  return 0;
      }
      else {
	if (currentMarkup())
	  currentMarkup()->changeToAttributeValue(nameMarkupIndex);
	if (!sd().attributeOmitName())
	  message(ParserMessages::attributeNameShorttag);
      }
    }
    else {
      // It's a name token.
      if (!parseAttributeParameter(tagMode, 0, parm, netEnabling))
	return 0;
      if (!sd().attributeOmitName())
	message(ParserMessages::attributeNameShorttag);
    }
  }
  if (netEnabling)
    message(ParserMessages::startTagGroupNet);
  return 1;
}

#ifdef SP_NAMESPACE
}
#endif
