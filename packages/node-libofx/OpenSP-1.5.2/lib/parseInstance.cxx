// Copyright (c) 1994 James Clark, 1999 Matthias Clasen
// See the file COPYING for copying permission.

#include "splib.h"
#include "Parser.h"
#include "ParserMessages.h"
#include "MessageArg.h"
#include "TokenMessageArg.h"
#include "token.h"
#include "macros.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

void Parser::doInstanceStart()
{
  if (cancelled()) {
    allDone();
    return;
  }
  // FIXME check here that we have a valid dtd
  compileInstanceModes();
  setPhase(contentPhase);
  Token token = getToken(currentMode());
  switch (token) {
  case tokenEe:
  case tokenStagoNameStart:
  case tokenStagoTagc:
  case tokenStagoGrpo:
  case tokenEtagoNameStart:
  case tokenEtagoTagc:
  case tokenEtagoGrpo:
    break;
  default:
    if (sd().omittag()) {
      unsigned startImpliedCount = 0;
      unsigned attributeListIndex = 0;
      IList<Undo> undoList;
      IList<Event> eventList;
      if (!tryImplyTag(currentLocation(),
		       startImpliedCount,
		       attributeListIndex,
		       undoList,
		       eventList))
	CANNOT_HAPPEN();
      queueElementEvents(eventList);
    }
    else
      message(ParserMessages::instanceStartOmittag);
  }
  currentInput()->ungetToken();
}

void Parser::endInstance()
{
  // Do checking before popping entity stack so that there's a
  // current location for error messages.
  endAllElements();
  while (markedSectionLevel() > 0) {
    message(ParserMessages::unclosedMarkedSection,
	    currentMarkedSectionStartLocation());
    endMarkedSection();
  }
  checkIdrefs();
  popInputStack();
  allDone();
}

void Parser::checkIdrefs()
{
  IdTableIter iter(idTableIter());
  Id *id;
  while ((id = iter.next()) != 0) {
    for (size_t i = 0; i < id->pendingRefs().size(); i++) {
      Messenger::setNextLocation(id->pendingRefs()[i]);
      message(ParserMessages::missingId, StringMessageArg(id->name()));
    }
  }
}

void Parser::doContent()
{
  do {
    if (cancelled()) {
      allDone();
      return;
    }
    Token token = getToken(currentMode());
    switch (token) {
    case tokenEe:
      if (inputLevel() == 1) {
	endInstance();
	return;
      }
      if (inputLevel() == specialParseInputLevel()) {
	// FIXME have separate messages for each type of special parse
	// perhaps force end of marked section or element
	message(ParserMessages::specialParseEntityEnd);
      }
      if (eventsWanted().wantInstanceMarkup())
	eventHandler().entityEnd(new (eventAllocator())
				 EntityEndEvent(currentLocation()));
      if (afterDocumentElement())
	message(ParserMessages::afterDocumentElementEntityEnd);
      if (sd().integrallyStored()
	  && tagLevel()
	  && currentElement().index() != currentInputElementIndex())
	message(ParserMessages::contentAsyncEntityRef);
      popInputStack();
      break;
    case tokenCroDigit:
    case tokenHcroHexDigit:
      {
	if (afterDocumentElement())
	  message(ParserMessages::characterReferenceAfterDocumentElement);
	Char ch;
	Location loc;
	if (parseNumericCharRef(token == tokenHcroHexDigit, ch, loc)) {
	  acceptPcdata(loc);
	  noteData();
	  Boolean isSgmlChar;
	  if (!translateNumericCharRef(ch, isSgmlChar))
	    break;
	  if (!isSgmlChar) {
	    eventHandler().nonSgmlChar(new (eventAllocator())
	                               NonSgmlCharEvent(ch, loc));
	    break;
	  }
	  eventHandler().data(new (eventAllocator())
			      ImmediateDataEvent(Event::characterData,
						 &ch, 1, loc, 1));
	  break;
	}
      }
      break;
    case tokenCroNameStart:
      if (afterDocumentElement())
	message(ParserMessages::characterReferenceAfterDocumentElement);
      parseNamedCharRef();
      break;
    case tokenEroGrpo:
    case tokenEroNameStart:
      {
	if (afterDocumentElement())
	  message(ParserMessages::entityReferenceAfterDocumentElement);
	ConstPtr<Entity> entity;
	Ptr<EntityOrigin> origin;
	if (parseEntityReference(0, token == tokenEroGrpo, entity, origin)) {
	  if (!entity.isNull()) {
	    if (entity->isCharacterData())
	      acceptPcdata(Location(origin.pointer(), 0));
	    if (inputLevel() == specialParseInputLevel())
	      entity->rcdataReference(*this, origin);
	    else
	      entity->contentReference(*this, origin);
	  }
	}
      }
      break;
    case tokenEtagoNameStart:
      acceptEndTag(parseEndTag());
      break;
    case tokenEtagoTagc:
      parseEmptyEndTag();
      break;
    case tokenEtagoGrpo:
      parseGroupEndTag();
      break;
    case tokenMdoNameStart:
      if (startMarkup(eventsWanted().wantInstanceMarkup(), currentLocation()))
	currentMarkup()->addDelim(Syntax::dMDO);
      Syntax::ReservedName name;
      Boolean result;
      unsigned startLevel;
      startLevel = inputLevel();
      if (parseDeclarationName(&name)) {
	switch (name) {
	case Syntax::rUSEMAP:
	  if (afterDocumentElement())
	    message(ParserMessages::declarationAfterDocumentElement,
		    StringMessageArg(syntax().reservedName(name)));
	  result = parseUsemapDecl();
	  break;
	case Syntax::rUSELINK:
	  if (afterDocumentElement())
	    message(ParserMessages::declarationAfterDocumentElement,
		    StringMessageArg(syntax().reservedName(name)));
	  result = parseUselinkDecl();
	  break;
	case Syntax::rDOCTYPE:
	case Syntax::rLINKTYPE:
	case Syntax::rELEMENT:
	case Syntax::rATTLIST:
	case Syntax::rENTITY:
	case Syntax::rNOTATION:
	case Syntax::rSHORTREF:
	case Syntax::rLINK:
	case Syntax::rIDLINK:
	  message(ParserMessages::instanceDeclaration,
		  StringMessageArg(syntax().reservedName(name)));
	  result = 0;
	  break;
	default:
	  message(ParserMessages::noSuchDeclarationType,
		  StringMessageArg(syntax().reservedName(name)));
	  result = 0;
	  break;
	}
      }
      else
	result = 0;
      if (!result)
	skipDeclaration(startLevel);
      noteMarkup();
      break;
    case tokenMdoMdc:
      // empty comment
      emptyCommentDecl();
      noteMarkup();
      break;
    case tokenMdoCom:
      parseCommentDecl();
      noteMarkup();
      break;
    case tokenMdoDso:
      if (afterDocumentElement())
	message(ParserMessages::markedSectionAfterDocumentElement);
      parseMarkedSectionDeclStart();
      noteMarkup();
      break;
    case tokenMscMdc:
      handleMarkedSectionEnd();
      noteMarkup();
      break;
    case tokenNet:
      parseNullEndTag();
      break;
    case tokenPio:
      parseProcessingInstruction();
      break;
    case tokenStagoNameStart:
      parseStartTag();
      break;
    case tokenStagoTagc:
      parseEmptyStartTag();
      break;
    case tokenStagoGrpo:
      parseGroupStartTag();
      break;
    case tokenRe:
      acceptPcdata(currentLocation());
      queueRe(currentLocation());
      break;
    case tokenRs:
      acceptPcdata(currentLocation());
      noteRs();
      if (eventsWanted().wantInstanceMarkup())
	eventHandler().ignoredRs(new (eventAllocator())
				 IgnoredRsEvent(currentChar(),
						currentLocation()));
      break;
    case tokenS:
      extendContentS();
      if (eventsWanted().wantInstanceMarkup())
	eventHandler().sSep(new (eventAllocator())
			    SSepEvent(currentInput()->currentTokenStart(),
				      currentInput()->currentTokenLength(),
				      currentLocation(),
				      0));
      break;
    case tokenIgnoredChar:
      extendData();
      if (eventsWanted().wantMarkedSections())
	eventHandler().ignoredChars(new (eventAllocator())
				    IgnoredCharsEvent(currentInput()->currentTokenStart(),
						      currentInput()->currentTokenLength(),
						      currentLocation(),
						      0));
      break;
    case tokenUnrecognized:
      reportNonSgmlCharacter();
      parsePcdata();
      break;
    case tokenCharDelim:
      message(ParserMessages::dataCharDelim,
	      StringMessageArg(StringC(currentInput()->currentTokenStart(),
			  	       currentInput()->currentTokenLength())));
      // fall through
    case tokenChar:
      parsePcdata();
      break;
    default:
      ASSERT(token >= tokenFirstShortref);
      handleShortref(token - tokenFirstShortref);
      break;
    }
  } while (eventQueueEmpty());
}

