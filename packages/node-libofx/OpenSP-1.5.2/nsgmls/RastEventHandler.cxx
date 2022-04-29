// Copyright (c) 1994,1995 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif

#include "config.h"
#include "RastEventHandler.h"
#include "SgmlParser.h"
#include "ParserOptions.h"
#include "Entity.h"
#include "Notation.h"
#include "Attribute.h"
#include "Vector.h"
#include "Vector.h"
#include "MessageArg.h"

#include "RastEventHandlerMessages.h"

#include <stdlib.h>
#include <string.h>

// This is based on ISO/IEC 13673, Intermediate Editor's Draft, 1994/8/29,
// together with editing instructions in ISO/IEC JTC1/SC18/WG8 N1777.

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

const OutputCharStream::Newline nl = OutputCharStream::newline;

class EventHandlerMessenger : public Messenger {
public:
  EventHandlerMessenger(EventHandler *eh) : eh_(eh) { }
  void dispatchMessage(const Message &message) {
    eh_->message(new MessageEvent(message));
  }
  void dispatchMessage(Message &message) {
    eh_->message(new MessageEvent(message));
  }
private:
  EventHandler *eh_;
};

#if 0
const 
#endif
RastPrintable RastEventHandler::printable;

RastPrintable::RastPrintable()
{
  static const char s[] =
    " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~";
  size_t i;
  for (i = 0; i < sizeof(v_); i++)
    v_[i] = 0;
  for (i = 0; s[i] != '\0'; i++)
    v_[(unsigned char)s[i]] = 32 + i;
}

// inline
void RastEventHandler::flushLine(LineType type)
{
  if (lineLength_ > 0) {
    os() << char(type) << nl;
    lineLength_ = 0;
  }
}

RastSubdocState::RastSubdocState()
{
  init(0, 0);
}

RastSubdocState::RastSubdocState(SgmlParser *parser, RastEventHandler *rast)
{
  init(parser, rast);
}

void RastSubdocState::init(SgmlParser *parser, RastEventHandler *rast)
{
  parser_ = parser;
  hadActiveLpdOrDtd_ = 0;
  activeLinkTypes_.clear();
  hadDocumentElement_ = 0;
  linkProcess_.clear();
  linkProcess_.setHandler(rast);
  haveLinkProcess_ = 0;
  endPrologEvent_.clear();
  parseSubdocQueue_.clear();
  linkRuleQueue_.clear();
  for (int i = 0; i < nAttributeType; i++)
    attributeSortOrder_[i].clear();
}

void RastSubdocState::swap(RastSubdocState &to)
{
  {
    SgmlParser *tem = to.parser_;
    to.parser_ = parser_;
    parser_ = tem;
  }
  {
    Boolean tem = to.hadActiveLpdOrDtd_;
    to.hadActiveLpdOrDtd_ = hadActiveLpdOrDtd_;
    hadActiveLpdOrDtd_ = tem;
  }
  {
    Boolean tem = to.hadDocumentElement_;
    to.hadDocumentElement_ = hadDocumentElement_;
    hadDocumentElement_ = tem;
  }
  activeLpdOrDtdLocation_.swap(to.activeLpdOrDtdLocation_);
  activeLinkTypes_.swap(to.activeLinkTypes_);
  linkProcess_.swap(to.linkProcess_);
  endPrologEvent_.swap(to.endPrologEvent_);
  parseSubdocQueue_.swap(to.parseSubdocQueue_);
  linkRuleQueue_.swap(to.linkRuleQueue_);
  for (int i = 0; i < nAttributeType; i++)
    attributeSortOrder_[i].swap(to.attributeSortOrder_[i]);
}

RastEventHandler::RastEventHandler(SgmlParser *parser, Messenger *mgr)
: lineLength_(0),
  os_(0),
  piErrorCount_(0),
  RastSubdocState(parser, this),
  mgr_(mgr)
{
  RastSubdocState::init(parser, this);
}

