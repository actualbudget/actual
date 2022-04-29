// Copyright (c) 1995 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif

#include "config.h"
#include "CopyEventHandler.h"
#include "macros.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

inline
OutputCharStream &operator<<(OutputCharStream &os, const MarkupIter &iter)
{
  return os.write(iter.charsPointer(), iter.charsLength());
}

#ifdef __GNUG__
inline
#endif
Boolean CopyEventHandler::noOutput()
{
  if (inInstance_) {
    if (normalizeFlags_ & normalizeExpand) {
      if (entityLevel_ >= outputEntityLevel_)
	return 0;
    }
    else {
      if (entityLevel_ == outputEntityLevel_)
	return 0;
    }
  }
  else if (normalizeFlags_ & normalizeIncludeProlog) {
    if (normalizeFlags_ & normalizeExpandProlog) {
      if (entityLevel_ >= outputEntityLevel_)
	return 0;
    }
    else {
      if (entityLevel_ == outputEntityLevel_)
	return 0;
    }
  }
  return 1;
}

inline
Boolean CopyEventHandler::doNothing(Event *event)
{
  if (noOutput()) {
    delete event;
    return 1;
  }
  else
    return 0;
}


inline
void CopyEventHandler::withNamedCharRef(const StringC &str,
					const Location &loc)
{
  withNamedCharRef(str.data(), str.size(), loc);
}

static
void escape(OutputCharStream &s, Char c)
{
  s << "&#" << (unsigned long)c << ";";
}

CopyEventHandler::CopyEventHandler(OutputCharStream *os,
				   unsigned normalizeFlags,
				   const StringC &outputEntity)
: os_(os), topOs_(os), inInstance_(0), entityLevel_(0),
  normalizeFlags_(normalizeFlags), outputEntity_(outputEntity),
  omittagHoist_(0), inSpecialMarkedSection_(0),
  currentAttributes_(0), emptyElementNormal_(0)
{
  outputEntityLevel_ = outputEntity_.size() == 0 ? 0 : unsigned(-1);
  os_->setEscaper(escape);
}

CopyEventHandler::~CopyEventHandler()
{
  delete os_;
}

void CopyEventHandler::markup(const Location &loc,
			      const Markup &markup)
{
  if (!noOutput())
    outputMarkup(loc, markup);
}

void CopyEventHandler::sgmlDecl(SgmlDeclEvent *event)
{
  if (event->implySystemId().size() == 0
      && !event->location().origin().isNull()
      && (normalizeFlags_ & normalizeIncludeProlog)) {
    syntax_ = event->refSyntaxPointer();
    sd_ = event->refSdPointer();
    outputMarkup(event->location(), event->markup());
  }
  syntax_ = event->prologSyntaxPointer();
  instanceSyntax_ = event->instanceSyntaxPointer();
  if (instanceSyntax_->namecaseGeneral())
    instanceSyntax_->generalSubstTable()->inverseTable(lowerSubst_);
  else if (instanceSyntax_->namecaseEntity())
    instanceSyntax_->entitySubstTable()->inverseTable(lowerSubst_);
  sd_ = event->sdPointer();
  emptyElementNormal_ = sd_->emptyElementNormal();
  delete event;
}

void CopyEventHandler::endProlog(EndPrologEvent *event)
{
  inInstance_ = 1;
  syntax_ = instanceSyntax_;
  delete event;
}

void CopyEventHandler::data(DataEvent *event)
{
  omittagHoist_ = 0;
  if (doNothing(event))
    return;
  if (event->entity())
    entityRef(event->location().origin()->asEntityOrigin());
  else {
    size_t n = event->dataLength();
    unsigned long dummy;
    if (n > 1 || !event->isRe(dummy))
      writeData(event->data(), n, event->location());
  }
  delete event;
}

void CopyEventHandler::nonSgmlChar(NonSgmlCharEvent *event)
{
  omittagHoist_ = 0;
  if (doNothing(event))
    return;
  Char c = event->character();
  writeData(&c, 1, event->location());
  delete event;
}

