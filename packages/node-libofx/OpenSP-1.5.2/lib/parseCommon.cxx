// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#include "splib.h"
#include "Parser.h"
#include "token.h"
#include "MessageArg.h"
#include "ParserMessages.h"
#include "constant.h"
#include "NumericCharRefOrigin.h"
#include "macros.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

Boolean Parser::parseProcessingInstruction()
{
  currentInput()->startToken();
  Location location(currentLocation());
  StringC buf;
  for (;;) {
    Token token = getToken(piMode);
    if (token == tokenPic)
      break;
    switch (token) {
    case tokenEe:
      message(ParserMessages::processingInstructionEntityEnd);
      return 0;
    case tokenUnrecognized:
      reportNonSgmlCharacter();
      // fall through
    case tokenChar:
      buf += *currentInput()->currentTokenStart();
      if (buf.size()/2 > syntax().pilen()) {
	message(ParserMessages::processingInstructionLength,
		NumberMessageArg(syntax().pilen()));
	message(ParserMessages::processingInstructionClose);
	return 0;
      }
      break;
    }
  }
  if (buf.size() > syntax().pilen())
    message(ParserMessages::processingInstructionLength,
	    NumberMessageArg(syntax().pilen()));
  if (options().warnPiMissingName) {
    size_t i = 0;
    if (buf.size() && syntax().isNameStartCharacter(buf[0])) {
      for (i = 1; i < buf.size(); i++)
	if (!syntax().isNameCharacter(buf[i]))
	  break;
    }
    if (i == 0 || (i < buf.size() && !syntax().isS(buf[i])))
      message(ParserMessages::piMissingName);
  }
  noteMarkup();
  eventHandler().pi(new (eventAllocator()) ImmediatePiEvent(buf, location));
  return 1;
}

