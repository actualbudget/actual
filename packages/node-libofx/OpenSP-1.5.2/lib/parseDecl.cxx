// Copyright (c) 1994, 1995 James Clark
// See the file COPYING for copying permission.

// Prolog, dtd and declaration parsing.

#include "splib.h"
#include "Parser.h"
#include "Param.h"
#include "Markup.h"
#include "ParserMessages.h"
#include "MessageArg.h"
#include "TokenMessageArg.h"
#include "token.h"
#include "macros.h"
#include <stdio.h>

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

static const AllowedParams allowMdc(Param::mdc);
static const AllowedParams allowName(Param::name);
static const AllowedParams allowParamLiteral(Param::paramLiteral);
static const AllowedParams allowNameNameGroup(Param::name, Param::nameGroup);
static const AllowedParams allowDsoMdc(Param::dso, Param::mdc);
static AllowedParams allowNameMdc(Param::name, Param::mdc);
static AllowedParams
  allowExplicitLinkRuleMdc(Param::mdc,
			   Param::name,
			   Param::nameGroup,
			   Param::indicatedReservedName + Syntax::rIMPLIED);
static AllowedParams
  allowNameNameGroupMdc(Param::name, Param::nameGroup, Param::mdc);

static const AllowedParams
  allowLinkSetSpec(Param::name,
		   Param::indicatedReservedName + Syntax::rINITIAL,
		   Param::indicatedReservedName + Syntax::rEMPTY,
		   Param::indicatedReservedName + Syntax::rRESTORE);

void Parser::doProlog()
{
  const unsigned maxTries = 10;
  unsigned tries = 0;
  do {
    if (cancelled()) {
      allDone();
      return;
    }
    Token token = getToken(proMode);
    switch (token) {
    case tokenUnrecognized:
      if (reportNonSgmlCharacter())
	break;
      if (hadDtd()) {
	currentInput()->ungetToken();
	endProlog();
	return;
      }
      {
	StringC gi;
	if (lookingAtStartTag(gi)) {
	  currentInput()->ungetToken();
	  implyDtd(gi);
	  return;
	}
      }
	    
      if (++tries >= maxTries) {
	message(ParserMessages::notSgml);
	giveUp();
	return;
      }
      message(ParserMessages::prologCharacter, StringMessageArg(currentToken()));
      prologRecover();
      break;
    case tokenEe:
      if (hadDtd()) {
	endProlog();
	return;
      }
      message(ParserMessages::documentEndProlog);
      allDone();
      return;
    case tokenMdoMdc:
      // empty comment
      emptyCommentDecl();
      break;
    case tokenMdoCom:
      if (!parseCommentDecl())
	prologRecover();
      break;
    case tokenMdoNameStart:
      setPass2Start();
      if (startMarkup(eventsWanted().wantPrologMarkup(), currentLocation()))
	currentMarkup()->addDelim(Syntax::dMDO);
      Syntax::ReservedName name;
      if (parseDeclarationName(&name)) {
	switch (name) {
	case Syntax::rDOCTYPE:
	  if (!parseDoctypeDeclStart())
	    giveUp();
	  return;
	case Syntax::rLINKTYPE:
	  if (!parseLinktypeDeclStart())
	    giveUp();
	  return;
	case Syntax::rELEMENT:
	case Syntax::rATTLIST:
	case Syntax::rENTITY:
	case Syntax::rNOTATION:
	case Syntax::rSHORTREF:
	case Syntax::rUSEMAP:
	case Syntax::rUSELINK:
	case Syntax::rLINK:
	case Syntax::rIDLINK:
	  message(ParserMessages::prologDeclaration,
		  StringMessageArg(syntax().reservedName(name)));
	  if (!hadDtd())
	    tries++;
	  prologRecover();
	  break;
	default:
	  message(ParserMessages::noSuchDeclarationType,
		  StringMessageArg(syntax().reservedName(name)));
	  prologRecover();
	  break;
	}
      }
      else
	prologRecover();
      break;
    case tokenPio:
      if (!parseProcessingInstruction())
	prologRecover();
      break;
    case tokenS:
      if (eventsWanted().wantPrologMarkup()) {
	extendS();
	eventHandler().sSep(new (eventAllocator())
			    SSepEvent(currentInput()->currentTokenStart(),
				      currentInput()->currentTokenLength(),
				      currentLocation(),
				      1));
      }
      break;
    default:
      CANNOT_HAPPEN();
    }
  } while (eventQueueEmpty());
}

void Parser::endProlog()
{
  if (baseDtd().isNull()
#if 0
      || baseDtd()->documentElementType()->definition()->undefined()
#endif
      ) {
    // We could continue, but there's not a lot of point.
    giveUp();
    return;
  }
  if (maybeStartPass2())
    setPhase(prologPhase);
  else {
    if (inputLevel() == 0) {
      allDone();
      return;
    }
    if (pass2())
      checkEntityStability();
    setPhase(instanceStartPhase);
    startInstance();
    ConstPtr<ComplexLpd> lpd;
    Vector<AttributeList> simpleLinkAtts;
    Vector<StringC> simpleLinkNames;
    for (size_t i = 0; i < nActiveLink(); i++)
      if (activeLpd(i).type() == Lpd::simpleLink) {
	const SimpleLpd &lpd = (SimpleLpd &)activeLpd(i);
	simpleLinkNames.push_back(lpd.name());
	simpleLinkAtts.resize(simpleLinkAtts.size() + 1);
	simpleLinkAtts.back().init(lpd.attributeDef());
	simpleLinkAtts.back().finish(*this);
      }
      else 
	lpd = (ComplexLpd *)&activeLpd(i);
    eventHandler().endProlog(new (eventAllocator())
			     EndPrologEvent(currentDtdPointer(),
					    lpd,
					    simpleLinkNames,
					    simpleLinkAtts,
					    currentLocation()));
  }
}

void Parser::prologRecover()
{
  unsigned skipCount = 0;
  const unsigned skipMax = 250;
  for (;;) {
    Token token = getToken(proMode);
    skipCount++;
    if (token == tokenUnrecognized) {
      token = getToken(mdMode);
      if (token == tokenMdc) {
	token = getToken(proMode);
	if (token == tokenS)
	  return;
      }
    }
    switch (token) {
    case tokenUnrecognized:
      (void)getChar();
      break;
    case tokenEe:
      return;
    case tokenMdoMdc:
    case tokenMdoCom:
    case tokenMdoNameStart:
    case tokenPio:
      currentInput()->ungetToken();
      return;
    case tokenS:
      if (currentChar() == syntax().standardFunction(Syntax::fRE)
	  && skipCount >= skipMax)
	return;
    default:
      break;
    }
  }
}

void Parser::doDeclSubset()
{
  do {
    if (cancelled()) {
      allDone();
      return;
    }
    Token token = getToken(currentMode());
    unsigned startLevel = inputLevel();
    Boolean inDtd = !haveDefLpd();
    switch (token) {
    case tokenUnrecognized:
      if (reportNonSgmlCharacter())
	break;
      message(ParserMessages::declSubsetCharacter, StringMessageArg(currentToken()));
      declSubsetRecover(startLevel);
      break;
    case tokenEe:
      if (inputLevel() == specialParseInputLevel()) {
	// FIXME have separate messages for each type of special parse
	message(ParserMessages::specialParseEntityEnd);
      }
      if (eventsWanted().wantPrologMarkup())
	eventHandler().entityEnd(new (eventAllocator())
				 EntityEndEvent(currentLocation()));
      if (inputLevel() == 2) {
	const EntityDecl *e
	  = currentLocation().origin()->entityDecl();
	if (e
	    && (e->declType() == EntityDecl::doctype
		|| e->declType() == EntityDecl::linktype)) {
	  // popInputStack may destroy e
	  Boolean fake = e->defLocation().origin().isNull();
	  popInputStack();
	  if (!(inDtd
		? parseDoctypeDeclEnd(fake)
		: parseLinktypeDeclEnd()))
	    ;			// FIXME recover
	  setPhase(prologPhase);
	  return;
	}
      }
      if (inputLevel() == 1) {
	if (finalPhase() == declSubsetPhase) {
	  checkDtd(defDtd());
	  endDtd();
	}
	else
	  // Give message before popping stack.
	  message(inDtd
		  ? ParserMessages::documentEndDtdSubset
		  : ParserMessages::documentEndLpdSubset);
	popInputStack();
	allDone();
      }
      else
	popInputStack();
      return;
    case tokenDsc:		// end of declaration subset
      // FIXME what's the right location?
      if (!referenceDsEntity(currentLocation())) {
	if (!(inDtd ? parseDoctypeDeclEnd() : parseLinktypeDeclEnd()))
	  ;			// FIXME recover
	setPhase(prologPhase);
      }
      return;
    case tokenMdoNameStart:	// named markup declaration
      if (startMarkup(eventsWanted().wantPrologMarkup(), currentLocation()))
	currentMarkup()->addDelim(Syntax::dMDO);
      Syntax::ReservedName name;
      Boolean result;
      if (parseDeclarationName(&name,
			       inDtd && !options().errorAfdr)) {
	switch (name) {
	case Syntax::rANY:	// used for <!AFDR
	  result = parseAfdrDecl();
	  break;
	case Syntax::rELEMENT:
	  if (inDtd)
	    result = parseElementDecl();
	  else {
	    message(ParserMessages::lpdSubsetDeclaration,
		    StringMessageArg(syntax().reservedName(name)));
	    result = 0;
	  }
	  break;
	case Syntax::rATTLIST:
	  result = parseAttlistDecl();
	  break;
	case Syntax::rENTITY:
	  result = parseEntityDecl();
	  break;
	case Syntax::rNOTATION:
	  result = parseNotationDecl();
	  if (!inDtd && !sd().www())
	    message(ParserMessages::lpdSubsetDeclaration,
		    StringMessageArg(syntax().reservedName(name)));
	  break;
	case Syntax::rSHORTREF:
	  if (inDtd)
	    result = parseShortrefDecl();
	  else {
	    message(ParserMessages::lpdSubsetDeclaration,
		    StringMessageArg(syntax().reservedName(name)));
	    result = 0;
	  }
	  break;
	case Syntax::rUSEMAP:
	  if (inDtd)
	    result = parseUsemapDecl();
	  else {
	    message(ParserMessages::lpdSubsetDeclaration,
		    StringMessageArg(syntax().reservedName(name)));
	    result = 0;
	  }
	  break;
	case Syntax::rLINK:
	  if (inDtd) {
	    message(ParserMessages::dtdSubsetDeclaration,
		    StringMessageArg(syntax().reservedName(name)));
	    result = 0;
	  }
	  else
	    result = parseLinkDecl();
	  break;
	case Syntax::rIDLINK:
	  if (inDtd) {
	    message(ParserMessages::dtdSubsetDeclaration,
		    StringMessageArg(syntax().reservedName(name)));
	    result = 0;
	  }
	  else
	    result = parseIdlinkDecl();
	  break;
	case Syntax::rDOCTYPE:
	case Syntax::rLINKTYPE:
	case Syntax::rUSELINK:
	  result = 0;
	  message(inDtd
		  ? ParserMessages::dtdSubsetDeclaration
		  : ParserMessages::lpdSubsetDeclaration,
		  StringMessageArg(syntax().reservedName(name)));
	  break;
	default:
	  result = 0;
	  message(ParserMessages::noSuchDeclarationType,
		  StringMessageArg(syntax().reservedName(name)));
	  break;
	}
      }
      else
	result = 0;
      if (!result)
	declSubsetRecover(startLevel);
      break;
    case tokenMdoMdc:		// empty comment declaration
      // empty comment
      emptyCommentDecl();
      break;
    case tokenMdoCom:		// comment declaration
      if (!parseCommentDecl())
	declSubsetRecover(startLevel);
      break;
    case tokenMdoDso:		// marked section declaration
      if (!parseMarkedSectionDeclStart())
	declSubsetRecover(startLevel);
      break;
    case tokenMscMdc:
      handleMarkedSectionEnd();
      break;
    case tokenPeroGrpo:		// parameter entity reference with name group
      message(ParserMessages::peroGrpoProlog);
      // fall through
    case tokenPeroNameStart:	// parameter entity reference
      {
	ConstPtr<Entity> entity;
	Ptr<EntityOrigin> origin;
	if (parseEntityReference(1, token == tokenPeroGrpo, entity, origin)) {
	  if (!entity.isNull())
	    entity->dsReference(*this, origin);
	}
	else
	  declSubsetRecover(startLevel);
      }
      break;
    case tokenPio:		// processing instruction
      if (!parseProcessingInstruction())
	declSubsetRecover(startLevel);
      break;
    case tokenS:		// white space
      if (eventsWanted().wantPrologMarkup()) {
	extendS();
	eventHandler().sSep(new (eventAllocator())
			    SSepEvent(currentInput()->currentTokenStart(),
				      currentInput()->currentTokenLength(),
				      currentLocation(),
				      1));
      }
      break;
    case tokenIgnoredChar:
      // from an ignored marked section
      if (eventsWanted().wantPrologMarkup())
	eventHandler().ignoredChars(new (eventAllocator())
				    IgnoredCharsEvent(currentInput()->currentTokenStart(),
						      currentInput()->currentTokenLength(),
						      currentLocation(),
						      1));
      break;
    case tokenRe:
    case tokenRs:
    case tokenCroNameStart:
    case tokenCroDigit:
    case tokenHcroHexDigit:
    case tokenEroNameStart:
    case tokenEroGrpo:
    case tokenChar:
      // these can occur in a cdata or rcdata marked section
      message(ParserMessages::dataMarkedSectionDeclSubset);
      declSubsetRecover(startLevel);
      break;
    default:
      CANNOT_HAPPEN();
    }
  } while (eventQueueEmpty());
}

void Parser::declSubsetRecover(unsigned startLevel)
{
  for (;;) {
    Token token = getToken(currentMode());
    switch (token) {
    case tokenUnrecognized:
      (void)getChar();
      break;
    case tokenEe:
      if (inputLevel() <= startLevel)
	return;
      popInputStack();
      break;
    case tokenMdoCom:
    case tokenDsc:
    case tokenMdoNameStart:
    case tokenMdoMdc:
    case tokenMdoDso:
    case tokenMscMdc:
    case tokenPio:
      if (inputLevel() == startLevel) {
	currentInput()->ungetToken();
	return;
      }
      break;
    default:
      break;
    }
  }
}

Boolean Parser::lookingAtStartTag(StringC &gi)
{
  // This is harder than might be expected since we may not have compiled
  // the recognizers for the instance yet.
  const StringC &stago = instanceSyntax().delimGeneral(Syntax::dSTAGO);
  for (size_t i = currentInput()->currentTokenLength();
       i < stago.size();
       i++)
    if (currentInput()->tokenChar(messenger()) == InputSource::eE)
      return 0;
  StringC delim;
  getCurrentToken(instanceSyntax().generalSubstTable(), delim);
  if (delim != stago)
    return 0;
  Xchar c = currentInput()->tokenChar(messenger());
  if (!instanceSyntax().isNameStartCharacter(c))
    return 0;
  do {
    gi += (*instanceSyntax().generalSubstTable())[(Char)c];
    c = currentInput()->tokenChar(messenger());
  } while (instanceSyntax().isNameCharacter(c));
  return 1;
}

Boolean Parser::parseDeclarationName(Syntax::ReservedName *result,
				     Boolean allowAfdr)
{
  currentInput()->discardInitial();
  extendNameToken(syntax().namelen(), ParserMessages::nameLength);
  StringC &name = nameBuffer();
  getCurrentToken(syntax().generalSubstTable(), name);
  if (!syntax().lookupReservedName(name, result)) {
    if (allowAfdr && name == sd().execToInternal("AFDR")) {
      *result = Syntax::rANY;
      if (currentMarkup())
	currentMarkup()->addName(currentInput());
    }
    else {
      message(ParserMessages::noSuchDeclarationType, StringMessageArg(name));
      return 0;
    }
  }
  else if (currentMarkup())
    currentMarkup()->addReservedName(*result, currentInput());
  return 1;
}