void CopyEventHandler::writeData(const Char *p, size_t n,
				 const Location &loc)
{
  const Markup *markupPtr;
  if (n == 1 && loc.origin()->isNumericCharRef(markupPtr)) {
    if (markupPtr)
      outputMarkup(loc.origin()->parent(), *markupPtr);
  }
  else
    withNamedCharRef(p, n, loc);
}

void CopyEventHandler::withNamedCharRef(const Char *p, size_t n,
					const Location &loc)
{
  if (n > 0) {
    const Origin *origin = loc.origin().pointer();
    if (origin) {
      NamedCharRef ref;
      if (origin->isNamedCharRef(loc.index(), ref)) {
	Markup markup;
	markup.addDelim(Syntax::dCRO);
	markup.addName(ref.origName().data(), ref.origName().size());
	switch (ref.refEndType()) {
	case NamedCharRef::endOmitted:
	  break;
	case NamedCharRef::endRE:
	  markup.addRefEndRe();
	  break;
	case NamedCharRef::endRefc:
	  markup.addDelim(Syntax::dREFC);
	  break;
	}
	outputMarkup(Location(loc.origin(), ref.refStartIndex()), markup);
	p++;
	n--;
      }
    }
  }
  os().write(p, n);
}

void CopyEventHandler::reOrigin(ReOriginEvent *event)
{
  omittagHoist_ = 0;
  if (doNothing(event))
    return;
  Char c = event->re();
  withNamedCharRef(&c, 1, event->location());
  delete event;
}

void CopyEventHandler::sSep(SSepEvent *event)
{
  if (doNothing(event))
    return;
  withNamedCharRef(event->data(), event->dataLength(), event->location());
  delete event;
}

void CopyEventHandler::ignoredRs(IgnoredRsEvent *event)
{
  if (doNothing(event))
    return;
  Char c = event->rs();
  withNamedCharRef(&c, 1, event->location());
  delete event;
}

void CopyEventHandler::startElement(StartElementEvent *event)
{
  mustOmitEnd_ = event->mustOmitEnd();
  const Markup *markup = event->markupPtr();
  if (!markup) {
    if (normalizeFlags_ & normalizeExpand) {
      if (outputEntityLevel_ > entityLevel_ - omittagHoist_) {
	delete event;
	return;
      }
      if (omittagHoist_ >= entityStack_.size())
	os_ = topOs_;
    }
    else if (entityLevel_ - omittagHoist_ != outputEntityLevel_) {
      delete event;
      return;
    }
  }
  else {
    omittagHoist_ = 0;
    if (doNothing(event))
      return;
  }
  if (normalizeFlags_ & normalizeExpandAll)
    handleChange();
  if (markup) {
    Boolean hadName = 0;
    Boolean closed = 1;
    MarkupIter iter(*markup);
    while (iter.valid()) {
      switch (iter.type()) {
      case Markup::delimiter:
	switch (iter.delimGeneral()) {
	case Syntax::dTAGC:
	  closed = 1;
	  if (!hadName) {
	    StringC nameBuf;
	    StringC tag(elementTypeOrigName(event->elementType(), nameBuf));
	    if (normalizeFlags_ & normalizeEmptytag) {
	      handleChange();
	      os() << tag;
	      tag.resize(0);
	    }
	    unspecifiedAttributeValues(event->attributes(), tag);
	  }
	  os() << syntax_->delimGeneral(iter.delimGeneral());
	  break;
	case Syntax::dNESTC:
	  closed = 1;
	  if (normalizeFlags_ & normalizeNet) {
	    handleChange();
	    os() << syntax_->delimGeneral(Syntax::dTAGC);
	    break;
	  }
	  // fall through
	default:
	  os() << syntax_->delimGeneral(iter.delimGeneral());
	  break;
	}
	iter.advance();
	break;
      case Markup::name:
	{
	  ASSERT(!hadName);
	  const ElementType *elementType = event->elementType();
	  if (elementType->index() >= elementTypeOrigNames_.size())
	    elementTypeOrigNames_.resize(elementType->index() + 1);
	  StringC &elementTypeOrigName
	    = elementTypeOrigNames_[elementType->index()];
	  if (elementTypeOrigName.size() == 0) {
	    elementTypeOrigName.assign(iter.charsPointer(),
				       iter.charsLength());
	    // add rank if missing
	    elementTypeOrigName.append(event->name().data() +
				       elementTypeOrigName.size(),
				       event->name().size()
				       - elementTypeOrigName.size());
	  }
	  os() << iter;
	  if (normalizeFlags_ & normalizeRank) {
	    for (size_t i = iter.charsLength();
		 i < event->name().size();
		 i++) {
	      handleChange();
	      os().put(event->name()[i]);
	    }
	  }
	  attributeSpecList(iter, event->attributes());
	  hadName = 1;
	}
	break;
      case Markup::s:
	os() << iter;
	iter.advance();
	break;
      default:
	CANNOT_HAPPEN();
      }
    }
    if (!closed && (normalizeFlags_ && normalizeUnclosed)) {
      handleChange();
      os() << syntax_->delimGeneral(Syntax::dTAGC);
    }
  }
  else if (normalizeFlags_ & normalizeOmittag) {
    if (inSpecialMarkedSection_) {
      reportTagInSpecialMarkedSection(event->location());
      return;
    }
    handleChange();
    StringC nameBuf;
    os() << syntax_->delimGeneral(Syntax::dSTAGO)
      << elementTypeOrigName(event->elementType(), nameBuf);
    unspecifiedAttributeValues(event->attributes(), StringC());
    os() << syntax_->delimGeneral(Syntax::dTAGC);
  }
  delete event;
  if (entityStack_.size() > 0 && os_ == topOs_)
    os_ = &entityStack_.back().str;
}