Boolean Parser::parseLiteral(Mode litMode,
			     Mode liteMode,
			     size_t maxLength,
			     const MessageType1 &tooLongMessage,
			     unsigned flags,
			     Text &text)
{
  unsigned startLevel = inputLevel();
  Mode currentMode = litMode;
  // If the literal gets to be longer than this, then we assume
  // that the closing delimiter has been omitted if we're at the end
  // of a line and at the starting input level.
  size_t reallyMaxLength = (maxLength > size_t(-1)/2
			    ? size_t(-1)
			    : maxLength * 2);
  text.clear();
  Location startLoc(currentLocation());
  if (flags & literalDelimInfo)
    text.addStartDelim(currentLocation());
  for (;;) {
    Token token = getToken(currentMode);
    switch (token) {
    case tokenEe:
      if (inputLevel() == startLevel) {
	message(ParserMessages::literalLevel);
	return 0;
      }
      text.addEntityEnd(currentLocation());
      popInputStack();
      if (inputLevel() == startLevel)
	currentMode = litMode;
      break;
    case tokenUnrecognized:
      if (reportNonSgmlCharacter())
	break;
      message(ParserMessages::literalMinimumData,
	      StringMessageArg(currentToken()));
      break;
    case tokenRs:
      text.ignoreChar(currentChar(), currentLocation());
      break;
    case tokenRe:
      if (text.size() > reallyMaxLength && inputLevel() == startLevel) {
#if 0
	message(tooLongMessage, NumberMessageArg(maxLength));
#endif
	// guess that the closing delimiter has been omitted
	Messenger::setNextLocation(startLoc);
	message(ParserMessages::literalClosingDelimiter);
	return 0;
      }
      // fall through
    case tokenSepchar:
      if ((flags & literalSingleSpace)
	  && (text.size() == 0 || text.lastChar() == syntax().space()))
	text.ignoreChar(currentChar(), currentLocation());
      else
	text.addChar(syntax().space(),
		     Location(new ReplacementOrigin(currentLocation(),
						    currentChar()),
			      0));
      break;
    case tokenSpace:
      if ((flags & literalSingleSpace)
	  && (text.size() == 0 || text.lastChar() == syntax().space()))
	text.ignoreChar(currentChar(), currentLocation());
      else
	text.addChar(currentChar(), currentLocation());
      break;
    case tokenCroDigit:
    case tokenHcroHexDigit:
      {
	Char c;
	Location loc;
	if (!parseNumericCharRef(token== tokenHcroHexDigit, c, loc))
	  return 0;
	Boolean isSgmlChar;
	if (!translateNumericCharRef(c, isSgmlChar))
	  break;
	if (!isSgmlChar) {
	  if (flags & literalNonSgml)
	    text.addNonSgmlChar(c, loc);
	  else
	    message(ParserMessages::numericCharRefLiteralNonSgml,
	            NumberMessageArg(c));
	  break;
	}
	if (flags & literalDataTag) {
	  if (!syntax().isSgmlChar(c))
	    message(ParserMessages::dataTagPatternNonSgml);
	  else if (syntax().charSet(Syntax::functionChar)->contains(c))
	    message(ParserMessages::dataTagPatternFunction);
	}
	if ((flags & literalSingleSpace)
	    && c == syntax().space()
	    && (text.size() == 0 || text.lastChar() == syntax().space()))
	  text.ignoreChar(c, loc);
	else
	  text.addChar(c, loc);
      }
      break;
    case tokenCroNameStart:
      if (!parseNamedCharRef())
	return 0;
      break;
    case tokenEroGrpo:
      message(inInstance() ? ParserMessages::eroGrpoStartTag : ParserMessages::eroGrpoProlog);
      break;
    case tokenLit:
    case tokenLita:
      if (flags & literalDelimInfo)
	text.addEndDelim(currentLocation(), token == tokenLita);
      goto done;
    case tokenPeroNameStart:
      if (options().warnInternalSubsetLiteralParamEntityRef
	  && inputLevel() == 1)
	message(ParserMessages::internalSubsetLiteralParamEntityRef);
      // fall through
    case tokenEroNameStart:
      {
	ConstPtr<Entity> entity;
	Ptr<EntityOrigin> origin;
	if (!parseEntityReference(token == tokenPeroNameStart,
				  (flags & literalNoProcess) ? 2 : 0,
				  entity, origin))
	  return 0;
	if (!entity.isNull())
	  entity->litReference(text, *this, origin,
			       (flags & literalSingleSpace) != 0);
	if (inputLevel() > startLevel)
	  currentMode = liteMode;
      }
      break;
    case tokenPeroGrpo:
      message(ParserMessages::peroGrpoProlog);
      break;
    case tokenCharDelim:
      message(ParserMessages::dataCharDelim,
	      StringMessageArg(StringC(currentInput()->currentTokenStart(),
			  	       currentInput()->currentTokenLength())));
      // fall through
    case tokenChar:
      if (text.size() > reallyMaxLength && inputLevel() == startLevel
	  && currentChar() == syntax().standardFunction(Syntax::fRE)) {
#if 0
	message(tooLongMessage, NumberMessageArg(maxLength));
#endif
	// guess that the closing delimiter has been omitted
	Messenger::setNextLocation(startLoc);
	message(ParserMessages::literalClosingDelimiter);
	return 0;
      }
      text.addChar(currentChar(), currentLocation());
      break;
    }
  }
 done:
  if ((flags & literalSingleSpace)
      && text.size() > 0
      && text.lastChar() == syntax().space())
    text.ignoreLastChar();
  if (text.size() > maxLength) {
    switch (litMode) {
    case alitMode:
    case alitaMode:
    case talitMode:
    case talitaMode:
      if (AttributeValue::handleAsUnterminated(text, *this))
	return 0;
    default:
      break;
    }
    message(tooLongMessage, NumberMessageArg(maxLength));
  }
  return 1;
}