Boolean Parser::parseElementDecl()
{
  unsigned declInputLevel = inputLevel();
  Param parm;
  if (!parseParam(allowNameNameGroup, declInputLevel, parm))
    return 0;
  Vector<NameToken> nameVector;
  if (parm.type == Param::nameGroup) {
    parm.nameTokenVector.swap(nameVector);
    if (options().warnElementGroupDecl)
      message(ParserMessages::elementGroupDecl);
  }
  else {
    nameVector.resize(1);
    parm.token.swap(nameVector[0].name);
    parm.origToken.swap(nameVector[0].origName);
  }
  static AllowedParams
    allowRankOmissionContent(Param::number,
			     Param::reservedName + Syntax::rO,
			     Param::minus,
			     Param::reservedName + Syntax::rCDATA,
			     Param::reservedName + Syntax::rRCDATA,
			     Param::reservedName + Syntax::rEMPTY,
			     Param::reservedName + Syntax::rANY,
			     Param::modelGroup);
  if (!parseParam(allowRankOmissionContent, declInputLevel, parm))
    return 0;
  StringC rankSuffix;
  Vector<ElementType *> elements(nameVector.size());
  Vector<RankStem *> rankStems;
  Vector<const RankStem *> constRankStems;
  size_t i;
  if (parm.type == Param::number) {
    if (options().warnRank)
      message(ParserMessages::rank);
    parm.token.swap(rankSuffix);
    rankStems.resize(nameVector.size());
    constRankStems.resize(nameVector.size());
    for (i = 0; i < elements.size(); i++) {
      StringC name(nameVector[i].name);
      name += rankSuffix;
      if (name.size() > syntax().namelen()
	  && nameVector[i].name.size() <= syntax().namelen())
	message(ParserMessages::genericIdentifierLength,
		NumberMessageArg(syntax().namelen()));
      elements[i] = lookupCreateElement(name);
      rankStems[i] = lookupCreateRankStem(nameVector[i].name);
      constRankStems[i] = rankStems[i];
    }
    static AllowedParams
      allowOmissionContent(Param::reservedName + Syntax::rO,
			   Param::minus,
			   Param::reservedName + Syntax::rCDATA,
			   Param::reservedName + Syntax::rRCDATA,
			   Param::reservedName + Syntax::rEMPTY,
			   Param::reservedName + Syntax::rANY,
			   Param::modelGroup);
    Token token = getToken(mdMinusMode);
    if (token == tokenNameStart)
      message(ParserMessages::psRequired);
    currentInput()->ungetToken();
    if (!parseParam(allowOmissionContent, declInputLevel, parm))
      return 0;
  }
  else {
    for (i = 0; i < elements.size(); i++) {
      // StringC *origName;
      // origName = new StringC(nameVector[i].origName);
      elements[i] = lookupCreateElement(nameVector[i].name);
      elements[i]->setOrigName(nameVector[i].origName);
    }
  }
  for (i = 0; i < elements.size(); i++)
    if (defDtd().lookupRankStem(elements[i]->name()) && validate())
      message(ParserMessages::rankStemGenericIdentifier,
	      StringMessageArg(elements[i]->name()));
  unsigned char omitFlags = 0;
  if (parm.type == Param::minus
      || parm.type == Param::reservedName + Syntax::rO) {
    if (options().warnMinimizationParam)
      message(ParserMessages::minimizationParam);
    omitFlags |= ElementDefinition::omitSpec;
    if (parm.type != Param::minus)
      omitFlags |= ElementDefinition::omitStart;
    static AllowedParams allowOmission(Param::reservedName + Syntax::rO,
				       Param::minus);
    if (!parseParam(allowOmission, declInputLevel, parm))
      return 0;
    if (parm.type != Param::minus)
      omitFlags |= ElementDefinition::omitEnd;
    static AllowedParams allowContent(Param::reservedName + Syntax::rCDATA,
				      Param::reservedName + Syntax::rRCDATA,
				      Param::reservedName + Syntax::rEMPTY,
				      Param::reservedName + Syntax::rANY,
				      Param::modelGroup);
    if (!parseParam(allowContent, declInputLevel, parm))
      return 0;
  }
  else {
    if (sd().omittag())
      message(ParserMessages::missingTagMinimization);
  }
  Ptr<ElementDefinition> def;
  switch (parm.type) {
  case Param::reservedName + Syntax::rCDATA:
    def = new ElementDefinition(markupLocation(),
				defDtd().allocElementDefinitionIndex(),
				omitFlags,
				ElementDefinition::cdata);
    if (!parseParam(allowMdc, declInputLevel, parm))
      return 0;
    if (options().warnCdataContent)
      message(ParserMessages::cdataContent);
    break;
  case Param::reservedName + Syntax::rRCDATA:
    def = new ElementDefinition(markupLocation(),
				defDtd().allocElementDefinitionIndex(),
				omitFlags,
				ElementDefinition::rcdata);
    if (!parseParam(allowMdc, declInputLevel, parm))
      return 0;
    if (options().warnRcdataContent)
      message(ParserMessages::rcdataContent);
    break;
  case Param::reservedName + Syntax::rEMPTY:
    def = new ElementDefinition(markupLocation(),
				defDtd().allocElementDefinitionIndex(),
				omitFlags,
				ElementDefinition::empty);
    if ((omitFlags & ElementDefinition::omitSpec)
	&& !(omitFlags & ElementDefinition::omitEnd)
	&& options().warnShould)
      message(ParserMessages::emptyOmitEndTag);
    if (!parseParam(allowMdc, declInputLevel, parm))
      return 0;
    break;
  case Param::reservedName + Syntax::rANY:
    def = new ElementDefinition(markupLocation(),
				defDtd().allocElementDefinitionIndex(),
				omitFlags,
				ElementDefinition::any);
    if (!parseExceptions(declInputLevel, def))
      return 0;
    break;
  case Param::modelGroup:
    {
      unsigned long cnt = parm.modelGroupPtr->grpgtcnt();
      // The outermost model group isn't formally a content token.
      if (cnt - 1 > syntax().grpgtcnt())
	message(ParserMessages::grpgtcnt, NumberMessageArg(syntax().grpgtcnt()));
      Owner<CompiledModelGroup>
	modelGroup(new CompiledModelGroup(parm.modelGroupPtr));
      Vector<ContentModelAmbiguity> ambiguities;
      Boolean pcdataUnreachable;
      modelGroup->compile(currentDtd().nElementTypeIndex(), ambiguities,
			  pcdataUnreachable);
      if (pcdataUnreachable && options().warnMixedContent)
	message(ParserMessages::pcdataUnreachable);
      if (validate()) {
	for (i = 0; i < ambiguities.size(); i++) {
	  const ContentModelAmbiguity &a = ambiguities[i];
	  reportAmbiguity(a.from, a.to1, a.to2, a.andDepth);
	}
      }
      def = new ElementDefinition(markupLocation(),
				  defDtd().allocElementDefinitionIndex(),
				  omitFlags,
				  ElementDefinition::modelGroup,
				  modelGroup);
      if (!parseExceptions(declInputLevel, def))
	return 0;
    }
    break;
  }
  if (rankSuffix.size() > 0)
    def->setRank(rankSuffix, constRankStems);
  ConstPtr<ElementDefinition> constDef(def);
  for (i = 0; i < elements.size(); i++) {
    if (elements[i]->definition() != 0) {
      if (validate())
	message(ParserMessages::duplicateElementDefinition,
	        StringMessageArg(elements[i]->name()));
    }
    else {
      elements[i]->setElementDefinition(constDef, i);
      if (!elements[i]->attributeDef().isNull())
	checkElementAttribute(elements[i]);
    }
    if (rankStems.size() > 0)
      rankStems[i]->addDefinition(constDef);
  }
  if (currentMarkup()) {
    Vector<const ElementType *> v(elements.size());
    for (i = 0; i < elements.size(); i++)
      v[i] = elements[i];
    eventHandler().elementDecl(new (eventAllocator())
			       ElementDeclEvent(v, currentDtdPointer(),
						markupLocation(),
						currentMarkup()));
  }
  return 1;
}

void Parser::reportAmbiguity(const LeafContentToken *from,
			     const LeafContentToken *to1,
			     const LeafContentToken *to2,
			     unsigned ambigAndDepth)
{
  StringC toName;
  const ElementType *toType = to1->elementType();
  if (toType)
    toName = toType->name();
  else {
    toName = syntax().delimGeneral(Syntax::dRNI);
    toName += syntax().reservedName(Syntax::rPCDATA);
  }
  unsigned to1Index = to1->typeIndex() + 1;
  unsigned to2Index = to2->typeIndex() + 1;
  if (from->isInitial())
    message(ParserMessages::ambiguousModelInitial,
	    StringMessageArg(toName),
	    OrdinalMessageArg(to1Index),
	    OrdinalMessageArg(to2Index));
  else {
    StringC fromName;
    const ElementType *fromType = from->elementType();
    if (fromType)
      fromName = fromType->name();
    else {
      fromName = syntax().delimGeneral(Syntax::dRNI);
      fromName += syntax().reservedName(Syntax::rPCDATA);
    }
    unsigned fromIndex = from->typeIndex() + 1;
    unsigned andMatches = from->andDepth() - ambigAndDepth;
    if (andMatches == 0)
      message(ParserMessages::ambiguousModel,
	      StringMessageArg(fromName),
	      OrdinalMessageArg(fromIndex),
	      StringMessageArg(toName),
	      OrdinalMessageArg(to1Index),
	      OrdinalMessageArg(to2Index));
    else if (andMatches == 1)
      message(ParserMessages::ambiguousModelSingleAnd,
	      StringMessageArg(fromName),
	      OrdinalMessageArg(fromIndex),
	      StringMessageArg(toName),
	      OrdinalMessageArg(to1Index),
	      OrdinalMessageArg(to2Index));
    else
      message(ParserMessages::ambiguousModelMultipleAnd,
	      StringMessageArg(fromName),
	      OrdinalMessageArg(fromIndex),
	      NumberMessageArg(andMatches),
	      StringMessageArg(toName),
	      OrdinalMessageArg(to1Index),
	      OrdinalMessageArg(to2Index));
  }
}


// Check the compatibility of the attribute definition with
// the element definition.

void Parser::checkElementAttribute(const ElementType *e, size_t checkFrom)
{
  if (!validate())
    return;
  const AttributeDefinitionList *attDef = e->attributeDef().pointer();
  Boolean conref = 0;
  ASSERT(e != 0);
  const ElementDefinition *edef = e->definition();
  ASSERT(edef != 0);
  ASSERT(attDef != 0);
  size_t attDefLength = attDef->size();
  for (size_t i = checkFrom; i < attDefLength; i++) {
    const AttributeDefinition *p = attDef->def(i);
    if (p->isConref())
      conref = 1;
    if (p->isNotation()
	&& edef->declaredContent() == ElementDefinition::empty)
      message(ParserMessages::notationEmpty, StringMessageArg(e->name()));
  }
  if (conref) {
#if 0
    if (edef->omittedTagSpec() && !edef->canOmitEndTag()
	&& options().warnShould)
      message(ParserMessages::conrefOmitEndTag, StringMessageArg(e->name()));
#endif
    if (edef->declaredContent() == ElementDefinition::empty)
      message(ParserMessages::conrefEmpty, StringMessageArg(e->name()));
  }
}

ElementType *Parser::lookupCreateElement(const StringC &name)
{
  ElementType *e = defDtd().lookupElementType(name);
  if (!e) {
    if (haveDefLpd()) 
      message(ParserMessages::noSuchSourceElement, StringMessageArg(name));
    else {
      e = new ElementType(name, defDtd().allocElementTypeIndex());
      defDtd().insertElementType(e);
    }
  }
  return e;
}

RankStem *Parser::lookupCreateRankStem(const StringC &name)
{
  RankStem *r = defDtd().lookupRankStem(name);
  if (!r) {
    r = new RankStem(name, defDtd().nRankStem());
    defDtd().insertRankStem(r);
    const ElementType *e = defDtd().lookupElementType(name);
    if (e && e->definition() != 0)
      message(ParserMessages::rankStemGenericIdentifier, StringMessageArg(name));
  }
  return r;
}

Boolean Parser::parseExceptions(unsigned declInputLevel,
				Ptr<ElementDefinition> &def)
{
  Param parm;
  static AllowedParams
    allowExceptionsMdc(Param::mdc, Param::exclusions, Param::inclusions);
  if (!parseParam(allowExceptionsMdc, declInputLevel, parm))
    return 0;
  if (parm.type == Param::exclusions) {
    if (options().warnExclusion)
      message(ParserMessages::exclusion);
    def->setExclusions(parm.elementVector);
    static AllowedParams allowInclusionsMdc(Param::mdc, Param::inclusions);
    if (!parseParam(allowInclusionsMdc, declInputLevel, parm))
      return 0;
  }
  if (parm.type == Param::inclusions) {
    if (options().warnInclusion)
      message(ParserMessages::inclusion);
    def->setInclusions(parm.elementVector);
    size_t nI = def->nInclusions();
    size_t nE = def->nExclusions();
    if (nE) {
      for (size_t i = 0; i < nI; i++) {
	const ElementType *e = def->inclusion(i);
	for (size_t j = 0; j < nE; j++)
	  if (def->exclusion(j) == e)
	    message(ParserMessages::excludeIncludeSame,
		    StringMessageArg(e->name()));
      }
    }
    if (!parseParam(allowMdc, declInputLevel, parm))
      return 0;
  }
  return 1;
}