void RastEventHandler::end()
{
  if (errorCount() != 0) {
    truncateOutput();
    os() << (piErrorCount_ != 0
	     ? "#RAST-PI-ERROR"
	     : "#ERROR")
         << nl;
  }
}

void RastEventHandler::truncateOutput()
{
  // This must be handled by derived classes to get conforming output.
}

void RastEventHandler::sgmlDecl(SgmlDeclEvent *event)
{
  rastParseSubdocYesString_ = event->sd().execToInternal("rast-parse-subdoc:yes");
  rastParseSubdocNoString_ = event->sd().execToInternal("rast-parse-subdoc:no");
  rastActiveLpdString_ = event->sd().execToInternal("rast-active-lpd:");
  rastLinkRuleString_ = event->sd().execToInternal("rast-link-rule:");
  delete event;
}

void RastEventHandler::startElement(StartElementEvent *event)
{
  flushLine(dataLine);
  if (!hadDocumentElement_) {
    if (activeLinkTypes_.size() > 0) {
      activeLinks();
      simpleLinkInfo();
    }
    hadDocumentElement_ = 1;
  }
  os() << '[' << event->name();
  Boolean hadNewline;
  if (event->attributes().size() > 0) {
    hadNewline = 1;
    os() << nl;
    attributeInfo(event->attributes(), dtdAttribute);
  }
  else
    hadNewline = 0;
  if (haveLinkProcess_) {
    const AttributeList *linkAttributes;
    const ResultElementSpec *resultElementSpec;
    EventHandlerMessenger messenger(this);
    linkProcess_.startElement(event->elementType(),
			      event->attributes(),
			      event->location(),
			      messenger,
			      linkAttributes,
			      resultElementSpec);
    if (linkProcess_.nImpliedLinkRules() > 0) {
      if (!hadNewline) {
	os() << nl;
	hadNewline = 1;
      }
      os() << "#LINK-SET-INFO" << nl;
      impliedSourceLinkRules();
    }
    if (linkAttributes) {
      if (!hadNewline) {
	os() << nl;
	hadNewline = 1;
      }
      os() << "#LINK-RULE" << nl;
      attributeInfo(*linkAttributes, linkAttribute);
      if (linkProcess_.isExplicit()) {
	os() << "#RESULT=";
	if (resultElementSpec && resultElementSpec->elementType) {
	  os() << resultElementSpec->elementType->name() << nl;
	  attributeInfo(resultElementSpec->attributeList, resultAttribute);
	}
	else
	  os() << "#IMPLIED" << nl;
      }
    }
    else
      hadNewline = 0;
  }
  os() << ']' << nl;
  delete event;
}

void RastEventHandler::activeLinks()
{
  for (size_t i = 0; i < activeLinkTypes_.size(); i++) {
    os() << "#ACTIVE-LINK=" << activeLinkTypes_[i] << nl;
    Boolean found = 0;
    if (haveLinkProcess_ && linkProcess_.name() == activeLinkTypes_[i]) {
      found = 1;
      if (linkProcess_.nImpliedLinkRules() > 0) {
	os() << "#INITIAL" << nl;
	impliedSourceLinkRules();
      }
    }
    if (!found) {
      if (endPrologEvent_) {
	for (size_t j = 0; j < endPrologEvent_->simpleLinkNames().size(); j++)
	  if (endPrologEvent_->simpleLinkNames()[j] == activeLinkTypes_[i]) {
	    found = 1;
	    break;
	  }
      }
      if (!found) {
	setNextLocation(activeLpdOrDtdLocation_);
	Messenger::message(RastEventHandlerMessages::invalidActiveLinkType,
			   StringMessageArg(activeLinkTypes_[i]));
      }
    }
    os() << "#END-ACTIVE-LINK" << nl;
  }
}