Boolean Parser::parseNamedCharRef()
{
  if (options().warnNamedCharRef)
    message(ParserMessages::namedCharRef);
  InputSource *in = currentInput();
  Index startIndex = currentLocation().index();
  in->discardInitial();
  extendNameToken(syntax().namelen(), ParserMessages::nameLength);
  Char c;
  Boolean valid;
  StringC name;
  getCurrentToken(syntax().generalSubstTable(), name);
  if (!syntax().lookupFunctionChar(name, &c)) {
    message(ParserMessages::functionName, StringMessageArg(name));
    valid = 0;
  }
  else {
    valid = 1;
    if (wantMarkup())
      getCurrentToken(name);	// the original name
  }
  NamedCharRef::RefEndType refEndType;
  switch (getToken(refMode)) {
  case tokenRefc:
    refEndType = NamedCharRef::endRefc;
    break;
  case tokenRe:
    refEndType = NamedCharRef::endRE;
    if (options().warnRefc)
      message(ParserMessages::refc);
    break;
  default:
    refEndType = NamedCharRef::endOmitted;
    if (options().warnRefc)
      message(ParserMessages::refc);
    break;
  }
  in->startToken();
  if (valid)
    in->pushCharRef(c, NamedCharRef(startIndex, refEndType, name));
  return 1;
}

Boolean Parser::parseNumericCharRef(Boolean isHex, Char &ch, Location &loc)
{
  InputSource *in = currentInput();
  Location startLocation = currentLocation();
  in->discardInitial();
  Boolean valid = 1;
  Char c = 0;
  if (isHex) {
    extendHexNumber();
    const Char *lim = in->currentTokenEnd();
    for (const Char *p = in->currentTokenStart(); p < lim; p++) {
      int val = sd().hexDigitWeight(*p);
      if (c <= charMax/16 && (c *= 16) <= charMax - val)
	c += val;
      else {
	message(ParserMessages::characterNumber, StringMessageArg(currentToken()));
	valid = 0;
	break;
      }
    }
  }
  else {
    extendNumber(syntax().namelen(), ParserMessages::numberLength);
    const Char *lim = in->currentTokenEnd();
    for (const Char *p = in->currentTokenStart(); p < lim; p++) {
      int val = sd().digitWeight(*p);
      if (c <= charMax/10 && (c *= 10) <= charMax - val)
	c += val;
      else {
	message(ParserMessages::characterNumber, StringMessageArg(currentToken()));
	valid = 0;
	break;
      }
    }
  }
  if (valid && !sd().docCharsetDecl().charDeclared(c)) {
    valid = 0;
    message(ParserMessages::characterNumber, StringMessageArg(currentToken()));
  }
  Owner<Markup> markupPtr;
  if (wantMarkup()) {
    markupPtr = new Markup;
    markupPtr->addDelim(isHex ? Syntax::dHCRO : Syntax::dCRO);
    markupPtr->addNumber(in);
    switch (getToken(refMode)) {
    case tokenRefc:
      markupPtr->addDelim(Syntax::dREFC);
      break;
    case tokenRe:
      markupPtr->addRefEndRe();
      if (options().warnRefc)
	message(ParserMessages::refc);
      break;
    default:
      if (options().warnRefc)
	message(ParserMessages::refc);
      break;
    }
  }
  else if (options().warnRefc) {
    if (getToken(refMode) != tokenRefc)
      message(ParserMessages::refc);
  }
  else
    (void)getToken(refMode);
  if (valid) {
    ch = c;
    loc = Location(new NumericCharRefOrigin(startLocation,
					    currentLocation().index()
					    + currentInput()->currentTokenLength()
					    - startLocation.index(),
					    markupPtr),
		   0);
  }
  return valid;
}

// Translate a character number in the document character set
// into the internal character set.
// If it's a non-SGML char (ie described as UNUSED in SGML declaration),
// return 1 and set sgmlChar to 0.