Boolean Parser::parseAttlistDecl()
{
  unsigned declInputLevel = inputLevel();
  Param parm;
  size_t attcnt = 0;
  size_t idIndex = size_t(-1);
  size_t notationIndex = size_t(-1);
  Boolean anyCurrent = 0;

  Boolean isNotation;
  Vector<Attributed *> attributed;
  if (!parseAttributed(declInputLevel, parm, attributed, isNotation))
    return 0;
  Vector<CopyOwner<AttributeDefinition> > defs;
  if (!parseParam(sd().www() ? allowNameMdc : allowName, declInputLevel, parm))
    return 0;
  while (parm.type != Param::mdc) {
    StringC attributeName;
    StringC origAttributeName;
    parm.token.swap(attributeName);
    parm.origToken.swap(origAttributeName);
    attcnt++;
    Boolean duplicate = 0;
    size_t i;
    for (i = 0; i < defs.size(); i++)
      if (defs[i]->name() == attributeName) {
	message(ParserMessages::duplicateAttributeDef,
		StringMessageArg(attributeName));
	duplicate = 1;
	break;
      }
    Owner<DeclaredValue> declaredValue;
    if (!parseDeclaredValue(declInputLevel, isNotation, parm, declaredValue))
      return 0;
    if (!duplicate) {
      if (declaredValue->isId()) {
	if (idIndex != size_t(-1))
	  message(ParserMessages::multipleIdAttributes,
		  StringMessageArg(defs[idIndex]->name()));
	idIndex = defs.size();
      }
      else if (declaredValue->isNotation()) {
	if (notationIndex != size_t(-1))
	  message(ParserMessages::multipleNotationAttributes,
		  StringMessageArg(defs[notationIndex]->name()));
	notationIndex = defs.size();
      }
    }
    const Vector<StringC> *tokensPtr = declaredValue->getTokens();
    if (tokensPtr) {
      size_t nTokens = tokensPtr->size();
      if (!sd().www()) {
	Vector<StringC>::const_iterator tokens = tokensPtr->begin();
	for (i = 0; i < nTokens; i++) {
	  for (size_t j = 0; j < defs.size(); j++)
	    if (defs[j]->containsToken(tokens[i])) {
	      message(ParserMessages::duplicateAttributeToken,
		      StringMessageArg(tokens[i]));
	      break;
	    }
	}
      }
      attcnt += nTokens;
    }
    Owner<AttributeDefinition> def;
    if (!parseDefaultValue(declInputLevel, isNotation, parm, attributeName,
			   declaredValue, def, anyCurrent))
      return 0;
    if (haveDefLpd() && defLpd().type() == Lpd::simpleLink && !def->isFixed())
      message(ParserMessages::simpleLinkFixedAttribute);
    def->setOrigName(origAttributeName);
    if (!duplicate) {
      defs.resize(defs.size() + 1);
      defs.back() = def.extract();
    }
    static AllowedParams allowNameMdc(Param::name, Param::mdc);
    if (!parseParam(allowNameMdc, declInputLevel, parm))
      return 0;
  }
  if (attcnt > syntax().attcnt())
    message(ParserMessages::attcnt,
	    NumberMessageArg(attcnt),
	    NumberMessageArg(syntax().attcnt()));
  if (haveDefLpd() && !isNotation) {
    if (defLpd().type() == Lpd::simpleLink) {
      for (size_t i = 0; i < attributed.size(); i++) {
	const ElementType *e = (const ElementType *)attributed[i];
	if (e) {
	  if (e->name() == defLpd().sourceDtd()->name()) {
	    SimpleLpd &lpd = (SimpleLpd &)defLpd();
	    if (lpd.attributeDef().isNull())
	      lpd.setAttributeDef(new AttributeDefinitionList(defs, 0));
	    else
	      message(ParserMessages::duplicateAttlistElement,
		      StringMessageArg(e->name()));
	  }
	  else
	    message(ParserMessages::simpleLinkAttlistElement,
		    StringMessageArg(e->name()));
	}
      }
    }
    else {
      Ptr<AttributeDefinitionList>
	adl(new AttributeDefinitionList(defs,
					defComplexLpd()
					.allocAttributeDefinitionListIndex()));
      for (size_t i = 0; i < attributed.size(); i++) {
	const ElementType *e = (const ElementType *)attributed[i];
	if (e) {
	  if (defComplexLpd().attributeDef(e).isNull())
	    defComplexLpd().setAttributeDef(e, adl);
	  else
	    message(ParserMessages::duplicateAttlistElement,
		    StringMessageArg(e->name()));
	}
      }
    }
  }
  else {
    Ptr<AttributeDefinitionList>
      adl(new AttributeDefinitionList(defs,
				      defDtd()
				      .allocAttributeDefinitionListIndex(),
				      anyCurrent,
				      idIndex,
				      notationIndex));
    for (size_t i = 0; i < attributed.size(); i++) {
      if (attributed[i]->attributeDef().isNull()) {
	attributed[i]->setAttributeDef(adl);
	if (!isNotation) {
	  ElementType *e = (ElementType *)attributed[i];
	  if (e->definition() != 0)
	    checkElementAttribute(e);
	}
      }
      else if (options().errorAfdr && !sd().www()) {
	if (isNotation)
	  message(ParserMessages::duplicateAttlistNotation,
		  StringMessageArg(((Notation *)attributed[i])->name()));
	else
	  message(ParserMessages::duplicateAttlistElement,
		  StringMessageArg(((ElementType *)attributed[i])->name()));
      }
      else {
	if (!hadAfdrDecl() && !sd().www()) {
	  message(ParserMessages::missingAfdrDecl);
	  setHadAfdrDecl();
	}
	AttributeDefinitionList *curAdl;
	{
	  // Use block to make sure temporary gets destroyed.
	  curAdl = attributed[i]->attributeDef().pointer();
	}
	size_t oldSize = curAdl->size();
	if (curAdl->count() != 1) {
	  Vector<CopyOwner<AttributeDefinition> > copy(oldSize);
	  for (size_t j = 0; j < oldSize; j++)
	    copy[j] = curAdl->def(j)->copy();
	  Ptr<AttributeDefinitionList> adlCopy
	    = new AttributeDefinitionList(copy,
					  defDtd().allocAttributeDefinitionListIndex(),
					  curAdl->anyCurrent(),
					  curAdl->idIndex(),
					  curAdl->notationIndex());
	  attributed[i]->setAttributeDef(adlCopy);
	  curAdl = adlCopy.pointer();
	}
	for (size_t j = 0; j < adl->size(); j++) {
	  unsigned index;
	  if (!curAdl->attributeIndex(adl->def(j)->name(), index)) {
            index = curAdl->idIndex();
            if (index != -1 && adl->def(j)->isId())
              message(ParserMessages::multipleIdAttributes,
                      StringMessageArg(curAdl->def(index)->name()));
            index = curAdl->notationIndex();
            if (index != -1 && adl->def(j)->isNotation())
              message(ParserMessages::multipleNotationAttributes,
                      StringMessageArg(curAdl->def(index)->name()));
	    curAdl->append(adl->def(j)->copy());
          }
          else {
            Boolean tem;
            if (curAdl->def(index)->isSpecified(tem))
              message(ParserMessages::specifiedAttributeRedeclared,
                      StringMessageArg(adl->def(j)->name()));
          }
	}
	if (!isNotation) {
	  ElementType *e = (ElementType *)attributed[i];
	  if (e->definition() != 0)
	    checkElementAttribute(e, oldSize);
	}
      }
    }
  }
  if (currentMarkup()) {
    if (isNotation) {
      Vector<ConstPtr<Notation> > v(attributed.size());
      for (size_t i = 0; i < attributed.size(); i++)
	v[i] = (Notation *)attributed[i];
      eventHandler()
	.attlistNotationDecl(new (eventAllocator())
			     AttlistNotationDeclEvent(v,
						      markupLocation(),
						      currentMarkup()));
    }
    else {
      Vector<const ElementType *> v(attributed.size());
      for (size_t i = 0; i < attributed.size(); i++)
	v[i] = (ElementType *)attributed[i];
      if (haveDefLpd())
	eventHandler()
	  .linkAttlistDecl(new (eventAllocator())
			   LinkAttlistDeclEvent(v,
						defLpdPointer(),
						markupLocation(),
						currentMarkup()));
      else
	eventHandler().attlistDecl(new (eventAllocator())
				   AttlistDeclEvent(v,
						    currentDtdPointer(),
						    markupLocation(),
						    currentMarkup()));
    }
  }
  if (isNotation) {
    Dtd::EntityIter entityIter(defDtd().generalEntityIter());
    for (;;) {
      Ptr<Entity> entity(entityIter.next());
      if (entity.isNull())
	break;
      const ExternalDataEntity *external = entity->asExternalDataEntity();
      if (external) {
	const Notation *entityNotation = external->notation();
	for (size_t  i = 0; i < attributed.size(); i++)
	  if ((Notation *)attributed[i] == entityNotation) {
	    AttributeList attributes(entityNotation->attributeDef());
	    attributes.finish(*this);
	    ((ExternalDataEntity *)entity.pointer())
	      ->setNotation((Notation *)attributed[i], attributes);
	  }
      }
    }
  }
  return 1;
}


Boolean Parser::parseAttributed(unsigned declInputLevel,
				Param &parm,
				Vector<Attributed *> &attributed,
				Boolean &isNotation)
{
  static AllowedParams
    allowNameGroupNotation(Param::name,
			   Param::nameGroup,
			   Param::indicatedReservedName + Syntax::rNOTATION);
  static AllowedParams
    allowNameGroupNotationAll(Param::name,
			      Param::nameGroup,
			      Param::indicatedReservedName
			      + Syntax::rNOTATION,
			      Param::indicatedReservedName
			      + Syntax::rALL,
			      Param::indicatedReservedName
			      + Syntax::rIMPLICIT);
  if (!parseParam(haveDefLpd()
		  ? allowNameGroupNotation
		  : allowNameGroupNotationAll,
		  declInputLevel, parm))
    return 0;
  if (parm.type == Param::indicatedReservedName + Syntax::rNOTATION) {
    if (options().warnDataAttributes)
      message(ParserMessages::dataAttributes);
    isNotation = 1;
    static AllowedParams
      allowNameGroupAll(Param::name,
			Param::nameGroup,
			Param::indicatedReservedName + Syntax::rALL,
			Param::indicatedReservedName + Syntax::rIMPLICIT);
    if (!parseParam(haveDefLpd()
		    ? allowNameNameGroup
		    : allowNameGroupAll,
		    declInputLevel, parm))
      return 0;
    if (parm.type == Param::nameGroup) {
      attributed.resize(parm.nameTokenVector.size());
      for (size_t i = 0; i < attributed.size(); i++)
	attributed[i] = lookupCreateNotation(parm.nameTokenVector[i].name);
    }
    else {
      if (parm.type != Param::name && !hadAfdrDecl() && !sd().www()) {
	message(ParserMessages::missingAfdrDecl);
	setHadAfdrDecl();
      }
      attributed.resize(1);
      attributed[0]
	= lookupCreateNotation(parm.type == Param::name
			       ? parm.token
			       : syntax().rniReservedName(Syntax::ReservedName(parm.type - Param::indicatedReservedName)));
    }
  }
  else {
    isNotation = 0;
    if (parm.type == Param::nameGroup) {
      if (options().warnAttlistGroupDecl)
	message(ParserMessages::attlistGroupDecl);
      attributed.resize(parm.nameTokenVector.size());
      for (size_t i = 0; i < attributed.size(); i++)
	attributed[i] = lookupCreateElement(parm.nameTokenVector[i].name);
    }
    else {
      if (parm.type != Param::name && !hadAfdrDecl() && !sd().www()) {
	message(ParserMessages::missingAfdrDecl);
	setHadAfdrDecl();
      }
      attributed.resize(1);
      attributed[0]
	= lookupCreateElement(parm.type == Param::name
			      ? parm.token
			      : syntax().rniReservedName(Syntax::ReservedName(parm.type - Param::indicatedReservedName)));
    }
  }
  return 1;
}

Boolean Parser::parseDeclaredValue(unsigned declInputLevel,
				   Boolean isNotation,
				   Param &parm,
				   Owner<DeclaredValue> &declaredValue)
{
  static Param::Type declaredValues[] = {
    Param::reservedName + Syntax::rCDATA,
    Param::reservedName + Syntax::rENTITY,
    Param::reservedName + Syntax::rENTITIES,
    Param::reservedName + Syntax::rID,
    Param::reservedName + Syntax::rIDREF,
    Param::reservedName + Syntax::rIDREFS,
    Param::reservedName + Syntax::rNAME,
    Param::reservedName + Syntax::rNAMES,
    Param::reservedName + Syntax::rNMTOKEN,
    Param::reservedName + Syntax::rNMTOKENS,
    Param::reservedName + Syntax::rNUMBER,
    Param::reservedName + Syntax::rNUMBERS,
    Param::reservedName + Syntax::rNUTOKEN,
    Param::reservedName + Syntax::rNUTOKENS,
    Param::reservedName + Syntax::rNOTATION,
    Param::nameTokenGroup,
    Param::reservedName + Syntax::rDATA
    };
  static AllowedParams allowDeclaredValue(declaredValues,
					  SIZEOF(declaredValues) - 1);
  static AllowedParams allowDeclaredValueData(declaredValues,
					      SIZEOF(declaredValues));
  if (!parseParam(sd().www() ? allowDeclaredValueData : allowDeclaredValue,
                  declInputLevel, parm))
    return 0;
  enum { asDataAttribute = 01, asLinkAttribute = 02 };
  unsigned allowedFlags = asDataAttribute|asLinkAttribute;
  switch (parm.type) {
  case Param::reservedName + Syntax::rCDATA:
    declaredValue = new CdataDeclaredValue;
    break;
  case Param::reservedName + Syntax::rENTITY:
    declaredValue = new EntityDeclaredValue(0);
    allowedFlags = asLinkAttribute;
    break;
  case Param::reservedName + Syntax::rENTITIES:
    declaredValue = new EntityDeclaredValue(1);
    allowedFlags = asLinkAttribute;
    break;
  case Param::reservedName + Syntax::rID:
    declaredValue = new IdDeclaredValue;
    allowedFlags = 0;
    break;
  case Param::reservedName + Syntax::rIDREF:
    declaredValue = new IdrefDeclaredValue(0);
    allowedFlags = 0;
    break;
  case Param::reservedName + Syntax::rIDREFS:
    declaredValue = new IdrefDeclaredValue(1);
    allowedFlags = 0;
    break;
  case Param::reservedName + Syntax::rNAME:
    declaredValue
      = new TokenizedDeclaredValue(TokenizedDeclaredValue::name, 0);
    if (options().warnNameDeclaredValue)
      message(ParserMessages::nameDeclaredValue);
    break;
  case Param::reservedName + Syntax::rNAMES:
    declaredValue
      = new TokenizedDeclaredValue(TokenizedDeclaredValue::name, 1);
    if (options().warnNameDeclaredValue)
      message(ParserMessages::nameDeclaredValue);
    break;
  case Param::reservedName + Syntax::rNMTOKEN:
    declaredValue
      = new TokenizedDeclaredValue(TokenizedDeclaredValue::nameToken, 0);
    break;
  case Param::reservedName + Syntax::rNMTOKENS:
    declaredValue
      = new TokenizedDeclaredValue(TokenizedDeclaredValue::nameToken, 1);
    break;
  case Param::reservedName + Syntax::rNUMBER:
    declaredValue
      = new TokenizedDeclaredValue(TokenizedDeclaredValue::number, 0);
    if (options().warnNumberDeclaredValue)
      message(ParserMessages::numberDeclaredValue);
    break;
  case Param::reservedName + Syntax::rNUMBERS:
    declaredValue
      = new TokenizedDeclaredValue(TokenizedDeclaredValue::number, 1);
    if (options().warnNumberDeclaredValue)
      message(ParserMessages::numberDeclaredValue);
    break;
  case Param::reservedName + Syntax::rNUTOKEN:
    declaredValue
      = new TokenizedDeclaredValue(TokenizedDeclaredValue::numberToken, 0);
    if (options().warnNutokenDeclaredValue)
      message(ParserMessages::nutokenDeclaredValue);
    break;
  case Param::reservedName + Syntax::rNUTOKENS:
    declaredValue
      = new TokenizedDeclaredValue(TokenizedDeclaredValue::numberToken, 1);
    if (options().warnNutokenDeclaredValue)
      message(ParserMessages::nutokenDeclaredValue);
    break;
  case Param::reservedName + Syntax::rNOTATION:
    {
      static AllowedParams allowNameGroup(Param::nameGroup);
      if (!parseParam(allowNameGroup, declInputLevel, parm))
	return 0;
      Vector<StringC> group(parm.nameTokenVector.size());
      for (size_t i = 0; i < group.size(); i++)
	parm.nameTokenVector[i].name.swap(group[i]);
      declaredValue = new NotationDeclaredValue(group);
      allowedFlags = 0;
    }
    break;
  case Param::nameTokenGroup:
    {
      Vector<StringC> group(parm.nameTokenVector.size());
      Vector<StringC> origGroup(parm.nameTokenVector.size());
      for (size_t i = 0; i < group.size(); i++) {
	parm.nameTokenVector[i].name.swap(group[i]);
	parm.nameTokenVector[i].origName.swap(origGroup[i]);
      }
      GroupDeclaredValue *grpVal = new NameTokenGroupDeclaredValue(group);
      grpVal->setOrigAllowedValues(origGroup);
      declaredValue = grpVal;
    }
    break;
  case Param::reservedName + Syntax::rDATA:
    {
      if (!parseParam(allowName, declInputLevel, parm))
        return 0;
      Ptr<Notation> notation(lookupCreateNotation(parm.token));
      static AllowedParams allowDsoSilentValue(Param::dso, Param::silent);
      AttributeList attributes(notation->attributeDef());
      if (parseParam(allowDsoSilentValue, declInputLevel, parm)
          && parm.type == Param::dso) {
        if (attributes.size() == 0 && !sd().www())
	  message(ParserMessages::notationNoAttributes,
                  StringMessageArg(notation->name()));
        Boolean netEnabling;
        Ptr<AttributeDefinitionList> newAttDef;
        if (!parseAttributeSpec(asMode, attributes, netEnabling, newAttDef))
          return 0;
        if (!newAttDef.isNull()) {
          newAttDef->setIndex(defDtd().allocAttributeDefinitionListIndex());
          notation->setAttributeDef(newAttDef);
        }
        if (attributes.nSpec() == 0)
          message(ParserMessages::emptyDataAttributeSpec);
      }
      else {
        attributes.finish(*this);
        // unget the first token of the default value
        currentInput()->ungetToken();
      }
      ConstPtr<Notation> nt(notation.pointer());
      declaredValue = new DataDeclaredValue(nt, attributes);
    }
    break;
  default:
    CANNOT_HAPPEN();
  }
  if (isNotation) {
    if (!(allowedFlags & asDataAttribute))
      message(ParserMessages::dataAttributeDeclaredValue);
  }
  else if (haveDefLpd() && !isNotation && !(allowedFlags & asLinkAttribute))
    message(ParserMessages::linkAttributeDeclaredValue);
  return 1;
}