void RastEventHandler::simpleLinkInfo()
{
  if (!endPrologEvent_)
    return;
  for (size_t i = 0; i < activeLinkTypes_.size(); i++) {
    for (size_t j = 0; j < endPrologEvent_->simpleLinkNames().size(); j++) {
      const StringC &name = endPrologEvent_->simpleLinkNames()[j];
      if (name == activeLinkTypes_[i]) {
	os() << "#SIMPLE-LINK=" << name << nl;
	if (endPrologEvent_->simpleLinkAttributes()[j].size() > 0)
	  attributeInfo(endPrologEvent_->simpleLinkAttributes()[j],
			simpleAttribute);
	os() << "#END-SIMPLE-LINK" << nl;
	break;
      }
    }
  }
}

void RastEventHandler::impliedSourceLinkRules()
{
  size_t n = linkProcess_.nImpliedLinkRules();
  Vector<size_t> sortOrder(n);
  size_t i;
  for (i = 0; i < n; i++)
    sortOrder[i] = i;
  for (i = 1; i < n; i++) {
    size_t tem = sortOrder[i];
    const StringC &name
      = linkProcess_.impliedLinkRule(tem).elementType->name();
    size_t j;
    for (j = i; j > 0; j--) {
      if (lexCmp(linkProcess_.impliedLinkRule(j - 1).elementType->name(),
		 name) <= 0)
	break;
      sortOrder[j] = sortOrder[j - 1];
    }
    sortOrder[j] = tem;
  }
  for (i = 0; i < n; i++) {
    const ResultElementSpec &result
      = linkProcess_.impliedLinkRule(sortOrder[i]);
    os() << '[' << result.elementType->name();
    if (result.attributeList.size() > 0) {
      os() << nl;
      attributeInfo(result.attributeList, resultAttribute);
    }
    os() << ']' << nl;
  }
}

void RastEventHandler::endElement(EndElementEvent *event)
{
  if (haveLinkProcess_)
    linkProcess_.endElement();
  flushLine(dataLine);
  os() << "[/" << event->name() << ']' << nl;
  if (haveLinkProcess_ && linkProcess_.nImpliedLinkRules() > 0) {
    os() << "#LINK-SET-INFO" << nl;
    impliedSourceLinkRules();
    os() << "#END-LINK-SET-INFO" << nl;
  }
  delete event;
}

void RastEventHandler::data(DataEvent *event)
{
  lines(dataLine, event->data(), event->dataLength());
  delete event;
}

void RastEventHandler::pi(PiEvent *event)
{
  flushLine(dataLine);
  os() << "[?";
  size_t dataLength = event->dataLength();
  if (dataLength > 0) {
    const Char *data = event->data();
    if (dataLength >= 4
	&& memcmp(data,
		  rastParseSubdocYesString_.data(),
		  4*sizeof(Char)) == 0
	&& !interpretRastPi(data, dataLength, event->location())) {
      setNextLocation(event->location());
      Messenger::message(RastEventHandlerMessages::invalidRastPiError);
    }
    os() << nl;
    lines(dataLine, event->data(), dataLength);
    flushLine(dataLine);
  }
  os() << ']' << nl;
  delete event;
}

inline
Boolean equal(const Char *s1, size_t n1, const StringC &s2)
{
  return (n1 == s2.size()
	  && (n1 == 0
	      || memcmp(s1, s2.data(), n1*sizeof(Char)) == 0));
}

// Is s2 a prefix of s1 of length n1?

inline
Boolean prefix(const Char *s1, size_t n1, const StringC &s2)
{
  return (n1 >= s2.size()
	  && (n1 == 0
	      || memcmp(s1, s2.data(), s2.size()*sizeof(Char)) == 0));
}