Boolean Parser::translateNumericCharRef(Char &ch, Boolean &isSgmlChar)
{
  if (sd().internalCharsetIsDocCharset()) {
    if (options().warnNonSgmlCharRef && !syntax().isSgmlChar(ch))
      message(ParserMessages::nonSgmlCharRef);
    isSgmlChar = 1;
    return 1;
  }
  UnivChar univChar;
  if (!sd().docCharset().descToUniv(ch, univChar)) {
    const PublicId *pubid;
    CharsetDeclRange::Type type;
    Number n;
    StringC desc;
    if (sd().docCharsetDecl().getCharInfo(ch, pubid, type, n, desc)) {
      if (type == CharsetDeclRange::unused) {
	if (options().warnNonSgmlCharRef)
	  message(ParserMessages::nonSgmlCharRef);
	isSgmlChar = 0;
	return 1;
      }
    }
    else
      CANNOT_HAPPEN();
    if (type == CharsetDeclRange::string)
      message(ParserMessages::numericCharRefUnknownDesc,
	      NumberMessageArg(ch),
	      StringMessageArg(desc));
    else
      message(ParserMessages::numericCharRefUnknownBase,
	      NumberMessageArg(ch),
	      NumberMessageArg(n),
	      StringMessageArg(pubid->string()));
  }
  else {
    WideChar resultChar;
    ISet<WideChar> resultChars;
    switch (sd().internalCharset().univToDesc(univChar,
					      resultChar,
					      resultChars)) {
    case 1:
      if (resultChar <= charMax) {
	isSgmlChar = 1;
	ch = Char(resultChar);
	return 1;
      }
      // fall through
    case 2:
      message(ParserMessages::numericCharRefBadInternal,
	      NumberMessageArg(ch));
      break;
    default:
      message(ParserMessages::numericCharRefNoInternal,
	      NumberMessageArg(ch));
      break;
    }
  }
  return 0;
}

// ignoreLevel: 0 means don't ignore;
// 1 means parse name group and ignore if inactive
// 2 means ignore

Boolean Parser::parseEntityReference(Boolean isParameter,
				     int ignoreLevel,
				     ConstPtr<Entity> &entity,
				     Ptr<EntityOrigin> &origin)
{
  InputSource *in = currentInput();
  Location startLocation(in->currentLocation());
  Owner<Markup> markupPtr;
  if (wantMarkup()) {
    markupPtr = new Markup;
    markupPtr->addDelim(isParameter ? Syntax::dPERO : Syntax::dERO);
  }
  if (ignoreLevel == 1) {
    Markup savedMarkup;
    Markup *savedCurrentMarkup = currentMarkup();
    if (savedCurrentMarkup)
      savedCurrentMarkup->swap(savedMarkup);
    Location savedMarkupLocation(markupLocation());
    startMarkup(markupPtr != 0, startLocation);
    if (markupPtr) {
      markupPtr->addDelim(Syntax::dGRPO);
      markupPtr->swap(*currentMarkup());
    }
    Boolean ignore;
    if (!parseEntityReferenceNameGroup(ignore))
      return 0;
    if (markupPtr)
      currentMarkup()->swap(*markupPtr);
    startMarkup(savedCurrentMarkup != 0, savedMarkupLocation);
    if (savedCurrentMarkup)
      savedMarkup.swap(*currentMarkup());
    if (!ignore)
      ignoreLevel = 0;
    in->startToken();
    Xchar c = in->tokenChar(messenger());
    if (!syntax().isNameStartCharacter(c)) {
      message(ParserMessages::entityReferenceMissingName);
      return 0;
    }
  }
  in->discardInitial();
  if (isParameter)
    extendNameToken(syntax().penamelen(), ParserMessages::parameterEntityNameLength);
  else
    extendNameToken(syntax().namelen(), ParserMessages::nameLength);
  StringC &name = nameBuffer();
  getCurrentToken(syntax().entitySubstTable(), name);
  if (ignoreLevel)
    entity = new IgnoredEntity(name,
			       isParameter
			       ? Entity::parameterEntity
			       : Entity::generalEntity);
  else {
    entity = lookupEntity(isParameter, name, startLocation, 1);
    if (entity.isNull()) {
      if (haveApplicableDtd()) {
	if (!isParameter) {
	  entity = createUndefinedEntity(name, startLocation);
	  if (!sd().implydefEntity())
	    message(ParserMessages::entityUndefined, StringMessageArg(name));
	}
	else 
	  message(ParserMessages::parameterEntityUndefined,
		  StringMessageArg(name));
      }
      else
	message(ParserMessages::entityApplicableDtd);
    }
    else if (entity->defaulted() && options().warnDefaultEntityReference)
      message(ParserMessages::defaultEntityReference, StringMessageArg(name));
  }
  if (markupPtr) {
    markupPtr->addName(in);
    switch (getToken(refMode)) {
    case tokenRefc:
      markupPtr->addDelim(Syntax::dREFC);
      break;
    case tokenRe:
      markupPtr->addRefEndRe();
      if (options().warnRefc)
	message(ParserMessages::refc);
      break;
    default:
      if (options().warnRefc)
	message(ParserMessages::refc);
      break;
    }
  }
  else if (options().warnRefc) {
    if (getToken(refMode) != tokenRefc)
      message(ParserMessages::refc);
  }
  else
    (void)getToken(refMode);
  if (!entity.isNull())
    origin = EntityOrigin::make(internalAllocator(),
				entity,
				startLocation,
				currentLocation().index()
				+ currentInput()->currentTokenLength()
				- startLocation.index(),
				markupPtr);
  else
    origin = (EntityOrigin *)0;
  return 1;
}