void Parser::skipDeclaration(unsigned startLevel)
{
  const unsigned skipMax = 250;
  unsigned skipCount = 0;
  for (;;) {
    Token token = getToken(mdMode);
    if (inputLevel() == startLevel)
      skipCount++;
    switch (token) {
    case tokenUnrecognized:
      (void)getChar();
      break;
    case tokenEe:
      if (inputLevel() <= startLevel)
	return;
      popInputStack();
      return;
    case tokenMdc:
      if (inputLevel() == startLevel)
	return;
      break;
    case tokenS:
      if (inputLevel() == startLevel && skipCount >= skipMax
	  && currentChar() == syntax().standardFunction(Syntax::fRE))
	return;
      break;
    default:
      break;
    }
  }
}

void Parser::handleShortref(int index)
{
  const ConstPtr<Entity> &entity
    = currentElement().map()->entity(index);
  if (!entity.isNull()) {
    Owner<Markup> markupPtr;
    if (eventsWanted().wantInstanceMarkup()) {
      markupPtr = new Markup;
      markupPtr->addShortref(currentInput());
    }
    Ptr<EntityOrigin> origin
      = EntityOrigin::make(internalAllocator(),
			   entity,
			   currentLocation(),
			   currentInput()->currentTokenLength(),
			   markupPtr);
    entity->contentReference(*this, origin);
    return;
  }
  InputSource *in = currentInput();
  size_t length = in->currentTokenLength();
  const Char *s = in->currentTokenStart();
  size_t i = 0;
  if (currentMode() == econMode || currentMode() == econnetMode) {
    // FIXME do this in advance (what about B sequence?)
    for (i = 0; i < length && syntax().isS(s[i]); i++)
      ;
    if (i > 0 && eventsWanted().wantInstanceMarkup())
      eventHandler().sSep(new (eventAllocator())
			  SSepEvent(s, i, currentLocation(), 0));
  }
  if (i < length) {
    Location location(currentLocation());
    location += i;
    s += i;
    length -= i;
    acceptPcdata(location);
    if (sd().keeprsre()) {
      noteData();
      eventHandler().data(new (eventAllocator())
  			  ImmediateDataEvent(Event::characterData, s, length,
					     location, 0));
      return;
    }
     // FIXME speed this up
    for (; length > 0; location += 1, length--, s++) {
      if (*s == syntax().standardFunction(Syntax::fRS)) {
	noteRs();
	if (eventsWanted().wantInstanceMarkup())
	  eventHandler().ignoredRs(new (eventAllocator())
				   IgnoredRsEvent(*s, location));
      }
      else if (*s == syntax().standardFunction(Syntax::fRE))
	queueRe(location);
      else {
	noteData();
	eventHandler().data(new (eventAllocator())
			    ImmediateDataEvent(Event::characterData, s, 1,
					       location, 0));
      }
    }
  }
}