void CopyEventHandler::attributeSpecList(MarkupIter &iter,
					 const AttributeList &atts)
{
  size_t nAtt = atts.size();
  unsigned i;
  unsigned *attIndex;
  if (atts.nSpec()) {
    attIndex = new unsigned[atts.nSpec()];
    for (i = 0; i < atts.nSpec(); i++)
      attIndex[i] = unsigned(-1);
    for (i = 0; i < nAtt; i++)
      if (atts.specified(i))
	attIndex[atts.specIndex(i)] = i;
  }
  else
    attIndex = 0;
  Boolean hadAttname = 0;
  i = 0;
  StringC nameBuf;
  for (iter.advance(); iter.valid(); iter.advance())
    switch (iter.type()) {
    case Markup::name:
      os() << iter;
      hadAttname = 1;
      break;
    case Markup::s:
      os() << iter;
      break;
    case Markup::attributeValue:
      if (!hadAttname
	  && attIndex
	  && attIndex[i] != unsigned(-1)
	  && (normalizeFlags_ & (normalizeAttname | normalizeAttvalue))) {
	handleChange();
	os() << generalName(atts.name(attIndex[i]), nameBuf)
	  << syntax_->delimGeneral(Syntax::dVI);
      }
      if (normalizeFlags_ & normalizeAttvalue) {
	handleChange();
	os() << syntax_->delimGeneral(Syntax::dLIT)
	  << iter
	    << syntax_->delimGeneral(Syntax::dLIT);
      }
      else
	os() << iter;
      hadAttname = 0;
      i++;
      break;
    case Markup::literal:
      literal(iter.text());
      i++;
      hadAttname = 0;
      break;
    case Markup::delimiter:
      if (iter.delimGeneral() == Syntax::dVI)
	os() << syntax_->delimGeneral(iter.delimGeneral());
      else {
	unspecifiedAttributeValues(atts, StringC());
	delete [] attIndex;
	return;
      }
      break;
    default:
      CANNOT_HAPPEN();
    }
}