Boolean Parser::parseComment(Mode mode)
{
  Location startLoc(currentLocation());
  Markup *markup = currentMarkup();
  if (markup)
    markup->addCommentStart();
  Token token;
  while ((token = getToken(mode)) != tokenCom)
    switch (token) {
    case tokenUnrecognized:
      if (!reportNonSgmlCharacter())
	message(ParserMessages::sdCommentSignificant,
		StringMessageArg(currentToken()));
      break;
    case tokenEe:
      message(ParserMessages::commentEntityEnd, startLoc);
      return 0;
    default:
      if (markup)
	markup->addCommentChar(currentChar());
      break;
    }
  return 1;
}

void Parser::extendNameToken(size_t maxLength,
			     const MessageType1 &tooLongMessage)
{
  InputSource *in = currentInput();
  size_t length = in->currentTokenLength();
  const Syntax &syn = syntax();
  while (syn.isNameCharacter(in->tokenChar(messenger())))
    length++;
  if (length > maxLength)
    message(tooLongMessage, NumberMessageArg(maxLength));
  in->endToken(length);
}

void Parser::extendNumber(size_t maxLength, const MessageType1 &tooLongMessage)
{
  InputSource *in = currentInput();
  size_t length = in->currentTokenLength();
  while (syntax().isDigit(in->tokenChar(messenger())))
    length++;
  if (length > maxLength)
    message(tooLongMessage, NumberMessageArg(maxLength));
  in->endToken(length);
}

void Parser::extendHexNumber()
{
  InputSource *in = currentInput();
  size_t length = in->currentTokenLength();
  while (syntax().isHexDigit(in->tokenChar(messenger())))
    length++;
  if (length > syntax().namelen())
    message(ParserMessages::hexNumberLength, NumberMessageArg(syntax().namelen()));
  in->endToken(length);
}

Boolean Parser::reportNonSgmlCharacter()
{
  // In scanSuppress mode the non-SGML character will have been read.
  Char c = currentInput()->currentTokenLength() ? currentChar() : getChar();
  if (!syntax().isSgmlChar(c)) {
    message(ParserMessages::nonSgmlCharacter, NumberMessageArg(c));
    return 1;
  }
  return 0;
}

void Parser::extendS()
{
  InputSource *in = currentInput();
  size_t length = in->currentTokenLength();
  while (syntax().isS(in->tokenChar(messenger())))
    length++;
  in->endToken(length);
}

#ifdef SP_NAMESPACE
}
#endif