void Parser::parsePcdata()
{
  extendData();
  acceptPcdata(currentLocation());
  noteData();
  eventHandler().data(new (eventAllocator())
		      ImmediateDataEvent(Event::characterData,
					 currentInput()->currentTokenStart(),
					 currentInput()->currentTokenLength(),
					 currentLocation(),
					 0));
}

void Parser::parseStartTag()
{
  InputSource *in = currentInput();
  Markup *markup = startMarkup(eventsWanted().wantInstanceMarkup(),
			       in->currentLocation());
  if (markup)
    markup->addDelim(Syntax::dSTAGO);
  Boolean netEnabling;
  StartElementEvent *event = doParseStartTag(netEnabling);
  acceptStartTag(event->elementType(), event, netEnabling);
}

StartElementEvent *Parser::doParseStartTag(Boolean &netEnabling) 
{
  Markup *markup = currentMarkup();
  InputSource *in = currentInput();
  in->discardInitial();
  extendNameToken(syntax().namelen(), ParserMessages::nameLength);
  if (markup)
    markup->addName(in);
  StringC &name = nameBuffer();
  getCurrentToken(syntax().generalSubstTable(), name);
  ElementType *e = currentDtdNonConst().lookupElementType(name);
  if (sd().rank()) {
    if (!e)
      e = completeRankStem(name);
    else if (e->isRankedElement())
      handleRankedElement(e);
  }
  if (!e)
    e = lookupCreateUndefinedElement(name, currentLocation(), currentDtdNonConst(), (implydefElement() != Sd::implydefElementAnyother));
  AttributeList *attributes = allocAttributeList(e->attributeDef(), 0);
  Token closeToken = getToken(tagMode);
  if (closeToken == tokenTagc) {
    if (name.size() > syntax().taglen())
      checkTaglen(markupLocation().index());
    attributes->finish(*this);
    netEnabling = 0;
    if (markup)
      markup->addDelim(Syntax::dTAGC);
  }
  else {
    in->ungetToken();
    Ptr<AttributeDefinitionList> newAttDef;
    if (parseAttributeSpec(tagMode, *attributes, netEnabling, newAttDef)) {
      // The difference between the indices will be the difference
      // in offsets plus 1 for each named character reference.
      if (in->currentLocation().index() - markupLocation().index()
	  > syntax().taglen())
	checkTaglen(markupLocation().index());
    }
    else
      netEnabling = 0;
    if (!newAttDef.isNull()) {
      newAttDef->setIndex(currentDtdNonConst().allocAttributeDefinitionListIndex());
      e->setAttributeDef(newAttDef);
    }
  }
  return new (eventAllocator()) StartElementEvent(e,
						  currentDtdPointer(),
						  attributes,
						  markupLocation(),
						  markup);
}

ElementType *Parser::completeRankStem(const StringC &name)
{
  const RankStem *rankStem = currentDtd().lookupRankStem(name);
  if (rankStem) {
    StringC name(rankStem->name());
    if (!appendCurrentRank(name, rankStem))
      message(ParserMessages::noCurrentRank, StringMessageArg(name));
    else
      return currentDtdNonConst().lookupElementType(name);
  }
  return 0;
}

void Parser::handleRankedElement(const ElementType *e)
{
  StringC rankSuffix(e->definition()->rankSuffix());
  const RankStem *rankStem = e->rankedElementRankStem();
  for (size_t i = 0; i < rankStem->nDefinitions(); i++) {
    const ElementDefinition *def = rankStem->definition(i);
    for (size_t j = 0; j < def->nRankStems(); j++)
      setCurrentRank(def->rankStem(j), rankSuffix);
  }
}

void Parser::checkTaglen(Index tagStartIndex)
{
  const InputSourceOrigin *origin
    = currentLocation().origin()->asInputSourceOrigin();
  ASSERT(origin != 0);
  if (origin->startOffset(currentLocation().index())
      - origin->startOffset(tagStartIndex
			    + syntax().delimGeneral(Syntax::dSTAGO).size())
      > syntax().taglen())
    message(ParserMessages::taglen, NumberMessageArg(syntax().taglen()));
}

void Parser::parseEmptyStartTag()
{
  if (options().warnEmptyTag)
    message(ParserMessages::emptyStartTag);
  if (!currentDtd().isBase())
    message(ParserMessages::emptyStartTagBaseDtd);
  const ElementType *e = 0;
  if (!sd().omittag()) 
    e = lastEndedElementType();
  else if (tagLevel() > 0)
    e = currentElement().type();
  if (!e)
    e = currentDtd().documentElementType();
  AttributeList *attributes = allocAttributeList(e->attributeDef(), 0);
  attributes->finish(*this);
  Markup *markup = startMarkup(eventsWanted().wantInstanceMarkup(),
			       currentLocation());
  if (markup) {
    markup->addDelim(Syntax::dSTAGO);
    markup->addDelim(Syntax::dTAGC);
  }
  acceptStartTag(e,
		 new (eventAllocator())
		   StartElementEvent(e,
				     currentDtdPointer(),
				     attributes,
				     markupLocation(),
				     markup),
		 0);
}