Boolean Parser::parseDefaultValue(unsigned declInputLevel,
				  Boolean isNotation,
				  Param &parm,
				  const StringC &attributeName,
				  Owner<DeclaredValue> &declaredValue,
				  Owner<AttributeDefinition> &def,
				  Boolean &anyCurrent)
{
  // default value
  static AllowedParams
    allowDefaultValue(Param::indicatedReservedName + Syntax::rFIXED,
		      Param::indicatedReservedName + Syntax::rREQUIRED,
		      Param::indicatedReservedName + Syntax::rCURRENT,
		      Param::indicatedReservedName + Syntax::rCONREF,
		      Param::indicatedReservedName + Syntax::rIMPLIED,
		      Param::attributeValue,
		      Param::attributeValueLiteral);
  static AllowedParams
    allowTokenDefaultValue(Param::indicatedReservedName + Syntax::rFIXED,
		      Param::indicatedReservedName + Syntax::rREQUIRED,
		      Param::indicatedReservedName + Syntax::rCURRENT,
		      Param::indicatedReservedName + Syntax::rCONREF,
		      Param::indicatedReservedName + Syntax::rIMPLIED,
		      Param::attributeValue,
		      Param::tokenizedAttributeValueLiteral);
  if (!parseParam(declaredValue->tokenized()
		  ? allowTokenDefaultValue
		  : allowDefaultValue, declInputLevel, parm))
    return 0;
  switch (parm.type) {
  case Param::indicatedReservedName + Syntax::rFIXED:
    {
      static AllowedParams allowValue(Param::attributeValue,
				      Param::attributeValueLiteral);
      static AllowedParams
	allowTokenValue(Param::attributeValue,
			Param::tokenizedAttributeValueLiteral);
      if (!parseParam(declaredValue->tokenized()
		      ? allowTokenValue
		      : allowValue, declInputLevel, parm))
	return 0;
      unsigned specLength = 0;
      AttributeValue *value = declaredValue->makeValue(parm.literalText,
						       *this,
						       attributeName,
						       specLength);
      if (declaredValue->isId())
	message(ParserMessages::idDeclaredValue);
      def = new FixedAttributeDefinition(attributeName,
					 declaredValue.extract(),
					 value);
    }
    break;
  case Param::attributeValue:
    if (options().warnAttributeValueNotLiteral)
      message(ParserMessages::attributeValueNotLiteral);
    // fall through
  case Param::attributeValueLiteral:
  case Param::tokenizedAttributeValueLiteral:
    {
      unsigned specLength = 0;
      AttributeValue *value = declaredValue->makeValue(parm.literalText,
						       *this,
						       attributeName,
						       specLength);
      if (declaredValue->isId())
	message(ParserMessages::idDeclaredValue);
      def = new DefaultAttributeDefinition(attributeName,
					   declaredValue.extract(),
					   value);
    }
    break;
  case Param::indicatedReservedName + Syntax::rREQUIRED:
    def = new RequiredAttributeDefinition(attributeName,
					  declaredValue.extract());
    break;
  case Param::indicatedReservedName + Syntax::rCURRENT:
    anyCurrent = 1;
    if (declaredValue->isId())
      message(ParserMessages::idDeclaredValue);
    def = new CurrentAttributeDefinition(attributeName,
					 declaredValue.extract(),
					 defDtd().allocCurrentAttributeIndex());
    if (isNotation)
      message(ParserMessages::dataAttributeDefaultValue);
    else if (haveDefLpd())
      message(ParserMessages::linkAttributeDefaultValue);
    else if (options().warnCurrent)
      message(ParserMessages::currentAttribute);
    break;
  case Param::indicatedReservedName + Syntax::rCONREF:
    if (declaredValue->isId())
      message(ParserMessages::idDeclaredValue);
    if (declaredValue->isNotation())
      message(ParserMessages::notationConref);
    def = new ConrefAttributeDefinition(attributeName,
					declaredValue.extract());
    if (isNotation)
      message(ParserMessages::dataAttributeDefaultValue);
    else if (haveDefLpd())
      message(ParserMessages::linkAttributeDefaultValue);
    else if (options().warnConref)
      message(ParserMessages::conrefAttribute);
    break;
  case Param::indicatedReservedName + Syntax::rIMPLIED:
    def = new ImpliedAttributeDefinition(attributeName,
					 declaredValue.extract());
    break;
  default:
    CANNOT_HAPPEN();
  }
  return 1;
}

// parm contains either system or public

Boolean Parser::parseExternalId(const AllowedParams &sysidAllow,
				const AllowedParams &endAllow,
				Boolean maybeWarnMissingSystemId,
				unsigned declInputLevel,
				Param &parm,
				ExternalId &id)
{
  id.setLocation(currentLocation());
  if (parm.type == Param::reservedName + Syntax::rPUBLIC) {
    static AllowedParams allowMinimumLiteral(Param::minimumLiteral);
    if (!parseParam(allowMinimumLiteral, declInputLevel, parm))
      return 0;
    const MessageType1 *fpierr;
    const MessageType1 *urnerr;
    switch (id.setPublic(parm.literalText, sd().internalCharset(), 
                         syntax().space(), fpierr, urnerr)) {
    case PublicId::fpi: 
      {
        PublicId::TextClass textClass;
        if (sd().formal() && id.publicId()->getTextClass(textClass) && textClass == PublicId::SD)
  	  message(ParserMessages::wwwRequired);
        if (sd().urn() && !sd().formal()) 
          message(*urnerr, StringMessageArg(*id.publicIdString()));
      }
      break;
    case PublicId::urn:
      if (sd().formal() && !sd().urn()) 
        message(*fpierr, StringMessageArg(*id.publicIdString()));
      break;
    case PublicId::informal:
      if (sd().formal())
        message(*fpierr, StringMessageArg(*id.publicIdString()));
      if (sd().urn())
        message(*urnerr, StringMessageArg(*id.publicIdString()));
      break;
    }
  }
  if (!parseParam(sysidAllow, declInputLevel, parm))
    return 0;
  if (parm.type == Param::systemIdentifier) {
    id.setSystem(parm.literalText);
    if (!parseParam(endAllow, declInputLevel, parm))
      return 0;
  }
  else if (options().warnMissingSystemId && maybeWarnMissingSystemId)
    message(ParserMessages::missingSystemId);
  return 1;
}

Boolean Parser::parseNotationDecl()
{
  unsigned declInputLevel = inputLevel();
  Param parm;
  if (!parseParam(allowName, declInputLevel, parm))
    return 0;
  Notation *nt = lookupCreateNotation(parm.token);
  if (validate() && nt->defined())
    message(ParserMessages::duplicateNotationDeclaration,
	    StringMessageArg(parm.token));
  AttributeDefinitionList *atts = nt->attributeDef().pointer();
  if (atts) 
    for (size_t i = 0; i < atts->size(); i++) {
      Boolean implicit;
      if (atts->def(i)->isSpecified(implicit) && implicit) {
        message(ParserMessages::notationMustNotBeDeclared,
                StringMessageArg(parm.token));
        break;
      }
    }
  static AllowedParams
    allowPublicSystem(Param::reservedName + Syntax::rPUBLIC,
		      Param::reservedName + Syntax::rSYSTEM);
  if (!parseParam(allowPublicSystem, declInputLevel, parm))
    return 0;


  static AllowedParams allowSystemIdentifierMdc(Param::systemIdentifier,
						Param::mdc);

  ExternalId id;
  if (!parseExternalId(allowSystemIdentifierMdc, allowMdc,
		       parm.type == Param::reservedName + Syntax::rSYSTEM,
		       declInputLevel, parm, id))
    return 0;
  if (validate() && sd().formal()) {
    PublicId::TextClass textClass;
    const PublicId *publicId = id.publicId();
    if (publicId
	&& publicId->getTextClass(textClass)
	&& textClass != PublicId::NOTATION)
      message(ParserMessages::notationIdentifierTextClass);
  }
  if (!nt->defined()) {
    nt->setExternalId(id, markupLocation());
    nt->generateSystemId(*this);
    if (currentMarkup())
      eventHandler().notationDecl(new (eventAllocator())
				  NotationDeclEvent(nt, markupLocation(),
						    currentMarkup()));
  }
  return 1;
}

Boolean Parser::parseEntityDecl()
{
  unsigned declInputLevel = inputLevel();
  Param parm;

  static AllowedParams
    allowEntityNamePero(Param::entityName,
			Param::indicatedReservedName + Syntax::rDEFAULT,
			Param::pero);

  if (!parseParam(allowEntityNamePero, declInputLevel, parm))
    return 0;

  Entity::DeclType declType;
  StringC name;			// empty for default entity
  if (parm.type == Param::pero) {
    declType = Entity::parameterEntity;
    static AllowedParams allowParamEntityName(Param::paramEntityName);
    if (!parseParam(allowParamEntityName, declInputLevel, parm))
      return 0;
    parm.token.swap(name);
  }
  else {
    declType = Entity::generalEntity;
    if (parm.type == Param::entityName)
      parm.token.swap(name);
    else if (sd().implydefEntity())
      message(ParserMessages::implydefEntityDefault);
    else if (options().warnDefaultEntityDecl)
      message(ParserMessages::defaultEntityDecl);
  }
  static AllowedParams
    allowEntityTextType(Param::paramLiteral,
			Param::reservedName + Syntax::rCDATA,
			Param::reservedName + Syntax::rSDATA,
			Param::reservedName + Syntax::rPI,
			Param::reservedName + Syntax::rSTARTTAG,
			Param::reservedName + Syntax::rENDTAG,
			Param::reservedName + Syntax::rMS,
			Param::reservedName + Syntax::rMD,
			Param::reservedName + Syntax::rSYSTEM,
			Param::reservedName + Syntax::rPUBLIC);

  if (!parseParam(allowEntityTextType, declInputLevel, parm))
    return 0;
  Location typeLocation(currentLocation());
  Entity::DataType dataType = Entity::sgmlText;
  InternalTextEntity::Bracketed bracketed = InternalTextEntity::none;
  switch (parm.type) {
  case Param::reservedName + Syntax::rSYSTEM:
  case Param::reservedName + Syntax::rPUBLIC:
    return parseExternalEntity(name, declType, declInputLevel, parm);
  case Param::reservedName + Syntax::rCDATA:
    dataType = Entity::cdata;
    if (options().warnInternalCdataEntity)
      message(ParserMessages::internalCdataEntity);
    break;
  case Param::reservedName + Syntax::rSDATA:
    dataType = Entity::sdata;
    if (options().warnInternalSdataEntity)
      message(ParserMessages::internalSdataEntity);
    break;
  case Param::reservedName + Syntax::rPI:
    dataType = Entity::pi;
    if (options().warnPiEntity)
      message(ParserMessages::piEntity);
    break;
  case Param::reservedName + Syntax::rSTARTTAG:
    bracketed = InternalTextEntity::starttag;
    if (options().warnBracketEntity)
      message(ParserMessages::bracketEntity);
    break;
  case Param::reservedName + Syntax::rENDTAG:
    bracketed = InternalTextEntity::endtag;
    if (options().warnBracketEntity)
      message(ParserMessages::bracketEntity);
    break;
  case Param::reservedName + Syntax::rMS:
    bracketed = InternalTextEntity::ms;
    if (options().warnBracketEntity)
      message(ParserMessages::bracketEntity);
    break;
  case Param::reservedName + Syntax::rMD:
    bracketed = InternalTextEntity::md;
    if (options().warnBracketEntity)
      message(ParserMessages::bracketEntity);
    break;
  }
  if (parm.type != Param::paramLiteral) {
    if (!parseParam(allowParamLiteral, declInputLevel, parm))
      return 0;
  }
  Text text;
  parm.literalText.swap(text);
  if (bracketed != InternalTextEntity::none) {
    StringC open;
    StringC close;
    switch (bracketed) {
    case InternalTextEntity::starttag:
      open = instanceSyntax().delimGeneral(Syntax::dSTAGO);
      close = instanceSyntax().delimGeneral(Syntax::dTAGC);
      break;
    case InternalTextEntity::endtag:
      open = instanceSyntax().delimGeneral(Syntax::dETAGO);
      close = instanceSyntax().delimGeneral(Syntax::dTAGC);
      break;
    case InternalTextEntity::ms: {
      const Syntax &syn = 
	(declType == Entity::parameterEntity) ? syntax() : instanceSyntax();
      open = syn.delimGeneral(Syntax::dMDO);
      open += syn.delimGeneral(Syntax::dDSO);
      close = syn.delimGeneral(Syntax::dMSC);
      close += syn.delimGeneral(Syntax::dMDC);
      break;
    }
    case InternalTextEntity::md: {
      const Syntax &syn = 
	(declType == Entity::parameterEntity) ? syntax() : instanceSyntax();
      open = syn.delimGeneral(Syntax::dMDO);
      close = syn.delimGeneral(Syntax::dMDC);
      break;
    }
    default:
      CANNOT_HAPPEN();
    }
    text.insertChars(open, Location(new BracketOrigin(typeLocation,
						      BracketOrigin::open),
				    0));
    text.addChars(close, Location(new BracketOrigin(typeLocation,
						    BracketOrigin::close),
				  0));
    if (text.size() > syntax().litlen()
	&& text.size() - open.size() - close.size() <= syntax().litlen())
      message(ParserMessages::bracketedLitlen,
	      NumberMessageArg(syntax().litlen()));
  }
  if (!parseParam(allowMdc, declInputLevel, parm))
    return 0;
  if (declType == Entity::parameterEntity
      && (dataType == Entity::cdata || dataType == Entity::sdata)) {
    message(ParserMessages::internalParameterDataEntity,
	    StringMessageArg(name));
    return 1;
  }
  Ptr<Entity> entity;
  switch (dataType) {
  case Entity::cdata:
    entity = new InternalCdataEntity(name, markupLocation(), text);
    break;
  case Entity::sdata:
    entity = new InternalSdataEntity(name, markupLocation(), text);
    break;
  case Entity::pi:
    entity = new PiEntity(name, declType, markupLocation(), text);
    break;
  case Entity::sgmlText:
    entity = new InternalTextEntity(name, declType, markupLocation(), text, bracketed);
    break;
  default:
    CANNOT_HAPPEN();
    break;
  }
  maybeDefineEntity(entity);
  return 1;
}

Boolean Parser::parseExternalEntity(StringC &name,
				    Entity::DeclType declType,
				    unsigned declInputLevel,
				    Param &parm)
{
  static AllowedParams
    allowSystemIdentifierEntityTypeMdc(Param::systemIdentifier,
				       Param::reservedName + Syntax::rSUBDOC,
				       Param::reservedName + Syntax::rCDATA,
				       Param::reservedName + Syntax::rSDATA,
				       Param::reservedName + Syntax::rNDATA,
				       Param::mdc);
  static AllowedParams
    allowEntityTypeMdc(Param::reservedName + Syntax::rSUBDOC,
		       Param::reservedName + Syntax::rCDATA,
		       Param::reservedName + Syntax::rSDATA,
		       Param::reservedName + Syntax::rNDATA,
		       Param::mdc);
  
  ExternalId id;
  if (!parseExternalId(allowSystemIdentifierEntityTypeMdc, allowEntityTypeMdc,
		       1, declInputLevel, parm, id))
    return 0;
  if (parm.type == Param::mdc) {
    maybeDefineEntity(new ExternalTextEntity(name, declType, markupLocation(),
					     id));
    return 1;
  }
  Ptr<Entity> entity;
  if (parm.type == Param::reservedName + Syntax::rSUBDOC) {
    if (sd().subdoc() == 0)
      message(ParserMessages::subdocEntity, StringMessageArg(name));
    if (!parseParam(allowMdc, declInputLevel, parm))
      return 0;
    entity = new SubdocEntity(name, markupLocation(), id);
  }
  else {
    Entity::DataType dataType;
    switch (parm.type) {
    case Param::reservedName + Syntax::rCDATA:
      dataType = Entity::cdata;
      if (options().warnExternalCdataEntity)
	message(ParserMessages::externalCdataEntity);
      break;
    case Param::reservedName + Syntax::rSDATA:
      dataType = Entity::sdata;
      if (options().warnExternalSdataEntity)
	message(ParserMessages::externalSdataEntity);
      break;
    case Param::reservedName + Syntax::rNDATA:
      dataType = Entity::ndata;
      break;
    default:
      CANNOT_HAPPEN();
    }
    if (!parseParam(allowName, declInputLevel, parm))
      return 0;
    Ptr<Notation> notation(lookupCreateNotation(parm.token));
    if (!parseParam(allowDsoMdc, declInputLevel, parm))
      return 0;
    AttributeList attributes(notation->attributeDef());
    if (parm.type == Param::dso) {
      if (attributes.size() == 0 && !sd().www()) 
	message(ParserMessages::notationNoAttributes,
		StringMessageArg(notation->name()));
      Boolean netEnabling;
      Ptr<AttributeDefinitionList> newAttDef;
      if (!parseAttributeSpec(asMode, attributes, netEnabling, newAttDef))
	return 0;
      if (!newAttDef.isNull()) {
	newAttDef->setIndex(defDtd().allocAttributeDefinitionListIndex());
	notation->setAttributeDef(newAttDef);
      }
      if (attributes.nSpec() == 0)
	message(ParserMessages::emptyDataAttributeSpec);
      if (!parseParam(allowMdc, declInputLevel, parm))
	return 0;
    }
    else
      attributes.finish(*this);
    entity = new ExternalDataEntity(name, dataType, markupLocation(), id, 
				    notation, attributes, 
				    declType == Entity::parameterEntity 
				    ? Entity::parameterEntity
				    : Entity::generalEntity);
  }
  if (declType == Entity::parameterEntity && !sd().www()) {
    message(ParserMessages::externalParameterDataSubdocEntity,
	    StringMessageArg(name));
    return 1;
  }
  maybeDefineEntity(entity);
  return 1;
}