Boolean RastEventHandler::interpretRastPi(const Char *data,
					  size_t dataLength,
					  const Location &loc)
{
  if (equal(data, dataLength, rastParseSubdocNoString_)) {
    queueParseSubdoc(0);
    return 1;
  }
  if (equal(data, dataLength, rastParseSubdocYesString_)) {
    queueParseSubdoc(1);
    return 1;
  }
  if (prefix(data, dataLength, rastActiveLpdString_)) {
    if (hadActiveLpdOrDtd_)
      return 1;
    hadActiveLpdOrDtd_ = 1;
    activeLpdOrDtdLocation_ = loc;
    const Char *p = data + rastActiveLpdString_.size();
    size_t n = dataLength - rastActiveLpdString_.size();
    StringC name;
    for (;;) {
      if (n == 0 || *p == ',') {
	if (name.size() == 0)
	  return 0;
	for (size_t i = 0; i < activeLinkTypes_.size(); i++)
	  if (name == activeLinkTypes_[i]) {
	    setNextLocation(activeLpdOrDtdLocation_);
	    Messenger::message(RastEventHandlerMessages::duplicateActiveLinkType,
			       StringMessageArg(name));
	  }
	activeLinkTypes_.resize(activeLinkTypes_.size() + 1);
	name.swap(activeLinkTypes_.back());
	if (n == 0)
	  break;
      }
      else
	name += *p;
      p++;
      n--;
    }
    for (size_t i = 0; i < activeLinkTypes_.size(); i++)
      parser_->activateLinkType(activeLinkTypes_[i]);
    return 1;
  }
  if (prefix(data, dataLength, rastLinkRuleString_)) {
    LinkRulePi *p = new LinkRulePi;
    p->pi.assign(data + rastLinkRuleString_.size(),
		 dataLength - rastLinkRuleString_.size());
    p->loc = loc;
    linkRuleQueue_.append(p);
    return 1;
  }
  return 0;
}

void RastEventHandler::sdataEntity(SdataEntityEvent *event)
{
  flushLine(dataLine);
  os() << "#SDATA-TEXT" << nl;
  lines(markupLine, event->data(), event->dataLength());
  flushLine(markupLine);
  os() << "#END-SDATA" << nl;
  delete event;
}

void RastEventHandler::externalDataEntity(ExternalDataEntityEvent *event)
{
  const ExternalDataEntity *entity = event->entity();
  if (!entity)
    return;
  flushLine(dataLine);
  os() << "[&" << entity->name() << nl;
  externalEntityInfo(entity, dtdAttribute);
  os() << ']' << nl;
  delete event;
}

void RastEventHandler::externalEntityInfo(const ExternalDataEntity *entity,
					  AttributeType attributeType)
{
  char c;
  switch (entity->dataType()) {
  case Entity::cdata:
    c = 'C';
    break;
  case Entity::sdata:
    c = 'S';
    break;
  case Entity::ndata:
    c = 'N';
    break;
  default:
    return;
  }
  os() << '#' << c << "DATA-EXTERNAL" << nl;
  externalIdInfo(entity->externalId());
  os() << "#NOTATION=" << entity->notation()->name() << nl;
  externalIdInfo(entity->notation()->externalId());
  attributeInfo(entity->attributes(),
		(attributeType == resultAttribute
		 ? resultAttribute
		 : dtdAttribute));
}

void RastEventHandler::subdocEntity(SubdocEntityEvent *event)
{
  const SubdocEntity *entity = event->entity();
  if (!entity)
    return;
  flushLine(dataLine);
  os() << "[&" << entity->name() << nl;
  Ptr<InputSourceOrigin> origin(event->entityOrigin()->copy());
  subdocEntityInfo(entity, origin, 1);
  os() << ']' << nl;
  delete event;
}

void RastEventHandler::subdocEntityInfo(const SubdocEntity *entity,
					const Ptr<InputSourceOrigin> &entityOrigin,
					Boolean referenced)
{
  os() << "#SUBDOC" << nl;
  externalIdInfo(entity->externalId());
  if (parseNextSubdoc()) {
    // FIXME subdocuments in entity attributes shouldn't count against
    // SUBDOC quantity limit.
    os() << "#PARSED-SUBDOCUMENT" << nl;
    SgmlParser::Params params;
    params.entityType = SgmlParser::Params::subdoc;
    params.subdocInheritActiveLinkTypes = 0;
    params.subdocReferenced = referenced;
    params.parent = parser_;
    params.sysid = entity->externalId().effectiveSystemId();
    params.origin = entityOrigin;
    SgmlParser parser(params);
    RastSubdocState oldSubdocState;
    RastSubdocState::swap(oldSubdocState);
    RastSubdocState::init(&parser, this);
    parser.parseAll(*this);
    oldSubdocState.swap(*this);
  }
}