void CopyEventHandler::unspecifiedAttributeValues(const AttributeList &atts,
						  const StringC &beforeFirst)
{
  if (normalizeFlags_ & (normalizeCurrent|normalizeAttspec)) {
    Boolean first = 1;
    size_t nAtt = atts.size();
    StringC nameBuf;
    for (unsigned i = 0; i < nAtt; i++) {
      const Text *text;
      if (!atts.specified(i)
	  && ((normalizeFlags_ & normalizeAttspec)
	      || atts.current(i))
	  && atts.value(i)
	  && (text = atts.value(i)->text()) != 0) {
	if (first) {
	  handleChange();
	  os() << beforeFirst;
	  first = 0;
	}
	os().put(syntax_->standardFunction(Syntax::fSPACE));
	os() << generalName(atts.name(i), nameBuf)
	  << syntax_->delimGeneral(Syntax::dVI);
	Boolean lita;
	if (text->delimType(lita))
	  literal(*text);
	else {
	  if (normalizeFlags_ & normalizeAttvalue) {
	    os() << syntax_->delimGeneral(Syntax::dLIT)
	      << text->string()
		<<  syntax_->delimGeneral(Syntax::dLIT);
	  }
	  else
	    os() << text->string();
	}
      }
    }
  }
}

void CopyEventHandler::literal(const Text &text)
{
  TextIter iter(text);
  TextItem::Type type;
  const Char *p;
  size_t n;
  const Location *loc;
  StringC delim;
  Boolean lita;
  if (!text.delimType(lita))
    CANNOT_HAPPEN();
  delim = syntax_->delimGeneral(lita ? Syntax::dLITA : Syntax::dLIT);
  os() << delim;
  int level = 0;
  while (iter.next(type, p, n, loc)) {
    switch (type) {
    case TextItem::ignore:
    case TextItem::data:
    case TextItem::nonSgml:
      if (!level) {
	const Char *orig;
	if (loc->origin()->origChars(orig))
	  writeData(orig, n, loc->origin()->parent());
	else
	  writeData(p, n, *loc);
      }
      break;
    case TextItem::cdata:
    case TextItem::sdata:
      if (!level)
	entityRef(loc->origin()->asEntityOrigin());
      break;
    case TextItem::entityStart:
      if (!level++)
	entityRef(loc->origin()->asEntityOrigin());
      break;
    case TextItem::entityEnd:
      level--;
      break;
    case TextItem::startDelim:
    case TextItem::endDelim:
    case TextItem::endDelimA:
      break;
    }
  }
  Location delimLoc;
  if (!text.endDelimLocation(delimLoc))
    CANNOT_HAPPEN();
  withNamedCharRef(delim, delimLoc);
}