Notation *Parser::lookupCreateNotation(const StringC &name)
{
  Ptr<Notation> nt = defDtd().lookupNotation(name);
  if (nt.isNull()) {
    nt = new Notation(name, defDtd().namePointer(), defDtd().isBase());
    defDtd().insertNotation(nt);
  }
  return nt.pointer();
}

void Parser::maybeDefineEntity(const Ptr<Entity> &entity)
{
  Dtd &dtd = defDtd();
  if (haveDefLpd())
    entity->setDeclIn(dtd.namePointer(),
		      dtd.isBase(),
		      defLpd().namePointer(),
		      defLpd().active());
  else
    entity->setDeclIn(dtd.namePointer(), dtd.isBase());
  Boolean ignored = 0;
  if (entity->name().size() == 0) {
    const Entity *oldEntity = dtd.defaultEntity().pointer();
    if (oldEntity == 0
	|| (!oldEntity->declInActiveLpd() && entity->declInActiveLpd()))
      dtd.setDefaultEntity(entity, *this);
    else {
      ignored = 1;
      if (options().warnDuplicateEntity)
	message(ParserMessages::duplicateEntityDeclaration,
		StringMessageArg(syntax().rniReservedName(Syntax::rDEFAULT)));
    }
  }
  else {
    Ptr<Entity> oldEntity = dtd.insertEntity(entity);
    if (oldEntity.isNull())
      entity->generateSystemId(*this);
    else if (oldEntity->defaulted()) {
      dtd.insertEntity(entity, 1);
      message(ParserMessages::defaultedEntityDefined,
	      StringMessageArg(entity->name()));
      entity->generateSystemId(*this);
    }
    else {
      if (entity->declInActiveLpd() && !oldEntity->declInActiveLpd()) {
	dtd.insertEntity(entity, 1);
	entity->generateSystemId(*this);
      }
      else {
	ignored = 1;
	if (options().warnDuplicateEntity)
	  message(entity->declType() == Entity::parameterEntity
		  ? ParserMessages::duplicateParameterEntityDeclaration
		  : ParserMessages::duplicateEntityDeclaration,
		  StringMessageArg(entity->name()));
      }
    }
  }
  if (currentMarkup())
    eventHandler().entityDecl(new (eventAllocator())
			      EntityDeclEvent(entity, ignored,
					      markupLocation(),
					      currentMarkup()));
}

Boolean Parser::parseShortrefDecl()
{
  if (!defDtd().isBase())
    message(ParserMessages::shortrefOnlyInBaseDtd);

  unsigned declInputLevel = inputLevel();
  Param parm;

  if (!parseParam(allowName, declInputLevel, parm))
    return 0;
  ShortReferenceMap *map = lookupCreateMap(parm.token);
  int valid = 1;
  if (map->defined()) {
    message(ParserMessages::duplicateShortrefDeclaration,
	    StringMessageArg(parm.token),
	    map->defLocation());
    valid = 0;
  }
  else
    map->setDefLocation(markupLocation());
  if (!parseParam(allowParamLiteral, declInputLevel, parm))
    return 0;
  Vector<StringC> vec;
  do {
    StringC delim(parm.literalText.string());
    instanceSyntax().generalSubstTable()->subst(delim);
    size_t srIndex;
    if (!defDtd().shortrefIndex(delim, instanceSyntax(), srIndex)) {
      message(ParserMessages::unknownShortrefDelim,
	      StringMessageArg(prettifyDelim(delim)));
      valid = 0;
    }
    static AllowedParams allowEntityName(Param::entityName);
    if (!parseParam(allowEntityName, declInputLevel, parm))
      return 0;
    if (valid) {
      if (srIndex >= vec.size())
	vec.resize(srIndex + 1);
      if (vec[srIndex].size() > 0) {
	message(ParserMessages::delimDuplicateMap,
		StringMessageArg(prettifyDelim(delim)));
	valid = 0;
      }
      else
	parm.token.swap(vec[srIndex]);
    }
    static AllowedParams allowParamLiteralMdc(Param::paramLiteral, Param::mdc);
    if (!parseParam(allowParamLiteralMdc, declInputLevel, parm))
      return 0;
  } while (parm.type != Param::mdc);
  if (valid) {
    map->setNameMap(vec);
    if (currentMarkup())
      eventHandler().shortrefDecl(new (eventAllocator())
				  ShortrefDeclEvent(map,
						    currentDtdPointer(),
						    markupLocation(),
						    currentMarkup()));
  }
  return 1;
}

StringC Parser::prettifyDelim(const StringC &delim)
{
  StringC prettyDelim;
  for (size_t i = 0; i < delim.size(); i++) {
    const StringC *nameP;
    if (syntax().charFunctionName(delim[i], nameP)) {
      prettyDelim += syntax().delimGeneral(Syntax::dCRO);
      prettyDelim += *nameP;
      prettyDelim += syntax().delimGeneral(Syntax::dREFC);
    }
    else
      prettyDelim += delim[i];
  }
  return prettyDelim;
}

ShortReferenceMap *Parser::lookupCreateMap(const StringC &name)
{
  ShortReferenceMap *map = defDtd().lookupShortReferenceMap(name);
  if (!map) {
    map = new ShortReferenceMap(name);
    defDtd().insertShortReferenceMap(map);
  }
  return map;
}

Boolean Parser::parseUsemapDecl()
{
  if (!inInstance() && !defDtd().isBase())
    message(ParserMessages::usemapOnlyInBaseDtd);

  unsigned declInputLevel = inputLevel();
  Param parm;
  static AllowedParams
    allowNameEmpty(Param::name,
		   Param::indicatedReservedName + Syntax::rEMPTY);
  if (!parseParam(allowNameEmpty, declInputLevel, parm))
    return 0;
  const ShortReferenceMap *map;
  if (parm.type == Param::name) {
    if (inInstance()) {
      map = currentDtd().lookupShortReferenceMap(parm.token);
      if (!map)
	message(ParserMessages::undefinedShortrefMapInstance,
		StringMessageArg(parm.token));
    }
    else {
      ShortReferenceMap *tem = lookupCreateMap(parm.token);
      tem->setUsed();
      map = tem;
    }
  }
  else
    map = &theEmptyMap;
  static AllowedParams
    allowNameNameGroupMdc(Param::name, Param::nameGroup, Param::mdc);
  if (!parseParam(allowNameNameGroupMdc, declInputLevel, parm))
    return 0;
  if (parm.type != Param::mdc) {
    if (inInstance()) {
      message(ParserMessages::usemapAssociatedElementTypeInstance);
      if (!parseParam(allowMdc, declInputLevel, parm))
	return 0;
    }
    else {
      Vector<const ElementType *> v;
      if (parm.type == Param::name) {
	ElementType *e = lookupCreateElement(parm.token);
	v.push_back(e);
	if (!e->map())
	  e->setMap(map);
      }
      else {
	v.resize(parm.nameTokenVector.size());
	for (size_t i = 0; i < parm.nameTokenVector.size(); i++) {
	  ElementType *e
	    = lookupCreateElement(parm.nameTokenVector[i].name);
	  v[i] = e;
	  if (!e->map())
	    e->setMap(map);
	}
      }
      if (!parseParam(allowMdc, declInputLevel, parm))
	return 0;
      if (currentMarkup())
	eventHandler().usemap(new (eventAllocator())
			      UsemapEvent(map, v,
					  currentDtdPointer(),
					  markupLocation(),
					  currentMarkup()));
    }
  }
  else {
    if (!inInstance())
      message(ParserMessages::usemapAssociatedElementTypeDtd);
    else if (map) {
      if (map != &theEmptyMap && !map->defined())
	message(ParserMessages::undefinedShortrefMapInstance,
		StringMessageArg(map->name()));
      else {
	if (currentMarkup()) {
	  Vector<const ElementType *> v;
	  eventHandler().usemap(new (eventAllocator())
				UsemapEvent(map, v,
					    currentDtdPointer(),
					    markupLocation(),
					    currentMarkup()));
	}
	currentElement().setMap(map);
      }
    }
  }
  return 1;
}

Boolean Parser::parseDoctypeDeclStart()
{
  if (hadDtd() && !sd().concur() && !sd().explicitLink())
    message(ParserMessages::multipleDtds);
  if (hadLpd())
    message(ParserMessages::dtdAfterLpd);
  unsigned declInputLevel = inputLevel();
  Param parm;
  static AllowedParams
    allowImpliedName(Param::indicatedReservedName + Syntax::rIMPLIED,
		     Param::name);
  if (!parseParam(sd().www() ? allowImpliedName : allowName, declInputLevel, parm))
    return 0;
  if (parm.type == Param::indicatedReservedName + Syntax::rIMPLIED) {
    if (sd().concur() > 0 || sd().explicitLink() > 0)
      message(ParserMessages::impliedDoctypeConcurLink);
    message(ParserMessages::sorryImpliedDoctype);
    return 0;
  }
  StringC name;
  parm.token.swap(name);
  if (!lookupDtd(name).isNull())
    message(ParserMessages::duplicateDtd, StringMessageArg(name));
  static AllowedParams
    allowPublicSystemDsoMdc(Param::reservedName + Syntax::rPUBLIC,
			    Param::reservedName + Syntax::rSYSTEM,
			    Param::dso,
			    Param::mdc);
  if (!parseParam(allowPublicSystemDsoMdc, declInputLevel, parm))
    return 0;
  ConstPtr<Entity> entity;
  StringC notation;
  EntityDecl::DataType data;
  ExternalId id;
  if (parm.type == Param::reservedName + Syntax::rPUBLIC
      || parm.type == Param::reservedName + Syntax::rSYSTEM) {
    static AllowedParams allowSystemIdentifierDsoMdc(Param::systemIdentifier,
						     Param::dso, Param::mdc);
    static AllowedParams
      allowSystemIdentifierDsoMdcData(Param::systemIdentifier,
                                      Param::dso, Param::mdc,
                                      Param::reservedName + Syntax::rCDATA,
                                      Param::reservedName + Syntax::rSDATA,
                                      Param::reservedName + Syntax::rNDATA);
    static AllowedParams allowDsoMdcData(Param::dso, Param::mdc,
                                         Param::reservedName + Syntax::rCDATA,
                                         Param::reservedName + Syntax::rSDATA,
                                         Param::reservedName + Syntax::rNDATA);
    if (!parseExternalId(sd().www() ? allowSystemIdentifierDsoMdcData : 
                                      allowSystemIdentifierDsoMdc, 
                         sd().www() ? allowDsoMdcData : allowDsoMdc,
			 1, declInputLevel, parm, id))
      return 0;
    switch (parm.type) {
    case Param::reservedName + Syntax::rCDATA:
      data = Entity::cdata;
      break; 
    case Param::reservedName + Syntax::rSDATA:
      data = Entity::sdata;
      break; 
    case Param::reservedName + Syntax::rNDATA:
      data = Entity::ndata;
      break; 
    default:
      data = Entity::sgmlText;
      break;
    }
    if (data == Entity::sgmlText) {
      Ptr<Entity> tem
	= new ExternalTextEntity(name, Entity::doctype, markupLocation(), id);
      tem->generateSystemId(*this);
      entity = tem;
    }
#if 0
      eventHandler()
        .externalEntityDecl(new (eventAllocator())
  			    ExternalEntityDeclEvent(entity, 0));
#endif
    else {
      // external subset uses some DTD notation
      if (!parseParam(allowName, declInputLevel, parm))
        return 0;
      parm.token.swap(notation);
      if (!parseParam(allowDsoMdc, declInputLevel, parm))
        return 0;
    }
  }
  else 
  // no external subset specified
  if (sd().implydefDoctype()) {
    // FIXME this fails for #IMPLIED, since name isn't yet known
    Ptr<Entity> tem
      = new ExternalTextEntity(name, Entity::doctype, markupLocation(), id);
    tem->generateSystemId(*this);
    entity = tem;
  }
  else if (parm.type == Param::mdc) {
    if (sd().implydefElement() == Sd::implydefElementNo) {
      message(ParserMessages::noDtdSubset);
      enableImplydef();
    }
  }
  // Discard mdc or dso
  if (currentMarkup())
    currentMarkup()->resize(currentMarkup()->size() - 1);
  eventHandler().startDtd(new (eventAllocator())
			  StartDtdEvent(name, entity, parm.type == Param::dso,
					markupLocation(),
					currentMarkup()));
  startDtd(name);
  if (notation.size() > 0) {
    // FIXME this case has the wrong entity in the event 
    // this should be fixed by moving startDtd() call and this code up
    ConstPtr<Notation> nt(lookupCreateNotation(notation)); 
    
    AttributeList attrs(nt->attributeDef());
    attrs.finish(*this); 
    Ptr<Entity> tem 
      = new ExternalDataEntity(name, data, markupLocation(), id, nt, attrs, 
			       Entity::doctype);
    tem->generateSystemId(*this);
    // FIXME This is a hack; we need the entity to have the doctype name to
    // have generateSytemId() work properly, but have an empty name to add
    // it as a parameter entity, which is needed to check the notation
    StringC entname;
    tem->setName(entname);
    defDtd().insertEntity(tem);
    entity = tem;
  }
  if (parm.type == Param::mdc) {
    // unget the mdc
    currentInput()->ungetToken();
    if (entity.isNull()) {
      (void)parseDoctypeDeclEnd();
      return 1;
    }
    // reference the entity
    Ptr<EntityOrigin> origin
      = EntityOrigin::make(internalAllocator(), entity, currentLocation());
    entity->dsReference(*this, origin);
    if (inputLevel() == 1) {	// reference failed
      (void)parseDoctypeDeclEnd();
      return 1;
    }
  }
  else if (!entity.isNull())
    setDsEntity(entity);
  setPhase(declSubsetPhase);
  return 1;
}