void Parser::parseGroupStartTag()
{
  InputSource *in = currentInput();
  if (startMarkup(eventsWanted().wantInstanceMarkup(), currentLocation())) {
    currentMarkup()->addDelim(Syntax::dSTAGO);
    currentMarkup()->addDelim(Syntax::dGRPO);
  }
  Boolean active;
  if (!parseTagNameGroup(active, 1))
    return;
  in->startToken();
  // Location startLocation = in->currentLocation();
  Xchar c = in->tokenChar(messenger());
  if (!syntax().isNameStartCharacter(c)) {
    message(ParserMessages::startTagMissingName);
    return;
  }
  if (active) {
    Boolean netEnabling;
    StartElementEvent *event = doParseStartTag(netEnabling);
    if (netEnabling)
      message(ParserMessages::startTagGroupNet);
    acceptStartTag(event->elementType(), event, netEnabling);
  }
  else {
    in->discardInitial();

    extendNameToken(syntax().namelen(), ParserMessages::nameLength);
    if (currentMarkup())
      currentMarkup()->addName(currentInput());
    skipAttributeSpec();  
    if (currentMarkup())
      eventHandler().ignoredMarkup(new (eventAllocator())
				   IgnoredMarkupEvent(markupLocation(),
						      currentMarkup()));
    noteMarkup();
  }
}

void Parser::parseGroupEndTag()
{
  InputSource *in = currentInput();
  if (startMarkup(eventsWanted().wantInstanceMarkup(), currentLocation())) {
    currentMarkup()->addDelim(Syntax::dSTAGO);
    currentMarkup()->addDelim(Syntax::dGRPO);
  }
  Boolean active;
  if (!parseTagNameGroup(active, 0))
    return;
  in->startToken();
  // Location startLocation = in->currentLocation();
  Xchar c = in->tokenChar(messenger());
  if (!syntax().isNameStartCharacter(c)) {
    message(ParserMessages::endTagMissingName);
    return;
  }
  if (active)
    acceptEndTag(doParseEndTag());
  else {
    in->discardInitial();
    extendNameToken(syntax().namelen(), ParserMessages::nameLength);
    if (currentMarkup())
      currentMarkup()->addName(currentInput());
    parseEndTagClose();
    if (currentMarkup())
      eventHandler().ignoredMarkup(new (eventAllocator())
				   IgnoredMarkupEvent(markupLocation(),
						      currentMarkup()));
    noteMarkup();
  }
}

void Parser::acceptPcdata(const Location &startLocation)
{
  if (currentElement().tryTransitionPcdata())
    return;
  // Need to test here since implying tags may turn off pcdataRecovering.
  if (pcdataRecovering())
    return;
  IList<Undo> undoList;
  IList<Event> eventList;
  unsigned startImpliedCount = 0;
  unsigned attributeListIndex = 0;
  keepMessages();
  while (tryImplyTag(startLocation, startImpliedCount, attributeListIndex,
		     undoList, eventList))
    if (currentElement().tryTransitionPcdata()) {
      queueElementEvents(eventList);
      return;
    }
  discardKeptMessages();
  undo(undoList);
  if (validate() || afterDocumentElement())
    message(ParserMessages::pcdataNotAllowed);
  pcdataRecover();
}

void Parser::acceptStartTag(const ElementType *e,
			    StartElementEvent *event,
			    Boolean netEnabling)
{
  if (e->definition()->undefined() && (implydefElement() == Sd::implydefElementNo))
    message(ParserMessages::undefinedElement, StringMessageArg(e->name()));
  if (elementIsExcluded(e)) {
    keepMessages();
    if (validate())
      checkExclusion(e);
  }
  else {
    if (currentElement().tryTransition(e)) {
      pushElementCheck(e, event, netEnabling);
      return;
    }
    if (elementIsIncluded(e)) {
      event->setIncluded();
      pushElementCheck(e, event, netEnabling);
      return;
    }
    keepMessages();
  }
  IList<Undo> undoList;
  IList<Event> eventList;
  unsigned startImpliedCount = 0;
  unsigned attributeListIndex = 1;
  while (tryImplyTag(event->location(), startImpliedCount,
		     attributeListIndex, undoList, eventList))
    if (tryStartTag(e, event, netEnabling, eventList))
      return;
  discardKeptMessages();
  undo(undoList);
  if (validate() && !e->definition()->undefined())
    handleBadStartTag(e, event, netEnabling);
  else {
    if (validate() ? (implydefElement() != Sd::implydefElementNo) : afterDocumentElement())
      message(ParserMessages::elementNotAllowed, StringMessageArg(e->name()));
    // If element couldn't occur because it was excluded, then
    // do the transition here.
    (void)currentElement().tryTransition(e);
    pushElementCheck(e, event, netEnabling);
  }
}

void Parser::undo(IList<Undo> &undoList)
{
  while (!undoList.empty()) {
    Undo *p = undoList.get();
    p->undo(this);
    delete p;
  }
}

void Parser::queueElementEvents(IList<Event> &events)
{
  releaseKeptMessages();
  // FIXME provide IList<T>::reverse function
  // reverse it
  IList<Event> tem;
  while (!events.empty())
    tem.insert(events.get());
  while (!tem.empty()) {
    Event *e = tem.get();
    if (e->type() == Event::startElement) {
      noteStartElement(((StartElementEvent *)e)->included());
      eventHandler().startElement((StartElementEvent *)e);
    }
    else {
      noteEndElement(((EndElementEvent *)e)->included());
      eventHandler().endElement((EndElementEvent *)e);
    }
  }

}