void RastEventHandler::queueParseSubdoc(Boolean parseSubdoc)
{
  parseSubdocQueue_.push_back(PackedBoolean(parseSubdoc));
}

Boolean RastEventHandler::parseNextSubdoc()
{
  if (parseSubdocQueue_.size() == 0)
    return 0;
  Boolean result = parseSubdocQueue_[0];
  if (parseSubdocQueue_.size() > 1) {
    for (size_t i = 1; i < parseSubdocQueue_.size(); i++)
      parseSubdocQueue_[i - 1] = parseSubdocQueue_[i];
  }
  parseSubdocQueue_.resize(parseSubdocQueue_.size() - 1);
  return result;
}


void RastEventHandler::externalIdInfo(const ExternalId &id)
{
  const StringC *systemId = id.systemIdString();
  const StringC *publicId = id.publicIdString();
  if (publicId) {
    os() << "#PUBLIC" << nl;
    if (publicId->size() == 0)
      os() << "#EMPTY" << nl;
    else {
      lines(markupLine, publicId->data(), publicId->size());
      flushLine(markupLine);
    }
  }
  if (systemId || !publicId) {
    os() << "#SYSTEM" << nl;
    if (!systemId)
      os() << "#NONE" << nl;
    else if (systemId->size() == 0)
      os() << "#EMPTY" << nl;
    else {
      lines(markupLine, systemId->data(), systemId->size());
      flushLine(markupLine);
    }
  }
}

void RastEventHandler::nonSgmlChar(NonSgmlCharEvent *event)
{
  flushLine(dataLine);
  os() <<'#' << (unsigned long)event->character() << nl;
  delete event;
}

void RastEventHandler::lines(LineType type, const Char *p, size_t length)
{
  // This needs to be fast.
  while (length != 0) {
    if (printable(*p)) {
      size_t lim;
      switch (lineLength_) {
      case maxLineLength:
	os() << char(type) << nl;
	lineLength_ = 0;
	// fall through
      case 0:
	os() << char(type);
	lim = maxLineLength;
	break;
      default:
	lim = maxLineLength - lineLength_;
	break;
      }
      if (lim > length)
	lim = length;
      size_t n = lim;
      for (;;) {
	os().put(*p);
	p++;
	if (--n == 0)
	  break;
	if (!printable(*p)) {
	  lim -= n;
	  break;
	}
      }
      length -= lim;
      lineLength_ += lim;
    }
    else {
      // *p is an unprintable character print it
      flushLine(type);
      switch (*p) {
      case RS:
	os() << "#RS" << nl;
	break;
      case RE:
	os() << "#RE" << nl;
	break;
      case TAB:
	os() << "#TAB" << nl;
	break;
      default:
	os() << '#' << (unsigned long)*p << nl;
	break;
      }
      p++;
      length--;
    }
  }
}

int RastEventHandler::lexCmp(const StringC &s1, const StringC &s2)
{
  const Char *p1 = s1.data();
  size_t n1 = s1.size();
  const Char *p2 = s2.data();
  size_t n2 = s2.size();
  for (;;) {
    if (n1 == 0)
      return n2 == 0 ? 0 : -1;
    if (n2 == 0)
      return 1;
    if (*p1 != *p2) {
      // printable characters precede non-printable characters;
      // printable characters are in ASCII order
      // non-printable characters are in document character set order
      int a1 = printable(*p1);
      int a2 = printable(*p2);
      if (a1 == 0) {
	if (a2 == 0)
	  return *p1 < *p2 ? -1 : 1;
	else
	  return 1;
      }
      else if (a2 == 0)
	return -1;
      else
	return a1 - a2;
    }
    p1++;
    p2++;
    n1--;
    n2--;
  }
}