void Parser::implyDtd(const StringC &gi)
{
  startMarkup(eventsWanted().wantPrologMarkup(), currentLocation());
#if 0
  if (currentMarkup()) {
    currentMarkup()->addDelim(Syntax::dMDO);
    currentMarkup()->addReservedName(Syntax::rDOCTYPE,
				     syntax().reservedName(Syntax::rDOCTYPE));
    currentMarkup()->addS(syntax().space());
    currentMarkup()->addName(gi.data(), gi.size());
  }
#endif
  if (sd().concur() > 0 || sd().explicitLink() > 0
      || (sd().implydefElement() == Sd::implydefElementNo
          && !sd().implydefDoctype()))
    message(ParserMessages::omittedProlog);

  if ((sd().implydefElement() != Sd::implydefElementNo) && !sd().implydefDoctype()) {
    eventHandler().startDtd(new (eventAllocator())
				  StartDtdEvent(gi, ConstPtr<Entity>(), 0,
					markupLocation(),
					currentMarkup()));
    startDtd(gi);
    parseDoctypeDeclEnd(1);
    return;
  }
  ExternalId id;
  // The null location indicates that this is a fake entity.
  Entity *tem = new ExternalTextEntity(gi, Entity::doctype, Location(), id);
  ConstPtr<Entity> entity(tem);
  if (sd().implydefDoctype())
    tem->generateSystemId(*this);
  else {
    // Don't use Entity::generateSystemId because we don't want an error
    // if it fails.
    StringC str;
    if (!entityCatalog().lookup(*entity, syntax(), sd().internalCharset(),
			        messenger(), str)) {
      message(ParserMessages::noDtd);
      enableImplydef();
      eventHandler().startDtd(new (eventAllocator())
				   StartDtdEvent(gi, ConstPtr<Entity>(), 0,
				                 markupLocation(),
					         currentMarkup()));
      startDtd(gi);
      parseDoctypeDeclEnd(1);
      return;
    }
    id.setEffectiveSystem(str);
#if 0
    if (currentMarkup()) {
      currentMarkup()->addS(syntax().space());
      currentMarkup()->addReservedName(Syntax::rSYSTEM,
				       syntax().reservedName(Syntax::rSYSTEM));
    }
#endif
    entity = new ExternalTextEntity(gi,
				    Entity::doctype,
				    Location(),
				    id);
    StringC declStr;
    declStr += syntax().delimGeneral(Syntax::dMDO);
    declStr += syntax().reservedName(Syntax::rDOCTYPE);
    declStr += syntax().space();
    declStr += gi;
    declStr += syntax().space();
    declStr += syntax().reservedName(Syntax::rSYSTEM);
    declStr += syntax().delimGeneral(Syntax::dMDC);
    message(ParserMessages::implyingDtd, StringMessageArg(declStr));
  }
  Ptr<EntityOrigin> origin
    = EntityOrigin::make(internalAllocator(), entity, currentLocation());
  eventHandler().startDtd(new (eventAllocator())
			  StartDtdEvent(gi, entity, 0,
					markupLocation(),
					currentMarkup()));
  startDtd(gi);
  entity->dsReference(*this, origin);
  if (inputLevel() == 1)
    parseDoctypeDeclEnd(1);
  else
    setPhase(declSubsetPhase);
}

Boolean Parser::parseDoctypeDeclEnd(Boolean fake)
{
  checkDtd(defDtd());
  Ptr<Dtd> tem(defDtdPointer());
  endDtd();
  if (fake) {
    startMarkup(eventsWanted().wantPrologMarkup(), currentLocation());
#if 0
    if (currentMarkup())
      currentMarkup()->addDelim(Syntax::dMDC);
#endif
  }
  else {
    startMarkup(eventsWanted().wantPrologMarkup(), currentLocation());
    Param parm;
    // End DTD before parsing final param so parameter entity reference
    // not allowed between ] and >.
    if (!parseParam(allowMdc, inputLevel(), parm))
      return 0;
  }
  eventHandler().endDtd(new (eventAllocator()) EndDtdEvent(tem,
							   markupLocation(),
							   currentMarkup()));
#if 0
  if (fake) {
    Char c = syntax().standardFunction(Syntax::fRE);
    eventHandler().sSep(new (eventAllocator())
			SSepEvent(&c, 1, Location(), 1));
  }
#endif
  return 1;
}

void Parser::checkDtd(Dtd &dtd)
{
  if (dtd.isBase())
    addNeededShortrefs(dtd, instanceSyntax());
  if (sd().www() || !options().errorAfdr)
    addCommonAttributes(dtd);
  Dtd::ElementTypeIter elementIter(dtd.elementTypeIter());
  ElementType *p;
  ConstPtr<ElementDefinition> def;
  int i = 0;
  while ((p = elementIter.next()) != 0) {
    if (p->definition() == 0) {
      if (p->name() == dtd.name()) {
	if (validate() && (implydefElement() == Sd::implydefElementNo))
	  message(ParserMessages::documentElementUndefined);
      }
      else if (options().warnUndefinedElement)
	message(ParserMessages::dtdUndefinedElement, StringMessageArg(p->name()));
      if (def.isNull())
	def = new ElementDefinition(currentLocation(),
				    size_t(ElementDefinition::undefinedIndex),
				    ElementDefinition::omitEnd,
				    ElementDefinition::any,
                                    (implydefElement() != Sd::implydefElementAnyother));
      p->setElementDefinition(def, i++);
    }
    const ShortReferenceMap *map = p->map();
    if (map != 0 && map != &theEmptyMap && !map->defined()) {
      if (validate())
	message(ParserMessages::undefinedShortrefMapDtd,
	        StringMessageArg(map->name()),
	        StringMessageArg(p->name()));
      p->setMap(0);
    }
  }
  Dtd::ShortReferenceMapIter mapIter(dtd.shortReferenceMapIter());
  int nShortref = dtd.nShortref();
  for (;;) {
    ShortReferenceMap *map = mapIter.next();
    if (!map)
      break;
    Vector<ConstPtr<Entity> > entityMap(nShortref);
    for (i = 0; i < nShortref; i++) {
      const StringC *entityName = map->entityName(i);
      if (entityName) {
	ConstPtr<Entity> entity
	  = lookupEntity(0, *entityName, map->defLocation(), 0);
	if (entity.isNull()) {
	  setNextLocation(map->defLocation());
	  message(ParserMessages::mapEntityUndefined,
		  StringMessageArg(*entityName),
		  StringMessageArg(map->name()));
	}
	else {
	  if (entity->defaulted() && options().warnDefaultEntityReference) {
	    setNextLocation(map->defLocation());
	    message(ParserMessages::mapDefaultEntity,
		    StringMessageArg(*entityName),
		    StringMessageArg(map->name()));
	  }
	  entityMap[i] = entity;
	}
      }
    }
    map->setEntityMap(entityMap);
    if (options().warnUnusedMap && !map->used()) {
      setNextLocation(map->defLocation());
      message(ParserMessages::unusedMap, StringMessageArg(map->name()));
    }
  }
  if (options().warnUnusedParam) {
    Dtd::ConstEntityIter entityIter(((const Dtd &)dtd).parameterEntityIter());
    for (;;) {
      ConstPtr<Entity> entity(entityIter.next());
      if (entity.isNull())
	break;
      if (!entity->used() && !maybeStatusKeyword(*entity)) {
	setNextLocation(entity->defLocation());
	message(ParserMessages::unusedParamEntity,
		StringMessageArg(entity->name()));
      }
    }
  }
  Dtd::ConstEntityIter gEntityIter(((const Dtd &)dtd).generalEntityIter());
  Dtd::ConstEntityIter pEntityIter(((const Dtd &)dtd).parameterEntityIter());
  for (i = 0; i < (sd().www() ? 2 : 1); i++) {
    for (;;) {
      ConstPtr<Entity> entity(i == 0 ? gEntityIter.next() : pEntityIter.next());
      if (entity.isNull())
	break;
      const ExternalDataEntity *external = entity->asExternalDataEntity();
      if (external) {
	Notation *notation = (Notation *)external->notation();
	if (!notation->defined()) {
	  if (sd().implydefNotation()) {
	    ExternalId id;
	    notation->setExternalId(id, Location());
	    notation->generateSystemId(*this);
	  } 
	  else if (validate()) {
	    setNextLocation(external->defLocation());
	    switch (external->declType()) {
	    case Entity::parameterEntity:
	    message(ParserMessages::parameterEntityNotationUndefined,
		    StringMessageArg(notation->name()),
		    StringMessageArg(external->name()));
	      break;
	    case Entity::doctype:
	      message(ParserMessages::dsEntityNotationUndefined,
		      StringMessageArg(notation->name()));
	      break;
	    default:
	      message(ParserMessages::entityNotationUndefined,
		StringMessageArg(notation->name()),
		StringMessageArg(external->name()));
	      break;
	    }
	  }
	}
      }
    }
  }
  Dtd::NotationIter notationIter(dtd.notationIter());
  for (;;) {
    Ptr<Notation> notation(notationIter.next());
    if (notation.isNull())
      break;
    if (!notation->defined() && !notation->attributeDef().isNull()) {
	if (sd().implydefNotation()) {
	  ExternalId id;
	  notation->setExternalId(id, Location());
	  notation->generateSystemId(*this);				       
	} 
	else if (validate())
	  message(ParserMessages::attlistNotationUndefined,
		  StringMessageArg(notation->name()));
    }
  }
}

#if 0
void Parser::addCommonAttributes(Dtd &dtd)
{
  Ptr<AttributeDefinitionList> commonAdl[2];
  {
    ElementType *e = dtd.removeElementType(syntax()
					   .rniReservedName(Syntax::rALL));
    if (e) {
      commonAdl[0] = e->attributeDef();
      delete e;
      lookupCreateElement(syntax().rniReservedName(Syntax::rIMPLICIT));
    }
  }
  {
    Ptr<Notation> allNotation
      = dtd.removeNotation(syntax().rniReservedName(Syntax::rALL));
    if (!allNotation.isNull()) {
      commonAdl[1] = allNotation->attributeDef();
      lookupCreateNotation(syntax().rniReservedName(Syntax::rIMPLICIT));
    }
  }
  Dtd::ElementTypeIter elementIter(dtd.elementTypeIter());
  Dtd::NotationIter notationIter(dtd.notationIter());
  Vector<PackedBoolean> doneAdl(dtd.nAttributeDefinitionList(),
				PackedBoolean(0));
  for (int isNotation = 0; isNotation < 2; isNotation++) {
    if (!commonAdl[isNotation].isNull()) {
      doneAdl[commonAdl[isNotation]->index()] = 1;
      for (;;) {
	Attributed *a;
	if (!isNotation)
	  a = elementIter.next();
	else
	  a = notationIter.next().pointer();
	if (!a)
	  break;
	Ptr<AttributeDefinitionList> adl = a->attributeDef();
	if (adl.isNull())
	  a->setAttributeDef(commonAdl[isNotation]);
	else if (!doneAdl[adl->index()]) {
	  doneAdl[adl->index()] = 1;
	  for (size_t j = 0; j < commonAdl[isNotation]->size(); j++) {
	    unsigned tem;
	    if (!adl->attributeIndex(commonAdl[isNotation]->def(j)->name(),
				     tem))
	      adl->append(commonAdl[isNotation]->def(j)->copy());
	  }
	}
      }
    }
  }
  {
    ElementType *e = dtd.removeElementType(syntax()
					   .rniReservedName(Syntax::rIMPLICIT));
    if (e)
      dtd.setImplicitElementAttributeDef(e->attributeDef());
    delete e;
  }
  {
    Ptr<Notation> n
      = dtd.removeNotation(syntax().rniReservedName(Syntax::rIMPLICIT));
    if (!n.isNull())
      dtd.setImplicitNotationAttributeDef(n->attributeDef());
  }
}
#else
void Parser::addCommonAttributes(Dtd &dtd)
{
  // These are #implicit, #all, #notation #implicit, #notation #all
  Ptr<AttributeDefinitionList> commonAdl[4];
  {
    ElementType *e = lookupCreateElement(syntax()
                                       .rniReservedName(Syntax::rIMPLICIT));
    commonAdl[0] = e->attributeDef();
    e = dtd.removeElementType(syntax().rniReservedName(Syntax::rALL));
    if (e) 
      commonAdl[1] = e->attributeDef();
    delete e;
  }
  {
    Ptr<Notation> nt 
      = lookupCreateNotation(syntax().rniReservedName(Syntax::rIMPLICIT));
    commonAdl[2] = nt->attributeDef();
    nt = dtd.removeNotation(syntax().rniReservedName(Syntax::rALL));
    if (!nt.isNull()) 
      commonAdl[3] = nt->attributeDef();
  }
  Dtd::ElementTypeIter elementIter(dtd.elementTypeIter());
  Dtd::ElementTypeIter element2Iter(dtd.elementTypeIter());
  Dtd::NotationIter notationIter(dtd.notationIter());
  Dtd::NotationIter notation2Iter(dtd.notationIter());
  Vector<PackedBoolean> done1Adl(dtd.nAttributeDefinitionList(),
				PackedBoolean(0));
  Vector<PackedBoolean> done2Adl(dtd.nAttributeDefinitionList(),
				PackedBoolean(0));
  // we do 2 passes over element types and notations,
  // first merging #implicit attributes for implicit element types/notations
  // next merging #all attributes for all element types/notations 
  for (int i = 0; i < 4; i++) {
    if (!commonAdl[i].isNull()) {
      if (i % 2) 
        done1Adl[commonAdl[i]->index()] = 1;
      else
        done2Adl[commonAdl[i]->index()] = 1;
      for (;;) {
        Boolean skip;
	Attributed *a;
        switch (i) {
        case 0: 
          {
            ElementType *e = elementIter.next();
            a = e;
            skip = (e && e->definition()); // don't merge #implicit 
                                           // attributes if e is defined
          }
          break;
        case 1:
	  a = element2Iter.next();
          skip = 0;                        // always merge #all attributes
          break;
        case 2: 
          {
	    Notation *nt = notationIter.next().pointer();
            a = nt;
            skip = (nt && nt->defined());  // don't merge #implicit 
                                           // attributes if nt is defined
          }
          break;
        case 3:
	  a = notation2Iter.next().pointer();
          skip = 0;                        // always merge #all attributes
          break;
        default:
          CANNOT_HAPPEN();
        }
        if (!a)
          break;
	Ptr<AttributeDefinitionList> adl = a->attributeDef();
	if (adl.isNull()) {
          if (!skip)
	    a->setAttributeDef(commonAdl[i]);
        }
	else if (((i % 2) && !done1Adl[adl->index()])
               ||(!(i % 2) && !done2Adl[adl->index()])) {
          if (i % 2)
	    done1Adl[adl->index()] = 1;
          else 
	    done2Adl[adl->index()] = 1;
          if (!skip)
	    for (size_t j = 0; j < commonAdl[i]->size(); j++) {
	      unsigned index;
	      if (!adl->attributeIndex(commonAdl[i]->def(j)->name(),
	  			       index))
	        adl->append(commonAdl[i]->def(j)->copy());
              else if (i == 2) {
                // Give an error if an #ALL data attribute was 
                // specified and is later redeclared as #IMPLICIT
                Boolean implicit;
                if (adl->def(index)->isSpecified(implicit) && !implicit)
                  message(ParserMessages::specifiedAttributeRedeclared,
                          StringMessageArg(adl->def(index)->name()));
              } 
	    }
	}
      }
    }
  }
  {
    ElementType *e = dtd.removeElementType(syntax()
					   .rniReservedName(Syntax::rIMPLICIT));
    if (e)
      dtd.setImplicitElementAttributeDef(e->attributeDef());
    delete e;
  }
  {
    Ptr<Notation> n
      = dtd.removeNotation(syntax().rniReservedName(Syntax::rIMPLICIT));
    if (!n.isNull())
      dtd.setImplicitNotationAttributeDef(n->attributeDef());
  }
}

#endif

Boolean Parser::maybeStatusKeyword(const Entity &entity)
{
  const InternalEntity *internal = entity.asInternalEntity();
  if (!internal)
    return 0;
  const StringC &text = internal->string();
  static const Syntax::ReservedName statusKeywords[] = {
    Syntax::rINCLUDE, Syntax::rIGNORE
    };
  for (size_t i = 0; i < SIZEOF(statusKeywords); i++) {
    const StringC &keyword = instanceSyntax().reservedName(statusKeywords[i]);
    size_t j = 0;
    while (j < text.size() && instanceSyntax().isS(text[j]))
      j++;
    size_t k = 0;
    while (j < text.size()
	   && k < keyword.size()
	   && ((*instanceSyntax().generalSubstTable())[text[j]]
	       == keyword[k]))
      j++, k++;
    if (k == keyword.size()) {
      while (j < text.size() && instanceSyntax().isS(text[j]))
	j++;
      if (j == text.size())
	return 1;
    }
  }
  return 0;
}