void Parser::checkExclusion(const ElementType *e)
{
  const LeafContentToken *token = currentElement().invalidExclusion(e);
  if (token)
    message(ParserMessages::invalidExclusion,
	    OrdinalMessageArg(token->typeIndex() + 1),
	    StringMessageArg(token->elementType()->name()),
	    StringMessageArg(currentElement().type()->name()));
}

Boolean Parser::tryStartTag(const ElementType *e,
			    StartElementEvent *event,
			    Boolean netEnabling,
			    IList<Event> &impliedEvents)
{
  if (elementIsExcluded(e)) {
    checkExclusion(e);
    return 0;
  }
  if (currentElement().tryTransition(e)) {
    queueElementEvents(impliedEvents);
    pushElementCheck(e, event, netEnabling);
    return 1;
  }
  if (elementIsIncluded(e)) {
    queueElementEvents(impliedEvents);
    event->setIncluded();
    pushElementCheck(e, event, netEnabling);
    return 1;
  }
  return 0;
}

Boolean Parser::tryImplyTag(const Location &loc,
			    unsigned &startImpliedCount,
			    unsigned &attributeListIndex,
			    IList<Undo> &undo,
			    IList<Event> &eventList)
{
  if (!sd().omittag())
    return 0;
  if (currentElement().isFinished()) {
    if (tagLevel() == 0)
      return 0;
#if 1
    const ElementDefinition *def = currentElement().type()->definition();
    if (def && !def->canOmitEndTag())
      return 0;
#endif
    // imply an end tag
    if (startImpliedCount > 0) {
      message(ParserMessages::startTagEmptyElement,
	      StringMessageArg(currentElement().type()->name()));
      startImpliedCount--;
    }
#if 0
    const ElementDefinition *def = currentElement().type()->definition();
    if (def && !def->canOmitEndTag())
      message(ParserMessages::omitEndTagDeclare,
	      StringMessageArg(currentElement().type()->name()),
	      currentElement().startLocation());
#endif
    EndElementEvent *event
      = new (eventAllocator()) EndElementEvent(currentElement().type(),
					       currentDtdPointer(),
					       loc,
					       0);
    eventList.insert(event);
    undo.insert(new (internalAllocator()) UndoEndTag(popSaveElement()));
    return 1;
  }
  const LeafContentToken *token = currentElement().impliedStartTag();
  if (!token)
    return 0;
  const ElementType *e = token->elementType();
  if (elementIsExcluded(e))
    message(ParserMessages::requiredElementExcluded,
	    OrdinalMessageArg(token->typeIndex() + 1),
	    StringMessageArg(e->name()),
	    StringMessageArg(currentElement().type()->name()));
  if (tagLevel() != 0)
    undo.insert(new (internalAllocator())
		     UndoTransition(currentElement().matchState()));
  currentElement().doRequiredTransition();
  const ElementDefinition *def = e->definition();
  if (def->declaredContent() != ElementDefinition::modelGroup
      && def->declaredContent() != ElementDefinition::any)
    message(ParserMessages::omitStartTagDeclaredContent,
	    StringMessageArg(e->name()));
  if (def->undefined())
    message(ParserMessages::undefinedElement, StringMessageArg(e->name()));
  else if (!def->canOmitStartTag())
    message(ParserMessages::omitStartTagDeclare, StringMessageArg(e->name()));
  AttributeList *attributes
    = allocAttributeList(e->attributeDef(),
			 attributeListIndex++);
  // this will give an error if the element has a required attribute
  attributes->finish(*this);
  startImpliedCount++;
  StartElementEvent *event
    = new (eventAllocator()) StartElementEvent(e,
					       currentDtdPointer(),
					       attributes,
					       loc,
					       0);
  pushElementCheck(e, event, undo, eventList);
  const int implyCheckLimit = 30; // this is fairly arbitrary
  if (startImpliedCount > implyCheckLimit
      && !checkImplyLoop(startImpliedCount))
    return 0;
  return 1;
}

void Parser::pushElementCheck(const ElementType *e, StartElementEvent *event,
			      Boolean netEnabling)
{
  if (tagLevel() == syntax().taglvl())
    message(ParserMessages::taglvlOpenElements, NumberMessageArg(syntax().taglvl()));
  noteStartElement(event->included());
  if (event->mustOmitEnd()) {
    if (sd().emptyElementNormal()) {
      Boolean included = event->included();
      Location loc(event->location());
      eventHandler().startElement(event);
      endTagEmptyElement(e, netEnabling, included, loc);
    }
    else {
      EndElementEvent *end
	= new (eventAllocator()) EndElementEvent(e,
					         currentDtdPointer(),
					         event->location(),
					         0);
      if (event->included()) {
	end->setIncluded();
	noteEndElement(1);
      }
      else
	noteEndElement(0);
      eventHandler().startElement(event);
      eventHandler().endElement(end);
    }
  }
  else {
    const ShortReferenceMap *map = e->map();
    if (!map)
      map = currentElement().map();
    if (options().warnImmediateRecursion
        && e == currentElement().type())
      message(ParserMessages::immediateRecursion);
    pushElement(new (internalAllocator()) OpenElement(e,
						      netEnabling,
						      event->included(),
						      map,
						      event->location()));
    // Can't access event after it's passed to the event handler.
    eventHandler().startElement(event);
  }
}