void CopyEventHandler::endElement(EndElementEvent *event)
{
  if (!emptyElementNormal_ && mustOmitEnd_) {
    delete event;
    mustOmitEnd_ = 0;
    return;
  }
  const Markup *markup = event->markupPtr();
  if (!markup) {
    if (normalizeFlags_ & normalizeExpand) {
      if (outputEntityLevel_ > entityLevel_ - omittagHoist_) {
	delete event;
	return;
      }
      if (omittagHoist_ >= entityStack_.size())
	os_ = topOs_;
    }
    else if (entityLevel_ - omittagHoist_ != outputEntityLevel_) {
      delete event;
      return;
    }
  }
  else {
    omittagHoist_ = 0;
    if (doNothing(event))
      return;
  }
  if (normalizeFlags_ & normalizeExpandAll)
    handleChange();
  if (markup) {
    Boolean closed = 0;
    Boolean hadAttname = 0;
    for (MarkupIter iter(*markup); iter.valid(); iter.advance())
      switch (iter.type()) {
      case Markup::s:
	os() << iter;
	break;
      case Markup::name:
	{
	  os() << iter;
	  for (size_t i = iter.charsLength();
	       i < event->name().size();
	       i++) {
	    handleChange();
	    os().put(event->name()[i]);
	  }
	  hadAttname = 1;
	}
	break;
      case Markup::delimiter:
	if (iter.delimGeneral() == Syntax::dTAGC) {
	  closed = 1;
	  if (!hadAttname
	      && (normalizeFlags_ & normalizeEmptytag)) {
	    handleChange();
	    StringC nameBuf;
	    os() << elementTypeOrigName(event->elementType(), nameBuf);
	  }
	}
	else if (iter.delimGeneral() == Syntax::dNET) {
	  closed = 1;
	  if (normalizeFlags_ & normalizeNet) {
	    handleChange();
	    StringC nameBuf;
	    os() << syntax_->delimGeneral(Syntax::dETAGO)
	         << elementTypeOrigName(event->elementType(), nameBuf)
	         << syntax_->delimGeneral(Syntax::dTAGC);
	    break;
	  }
	}
	os() << syntax_->delimGeneral(iter.delimGeneral());
	break;
      default:
	CANNOT_HAPPEN();
      }
    if (!closed && (normalizeFlags_ & normalizeUnclosed)) {
      handleChange();
      os() << syntax_->delimGeneral(Syntax::dTAGC);
    }
  }
  else if (normalizeFlags_ & normalizeOmittag) {
    if (inSpecialMarkedSection_) {
      reportTagInSpecialMarkedSection(event->location());
      return;
    }
    handleChange();
    StringC nameBuf;
    os() << syntax_->delimGeneral(Syntax::dETAGO)
      << elementTypeOrigName(event->elementType(), nameBuf)
	<< syntax_->delimGeneral(Syntax::dTAGC);
  }
  delete event;
  if (entityStack_.size() > 0 && os_ == topOs_)
    os_ = &entityStack_.back().str;
}

void CopyEventHandler::pi(PiEvent *event)
{
  omittagHoist_ = 0;
  if (doNothing(event))
    return;
  if (event->entity())
    entityRef(event->location().origin()->asEntityOrigin());
  else {
    os() << syntax_->delimGeneral(Syntax::dPIO);
    os().write(event->data(), event->dataLength());
    os() << syntax_->delimGeneral(Syntax::dPIC);
  }
  delete event;
}

void CopyEventHandler::sdataEntity(SdataEntityEvent *event)
{
  omittagHoist_ = 0;
  if (doNothing(event))
    return;
  entityRef(event->location().origin()->asEntityOrigin());
  delete event;
}

void CopyEventHandler::externalDataEntity(ExternalDataEntityEvent *event)
{
  omittagHoist_ = 0;
  if (doNothing(event))
    return;
  entityRef(event->entityOrigin().pointer());
  delete event;
}

void CopyEventHandler::subdocEntity(SubdocEntityEvent *event)
{
  omittagHoist_ = 0;
  if (doNothing(event))
    return;
  entityRef(event->entityOrigin().pointer());
  delete event;
}

void CopyEventHandler::markedSectionStart(MarkedSectionStartEvent *event)
{
  omittagHoist_ = 0;
  switch (event->status()) {
  case MarkedSectionEvent::rcdata:
  case MarkedSectionEvent::cdata:
    inSpecialMarkedSection_ = 1;
    break;
  default:
    break;
  }
  if (doNothing(event))
    return;
  if (!(normalizeFlags_ & normalizeMarkedSection)
      || (inInstance_ && inSpecialMarkedSection_))
    outputMarkup(event->location(), event->markup());
  else if (inInstance_ && event->status() != MarkedSectionEvent::ignore) {
    // Put an empty comment so that REs aren't changed.
    // With an ignored marked section, sufficent to have comment at the end.
    handleChange();
    os() << syntax_->delimGeneral(Syntax::dMDO)
         << syntax_->delimGeneral(Syntax::dMDC);
  }
  delete event;
}