Boolean Parser::parseLinktypeDeclStart()
{
  if (baseDtd().isNull())
    message(ParserMessages::lpdBeforeBaseDtd);
  unsigned declInputLevel = inputLevel();
  Param parm;
  
  if (!parseParam(allowName, declInputLevel, parm))
    return 0;
  StringC name;
  parm.token.swap(name);
  if (!lookupDtd(name).isNull())
    message(ParserMessages::duplicateDtdLpd, StringMessageArg(name));
  else if (!lookupLpd(name).isNull())
    message(ParserMessages::duplicateLpd, StringMessageArg(name));
  static AllowedParams
    allowSimpleName(Param::indicatedReservedName + Syntax::rSIMPLE,
		    Param::name);
  if (!parseParam(allowSimpleName, declInputLevel, parm))
    return 0;
  Boolean simple;
  Ptr<Dtd> sourceDtd;
  if (parm.type == Param::indicatedReservedName + Syntax::rSIMPLE) {
    simple = 1;
    sourceDtd = baseDtd();
    if (sourceDtd.isNull())
      sourceDtd = new Dtd(StringC(), 1);
  }
  else {
    simple = 0;
    sourceDtd = lookupDtd(parm.token);
    if (sourceDtd.isNull()) {
      message(ParserMessages::noSuchDtd, StringMessageArg(parm.token));
      sourceDtd = new Dtd(parm.token, 0);
    }
  }
  static AllowedParams
    allowImpliedName(Param::indicatedReservedName + Syntax::rIMPLIED,
		     Param::name);
  if (!parseParam(allowImpliedName, declInputLevel, parm))
    return 0;
  Ptr<Dtd> resultDtd;
  Boolean implied = 0;
  if (parm.type == Param::indicatedReservedName + Syntax::rIMPLIED) {
    if (simple) {
      if (!sd().simpleLink())
	message(ParserMessages::simpleLinkFeature);
    }
    else {
      implied = 1;
      if (!sd().implicitLink())
	message(ParserMessages::implicitLinkFeature);
    }
  }
  else {
    if (simple)
      message(ParserMessages::simpleLinkResultNotImplied);
    else {
      if (!sd().explicitLink())
	message(ParserMessages::explicitLinkFeature);
      resultDtd = lookupDtd(parm.token);
      if (resultDtd.isNull())
	message(ParserMessages::noSuchDtd, StringMessageArg(parm.token));
    }
  }
  static AllowedParams
    allowPublicSystemDsoMdc(Param::reservedName + Syntax::rPUBLIC,
			    Param::reservedName + Syntax::rSYSTEM,
			    Param::dso,
			    Param::mdc);
  if (!parseParam(allowPublicSystemDsoMdc, declInputLevel, parm))
    return 0;
  ConstPtr<Entity> entity;
  if (parm.type == Param::reservedName + Syntax::rPUBLIC
      || parm.type == Param::reservedName + Syntax::rSYSTEM) {
    static AllowedParams allowSystemIdentifierDsoMdc(Param::systemIdentifier,
						     Param::dso, Param::mdc);
    ExternalId id;
    if (!parseExternalId(allowSystemIdentifierDsoMdc, allowDsoMdc,
			 1, declInputLevel, parm, id))
      return 0;
    Ptr<Entity> tem
      = new ExternalTextEntity(name, Entity::linktype, markupLocation(), id);
    tem->generateSystemId(*this);
    entity = tem;
#if 0
    eventHandler()
      .externalEntityDecl(new (eventAllocator())
			  ExternalEntityDeclEvent(entity, 0));
#endif
  }
  Ptr<Lpd> lpd;
  if (simple)
    lpd = new SimpleLpd(name, markupLocation(), sourceDtd);
  else
    lpd = new ComplexLpd(name,
			 implied ? Lpd::implicitLink : Lpd::explicitLink,
			 markupLocation(),
			 syntax(),
			 sourceDtd,
			 resultDtd);
  if (!baseDtd().isNull() && shouldActivateLink(name)) {
    size_t nActive = nActiveLink();
    if (simple) {
      size_t nSimple = 0;
      for (size_t i = 0; i < nActive; i++)
	if (activeLpd(i).type() == Lpd::simpleLink)
	  nSimple++;
      if (nSimple == sd().simpleLink())
	message(ParserMessages::simpleLinkCount,
		NumberMessageArg(sd().simpleLink()));
      lpd->activate();
    }
    else {
      Boolean haveImplicit = 0;
      Boolean haveExplicit = 0;
      size_t i;
      for (i = 0; i < nActive; i++) {
	if (activeLpd(i).type() == Lpd::implicitLink)
	  haveImplicit = 1;
	else if (activeLpd(i).type() == Lpd::explicitLink)
	  haveExplicit = 1;
      }
      const Dtd *sourceDtd = lpd->sourceDtd().pointer();
      if (implied && haveImplicit)
	message(ParserMessages::oneImplicitLink);
      else if (sd().explicitLink() <= 1 && sourceDtd != baseDtd().pointer())
	message(sd().explicitLink() == 0
		? ParserMessages::explicitNoRequiresSourceTypeBase
		: ParserMessages::explicit1RequiresSourceTypeBase,
		StringMessageArg(lpd->name()));
      else if (sd().explicitLink() == 1 && haveExplicit && !implied)
	message(ParserMessages::duplicateExplicitChain);
      else if (haveExplicit || haveImplicit
	       || sourceDtd != baseDtd().pointer())
	message(ParserMessages::sorryLink, StringMessageArg(lpd->name()));
      else
	lpd->activate();
    }
  }
  // Discard mdc or dso
  if (currentMarkup())
    currentMarkup()->resize(currentMarkup()->size() - 1);
  eventHandler().startLpd(new (eventAllocator())
			  StartLpdEvent(lpd->active(),
					name,
					entity,
					parm.type == Param::dso,
					markupLocation(),
					currentMarkup()));
  startLpd(lpd);
  if (parm.type == Param::mdc) {
    // unget the mdc
    currentInput()->ungetToken();
    if (entity.isNull()) {
      message(ParserMessages::noLpdSubset, StringMessageArg(name));
      (void)parseLinktypeDeclEnd();
      return 1;
    }
    // reference the entity
    Ptr<EntityOrigin> origin
      = EntityOrigin::make(internalAllocator(), entity, currentLocation());
    entity->dsReference(*this, origin);
    if (inputLevel() == 1) {	// reference failed
      (void)parseLinktypeDeclEnd();
      return 1;
    }
  }
  else if (!entity.isNull())
    setDsEntity(entity);
  setPhase(declSubsetPhase);
  return 1;
}

Boolean Parser::parseLinktypeDeclEnd()
{

  if (defLpd().type() != Lpd::simpleLink) {
    if (!defComplexLpd().initialLinkSet()->defined())
      message(ParserMessages::noInitialLinkSet,
	      StringMessageArg(defLpd().name()));
    ComplexLpd::ConstLinkSetIter iter = defComplexLpd().linkSetIter();
    const LinkSet *linkSet;
    while ((linkSet = iter.next()) != 0)
      if (!linkSet->defined())
	message(ParserMessages::undefinedLinkSet, StringMessageArg(linkSet->name()));
  }
  ConstPtr<Lpd> tem(defLpdPointer());
  endLpd();
  startMarkup(eventsWanted().wantPrologMarkup(), currentLocation());
  Param parm;
  Boolean result = parseParam(allowMdc, inputLevel(), parm);
  eventHandler().endLpd(new (eventAllocator()) EndLpdEvent(tem,
							   markupLocation(),
							   currentMarkup()));
  return result;
}

Boolean Parser::parseLinkDecl()
{
  return parseLinkSet(0);
}

Boolean Parser::parseIdlinkDecl()
{
  return parseLinkSet(1);
}

// This will only get called if we're defining a complex lpd.

Boolean Parser::parseLinkSet(Boolean idlink)
{
  if (defLpd().type() == Lpd::simpleLink) {
    message(idlink ? ParserMessages::idlinkDeclSimple : ParserMessages::linkDeclSimple);
    return 0;
  }
  if (idlink) {
    if (defComplexLpd().hadIdLinkSet())
      message(ParserMessages::duplicateIdLinkSet);
    else
      defComplexLpd().setHadIdLinkSet();
  }
  unsigned declInputLevel = inputLevel();
  Param parm;
  
  Boolean isExplicit = (defLpd().type() == Lpd::explicitLink);
  LinkSet *linkSet;
  if (idlink) {
    if (!parseParam(allowName, declInputLevel, parm))
      return 0;
    linkSet = 0;
  }
  else {
    static AllowedParams
      allowNameInitial(Param::name,
		       Param::indicatedReservedName + Syntax::rINITIAL);
    if (!parseParam(allowNameInitial, declInputLevel, parm))
      return 0;
    if (parm.type == Param::name)
      linkSet = lookupCreateLinkSet(parm.token);
    else
      linkSet = defComplexLpd().initialLinkSet();
    if (linkSet->defined())
      message(ParserMessages::duplicateLinkSet, StringMessageArg(linkSet->name()));
    static AllowedParams
      allowExplicitLinkRule(Param::name,
			    Param::nameGroup,
			    Param::indicatedReservedName + Syntax::rIMPLIED);
    if (!parseParam(isExplicit ? allowExplicitLinkRule : allowNameNameGroup,
		    declInputLevel, parm))
      return 0;
  }

  do {
    StringC id;
    if (idlink) {
      parm.token.swap(id);
      if (!parseParam(isExplicit ? allowExplicitLinkRuleMdc : allowNameNameGroupMdc,
		      declInputLevel, parm))
	return 0;
    }
    if (parm.type == Param::indicatedReservedName + Syntax::rIMPLIED) {
      if (!parseParam(allowName, declInputLevel, parm))
	return 0;
      Boolean resultImplied;
      const ElementType *resultType;
      AttributeList resultAttributes;
      if (!parseResultElementSpec(declInputLevel,
				  parm,
				  idlink,
				  resultImplied,
				  resultType,
				  resultAttributes))
	return 0;
      if (resultType) {
	const AttributeList *dummy;
	if (linkSet->impliedResultAttributes(resultType, dummy))
	  message(ParserMessages::duplicateImpliedResult,
		  StringMessageArg(resultType->name()));
	else
	  linkSet->addImplied(resultType, resultAttributes);
      }
    }
    else {
      SourceLinkRule *linkRule = 0;
      IdLinkRule idLinkRule;
      Ptr<SourceLinkRuleResource> linkRuleResource;
      if (idlink)
	linkRule = &idLinkRule;
      else {
	linkRuleResource = new SourceLinkRuleResource;
	linkRule = linkRuleResource.pointer();
      }
      Vector<const ElementType *> assocElementTypes;
      if (parm.type == Param::name) {
	assocElementTypes.resize(1);
	assocElementTypes[0] = lookupCreateElement(parm.token);
      }
      else {
	assocElementTypes.resize(parm.nameTokenVector.size());
	for (size_t i = 0; i < assocElementTypes.size(); i++)
	  assocElementTypes[i]
	    = lookupCreateElement(parm.nameTokenVector[i].name);
      }
      static AllowedParams
	allow2i(Param::indicatedReservedName + Syntax::rUSELINK,
		Param::indicatedReservedName + Syntax::rPOSTLINK,
		Param::dso,
		Param::mdc,
		Param::name,
		Param::nameGroup);
      static AllowedParams
	allow2id(Param::indicatedReservedName + Syntax::rUSELINK,
		 Param::indicatedReservedName + Syntax::rPOSTLINK,
		 Param::dso,
		 Param::mdc,
		 Param::name);
      static AllowedParams
	allow2e(Param::indicatedReservedName + Syntax::rUSELINK,
		Param::indicatedReservedName + Syntax::rPOSTLINK,
		Param::dso,
		Param::name,
		Param::indicatedReservedName + Syntax::rIMPLIED);

      if (!parseParam(isExplicit
		      ? allow2e
		      : (idlink ? allow2id : allow2i), declInputLevel, parm))
	return 0;
      if (parm.type == Param::indicatedReservedName + Syntax::rUSELINK) {
	static AllowedParams
	  allowLinkSetEmpty(Param::name,
			    Param::indicatedReservedName + Syntax::rINITIAL,
			    Param::indicatedReservedName + Syntax::rEMPTY);
	if (!parseParam(allowLinkSetEmpty, declInputLevel, parm))
	  return 0;
	const LinkSet *uselink;
	if (parm.type == Param::name)
	  uselink = lookupCreateLinkSet(parm.token);
	else if (parm.type == Param::indicatedReservedName + Syntax::rINITIAL)
	  uselink = defComplexLpd().initialLinkSet();
	else
	  uselink = defComplexLpd().emptyLinkSet();
	linkRule->setUselink(uselink);
	static AllowedParams
	  allow3i(Param::indicatedReservedName + Syntax::rPOSTLINK,
		  Param::dso,
		  Param::mdc,
		  Param::name,
		  Param::nameGroup);
	static AllowedParams
	  allow3id(Param::indicatedReservedName + Syntax::rPOSTLINK,
		   Param::dso,
		   Param::mdc,
		   Param::name);
	static AllowedParams
	  allow3e(Param::indicatedReservedName + Syntax::rPOSTLINK,
		  Param::dso,
		  Param::name,
		  Param::indicatedReservedName + Syntax::rIMPLIED);
	
	if (!parseParam(isExplicit
			? allow3e
			: (idlink ? allow3id : allow3i),
			declInputLevel, parm))
	  return 0;
      }
      if (parm.type == Param::indicatedReservedName + Syntax::rPOSTLINK) {
	if (!parseParam(allowLinkSetSpec, declInputLevel, parm))
	  return 0;
	const LinkSet *postlink;
	if (parm.type == Param::indicatedReservedName + Syntax::rRESTORE)
	  linkRule->setPostlinkRestore();
	else {
	  if (parm.type == Param::name)
	    postlink = lookupCreateLinkSet(parm.token);
	  else if (parm.type
		   == Param::indicatedReservedName + Syntax::rINITIAL)
	    postlink = defComplexLpd().initialLinkSet();
	  else
	    postlink = defComplexLpd().emptyLinkSet();
	  linkRule->setPostlink(postlink);
	}
	static AllowedParams
	  allow4i(Param::dso,
		  Param::mdc,
		  Param::name,
		  Param::nameGroup);
	static AllowedParams
	  allow4id(Param::dso,
		   Param::mdc,
		   Param::name);
	static AllowedParams
	  allow4e(Param::dso,
		  Param::name,
		  Param::indicatedReservedName + Syntax::rIMPLIED);
	if (!parseParam(isExplicit
			? allow4e
			: (idlink ? allow4id : allow4i),
			declInputLevel, parm))
	  return 0;
      }
      AttributeList attributes;
      ConstPtr<AttributeDefinitionList> attDef;
      for (size_t i = 0; i < assocElementTypes.size(); i++) {
	const ElementType *e = assocElementTypes[i];
	if (e) {
	  if (i == 0)
	    attDef = defComplexLpd().attributeDef(e);
	  else if (attDef != defComplexLpd().attributeDef(e))
	    message(ParserMessages::assocElementDifferentAtts);
	  // FIXME recover from this
	}
      }
      attributes.init(attDef);
      
      if (parm.type == Param::dso) {
	Boolean netEnabling;
	Ptr<AttributeDefinitionList> newAttDef;
	if (!parseAttributeSpec(asMode, attributes, netEnabling, newAttDef))
	  return 0;
	if (!newAttDef.isNull()) {
	  newAttDef->setIndex(defComplexLpd().allocAttributeDefinitionListIndex());
	  for (size_t i = 0; i < assocElementTypes.size(); i++) {
	    const ElementType *e = assocElementTypes[i];
	    if (e && defComplexLpd().attributeDef(e) == attDef)
	      defComplexLpd().setAttributeDef(e, newAttDef);
	  }
	}
	static AllowedParams
	  allow5e(Param::name,
		  Param::indicatedReservedName + Syntax::rIMPLIED);
	if (!parseParam(isExplicit
			? allow5e
			: (idlink ? allowNameMdc : allowNameNameGroupMdc),
			declInputLevel, parm))
	  return 0;
      }
      else
	attributes.finish(*this);
      linkRule->setLinkAttributes(attributes);
      if (isExplicit) {
	Boolean resultImplied;
	const ElementType *resultType;
	AttributeList resultAttributes;
	if (!parseResultElementSpec(declInputLevel,
				    parm,
				    idlink,
				    resultImplied,
				    resultType,
				    resultAttributes))
	  return 0;
	if (!resultImplied)
	  linkRule->setResult(resultType, resultAttributes);
      }
      // Install the link rule.
      if (idlink) {
	idLinkRule.setAssocElementTypes(assocElementTypes);
	addIdLinkRule(id, idLinkRule);
      }
      else {
	if (!linkSet->defined()) {
	  for (size_t i = 0; i < assocElementTypes.size(); i++)
	    if (assocElementTypes[i])
	      addLinkRule(linkSet, assocElementTypes[i], linkRuleResource);
	}
      }
    }
  } while (parm.type != Param::mdc);
  if (linkSet)
    linkSet->setDefined();
  if (currentMarkup()) {
    if (idlink)
      eventHandler().idLinkDecl(new (eventAllocator())
				IdLinkDeclEvent(defComplexLpdPointer(),
						markupLocation(),
						currentMarkup()));
    else
      eventHandler().linkDecl(new (eventAllocator())
			      LinkDeclEvent(linkSet,
					    defComplexLpdPointer(),
					    markupLocation(),
					    currentMarkup()));
  }
  return 1;
}