void Parser::endTagEmptyElement(const ElementType *e,
				Boolean netEnabling,
				Boolean included,
				const Location &startLoc)
{
  Token token = getToken(netEnabling ? econnetMode : econMode);
  switch (token) {
  case tokenNet:
    if (netEnabling) {
      Markup *markup = startMarkup(eventsWanted().wantInstanceMarkup(),
			           currentLocation());
      if (markup)
	markup->addDelim(Syntax::dNET);
      EndElementEvent *end
	= new (eventAllocator()) EndElementEvent(e,
						 currentDtdPointer(),
						 currentLocation(),
						 markup);
      if (included)
	end->setIncluded();
      eventHandler().endElement(end);
      noteEndElement(included);
      return;
    }
    break;
  case tokenEtagoTagc:
    {
      if (options().warnEmptyTag)
	message(ParserMessages::emptyEndTag);
      Markup *markup = startMarkup(eventsWanted().wantInstanceMarkup(),
				   currentLocation());
      if (markup) {
        markup->addDelim(Syntax::dETAGO);
        markup->addDelim(Syntax::dTAGC);
      }
      EndElementEvent *end
	= new (eventAllocator()) EndElementEvent(e,
						 currentDtdPointer(),
						 currentLocation(),
						 markup);
      if (included)
	end->setIncluded();
      eventHandler().endElement(end);
      noteEndElement(included);
      return;
    }
  case tokenEtagoNameStart:
    {
      EndElementEvent *end = parseEndTag();
      if (end->elementType() == e) {
	if (included)
	  end->setIncluded();
	eventHandler().endElement(end);
	noteEndElement(included);
	return;
      }
      if (!elementIsOpen(end->elementType())) {
	message(ParserMessages::elementNotOpen,
		StringMessageArg(end->elementType()->name()));
	delete end;
	break;
      }
      implyEmptyElementEnd(e, included, startLoc);
      acceptEndTag(end);
      return;
    }
  default:
    break;
  }
  implyEmptyElementEnd(e, included, startLoc);
  currentInput()->ungetToken();
}

void Parser::implyEmptyElementEnd(const ElementType *e,
				  Boolean included,
				  const Location &startLoc)
{
  if (!sd().omittag())
    message(ParserMessages::omitEndTagOmittag,
	    StringMessageArg(e->name()),
	    startLoc);
  else {
    const ElementDefinition *def = e->definition();
    if (def && !def->canOmitEndTag())
      message(ParserMessages::omitEndTagDeclare,
	      StringMessageArg(e->name()),
	      startLoc);
  }
  EndElementEvent *end
    = new (eventAllocator()) EndElementEvent(e,
					     currentDtdPointer(),
					     currentLocation(),
					     0);
  if (included)
    end->setIncluded();
  noteEndElement(included);
  eventHandler().endElement(end);
}

void Parser::pushElementCheck(const ElementType *e, StartElementEvent *event,
			      IList<Undo> &undoList,
			      IList<Event> &eventList)
{
  if (tagLevel() == syntax().taglvl())
    message(ParserMessages::taglvlOpenElements, NumberMessageArg(syntax().taglvl()));
  eventList.insert(event);
  if (event->mustOmitEnd()) {
    EndElementEvent *end
      = new (eventAllocator()) EndElementEvent(e,
					       currentDtdPointer(),
					       event->location(),
					       0);
    if (event->included())
      end->setIncluded();
    eventList.insert(end);
  }
  else {
    undoList.insert(new (internalAllocator()) UndoStartTag);
    const ShortReferenceMap *map = e->map();
    if (!map)
      map = currentElement().map();
    pushElement(new (internalAllocator()) OpenElement(e,
						      0,
						      event->included(),
						      map,
						      event->location()));
  }
}

EndElementEvent *Parser::parseEndTag()
{
  Markup *markup = startMarkup(eventsWanted().wantInstanceMarkup(),
			       currentLocation());
  if (markup) 
    markup->addDelim(Syntax::dETAGO);
  return doParseEndTag();
}

EndElementEvent *Parser::doParseEndTag()
{
 Markup *markup = currentMarkup();
 currentInput()->discardInitial();
 extendNameToken(syntax().namelen(), ParserMessages::nameLength);
 if (markup)
    markup->addName(currentInput());
  StringC &name = nameBuffer();
  getCurrentToken(syntax().generalSubstTable(), name);
  const ElementType *e = currentDtd().lookupElementType(name);
  if (sd().rank()) {
    if (!e)
      e = completeRankStem(name);
  }
  if (!e) 
    e = lookupCreateUndefinedElement(name, currentLocation(), currentDtdNonConst(), (implydefElement() != Sd::implydefElementAnyother));
  parseEndTagClose();
  return new (eventAllocator())
	       EndElementEvent(e,
			       currentDtdPointer(),
			       markupLocation(),
			       markup);
}

void Parser::parseEndTagClose()
{
  for (;;) {
    Token token = getToken(tagMode);
    switch (token) {
    case tokenUnrecognized:
      if (!reportNonSgmlCharacter())
	message(ParserMessages::endTagCharacter, StringMessageArg(currentToken()));
      return;
    case tokenEe:
      message(ParserMessages::endTagEntityEnd);
      return;
    case tokenEtago:
    case tokenStago:
      if (!sd().endTagUnclosed())
	message(ParserMessages::unclosedEndTagShorttag);
      currentInput()->ungetToken();
      return;
    case tokenTagc:
      if (currentMarkup())
	currentMarkup()->addDelim(Syntax::dTAGC);
      return;
    case tokenS:
      if (currentMarkup())
	currentMarkup()->addS(currentChar());
      break;
    default:
      message(ParserMessages::endTagInvalidToken,
	      TokenMessageArg(token, tagMode, syntaxPointer(), sdPointer()));
      return;
    }
  }
}

void Parser::parseEmptyEndTag()
{
  if (options().warnEmptyTag)
    message(ParserMessages::emptyEndTag);
  if (!currentDtd().isBase())
    message(ParserMessages::emptyEndTagBaseDtd);
  if (tagLevel() == 0)
    message(ParserMessages::emptyEndTagNoOpenElements);
  else {
    Markup *markup = startMarkup(eventsWanted().wantInstanceMarkup(),
				 currentLocation());
    if (markup) {
      markup->addDelim(Syntax::dETAGO);
      markup->addDelim(Syntax::dTAGC);
    }
    acceptEndTag(new (eventAllocator()) EndElementEvent(currentElement().type(),
							currentDtdPointer(),
							currentLocation(),
							markup));
  }
}