void RastEventHandler::attributeInfo(const AttributeList &attributes,
				     AttributeType attributeType)
{
  size_t length = attributes.size();
  if (length == 0)
    return;
  size_t defIndex = attributes.defIndex();
  if (defIndex >= attributeSortOrder_[attributeType].size())
    attributeSortOrder_[attributeType].resize(defIndex + 1);
  Vector<size_t> &sortOrder = attributeSortOrder_[attributeType][defIndex];
  if (sortOrder.size() != length
      || attributeType == simpleAttribute) {
    sortOrder.resize(length);
    size_t i;
    for (i = 0; i < length; i++)
      sortOrder[i] = i;
    // insertion sort
    for (i = 1; i < length; i++) {
      size_t tem = sortOrder[i];
      size_t j;
      for (j = i; j > 0; j--) {
	if (lexCmp(attributes.name(sortOrder[j - 1]),
		   attributes.name(tem)) <= 0)
	  break;
	sortOrder[j] = sortOrder[j - 1];
      }
      sortOrder[j] = tem;
    }
  }
  for (size_t j = 0; j < length; j++) {
    // Don't use sortOrder because attributeSortOrder_ may be grown
    // because of data attributes.
    size_t i = attributeSortOrder_[attributeType][defIndex][j];
    os() << attributes.name(i) << '=' << nl;
    const Text *text;
    const StringC *string;
    const AttributeValue *value = attributes.value(i);
    if (value) {
      switch (value->info(text, string)) {
      case AttributeValue::implied:
	os() << "#IMPLIED" << nl;
	break;
      case AttributeValue::tokenized:
	lines(markupLine, string->data(), string->size());
	flushLine(markupLine);
	break;
      case AttributeValue::cdata:
	{
	  TextIter iter(*text);
	  TextItem::Type type;
	  const Char *p;
	  size_t length;
	  const Location *loc;
	  while (iter.next(type, p, length, loc))
	    switch (type) {
	    case TextItem::data:
	    case TextItem::cdata:
	      lines(markupLine, p, length);
	      break;
	    case TextItem::sdata:
	      flushLine(markupLine);
	      os() << "#SDATA-TEXT" << nl;
	      lines(markupLine, p, length);
	      flushLine(markupLine);
	      os() << "#END-SDATA" << nl;
	      break;
	    case TextItem::nonSgml:
	      flushLine(markupLine);
	      os() << '#' << (unsigned long)*p << nl;
	      break;
	    default:
	      break;
	    }
	  flushLine(markupLine);
	}
	break;
      }
    }
    const AttributeSemantics *semantics = attributes.semantics(i);
    if (semantics) {
      ConstPtr<Notation> notation
	= semantics->notation();
      if (!notation.isNull())
	externalIdInfo(notation->externalId());
      size_t nEntities = semantics->nEntities();
      for (size_t i = 0; i < nEntities; i++) {
	ConstPtr<Entity> entity
	  = semantics->entity(i);
	if (!entity.isNull()) {
	  const ExternalDataEntity *externalDataEntity
	    = entity->asExternalDataEntity();
	  if (externalDataEntity)
	    externalEntityInfo(externalDataEntity,
			       (attributeType == resultAttribute
				? resultAttribute
				: dtdAttribute));
	  else {
	    const SubdocEntity *subdocEntity = entity->asSubdocEntity();
	    if (subdocEntity) {
	      Ptr<InputSourceOrigin> entityOrigin
		= EntityOrigin::make(entity,
				     ((TokenizedAttributeValue *)value)
				     ->tokenLocation(i));
	      subdocEntityInfo(subdocEntity, entityOrigin, 0);
	    }
	    else {
	      const InternalEntity *internalEntity = entity->asInternalEntity();
	      if (internalEntity)
		internalEntityInfo(internalEntity);
	    }
	  }
	}
	os() << "#END-ENTITY" << nl;
      }
    }
  }
}