void Parser::addIdLinkRule(const StringC &id,
			   IdLinkRule &rule)
{
  IdLinkRuleGroup *group = defComplexLpd().lookupCreateIdLink(id);
  size_t nRules = group->nLinkRules();
  if ((nRules == 1 && group->linkRule(0).attributes().nSpec() == 0)
      || nRules >= 1 && rule.attributes().nSpec() == 0)
    message(ParserMessages::multipleIdLinkRuleAttribute,
	    StringMessageArg(id));
  group->addLinkRule(rule);
}

void Parser::addLinkRule(LinkSet *linkSet,
			 const ElementType *sourceElement,
			 const ConstPtr<SourceLinkRuleResource> &linkRule)
{
  size_t nRules = linkSet->nLinkRules(sourceElement);
  if ((nRules == 1
       && linkSet->linkRule(sourceElement, 0).attributes().nSpec() == 0)
      || nRules >= 1 && linkRule->attributes().nSpec() == 0)
    message(ParserMessages::multipleLinkRuleAttribute,
	    StringMessageArg(sourceElement->name()));
  linkSet->addLinkRule(sourceElement, linkRule);
}

class ResultAttributeSpecModeSetter {
public:
  ResultAttributeSpecModeSetter(ParserState *state) : state_(state) {
    state_->setResultAttributeSpecMode();
  }
  ~ResultAttributeSpecModeSetter() { clear(); }
  void clear() {
    if (state_) {
      state_->clearResultAttributeSpecMode();
      state_ = 0;
    }
  }
private:
  ParserState *state_;
};

Boolean Parser::parseResultElementSpec(unsigned declInputLevel,
				       Param &parm,
				       Boolean idlink,
				       Boolean &implied,
				       const ElementType *&resultType,
				       AttributeList &attributes)
{
  if (parm.type == Param::indicatedReservedName + Syntax::rIMPLIED) {
    if (!parseParam(idlink ? allowNameMdc : allowExplicitLinkRuleMdc,
		    declInputLevel, parm))
      return 0;
    implied = 1;
  }
  else {
    implied = 0;
    ElementType *e = lookupResultElementType(parm.token);
    resultType = e;
    static AllowedParams
      allow(Param::dso,
	    Param::mdc,
	    Param::name,
	    Param::nameGroup,
	    Param::indicatedReservedName + Syntax::rIMPLIED);
    static AllowedParams
      allowNameDsoMdc(Param::dso,
		      Param::mdc,
		      Param::name);
    if (!parseParam(idlink ? allowNameDsoMdc : allow,
		    declInputLevel, parm))
      return 0;
    ConstPtr<AttributeDefinitionList> attDef;
    if (e)
      attDef = e->attributeDef();
    attributes.init(attDef);
    if (parm.type == Param::dso) {
      ResultAttributeSpecModeSetter modeSetter(this);
      Boolean netEnabling;
      Ptr<AttributeDefinitionList> newAttDef;
      if (!parseAttributeSpec(asMode, attributes, netEnabling, newAttDef))
	return 0;
      if (!newAttDef.isNull()) {
	Ptr<Dtd> r(defComplexLpd().resultDtd());
	if (!r.isNull()) {
	  newAttDef->setIndex(r->allocAttributeDefinitionListIndex());
	  if (e)
	    e->setAttributeDef(newAttDef);
	}
      }
      modeSetter.clear();
      if (attributes.nSpec() == 0)
	message(ParserMessages::emptyResultAttributeSpec);
      if (!parseParam(idlink ? allowNameMdc : allowExplicitLinkRuleMdc,
		      declInputLevel, parm))
	return 0;
    }
    else {
      // For entity and notation attributes.
      ResultAttributeSpecModeSetter modeSetter(this);
      attributes.finish(*this);
      modeSetter.clear();
    }
  }
  return 1;
}

ElementType *Parser::lookupResultElementType(const StringC &name)
{
  Dtd *dtd = defComplexLpd().resultDtd().pointer();
  if (!dtd)
    return 0;
  ElementType *e = dtd->lookupElementType(name);
  if (!e)
    message(ParserMessages::noSuchResultElement, StringMessageArg(name));
  return e;
}

Boolean Parser::parseUselinkDecl()
{
  unsigned declInputLevel = inputLevel();
  Param parm;
  if (!parseParam(allowLinkSetSpec, declInputLevel, parm))
    return 0;
  Param parm2;
  if (!parseParam(allowName, declInputLevel, parm2))
    return 0;
  StringC linkType;
  parm2.token.swap(linkType);
  if (!parseParam(allowMdc, declInputLevel, parm2))
    return 0;
  ConstPtr<Lpd> lpd = lookupLpd(linkType);
  if (lpd.isNull()) 
    message(ParserMessages::uselinkBadLinkType, StringMessageArg(linkType));
  else if (lpd->type() == Lpd::simpleLink)
    message(ParserMessages::uselinkSimpleLpd, StringMessageArg(linkType));
  else {
    const ComplexLpd *complexLpd = (const ComplexLpd *)lpd.pointer();
    const LinkSet *linkSet;
    Boolean restore = 0;
    if (parm.type == Param::name) {
      linkSet = complexLpd->lookupLinkSet(parm.token);
      if (!linkSet) {
	message(ParserMessages::uselinkBadLinkSet,
		StringMessageArg(complexLpd->name()),
		StringMessageArg(parm.token));
	return 1;
      }
    }
    else if (parm.type == Param::indicatedReservedName + Syntax::rINITIAL)
      linkSet = complexLpd->initialLinkSet();
    else if (parm.type == Param::indicatedReservedName + Syntax::rEMPTY)
      linkSet = complexLpd->emptyLinkSet();
    else {
      linkSet = 0;
      restore = 1;
    }
    if (lpd->active())
      eventHandler().uselink(new (eventAllocator())
			     UselinkEvent(lpd, linkSet,
					  restore, markupLocation(),
					  currentMarkup()));
    else
      eventHandler().ignoredMarkup(new (eventAllocator())
				   IgnoredMarkupEvent(markupLocation(),
						      currentMarkup()));
  }
  return 1;
}

LinkSet *Parser::lookupCreateLinkSet(const StringC &name)
{
  LinkSet *linkSet = defComplexLpd().lookupLinkSet(name);
  if (!linkSet) {
    linkSet = new LinkSet(name, defComplexLpd().sourceDtd().pointer());
    defComplexLpd().insertLinkSet(linkSet);
  }
  return linkSet;
}

Boolean Parser::parseMarkedSectionDeclStart()
{
  if (markedSectionLevel() == syntax().taglvl())
    message(ParserMessages::markedSectionLevel,
	    NumberMessageArg(syntax().taglvl()));
  if (!inInstance()
      && options().warnInternalSubsetMarkedSection
      && inputLevel() == 1)
    message(ParserMessages::internalSubsetMarkedSection);
  if (markedSectionSpecialLevel() > 0) {
    startMarkedSection(markupLocation());
    if (inInstance()
	? eventsWanted().wantMarkedSections()
	: eventsWanted().wantPrologMarkup())
      eventHandler().ignoredChars(new (eventAllocator())
				  IgnoredCharsEvent(currentInput()->currentTokenStart(),
						    currentInput()->currentTokenLength(),
						    currentLocation(),
						    0));
				  
    return 1;
  }
  Boolean discardMarkup;
  if (startMarkup(inInstance()
		  ? eventsWanted().wantMarkedSections()
		  : eventsWanted().wantPrologMarkup(),
		  currentLocation())) {
    currentMarkup()->addDelim(Syntax::dMDO);
    currentMarkup()->addDelim(Syntax::dDSO);
    discardMarkup = 0;
  }
  else if (options().warnInstanceStatusKeywordSpecS && inInstance()) {
    startMarkup(1, currentLocation());
    discardMarkup = 1;
  }
  unsigned declInputLevel = inputLevel();
  static AllowedParams allowStatusDso(Param::dso,
				      Param::reservedName + Syntax::rCDATA,
				      Param::reservedName + Syntax::rRCDATA,
				      Param::reservedName + Syntax::rIGNORE,
				      Param::reservedName + Syntax::rINCLUDE,
				      Param::reservedName + Syntax::rTEMP);
  Param parm;
  MarkedSectionEvent::Status status = MarkedSectionEvent::include;
  if (!parseParam(allowStatusDso, declInputLevel, parm))
    return 0;
  if (options().warnMissingStatusKeyword && parm.type == Param::dso)
    message(ParserMessages::missingStatusKeyword);
  while (parm.type != Param::dso) {
    switch (parm.type) {
    case Param::reservedName + Syntax::rCDATA:
      if (status < MarkedSectionEvent::cdata)
	status = MarkedSectionEvent::cdata;
      break;
    case Param::reservedName + Syntax::rRCDATA:
      if (status < MarkedSectionEvent::rcdata)
	status = MarkedSectionEvent::rcdata;
      if (options().warnRcdataMarkedSection)
	message(ParserMessages::rcdataMarkedSection);
      break;
    case Param::reservedName + Syntax::rIGNORE:
      if (status < MarkedSectionEvent::ignore)
	status = MarkedSectionEvent::ignore;
      if (inInstance() && options().warnInstanceIgnoreMarkedSection)
	message(ParserMessages::instanceIgnoreMarkedSection);
      break;
    case Param::reservedName + Syntax::rINCLUDE:
      if (inInstance() && options().warnInstanceIncludeMarkedSection)
	message(ParserMessages::instanceIncludeMarkedSection);
      break;
    case Param::reservedName + Syntax::rTEMP:
      if (options().warnTempMarkedSection)
	message(ParserMessages::tempMarkedSection);
      break;
    }
    if (!parseParam(allowStatusDso, declInputLevel, parm))
      return 0;
    if (options().warnMultipleStatusKeyword
        && parm.type != Param::dso)
      message(ParserMessages::multipleStatusKeyword);
  }
  // FIXME this disallows
  // <!entity % e "include [ stuff ">
  // ...
  // <![ %e; ]]>
  // which I think is legal.

  if (inputLevel() > declInputLevel)
    message(ParserMessages::parameterEntityNotEnded);
  switch (status) {
  case MarkedSectionEvent::include:
    startMarkedSection(markupLocation());
    break;
  case MarkedSectionEvent::cdata:
    startSpecialMarkedSection(cmsMode, markupLocation());
    break;
  case MarkedSectionEvent::rcdata:
    startSpecialMarkedSection(rcmsMode, markupLocation());
    break;
  case MarkedSectionEvent::ignore:
    startSpecialMarkedSection(imsMode, markupLocation());
    break;
  }
  if (currentMarkup()) {
    if (options().warnInstanceStatusKeywordSpecS && inInstance()) {
      Location loc(markupLocation());
      for (MarkupIter iter(*currentMarkup()); iter.valid(); iter.advance(loc, syntaxPointer())) {
	if (iter.type() == Markup::s) {
	  setNextLocation(loc);
	  message(ParserMessages::instanceStatusKeywordSpecS);
	}
      }
      if (discardMarkup)
	startMarkup(0, markupLocation());
    }
    eventHandler().markedSectionStart(new (eventAllocator())
				      MarkedSectionStartEvent(status,
							      markupLocation(),
							      currentMarkup()));
  }
  return 1;
}

void Parser::handleMarkedSectionEnd()
{
  if (markedSectionLevel() == 0)
    message(ParserMessages::markedSectionEnd);
  else {
    if (inInstance()
	? eventsWanted().wantMarkedSections()
	: eventsWanted().wantPrologMarkup()) {
      if (markedSectionSpecialLevel() > 1)
	eventHandler().ignoredChars(new (eventAllocator())
				    IgnoredCharsEvent(currentInput()->currentTokenStart(),
						      currentInput()->currentTokenLength(),
						      currentLocation(),
						      0));
      else {
	MarkedSectionEvent::Status status;
	switch (currentMode()) {
	case cmsMode:
	  status = MarkedSectionEvent::cdata;
	  break;
	case rcmsMode:
	  status = MarkedSectionEvent::rcdata;
	  break;
	case imsMode:
	  status = MarkedSectionEvent::ignore;
	  break;
	default:
	  status = MarkedSectionEvent::include;
	  break;
	}
	startMarkup(1, currentLocation());
	currentMarkup()->addDelim(Syntax::dMSC);
	currentMarkup()->addDelim(Syntax::dMDC);
	eventHandler().markedSectionEnd(new (eventAllocator())
					MarkedSectionEndEvent(status,
							      markupLocation(),
							      currentMarkup()));
      }
    }
    endMarkedSection();
  }
}

void Parser::emptyCommentDecl()
{
  if (startMarkup(eventsWanted().wantCommentDecls(), currentLocation())) {
    currentMarkup()->addDelim(Syntax::dMDO);
    currentMarkup()->addDelim(Syntax::dMDC);
    eventHandler().commentDecl(new (eventAllocator())
			       CommentDeclEvent(markupLocation(),
						currentMarkup()));
  }
  if (options().warnEmptyCommentDecl)
    message(ParserMessages::emptyCommentDecl);
}

Boolean Parser::parseCommentDecl()
{
  if (startMarkup(inInstance()
		  ? eventsWanted().wantCommentDecls()
		  : eventsWanted().wantPrologMarkup(),
		  currentLocation()))
    currentMarkup()->addDelim(Syntax::dMDO);
  if (!parseComment(comMode))
    return 0;
  for (;;) {
    Token token = getToken(mdMode);
    switch (token) {
    case tokenS:
      if (currentMarkup())
	currentMarkup()->addS(currentChar());
      if (options().warnCommentDeclS)
	message(ParserMessages::commentDeclS);
      break;
    case tokenCom:
      if (!parseComment(comMode))
	return 0;
      if (options().warnCommentDeclMultiple)
	message(ParserMessages::commentDeclMultiple);
      break;
    case tokenMdc:
      if (currentMarkup())
	currentMarkup()->addDelim(Syntax::dMDC);
      goto done;
    case tokenEe:
      message(ParserMessages::declarationLevel);
      return 0;
    case tokenUnrecognized:
      if (reportNonSgmlCharacter())
	break;
      // braces to work round Sun C++ 4.0 bug
      {
	message(ParserMessages::commentDeclarationCharacter,
		StringMessageArg(currentToken()),
		markupLocation());
      }
      return 0;
    default:
      // braces to work round Sun C++ 4.0 bug
      {
	message(ParserMessages::commentDeclInvalidToken,
		TokenMessageArg(token, mdMode, syntaxPointer(), sdPointer()),
		markupLocation());
      }
      return 0;
    }
  }
 done:
  if (currentMarkup())
    eventHandler().commentDecl(new (eventAllocator())
			       CommentDeclEvent(markupLocation(),
						currentMarkup()));
  return 1;
}

Boolean Parser::parseAfdrDecl()
{
  unsigned declInputLevel = inputLevel();
  static AllowedParams allowMinimumLiteral(Param::minimumLiteral);
  Param parm;
  setHadAfdrDecl();
  if (!parseParam(allowMinimumLiteral, declInputLevel, parm))
    return 0;
  if (parm.literalText.string() != sd().execToInternal("ISO/IEC 10744:1997"))
    message(ParserMessages::afdrVersion,
	    StringMessageArg(parm.literalText.string()));
  if (!parseParam(allowMdc, declInputLevel, parm))
    return 0;
  eventHandler().ignoredMarkup(new (eventAllocator())
			       IgnoredMarkupEvent(markupLocation(),
						  currentMarkup()));
  return 1;
}

#ifdef SP_NAMESPACE
}
#endif