void CopyEventHandler::markedSectionEnd(MarkedSectionEndEvent *event)
{
  omittagHoist_ = 0;
  if (doNothing(event)) {
    inSpecialMarkedSection_ = 0;
    return;
  }
  if (!(normalizeFlags_ & normalizeMarkedSection)
      || (inInstance_ && inSpecialMarkedSection_))
    outputMarkup(event->location(), event->markup());
  else if (inInstance_) {
    // Put an empty comment so that REs aren't changed.
    handleChange();
    os() << syntax_->delimGeneral(Syntax::dMDO)
         << syntax_->delimGeneral(Syntax::dMDC);
  }
  inSpecialMarkedSection_ = 0;
  delete event;
}

void CopyEventHandler::ignoredChars(IgnoredCharsEvent *event)
{
  omittagHoist_ = 0;
  if (doNothing(event))
    return;
  if (!(normalizeFlags_ & normalizeMarkedSection))
    os().write(event->data(), event->dataLength());
  delete event;
}

void CopyEventHandler::usemap(UsemapEvent *event)
{
  omittagHoist_ = 0;
  if (doNothing(event))
    return;
  if (!(normalizeFlags_ & normalizeShortref))
    outputMarkup(event->location(), event->markup());
  else if (inInstance_) {
    // Put an empty comment so that REs aren't changed.
    handleChange();
    os() << syntax_->delimGeneral(Syntax::dMDO)
         << syntax_->delimGeneral(Syntax::dMDC);
  }
  delete event;
}

void CopyEventHandler::uselink(UselinkEvent *event)
{
  omittagHoist_ = 0;
  markup(event->location(), event->markup());
  delete event;
}

void CopyEventHandler::startDtd(StartDtdEvent *event)
{
  startSubset(event);
}

void CopyEventHandler::startLpd(StartLpdEvent *event)
{
  startSubset(event);
}

void CopyEventHandler::startSubset(StartSubsetEvent *event)
{
  if (doNothing(event))
    return;
  if (!event->entity().isNull()
      && (normalizeFlags_ & normalizeExpandProlog)) {
    const Markup &m = event->markup();
    for (MarkupIter iter(m); iter.valid(); iter.advance())
      if (iter.type() == Markup::reservedName
	  && (iter.reservedName() == Syntax::rSYSTEM
	      || iter.reservedName() == Syntax::rPUBLIC)) {
	Markup copy(m);
	copy.resize(iter.index());
	outputMarkup(event->location(), copy);
	break;
      }
  }
  else
    outputMarkup(event->location(), event->markup());
  if (event->hasInternalSubset()
      || (normalizeFlags_ & normalizeExpandProlog)) {
    os() << syntax_->delimGeneral(Syntax::dDSO);
    hasInternalSubset_ = 1;
  }
  else
    hasInternalSubset_ = 0;
  delete event;
}

void CopyEventHandler::endDtd(EndDtdEvent *event)
{
  endSubset(event);
}

void CopyEventHandler::endLpd(EndLpdEvent *event)
{
  endSubset(event);
}

void CopyEventHandler::endSubset(MarkupEvent *event)
{
  if (doNothing(event))
    return;
  if (hasInternalSubset_)
    os() << syntax_->delimGeneral(Syntax::dDSC);
  outputMarkup(event->location(), event->markup());
  delete event;
}

void CopyEventHandler::entityDecl(EntityDeclEvent *event)
{
  currentAttributes_ = 0;
  const ExternalDataEntity *extData = event->entity().asExternalDataEntity();
  if (extData)
    currentAttributes_ = &extData->attributes();
  markup(event->location(), event->markup());
  currentAttributes_ = 0;
  delete event;
}

void CopyEventHandler::shortrefDecl(ShortrefDeclEvent *event)
{
  if (doNothing(event))
    return;
  if (!(normalizeFlags_ & normalizeShortref))
    outputMarkup(event->location(), event->markup());
  delete event;
}