void RastEventHandler::internalEntityInfo(const InternalEntity *entity)
{
  if (!entity)
    return;
  os() << '#'
       << char(entity->dataType() == Entity::cdata ? 'C' : 'S')
       << "DATA-INTERNAL" << nl;
  const StringC &str = entity->string();
  lines(markupLine, str.data(), str.size());
  flushLine(markupLine);
}

void RastEventHandler::endProlog(EndPrologEvent *event)
{
  if (!event->lpdPointer().isNull()) {
    linkProcess_.init(event->lpdPointer());
    haveLinkProcess_ = 1;
  }
  if (event->simpleLinkNames().size() > 0)
    endPrologEvent_ = event;
  else
    delete event;
}

void RastEventHandler::uselink(UselinkEvent *event)
{
  linkProcess_.uselink(event->linkSet(),
		       event->restore(),
		       event->lpd().pointer());
  if (haveLinkProcess_ && linkProcess_.nImpliedLinkRules() > 0) {
    flushLine(dataLine);
    os() << "#LINK-SET-INFO" << nl;
    impliedSourceLinkRules();
    os() << "#END-LINK-SET-INFO" << nl;
  }
  delete event;
}

void RastEventHandler::initMessage(Message &msg)
{
  mgr_->initMessage(msg);
}

void RastEventHandler::dispatchMessage(const Message &msg)
{
  if (msg.isError())
    piErrorCount_++;
  if (!cancelled()) {
    noteMessage(msg);
    mgr_->dispatchMessage(msg);
  }
}

RastLinkProcess::RastLinkProcess()
: rast_(0)
{
}

void RastLinkProcess::setHandler(RastEventHandler *rast)
{
  rast_ = rast;
}

// Always return 1. 0 means not ready.

Boolean RastLinkProcess::selectLinkRule(const Vector<const AttributeList *> &linkAttributes,
					const Location &location,
					size_t &selected)
{
  if (!rast_->linkRuleQueue_.empty()) {
    LinkRulePi *p = rast_->linkRuleQueue_.get();
    if (!selectLinkRulePi(p->pi, p->loc, linkAttributes, selected))
      selected = 0;
  }
  else {
    if (linkAttributes.size() > 0) {
      rast_->setNextLocation(location);
      rast_->Messenger::message(RastEventHandlerMessages::multipleLinkRules);
    }
    selected = 0;
  }
  return 1;
}

// Return zero for failure (RAST-PI-ERROR).

Boolean RastLinkProcess::selectLinkRulePi(const StringC &value,
					  const Location &loc,
					  const Vector<const AttributeList *> &linkAttributes,
					  size_t &selected)
{
  Boolean haveSelection = 0;
  size_t i;
  for (i = 0; i < linkAttributes.size(); i++) {
    const AttributeList &a = *linkAttributes[i];
    Boolean matchValue = 0;
    for (size_t j = 0; j < a.size(); j++) {
      const Text *textp;
      const StringC *strp;
      switch (a.value(j)->info(textp, strp)) {
      case AttributeValue::cdata:
	// What if it contains SDATA entities?
	if (textp->string() == value)
	  matchValue = 1;
	break;
      case AttributeValue::tokenized:
	if (*strp == value)
	  matchValue = 1;
	break;
      default:
	break;
      }
      if (matchValue)
	break;
    }
    if (matchValue) {
      if (haveSelection) {
	rast_->setNextLocation(loc);
	rast_->Messenger::message(RastEventHandlerMessages::multipleLinkRuleMatch);
	return 0;
      }
      haveSelection = 1;
      selected = i;
    }
  }
  if (!haveSelection) {
    rast_->setNextLocation(loc);
    rast_->Messenger::message(RastEventHandlerMessages::noLinkRuleMatch);
    return 0;
  }
  return 1;
}

void RastLinkProcess::swap(RastLinkProcess &to)
{
  LinkProcess::swap(to);
  RastEventHandler *tem = to.rast_;
  to.rast_ = rast_;
  rast_ = tem;
}

#ifdef SP_NAMESPACE
}
#endif