void Parser::parseNullEndTag()
{
  // If a null end tag was recognized, then there must be a net enabling
  // element on the stack.
  for (;;) {
    ASSERT(tagLevel() > 0);
    if (currentElement().netEnabling())
      break;
    if (!currentElement().isFinished() && validate())
      message(ParserMessages::elementNotFinished,
	      StringMessageArg(currentElement().type()->name()));
    implyCurrentElementEnd(currentLocation());
  }
  if (!currentElement().isFinished() && validate())
    message(ParserMessages::elementEndTagNotFinished,
	    StringMessageArg(currentElement().type()->name()));
  Markup *markup = startMarkup(eventsWanted().wantInstanceMarkup(),
			       currentLocation());
  if (markup)
    markup->addDelim(Syntax::dNET);
  acceptEndTag(new (eventAllocator()) EndElementEvent(currentElement().type(),
						      currentDtdPointer(),
						      currentLocation(),
						      markup));
}

void Parser::endAllElements()
{
  while (tagLevel() > 0) {
    if (!currentElement().isFinished())
      message(ParserMessages::elementNotFinishedDocumentEnd,
	      StringMessageArg(currentElement().type()->name()));
    implyCurrentElementEnd(currentLocation());
  }
  if (!currentElement().isFinished() && validate())
    message(ParserMessages::noDocumentElement);
}

void Parser::acceptEndTag(EndElementEvent *event)
{
  const ElementType *e = event->elementType();
  if (!elementIsOpen(e)) {
    message(ParserMessages::elementNotOpen, StringMessageArg(e->name()));
    delete event;
    return;
  }
  for (;;){
    if (currentElement().type() == e)
      break;
    if (!currentElement().isFinished() && validate())
      message(ParserMessages::elementNotFinished,
	      StringMessageArg(currentElement().type()->name()));
    implyCurrentElementEnd(event->location());
  }
  if (!currentElement().isFinished() && validate())
    message(ParserMessages::elementEndTagNotFinished,
	    StringMessageArg(currentElement().type()->name()));
  if (currentElement().included())
    event->setIncluded();
  noteEndElement(event->included());
  eventHandler().endElement(event);
  popElement();
}

void Parser::implyCurrentElementEnd(const Location &loc)
{
  if (!sd().omittag())
    message(ParserMessages::omitEndTagOmittag,
	    StringMessageArg(currentElement().type()->name()),
	    currentElement().startLocation());
  else {
    const ElementDefinition *def = currentElement().type()->definition();
    if (def && !def->canOmitEndTag())
      message(ParserMessages::omitEndTagDeclare,
	      StringMessageArg(currentElement().type()->name()),
	      currentElement().startLocation());
  }
  EndElementEvent *event
    = new (eventAllocator()) EndElementEvent(currentElement().type(),
					     currentDtdPointer(),
					     loc,
					     0);
  if (currentElement().included())
    event->setIncluded();
  noteEndElement(event->included());
  eventHandler().endElement(event);
  popElement();
}

void Parser::extendData()
{
  XcharMap<PackedBoolean> isNormal(normalMap());
  InputSource *in = currentInput();
  size_t length = in->currentTokenLength();
  // This is one of the parser's inner loops, so it needs to be fast.
  while (isNormal[in->tokenCharInBuffer(messenger())])
    length++;
  in->endToken(length);
}

void Parser::extendContentS()
{
  InputSource *in = currentInput();
  size_t length = in->currentTokenLength();
  XcharMap<PackedBoolean> isNormal(normalMap());
  for (;;) {
    Xchar ch = in->tokenChar(messenger());
    if (!syntax().isS(ch) || !isNormal[ch])
      break;
    length++;
  }
  in->endToken(length);
}

void Parser::handleBadStartTag(const ElementType *e,
			       StartElementEvent *event,
			       Boolean netEnabling)
{
  IList<Undo> undoList;
  IList<Event> eventList;
  keepMessages();
  for (;;) {
    Vector<const ElementType *> missing;
    findMissingTag(e, missing);
    if (missing.size() == 1) {
      queueElementEvents(eventList);
      const ElementType *m = missing[0];
      message(ParserMessages::missingElementInferred,
	      StringMessageArg(e->name()),
	      StringMessageArg(m->name()));
      AttributeList *attributes
	= allocAttributeList(m->attributeDef(), 1);
      // this will give an error if the element has a required attribute
      attributes->finish(*this);
      StartElementEvent *inferEvent
	= new (eventAllocator()) StartElementEvent(m,
						   currentDtdPointer(),
						   attributes,
						   event->location(),
						   0);
      if (!currentElement().tryTransition(m))
	inferEvent->setIncluded();
      pushElementCheck(m, inferEvent, 0);
      if (!currentElement().tryTransition(e))
	event->setIncluded();
      pushElementCheck(e, event, netEnabling);
      return;
    }
    if (missing.size() > 0) {
      queueElementEvents(eventList);
      Vector<StringC> missingNames;
      for (size_t i = 0; i < missing.size(); i++)
	missingNames.push_back(missing[i]->name());
      message(ParserMessages::missingElementMultiple,
	      StringMessageArg(e->name()),
	      StringVectorMessageArg(missingNames));
      pushElementCheck(e, event, netEnabling);
      return;
    }
    if (!sd().omittag()
	|| !currentElement().isFinished()
	|| tagLevel() == 0
	|| !currentElement().type()->definition()->canOmitEndTag())
      break;
    EndElementEvent *endEvent
      = new (eventAllocator()) EndElementEvent(currentElement().type(),
					       currentDtdPointer(),
					       event->location(),
					       0);
    eventList.insert(endEvent);
    undoList.insert(new (internalAllocator()) UndoEndTag(popSaveElement()));
  }
  discardKeptMessages();
  undo(undoList);
  message(ParserMessages::elementNotAllowed, StringMessageArg(e->name()));
  // If element couldn't occur because it was excluded, then
  // do the transition here.
  (void)currentElement().tryTransition(e);
  pushElementCheck(e, event, netEnabling);
}