void CopyEventHandler::entityStart(EntityStartEvent *event)
{
  if (event->entity()->name() == outputEntity_
      && event->entity()->declType() == Entity::generalEntity)
    outputEntityLevel_ = entityLevel_ + 1;
  if (inInstance_ && (normalizeFlags_ & normalizeOmittagHoist)) {
    if (event->entity()->asInternalEntity())
      omittagHoist_++;
    else
      omittagHoist_ = 0;
  }
  if (doNothing(event)) {
    entityLevel_++;
    return;
  }
  entityLevel_++;
  if ((normalizeFlags_ & normalizeExpand)
      && inInstance_
      && entityLevel_ > outputEntityLevel_) {
    entityStack_.resize(entityStack_.size() + 1);
    entityStack_.back().ref = event->entityOrigin();
    os_ = &entityStack_.back().str;
  }
  entityOrigin_ = event->entityOrigin();
  delete event;
}

void CopyEventHandler::entityEnd(EntityEndEvent *event)
{
  if (omittagHoist_ > 0)
    omittagHoist_--;
  if (entityLevel_-- == outputEntityLevel_) {
    outputEntityLevel_ = unsigned(-1);
    outputEntity_.resize(0);
  }
  else if (!(normalizeFlags_
	     & (inInstance_ ? normalizeExpand : normalizeExpandProlog))
	   && entityLevel_ == outputEntityLevel_) {
    if (!entityOrigin_.isNull()) {
      switch (entityOrigin_->entity()->declType()) {
      case Entity::doctype:
      case Entity::linktype:
	break;
      default:
	entityRef(entityOrigin_.pointer());
	break;
      }
    }
    entityOrigin_.clear();
  }
  else if ((normalizeFlags_ & normalizeExpand)
	   && inInstance_
	   && entityLevel_ >= outputEntityLevel_) {
    if (entityStack_.size() > 0) {
      ConstPtr<EntityOrigin> origin
	= entityStack_.back().ref;
      entityStack_.resize(entityStack_.size() - 1);
      if (entityStack_.size() > 0)
	os_ = &entityStack_.back().str;
      else
	os_ = topOs_;
      entityRef(origin.pointer());
    }
  }
  delete event;
}

void CopyEventHandler::outputMarkup(const Location &loc,
				    const Markup &markup)
{
  int level = 0;
  Boolean first = 1;
  MarkupIter iter(markup);
  while (iter.valid()) {
    switch (iter.type()) {
    case Markup::delimiter:
      if (first)
	withNamedCharRef(syntax_->delimGeneral(iter.delimGeneral()), loc);
      else if (!level) {
	os() << syntax_->delimGeneral(iter.delimGeneral());
	// hack, hack!
	if (iter.delimGeneral() == Syntax::dDSO && currentAttributes_ != 0) {
	  attributeSpecList(iter, *currentAttributes_);
	  first = 0;
	  continue;		// skip the advance
	}
      }
      break;
    case Markup::refEndRe:
      if (!level)
	os().put(syntax_->standardFunction(Syntax::fRE));
      break;
    case Markup::sdReservedName:
      if (!level) {
	if (normalizeFlags_ & normalizeReserved)
	  os() << sd_->reservedName(iter.sdReservedName());
	else
	  os() << iter;
      }
      break;
    case Markup::reservedName:
      if (!level && (normalizeFlags_ & normalizeReserved)) {
	os() << syntax_->reservedName(iter.reservedName());
	break;
      }
    case Markup::shortref:
      if (first) {
	withNamedCharRef(iter.charsPointer(), iter.charsLength(), loc);
	break;
      }
      // fall through
    case Markup::name:
    case Markup::nameToken:
    case Markup::attributeValue:
    case Markup::number:
    case Markup::s:
      if (!level)
	os() << iter;
      break;
    case Markup::comment:
      if (!level)
	os() << syntax_->delimGeneral(Syntax::dCOM)
	     << iter
	     << syntax_->delimGeneral(Syntax::dCOM);
      break;
    case Markup::entityStart:
      if (!level++) {
	const EntityOrigin *origin = iter.entityOrigin();
	// entityStarts in the SGML declaration don't have explicit references
	if (origin->entity())
	  entityRef(origin);
      }
      break;
    case Markup::entityEnd:
      level--;
      break;
    case Markup::literal:
      if (!level)
	literal(iter.text());
      break;
    case Markup::sdLiteral:
      if (!level)
	sdParamLiteral(iter.sdText());
      break;
    default:
      CANNOT_HAPPEN();
    }
    iter.advance();
    first = 0;
  }
}

void CopyEventHandler::sdParamLiteral(const SdText &text)
{
  const StringC &delim = syntax_->delimGeneral(text.lita()
					       ? Syntax::dLITA
					       : Syntax::dLIT);
  os() << delim;
  SdTextIter iter(text);
  const SyntaxChar *p;
  size_t n;
  Location loc;
  while (iter.next(p, n, loc)) {
    const Markup *markupPtr;
    if (n == 1 && loc.origin()->isNumericCharRef(markupPtr)) {
      if (markupPtr)
	outputMarkup(loc.origin()->parent(), *markupPtr);
    }
    else if (n > 0) {
      Char c = Char(*p);
      withNamedCharRef(&c, 1, loc);
      for (++p, --n; n > 0; ++p, --n)
	os().put(Char(*p));
    }
  }
  os() << delim;
}

void CopyEventHandler::entityRef(const EntityOrigin *origin)
{
  const Markup *m = origin->markup();
  if (!m)
    return;
  MarkupIter iter(*m);
  if (iter.valid()) {
    iter.advance();
    if (iter.valid()
	&& iter.type() == Markup::shortref
	&& (normalizeFlags_ & normalizeShortref)) {
       handleChange();
       Boolean containsRE = 0;
       Boolean containsRS = 0;
       for (size_t i = 0; i < iter.charsLength(); i++) {
	 Char c = iter.charsPointer()[i];
	 if (c == syntax_->standardFunction(Syntax::fRE))
	   containsRE = 1;
	 else if (c == syntax_->standardFunction(Syntax::fRS))
	   containsRS = 1;
       }
       if (containsRS)
	 os().put(syntax_->standardFunction(Syntax::fRS));
       os() << syntax_->delimGeneral(Syntax::dERO)
	 << origin->entity()->name();
       if (containsRE)
	 os().put(syntax_->standardFunction(Syntax::fRE));
       else
	 os() << syntax_->delimGeneral(Syntax::dREFC);
       return;
     }
  }
  outputMarkup(origin->parent(), *m);
}

const StringC &CopyEventHandler::elementTypeOrigName(const ElementType *type,
						     StringC &buf)
{
  if (type->index() < elementTypeOrigNames_.size()
      && elementTypeOrigNames_[type->index()].size() > 0)
    return elementTypeOrigNames_[type->index()];
  else
    return generalName(type->name(), buf);
}

const StringC &CopyEventHandler::generalName(const StringC &name,
					     StringC &buf)
{
  if ((normalizeFlags_ & normalizeLower)
      && syntax_->namecaseGeneral())
    return lowerCaseName(name, buf);
  else
    return name;
}

const StringC &CopyEventHandler::entityName(const StringC &name,
					    StringC &buf)
{
  if ((normalizeFlags_ & normalizeLower)
      && syntax_->namecaseEntity())
    return lowerCaseName(name, buf);
  else
    return name;
}

const StringC &CopyEventHandler::lowerCaseName(const StringC &name,
					       StringC &buf)
{
  size_t i;
  for (i = 0; i < name.size(); i++) {
    Char c = lowerSubst_[name[i]];
    if (c != name[i]) {
      buf = name;
      buf[i] = c;
      for (i++; i < name.size(); i++)
	lowerSubst_.subst(buf[i]);
      return buf;
    }
  }
  return name;
}

void CopyEventHandler::handleChange()
{
  if (os_ != topOs_) {
    os_ = topOs_;
    for (size_t i = 0; i < entityStack_.size(); i++) {
      StringC tem;
      entityStack_[i].str.flush();
      entityStack_[i].str.extractString(tem);
      os() << tem;
    }
    entityStack_.resize(0);
  }
}

#ifdef SP_NAMESPACE
}
#endif