void Parser::findMissingTag(const ElementType *e,
			    Vector<const ElementType *> &v)
{
  if (!currentElement().currentPosition()) {
    if (!e)
      v.push_back((const ElementType *)0);
    return;
  }
  if (elementIsExcluded(e))
    return;
  size_t newSize = 0;
  currentElement().matchState().possibleTransitions(v);
  // FIXME also get currentInclusions
  for (size_t i = 0; i < v.size(); i++) {
    if (v[i] && !elementIsExcluded(v[i])) {
      Boolean success = 0;
      switch (v[i]->definition()->declaredContent()) {
      case ElementDefinition::modelGroup:
	{
	  const CompiledModelGroup *grp
	    = v[i]->definition()->compiledModelGroup();
	  MatchState state(grp);
	  if (!e) {
	    if (state.tryTransitionPcdata())
	      success = 1;
	  }
	  else {
	    if (state.tryTransition(e))
	      success = 1;
	    if (!success) {
	      for (size_t j = 0; j < v[i]->definition()->nInclusions(); j++)
		if (v[i]->definition()->inclusion(j) == e) {
		  success = 1;
		  break;
		}
	    }
	    if (success) {
	      for (size_t j = 0; j < v[i]->definition()->nExclusions(); j++)
		if (v[i]->definition()->exclusion(j) == e) {
		  success = 0;
		  break;
		}
	    }
	  }
	}
	break;
#if 0
      case ElementDefinition::any:
	success = 1;
	break;
#endif
      case ElementDefinition::cdata:
      case ElementDefinition::rcdata:
	if (e == 0)
	  success = 1;
	break;
      default:
	break;
      }
      if (success)
	v[newSize++] = v[i];
    }
  }
  v.resize(newSize);
  // Sort them according to the order of their occurrence in the DTD.
  // Do an insertion sort.
  for (size_t i = 1; i < v.size(); i++) {
    const ElementType *tem = v[i];
    size_t j;
    for (j = i; j > 0 && v[j - 1]->index() > tem->index(); j--)
      v[j] = v[j - 1];
    v[j] = tem;
  }
}

#if 0
// This produces messages that are too verbose
// This doesn't try to be very efficient.
// 0 for #pcdata

void Parser::getAllowedElementTypes(Vector<const ElementType *> &v)
{
  v.clear();
  // FIXME get a list of all inclusions first
  // getCurrentInclusions(v);
  // x says whether each element of v was excluded
  Vector<PackedBoolean> x(v.size(), 0);
  unsigned startImpliedCount = 0;
  IList<Undo> undoList;
  for (;;) {
    if (currentElement().currentPosition()) {
      // have a model group
      size_t i = v.size();
      currentElement().matchState().possibleTransitions(v);
      x.resize(v.size());
      for (size_t j = i; j < v.size(); j++)
	x[j] = (v[j] && elementIsExcluded(v[j]));
      if (!sd().omittag())
	break;
      // Try to imply a tag
      if (currentElement().isFinished()) {
	if (tagLevel() == 0)
	  break;
	if (startImpliedCount)
	  break;
	const ElementDefinition *def = currentElement().type()->definition();
	if (def && def->canOmitEndTag())
	  undoList.insert(new (internalAllocator())
			  UndoEndTag(popSaveElement()));
	else
	  break;
      }
      else {
	const LeafContentToken *token = currentElement().impliedStartTag();
	if (!token)
	  break;
	const ElementType *e = token->elementType();
	if (elementIsExcluded(e))
	  break;
	const ElementDefinition *def = e->definition();
	if (!def
	    || def->undefined()
	    || (def->declaredContent() != ElementDefinition::modelGroup
		&& def->declaredContent() != ElementDefinition::any)
	    || !def->canOmitStartTag())
	  break;
	undoList.insert(new (internalAllocator()) UndoStartTag);
	startImpliedCount++;
	pushElement(new (internalAllocator()) OpenElement(e,
							  0,
							  0,
							  0,
							  Location()));
	if (checkImplyLoop(startImpliedCount))
	  break;
	for (size_t i = 0; i < def->nInclusions(); i++)
	  if (!elementIsExcluded(def->inclusion(i))) {
	    v.push_back(def->inclusion(i));
	    x.push_back(0);
	  }
      }
    }
    else {
      // must be allowed #pcdata
      v.push_back((const ElementType *)0);
      x.push_back((PackedBoolean)0);
      break;
    }
  }
  undo(undoList);
  // Remove exclusions and duplicates and undefined
  size_t newSize = 0;
  for (size_t i = 0; i < v.size(); i++)
    if (!x[i] && (!v[i] || !v[i]->definition()->undefined())) {
      Boolean dup = 0;
      for (size_t j = 0; j < newSize; j++)
	if (v[i] == v[j]) {
	  dup = 1;
	  break;
	}
      if (!dup)
	v[newSize++] = v[i];
    }
  v.resize(newSize);
}
#endif

#ifdef SP_NAMESPACE
}
#endif
