// Copyright (c) 1996 James Clark, 2000 Matthias Clasen
// Copyright (c) 2001 Epremis Corp.
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif

#include "splib.h"
#include "ArcEngine.h"
#include "ArcProcessor.h"
#include "Vector.h"
#include "NCVector.h"
#include "IQueue.h"
#include "ArcEngineMessages.h"
#include "ParserMessages.h"
#include "MessageArg.h"
#include "ParserOptions.h"
#include "SgmlParser.h"
#include "InternalInputSource.h"
#include "Parser.h"
#include "Allocator.h"
#include "LinkProcess.h"
#include "macros.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

static const size_t sizes[] = {
  sizeof(StartElementEvent),
  sizeof(EndElementEvent),
  sizeof(ImmediateDataEvent),
  sizeof(SdataEntityEvent),
  sizeof(EndPrologEvent),
  sizeof(CdataEntityEvent),
  sizeof(SdataEntityEvent),
  sizeof(ExternalDataEntityEvent),
  sizeof(OpenElement)
};

static
size_t maxSize(const size_t *v, size_t n)
{
  size_t max = 0;
  for (size_t i = 0; i < n; i++) {
    if (v[i] > max)
      max = v[i];
  }
  return max;
}

const unsigned invalidAtt = unsigned(-1);
const unsigned contentPseudoAtt = unsigned(-2);

class DelegateEventHandler : public EventHandler {
public:
#define EVENT(C, f) void f(C *ev) { delegateTo_->f(ev); }
#include "events.h"
#undef EVENT
protected:
  EventHandler *delegateTo_;
};

class QueueEventHandler : public EventHandler, public IQueue<Event> {
public:
#define EVENT(C, f) void f(C *ev) { ev->copyData(); append(ev); }
#include "events.h"
#undef EVENT
};

// This just passes through messages.

class NullEventHandler : public EventHandler {
public:
  NullEventHandler(Messenger &mgr) : mgr_(&mgr) { }
  void message(MessageEvent *event) {
    mgr_->dispatchMessage(event->message());
    delete event;
  }
private:
  Messenger *mgr_;
};

class ArcEngineImpl : public DelegateEventHandler, private Messenger {
public:
  ArcEngineImpl(Messenger &mgr,
		const SgmlParser *parser,
		ArcDirector &director,
		const volatile sig_atomic_t *cancelPtr,
		const StringC *arcPublicId,
		const Notation *,
		const Vector<StringC> &name,
		const SubstTable *table);
  ~ArcEngineImpl();
  void sgmlDecl(SgmlDeclEvent *);
  void appinfo(AppinfoEvent *);
  void startElement(StartElementEvent *);
  void endElement(EndElementEvent *);
  void data(DataEvent *);
  void sdataEntity(SdataEntityEvent *);
  void externalDataEntity(ExternalDataEntityEvent *);
  void pi(PiEvent *);
  void endProlog(EndPrologEvent *);
  void startDtd(StartDtdEvent *);
  void endDtd(EndDtdEvent *);
  void startLpd(StartLpdEvent *);
  void endLpd(EndLpdEvent *);
  void uselink(UselinkEvent *);
  size_t nBases() const { return arcProcessors_.size(); }
  EventHandler *delegateHandler() { return eventHandler_; }
private:
  void dispatchMessage(const Message &);
  void dispatchMessage(Message &);
  void initMessage(Message &);

  EventHandler *eventHandler_;
  NCVector<ArcProcessor> arcProcessors_;
  ConstPtr<Sd> sd_;
  ConstPtr<Syntax> syntax_;
  StringC is10744_;
  StringC arcBase_;
  StringC namespaceDelim_;
  StringC arch_;
  StringC uselex_;
  ConstPtr<AttributeDefinitionList> archPiAttributeDefs_;
  int stage_;
  QueueEventHandler eventQueue_;
  NullEventHandler nullHandler_;
  const SgmlParser *parser_;
  Location currentLocation_;
  unsigned gatheringContent_;
  Text content_;
  unsigned startAgain_;
  Allocator alloc_;
  StringC appinfo_;
  const AttributeList *linkAttributes_;
  LinkProcess linkProcess_;
  Boolean haveLinkProcess_;
  Vector<StringC> docName_;
  ArcDirector *director_;
  Messenger *mgr_;
  const volatile sig_atomic_t *cancelPtr_;
};


void ArcEngine::parseAll(SgmlParser &parser,
			 Messenger &mgr,
			 ArcDirector &director,
			 const volatile sig_atomic_t *cancelPtr)
{
  ArcEngineImpl wrap(mgr, &parser, director, cancelPtr,
		     0, 0, Vector<StringC>(), 0);
  parser.parseAll(wrap, cancelPtr);
}

EventHandler *
SelectOneArcDirector::arcEventHandler(const StringC *,
				      const Notation *,
				      const Vector<StringC> &name,
				      const SubstTable *table)
{
  if (name.size() != select_.size())
    return 0;
  for (size_t i = 0; i < name.size(); i++) {
    StringC tem(select_[i]);
    table->subst(tem);
    if (name[i] != tem)
      return 0;
  }
  return eh_;
}

void SelectOneArcDirector::dispatchMessage(const Message &msg)
{
  eh_->message(new MessageEvent(msg));
}

void SelectOneArcDirector::dispatchMessage(Message &msg)
{
  eh_->message(new MessageEvent(msg));
}

ArcEngineImpl::ArcEngineImpl(Messenger &mgr,
			     const SgmlParser *parser,
			     ArcDirector &director,
			     const volatile sig_atomic_t *cancelPtr,
			     const StringC *arcPublicId,
			     const Notation *notation,
			     const Vector<StringC> &docName,
			     const SubstTable *table)

: director_(&director), mgr_(&mgr), cancelPtr_(cancelPtr),
  parser_(parser), stage_(0),
  gatheringContent_(0), startAgain_(0), haveLinkProcess_(0),
  alloc_(maxSize(sizes, SIZEOF(sizes)), 50),
  nullHandler_(mgr), docName_(docName)
{
  eventHandler_ = director.arcEventHandler(arcPublicId, notation, docName, table);
  if (!eventHandler_)
    eventHandler_ = &nullHandler_;
  delegateTo_ = eventHandler_;
}

ArcEngineImpl::~ArcEngineImpl()
{
  for (size_t i = 0; i < arcProcessors_.size(); i++)
    if (arcProcessors_[i].valid())
      arcProcessors_[i].checkIdrefs();
}

void ArcEngineImpl::appinfo(AppinfoEvent *event)
{
  const StringC *str;
  if (event->literal(str))
    appinfo_ = *str;
  DelegateEventHandler::appinfo(event);
}

void ArcEngineImpl::pi(PiEvent *event)
{
  currentLocation_ = event->location();
  if (stage_ == 1 && event->dataLength() > is10744_.size() + 1) {
    Boolean match = 1;
    size_t i = 0;
    for (size_t j = 0; j < is10744_.size() && match; i++, j++)
      if ((*syntax_->generalSubstTable())[event->data()[i]] != is10744_[j])
	match = 0;
    if (match) {
      if ((event->dataLength() - i) < namespaceDelim_.size())
       match = 0;
      else {
	for (size_t j = 0; j < namespaceDelim_.size() && match; j++)
	 if ((*syntax_->generalSubstTable())[event->data()[i+j]] != namespaceDelim_[j])
	  match = 0;
      }
      if (match || syntax_->isS(event->data()[i])) {
	if (match)
	 i += namespaceDelim_.size();
	else {
	  do {
	    i++;
	  } while (i < event->dataLength() && syntax_->isS(event->data()[i]));
	}
	if (i >= event->dataLength()) {
	  Location loc(event->location());
	  loc += i;
	  setNextLocation(loc);
	  Messenger::message(ArcEngineMessages::is10744PiKeywordMissing);
	}
	else {
	  StringC token;
	  do {
	    token += (*syntax_->generalSubstTable())[event->data()[i++]];
	  } while (i < event->dataLength() && !syntax_->isS(event->data()[i]));
	  if (!match && token == arcBase_) {
	    size_t dataLength = event->dataLength();
	    const Char *data = event->data();
	    for (;;) {
	      while (i < dataLength && syntax_->isS(data[i]))
	        i++;
	      if (i >= dataLength)
	        break;
	      size_t start = i++;
	      while (i < dataLength && !syntax_->isS(data[i]))
	        i++;
	      StringC name(data + start, i - start);
	      syntax_->generalSubstTable()->subst(name);
	      arcProcessors_.resize(arcProcessors_.size() + 1);
	      Location loc(event->location());
	      loc += start;
	      arcProcessors_.back().setName(name, loc);
	    }
	  } else if (token == arch_) {
	    if (archPiAttributeDefs_.isNull()) {
	      const char *const autoTokens[] = { "ArcAuto", "nArcAuto", 0 };
	      struct AttdefData {
		const char *name;
		Boolean required;
		enum {
		  dvName,
		  dvNameTokenGroup,
		  dvCdata
		} declaredValue;
		const char *const *allowedTokens;
	      } const attdefData[] = {
		{ "name", 1, AttdefData::dvName, 0 },
		{ "public-id", 0, AttdefData::dvCdata, 0 },
		{ "dtd-public-id", 0, AttdefData::dvCdata, 0 },
		{ "dtd-system-id", 0, AttdefData::dvCdata, 0 },
		{ "form-att", 0, AttdefData::dvName, 0 },
		{ "renamer-att", 0, AttdefData::dvName, 0 },
		{ "suppressor-att", 0, AttdefData::dvName, 0 },
		{ "ignore-data-att", 0, AttdefData::dvName, 0 },
		{ "doc-elem-form", 0, AttdefData::dvCdata, 0 },
		{ "bridge-form", 0, AttdefData::dvCdata, 0 },
		{ "data-form", 0, AttdefData::dvCdata, 0 },
		{ "auto", 0, AttdefData::dvNameTokenGroup, autoTokens },
		{ "options", 0, AttdefData::dvCdata, 0 },
		{ "quantity", 0, AttdefData::dvCdata, 0 }
	      };
	      Vector<CopyOwner<AttributeDefinition> > attdefs;
	      for (size_t i = 0; i < SIZEOF(attdefData); i++) {
		StringC attName(sd_->execToInternal(attdefData[i].name));
		syntax_->generalSubstTable()->subst(attName);
		DeclaredValue *declaredValue;
		switch (attdefData[i].declaredValue) {
		case AttdefData::dvName:
		  declaredValue = new TokenizedDeclaredValue(TokenizedDeclaredValue::name, 0);
		  break;
		case AttdefData::dvCdata:
		  declaredValue = new CdataDeclaredValue();
		  break;
		case AttdefData::dvNameTokenGroup: {
		   Vector<StringC> allowedTokens;
		   for (const char *const *allowedToken = attdefData[i].allowedTokens;
			*allowedToken; allowedToken++) {
		     allowedTokens.push_back(sd_->execToInternal(*allowedToken));
		     syntax_->generalSubstTable()->subst(allowedTokens.back());
		   }
		   declaredValue = new NameTokenGroupDeclaredValue(allowedTokens);
		   break;
		 }
		default:
		  CANNOT_HAPPEN();
		}
		if (attdefData[i].required)
		  attdefs.push_back(new RequiredAttributeDefinition(attName, declaredValue));
		else
		  attdefs.push_back(new ImpliedAttributeDefinition(attName, declaredValue));
	      }
	      archPiAttributeDefs_ = new AttributeDefinitionList(attdefs, 0);
	    }
	    arcProcessors_.resize(arcProcessors_.size() + 1);
	    arcProcessors_.back().setPiDecl(event->location(),
					    StringC(event->data() + i, event->dataLength() - i),
					    i,
					    archPiAttributeDefs_);
	  } else if (match || token != uselex_) {
	    Location loc(event->location());
	    loc += i - token.size();
	    setNextLocation(loc);
	    Messenger::message(ArcEngineMessages::is10744PiKeywordInvalid,
			       StringMessageArg(token));
	  }
	}
      }
    }
  }
  DelegateEventHandler::pi(event);
}

void ArcEngineImpl::endProlog(EndPrologEvent *event)
{
  currentLocation_ = event->location();
  for (size_t i = 0; i < arcProcessors_.size(); i++)
    arcProcessors_[i].init(*event,
			   sd_,
			   syntax_,
			   parser_,
			   this,
			   docName_,
			   arcProcessors_,
			   *director_,
			   cancelPtr_);
  if (!event->lpdPointer().isNull()) {
    haveLinkProcess_ = 1;
    linkProcess_.init(event->lpdPointer());
  }
  DelegateEventHandler::endProlog(event);
}

void ArcEngineImpl::startDtd(StartDtdEvent *event)
{
  stage_++;
  DelegateEventHandler::startDtd(event);
}

void ArcEngineImpl::endDtd(EndDtdEvent *event)
{
  stage_++;
  DelegateEventHandler::endDtd(event);
}

void ArcEngineImpl::startLpd(StartLpdEvent *event)
{
  if (event->active())
    stage_ = 1;
  DelegateEventHandler::startLpd(event);
}

void ArcEngineImpl::endLpd(EndLpdEvent *event)
{
  stage_++;
  DelegateEventHandler::endLpd(event);
}

void ArcEngineImpl::sgmlDecl(SgmlDeclEvent *event)
{
  currentLocation_ = event->location();
  sd_ = event->sdPointer();
  syntax_ = event->instanceSyntaxPointer();
  arcBase_ = sd_->execToInternal("ArcBase");
  syntax_->generalSubstTable()->subst(arcBase_);
  is10744_ = sd_->execToInternal("IS10744");
  arch_ = sd_->execToInternal("arch");
  syntax_->generalSubstTable()->subst(arch_);
  uselex_ = sd_->execToInternal("USELEX");
  namespaceDelim_ = sd_->execToInternal(":");
  Boolean atStart = 1;
  for (size_t i = 0; i < appinfo_.size(); i++)
    if (syntax_->isS(appinfo_[i]))
      atStart = 1;
    else if (atStart) {
      if (i + 7 > appinfo_.size())
	break;
      StringC tem(appinfo_.data() + i, 7);
      syntax_->generalSubstTable()->subst(tem);
      if (tem == arcBase_) {
	if (i + 7 == appinfo_.size() || syntax_->isS(appinfo_[i + 7]))
	  break;
	if (appinfo_[i + 7] == sd_->execToInternal('=')) {
	  arcBase_.resize(0);
	  for (size_t j = i + 7; j < appinfo_.size(); j++) {
	    if (syntax_->isS(appinfo_[j]))
	      break;
	    arcBase_ += appinfo_[j];
	  }
	  // Allow quotes around replacement name.
	  if (arcBase_.size() > 2
	      && (arcBase_[0] == sd_->execToInternal('"')
	          || arcBase_[0] == sd_->execToInternal('\''))
	      && arcBase_[arcBase_.size() - 1] == arcBase_[0]) {
	    for (size_t j = 0; j < arcBase_.size() - 2; j++)
	      arcBase_[j] =  arcBase_[j + 1];
	    arcBase_.resize(arcBase_.size() - 2);
	  }
	  syntax_->generalSubstTable()->subst(arcBase_);
	  break;
	}
      }
      atStart = 0;
    }
  DelegateEventHandler::sgmlDecl(event);
}

void ArcEngineImpl::startElement(StartElementEvent *event)
{
  if (gatheringContent_) {
    gatheringContent_++;
    DelegateEventHandler::startElement(event);
    return;
  }
  currentLocation_ = event->location();
  const Text *contentP;
  size_t start;
  if (startAgain_) {
    start = startAgain_ - 1;
    contentP = &content_;
    startAgain_ = 0;
  }
  else {
    contentP = 0;
    start = 0;
    if (haveLinkProcess_) {
      const ResultElementSpec *resultElementSpec;
      linkProcess_.startElement(event->elementType(),
				event->attributes(),
				event->location(),
				*this, // Messenger &
				linkAttributes_,
				resultElementSpec);
    }
    else
      linkAttributes_ = 0;
  }
  for (size_t i = start; i < arcProcessors_.size(); i++) {
    if (arcProcessors_[i].valid()) {
      if (!arcProcessors_[i].processStartElement(*event,
						 linkAttributes_,
						 contentP,
						 alloc_)) {
	ASSERT(contentP == 0);
	startAgain_ = i + 1;
	gatheringContent_ = 1;
	delegateTo_ = &eventQueue_;
	DelegateEventHandler::startElement(event);
	return;
      }
    }
  }
  
  content_.clear();
  DelegateEventHandler::startElement(event);
}

void ArcEngineImpl::data(DataEvent *event)
{
  const Entity *entity = event->entity();
  if (gatheringContent_) {
    if (entity)
      content_.addCdata(entity->asInternalEntity()->string(),
			event->location().origin());
    else {
      // Do attribute value literal interpretation.
      Location loc(event->location());
      for (size_t i = 0; i < event->dataLength(); i++, loc += 1) {
	Char ch = event->data()[i];
	if (syntax_->isS(ch) && ch != syntax_->space()) {
	  if (ch == syntax_->standardFunction(Syntax::fRS))
	    content_.ignoreChar(ch, loc);
	  else
	    content_.addChar(syntax_->space(),
			     Location(new ReplacementOrigin(loc, ch), 0));
	}		 
	else
	  content_.addChar(ch, loc);
      }
    }
  }
  else {
    currentLocation_ = event->location();
    for (size_t i = 0; i < arcProcessors_.size(); i++) {
      if (arcProcessors_[i].valid() && arcProcessors_[i].processData()) {
	if (entity)
	  arcProcessors_[i].docHandler()
	    .data(new (alloc_) CdataEntityEvent(entity->asInternalEntity(),
						    event->location().origin()));
	else
	  arcProcessors_[i].docHandler()
	    .data(new (alloc_) ImmediateDataEvent(event->type(),
						      event->data(),
						      event->dataLength(),
						      event->location(),
						      0));
      }
    }
  }
  DelegateEventHandler::data(event);
}

void ArcEngineImpl::sdataEntity(SdataEntityEvent *event)
{
  if (gatheringContent_) {
    content_.addSdata(event->entity()->asInternalEntity()->string(),
		      event->location().origin());
    return;
  }
  else {
    currentLocation_ = event->location();
    for (size_t i = 0; i < arcProcessors_.size(); i++) {
      if (arcProcessors_[i].valid() && arcProcessors_[i].processData()) {
	const Entity *entity = event->entity();
	arcProcessors_[i].docHandler()
	  .sdataEntity(new (alloc_)
		       SdataEntityEvent(entity->asInternalEntity(),
					event->location().origin()));
      }
    }
  }
  DelegateEventHandler::sdataEntity(event);
}

void ArcEngineImpl::externalDataEntity(ExternalDataEntityEvent *event)
{
  if (!gatheringContent_) {
    currentLocation_ = event->location();
    for (size_t i = 0; i < arcProcessors_.size(); i++) {
      if (arcProcessors_[i].valid()
	  && arcProcessors_[i].processData()) {
	ConstPtr<Entity> entity
	  = arcProcessors_[i].dtdPointer()
	    ->lookupEntity(0, event->entity()->name());
	if (!entity.isNull()) {
	  ConstPtr<EntityOrigin> oldOrigin = event->entityOrigin();
	  Owner<Markup> markup;
	  if (oldOrigin->markup())
	    markup = new Markup(*oldOrigin->markup());
	  ConstPtr<EntityOrigin> newOrigin
	    = EntityOrigin::make(entity,
				 oldOrigin->parent(),
				 oldOrigin->refLength(),
				 markup);
	  arcProcessors_[i].docHandler()
	    .externalDataEntity(new (alloc_)
				ExternalDataEntityEvent(entity->asExternalDataEntity(),
							newOrigin));
	}
	// otherwise entity is not architectural
      }
    }
  }
  DelegateEventHandler::externalDataEntity(event);
}

void ArcEngineImpl::endElement(EndElementEvent *event)
{
  while (gatheringContent_) {
    if (--gatheringContent_ > 0) {
      DelegateEventHandler::endElement(event);
      return;
    }
    delegateTo_ = delegateHandler();
    // Clear out eventQueue_ in case handling the events
    // causes events to be queued again.
    IQueue<Event> tem;
    tem.swap(eventQueue_);
    while (!tem.empty())
      tem.get()->handle(*this);
  }
  currentLocation_ = event->location();
  for (size_t i = 0; i < arcProcessors_.size(); i++)
    if (arcProcessors_[i].valid())
      arcProcessors_[i].processEndElement(*event, alloc_);
  DelegateEventHandler::endElement(event);
  if (haveLinkProcess_)
    linkProcess_.endElement();
}

void ArcEngineImpl::uselink(UselinkEvent *event)
{
  if (!gatheringContent_)
    linkProcess_.uselink(event->linkSet(),
			 event->restore(),
			 event->lpd().pointer());
  DelegateEventHandler::uselink(event);
}

void ArcEngineImpl::dispatchMessage(const Message &msg)
{
  mgr_->dispatchMessage(msg);
}

void ArcEngineImpl::dispatchMessage(Message &msg)
{
  mgr_->dispatchMessage(msg);
}

void ArcEngineImpl::initMessage(Message &msg)
{
  mgr_->initMessage(msg);
  msg.loc = currentLocation_;
}

ArcProcessor::ArcProcessor()
: errorIdref_(1), docHandler_(0), arcAuto_(1),
  arcDtdIsParam_(0)
{
}

void ArcProcessor::setName(const StringC &name, const Location &loc)
{
  piDecl_ = 0;
  name_ = name;
  declLoc_ = loc;
}

const Syntax &ArcProcessor::attributeSyntax() const
{
  return *docSyntax_;
}

ConstPtr<Notation> ArcProcessor::getAttributeNotation(const StringC &name,
						      const Location &)
{
  if (!metaDtd_.isNull())
    return metaDtd_->lookupNotation(name);
  return 0;
}

ConstPtr<Entity> ArcProcessor::getAttributeEntity(const StringC &name,
						  const Location &)
{
  // FIXME What about default entity
  if (!metaDtd_.isNull())
    return metaDtd_->lookupEntity(0, name);
  return 0;
}

void ArcProcessor::noteCurrentAttribute(size_t i, AttributeValue *value)
{
  if (valid_)
    currentAttributes_[i] = value;
}

ConstPtr<AttributeValue> ArcProcessor::getCurrentAttribute(size_t i) const
{
  return currentAttributes_[i];
}

// This code is the same as in the main parser.
// Once handling of ID/IDREF in architectures has been clarified.
// Maybe factor out into AttributeContext.

Boolean ArcProcessor::defineId(const StringC &str, const Location &loc,
			       Location &prevLoc)
{
  if (!valid_)
    return 1;
  Id *id = lookupCreateId(str);
  if (id->defined()) {
    prevLoc = id->defLocation();
    return 0;
  }
  id->define(loc);
  return 1;
}

void ArcProcessor::noteIdref(const StringC &str, const Location &loc)
{
  if (!valid_ || !errorIdref_)
    return;
  Id *id = lookupCreateId(str);
  if (!id->defined())
    id->addPendingRef(loc);
}

Id *ArcProcessor::lookupCreateId(const StringC &name)
{
  Id *id = idTable_.lookup(name);
  if (!id) {
    id = new Id(name);
    idTable_.insert(id);
  }
  return id;
}

void ArcProcessor::checkIdrefs()
{
  NamedTableIter<Id> iter(idTable_);
  Id *id;
  while ((id = iter.next()) != 0) {
    for (size_t i = 0; i < id->pendingRefs().size(); i++) {
      Messenger::setNextLocation(id->pendingRefs()[i]);
      message(ArcEngineMessages::missingId, StringMessageArg(id->name()));
    }
  }
}

void ArcProcessor::setPiDecl(const Location &loc,
			     const StringC &attspecText,
			     Index attspecIndex,
			     const ConstPtr<AttributeDefinitionList> &archPiAttributeDefs)
{
    piDecl_ = 1;
    declLoc_ = loc;
    piDeclAttspecText_ = attspecText;
    piDeclAttspecIndex_ = attspecIndex;
    archPiAttributeDefs_ = archPiAttributeDefs;
}

class PiAttspecParser {
 public:
  PiAttspecParser(const SgmlParser *parser) : parser_(parser->parser_) {}
  Boolean parsePiAttributeSpec(const StringC &text,
			       const Location &loc,
			       AttributeList &attributeList);
 private:
  Parser *parser_;
};

Boolean
PiAttspecParser::
parsePiAttributeSpec(const StringC &text,
		     const Location &loc,
		     AttributeList &attributeList)
{
  Markup *savedCurrentMarkup = parser_->currentMarkup_;
  parser_->currentMarkup_ = 0;
  parser_->pushInput(new InternalInputSource(text, InputSourceOrigin::make(loc)));
  Boolean netEnabling;
  Ptr<AttributeDefinitionList> newAttDefs;
  Boolean result = parser_->parseAttributeSpec(piPasMode, attributeList, netEnabling, newAttDefs);
  parser_->popInputStack();
  parser_->currentMarkup_ = savedCurrentMarkup;
  return result;
}

void ArcProcessor::init(const EndPrologEvent &event,
			const ConstPtr<Sd> &sd,
			const ConstPtr<Syntax> &syntax,
			const SgmlParser *parentParser,
			Messenger *mgr,
			const Vector<StringC> &superName,
			const NCVector<ArcProcessor> &arcProcessors,
			ArcDirector &director,
			const volatile sig_atomic_t *cancelPtr)
{
  director_ = &director;
  mgr_ = mgr;
  docSyntax_ = syntax;
  docSd_ = sd;
  mgr_ = mgr;
  valid_ = 0;
  docDtd_ = event.dtdPointer();
  metaSyntax_ = docSyntax_;
  mayDefaultAttribute_ = 1;
  ConstPtr<Notation> notation;
  PiAttspecParser piAttspecParser(parentParser);
  if (!piDecl())
    docSyntax_->generalSubstTable()->subst(name_);
  else {
    attributeList_.init(archPiAttributeDefs_);
    Location loc(declLoc_);
    loc += piDeclAttspecIndex_;
    if (!piAttspecParser.parsePiAttributeSpec(piDeclAttspecText_, loc, attributeList_))
      return;
    supportAttributes(attributeList_, 1);
    if (name_.size() == 0)
      return;
  }
  const ArcProcessor *first = 0;
  for (const ArcProcessor *p = arcProcessors.begin(); p != this; p++)
    if (name_ == p->name()) {
      if ((piDecl() && p->piDecl()) || (!piDecl() && !p->piDecl())) {
	setNextLocation(declLoc_);
	message(ArcEngineMessages::duplicateArcDecl,
		StringMessageArg(name_),
		p->declLoc_);
	return;
      } else {
	first = p;
      }
    }
  if (first) {
    if (piDecl()) {
      setNextLocation(declLoc_);
      message(ArcEngineMessages::ignoringPiArcDecl,
	      StringMessageArg(name_),
	      first->declLoc_);
    } else {
      setNextLocation(declLoc_);
      message(ArcEngineMessages::ignoringArcBaseArcDecl,
	      StringMessageArg(name_),
	      first->declLoc_);
    }
    return;
  }
  const StringC *arcPublicId = 0;
  if (piDecl()) {
    if (supportAttsText_[rArcPubid])
      arcPublicId = &supportAtts_[rArcPubid];
  } else {
    notation = docDtd_->lookupNotation(name_);
    if (!notation.isNull()) {
      ConstPtr<AttributeDefinitionList> notAttDef = notation->attributeDef();
      attributeList_.init(notAttDef);
      attributeList_.finish(*this);
      supportAttributes(attributeList_, 0);
      arcPublicId = notation->publicIdPointer();
    }
    else {
      setNextLocation(declLoc_);
      message(ArcEngineMessages::noArcNotation, StringMessageArg(name_));
    }
  }
  Vector<StringC> docName(superName);
  docName.push_back(name_);
  ArcEngineImpl *engine
    = new ArcEngineImpl(*mgr, parentParser, director, cancelPtr,
			arcPublicId, notation.pointer(),
			docName,
			docSyntax_->generalSubstTable());
  docHandler_ = engine;
  ownEventHandler_ = engine;
  if (supportAtts_[rArcDocF].size() == 0)
    supportAtts_[rArcDocF] = name_;
  if (supportAtts_[rArcFormA].size() == 0)
    supportAtts_[rArcFormA] = name_;
  rniContent_ = docSyntax_->delimGeneral(Syntax::dRNI);
  rniContent_ += sd->execToInternal("CONTENT");
  rniDefault_ = docSyntax_->delimGeneral(Syntax::dRNI);
  rniDefault_ += docSyntax_->reservedName(Syntax::rDEFAULT);
  rniArcCont_ = metaSyntax_->delimGeneral(Syntax::dRNI);
  rniArcCont_ += sd->execToInternal("ARCCONT");
  rniMaptoken_ = metaSyntax_->delimGeneral(Syntax::dRNI);
  rniMaptoken_ += sd->execToInternal("MAPTOKEN");
  ConstPtr<Entity> dtdent = makeDtdEntity(notation.pointer());
  if (dtdent.isNull())
    return;
  StringC sysid = dtdent->asExternalEntity()->externalId().effectiveSystemId();
  if (sysid.size() == 0
      && !parentParser->entityCatalog().lookup(*dtdent,
					       *docSyntax_,
					       sd->internalCharset(),
					       *mgr_,
					       sysid)) {
    setNextLocation(dtdent->defLocation());
    message(ArcEngineMessages::arcGenerateSystemId,
	    StringMessageArg(name_));
    return;
  }
  docHandler_->sgmlDecl(new SgmlDeclEvent(sd, syntax));
  docHandler_->startDtd(new StartDtdEvent(dtdent->name(),
					  dtdent,
					  0,
					  event.location(),
					  0));
  SgmlParser::Params params;
  params.entityType = SgmlParser::Params::dtd;
  params.sysid = sysid;
  params.parent = parentParser;
  ParserOptions options = parentParser->options();
  errorIdref_ = options.errorIdref;
  options.errorAfdr = 0;
  options.includes = arcOpts_;
  params.options = &options;
  params.sd = docSd_;
  if (metaSyntax_->reservedName(Syntax::rALL).size() == 0) {
    Ptr<Syntax> tem(new Syntax(*metaSyntax_));
    tem->setName(Syntax::rALL, docSd_->execToInternal("ALL"));
    metaSyntax_ = tem;
  }
  params.prologSyntax = metaSyntax_;
  params.instanceSyntax = metaSyntax_;
  params.doctypeName = dtdent->name();
  params.origin = InputSourceOrigin::make(dtdent->defLocation());
  SgmlParser parser(params);
  parser.parseAll(*docHandler_, cancelPtr);
  Ptr<Dtd> baseDtd = parser.baseDtd();
  if (baseDtd.isNull()
      || baseDtd->documentElementType()->definition()->undefined())
    return;
  metaDtd_ = baseDtd;
  metaMapCache_.resize(docDtd_->nElementTypeIndex());
  mungeMetaDtd(*baseDtd, *docDtd_);
  docHandler_->endDtd(new EndDtdEvent(metaDtd_, event.location(), 0));
  startContent(*metaDtd_);
  currentAttributes_.resize(metaDtd_->nCurrentAttribute());
  valid_ = 1;
  docHandler_->endProlog(new EndPrologEvent(metaDtd_, event.location()));
  if (engine->nBases() == 0)
    docHandler_ = engine->delegateHandler();
}

void ArcProcessor::mungeMetaDtd(Dtd &metaDtd, const Dtd &docDtd)
{
  if (supportAtts_[rArcDataF].size() > 0
      && metaDtd.lookupNotation(supportAtts_[rArcDataF]).isNull()) {
    setNextLocation(supportAttsText_[rArcDataF]->charLocation(0));
    Messenger::message(ArcEngineMessages::noArcDataF,
		       StringMessageArg(supportAtts_[rArcDataF]));
    metaDtd.insertNotation(new Notation(supportAtts_[rArcDataF],
					metaDtd.namePointer(),
					metaDtd.isBase()));
  }
  // FIXME check for ArcAutoF
  Dtd::ConstEntityIter iter(docDtd.generalEntityIter());
  for (;;) {
    ConstPtr<Entity> ent = iter.next();
    if (ent.isNull())
      break;
    Ptr<Entity> copy(ent->copy());
    if (!copy->asExternalDataEntity()
	|| mungeDataEntity(*(ExternalDataEntity *)copy.pointer()))
      metaDtd.insertEntity(copy, 1);
  }
}

Boolean ArcProcessor::mungeDataEntity(ExternalDataEntity &entity)
{
  const MetaMap &map = buildMetaMap(0,
				    entity.notation(),
				    entity.attributes(),
				    0,
				    0);
  if (!map.attributed)
    return 0;
  AttributeList atts;
  const Notation *notation = (const Notation *)map.attributed;
  ConstPtr<AttributeValue> arcContent;
  if (mapAttributes(entity.attributes(), 0, 0, atts, arcContent, map)) {
    entity.setNotation((Notation *)notation, atts);
    return 1;
  }
  return 0;
}

ConstPtr<Entity> ArcProcessor::makeDtdEntity(const Notation *notation)
{
  ExternalId externalId;
  Location defLocation;
  if (notation) {
    if (!supportAtts_[rArcDTD].size()) {
      mgr_->setNextLocation(notation->defLocation());
      mgr_->message(ArcEngineMessages::noArcDTDAtt);
      return 0;
    }
    ConstPtr<Entity> entity = docDtd_->lookupEntity(arcDtdIsParam_,
						    supportAtts_[rArcDTD]);
    if (entity.isNull()) {
      mgr_->setNextLocation(supportAttsText_[rArcDTD]->charLocation(0));
      mgr_->message(arcDtdIsParam_
		    ? ArcEngineMessages::arcDtdNotDeclaredParameter
		    : ArcEngineMessages::arcDtdNotDeclaredGeneral,
		    StringMessageArg(supportAtts_[rArcDTD]));
      return 0;
    }
    if (!entity->asExternalEntity()) {
      mgr_->setNextLocation(entity->defLocation());
      mgr_->message(ArcEngineMessages::arcDtdNotExternal,
		    StringMessageArg(supportAtts_[rArcDTD]));
      return 0;
    }
    externalId = entity->asExternalEntity()->externalId();
    defLocation = entity->defLocation();
  } else {
    if (supportAttsText_[rArcDtdPubid]) {
      Text pubidText(*supportAttsText_[rArcDtdPubid]);
      const MessageType1 *fpierr;
      const MessageType1 *urnerr;
      switch (externalId.setPublic(pubidText, docSd_->internalCharset(),
				   docSyntax_->space(), fpierr, urnerr)) {
      case PublicId::fpi:
        {
	  PublicId::TextClass textClass;
	  if (docSd_->formal() && externalId.publicId()->getTextClass(textClass) && textClass == PublicId::SD) {
	    mgr_->setNextLocation(externalId.publicIdText()->charLocation(0));
	    mgr_->message(ParserMessages::wwwRequired);
	  }
	  if (docSd_->urn() && !docSd_->formal()) {
	    mgr_->setNextLocation(externalId.publicIdText()->charLocation(0));
	    mgr_->message(*urnerr, StringMessageArg(*externalId.publicIdString()));
	  }
        }
	break;
      case PublicId::urn:
	if (docSd_->formal() && !docSd_->urn()) {
	  mgr_->setNextLocation(externalId.publicIdText()->charLocation(0));
	  mgr_->message(*fpierr, StringMessageArg(*externalId.publicIdString()));
	}
	break;
      case PublicId::informal:
	if (docSd_->formal()) {
	  mgr_->setNextLocation(externalId.publicIdText()->charLocation(0));
	  mgr_->message(*fpierr, StringMessageArg(*externalId.publicIdString()));
	}
	if (docSd_->urn()) {
	  mgr_->setNextLocation(externalId.publicIdText()->charLocation(0));
	  mgr_->message(*urnerr, StringMessageArg(*externalId.publicIdString()));
	}
	break;
      }
    }
    if (supportAttsText_[rArcDtdSysid]) {
      Text sysidText(*supportAttsText_[rArcDtdSysid]);
      externalId.setSystem(sysidText);
    }
    defLocation = declLoc_;
  }
#if 0
  // Use the public identifier of the notation to find the meta-DTD.
  if (externalId.effectiveSystemId().size() == 0 && notation) {
    if (notation->externalId().effectiveSystemId().size()) {
      StringC tem(notation->externalId().effectiveSystemId());
      externalId.setEffectiveSystem(tem);
    }
    else  if (!externalId.publicId()) {
      const PublicId *pubid = notation->externalId().publicId();
      PublicId::OwnerType ownerType;
      if (pubid && pubid->getOwnerType(ownerType)) {
	Text pubidText;
	unsigned textClassPos = 2;
	if (ownerType != PublicId::ISO)
	  textClassPos += 3;
	StringC owner;
	pubid->getOwner(owner);
	textClassPos += owner.size();
	pubidText.addChars(pubid->string().data(),
			   textClassPos,
			   pubid->text().charLocation(0));
	pubidText.addChars(docSd_->execToInternal("DTD"),
			   pubid->text().charLocation(textClassPos));
	for (; textClassPos < pubid->string().size(); textClassPos++)
	  if (pubid->string()[textClassPos] == docSyntax_->space())
	    break;
	pubidText.addChars(pubid->string().data() + textClassPos,
			   pubid->string().size() - textClassPos,
			   pubid->text().charLocation(textClassPos));
	const MessageType1 *msg;
	externalId.setPublic(pubidText, docSd_->internalCharset(),
			     docSyntax_->space(), msg);
      }
    }
  }
#endif
  return new ExternalTextEntity(supportAtts_[rArcDocF],
				Entity::doctype,
				defLocation,
				externalId);
}

void ArcProcessor::supportAttributes(const AttributeList &atts, Boolean piDecl)
{
  static const char *const s[][2] = {
    { 0, "name" },
    { 0, "public-id" },
    { "ArcFormA", "form-att" },
    { "ArcNamrA", "renamer-att" },
    { "ArcSuprA", "suppressor-att" },
    { "ArcIgnDA", "ignore-data-att" },
    { "ArcDocF", "doc-elem-form" },
    { "ArcSuprF", 0 },
    { "ArcBridF", "bridge-form" },
    { "ArcDataF", "data-form" },
    { "ArcAuto", "auto" },
    { "ArcDTD", 0 },
    { 0, "dtd-public-id" },
    { 0, "dtd-system-id" },
    { "ArcQuant", "quantity" }
  };
  int column = piDecl ? 1 : 0;
  for (size_t i = 0; i < nReserve; i++)
    supportAttsText_[i] = 0;
  for (size_t i = 0; i < SIZEOF(s); i++)
   if (s[i][column]) {
     StringC attName(docSd_->execToInternal(s[i][column]));
     docSyntax_->generalSubstTable()->subst(attName);
     unsigned ind;
     if (atts.attributeIndex(attName, ind)) {
       const AttributeValue *value = atts.value(ind);
      if (value) {
	const Text *textP = value->text();
	// FIXME check for empty value
	if (textP) {
	  supportAttsText_[i] = textP;
	  supportAtts_[i] = textP->string();
	  switch (i) {
	  case rArcName:
	    name_ = supportAtts_[i];
	    break;
	  case rArcQuant:
	    processArcQuant(*textP);
	    break;
	  case rArcAuto: {
	    if (!piDecl)
	      docSyntax_->generalSubstTable()->subst(supportAtts_[i]);
	    StringC ArcAuto(docSd_->execToInternal("ArcAuto"));
	    docSyntax_->generalSubstTable()->subst(ArcAuto);
	    if (supportAtts_[i] == ArcAuto)
	      arcAuto_ = 1;
	    else {
	      StringC nArcAuto(docSd_->execToInternal("nArcAuto"));
	      docSyntax_->generalSubstTable()->subst(nArcAuto);
	      if (supportAtts_[i] == nArcAuto)
	        arcAuto_ = 0;
	      else if (!piDecl) {
		setNextLocation(textP->charLocation(0));
	        Messenger::message(ArcEngineMessages::invalidArcAuto,
				   StringMessageArg(supportAtts_[i]));
	      }
	    }
	    break;
	  }
	  case rArcFormA:
	  case rArcNamrA:
	  case rArcSuprA:
	  case rArcIgnDA:
	    if (!piDecl)
	      docSyntax_->generalSubstTable()->subst(supportAtts_[i]);
	    break;
	  case rArcDocF:
	  case rArcSuprF:
	  case rArcBridF:
	  case rArcDataF:
	    metaSyntax_->generalSubstTable()->subst(supportAtts_[i]);
	    break;
	  case rArcDTD:
	    {
	      const StringC &pero = docSyntax_->delimGeneral(Syntax::dPERO);
	      if (supportAtts_[i].size() >= pero.size()) {
		StringC tem(supportAtts_[i].data(), pero.size());
		docSyntax_->generalSubstTable()->subst(tem);
		if (tem == pero) {
		  arcDtdIsParam_ = 1;
		  tem.assign(supportAtts_[i].data() + pero.size(),
			     supportAtts_[i].size() - pero.size());
		  tem.swap(supportAtts_[i]);
		}
	      }
	      docSyntax_->entitySubstTable()->subst(supportAtts_[i]);
	    }
	    break;
	  }
	}
      }
    }
  }
  processArcOpts(atts, piDecl);
}

void ArcProcessor::processArcOpts(const AttributeList &atts, Boolean piDecl)
{
  Vector<StringC> arcOptA;
  unsigned ind;
  if (piDecl)
    arcOptA.push_back(docSd_->execToInternal("options"));
  else {
    StringC attName(docSd_->execToInternal("ArcOptSA"));
    docSyntax_->generalSubstTable()->subst(attName);
    Vector<size_t> arcOptAPos;
    const Text *arcOptAText = 0;
    if (atts.attributeIndex(attName, ind)) {
      const AttributeValue *value = atts.value(ind);
      if (value) {
	arcOptAText = value->text();
	if (arcOptAText)
	  split(*arcOptAText, docSyntax_->space(), arcOptA, arcOptAPos);
      }
    }
    if (!arcOptAText)
      arcOptA.push_back(docSd_->execToInternal("ArcOpt"));
  }
  for (size_t i = 0; i < arcOptA.size(); i++) {
    docSyntax_->generalSubstTable()->subst(arcOptA[i]);
    if (atts.attributeIndex(arcOptA[i], ind)) {
      const AttributeValue *value = atts.value(ind);
      if (value) {
	const Text *textP = value->text();
	if (textP) {
	  Vector<StringC> opts;
	  Vector<size_t> optsPos;
	  split(*textP, docSyntax_->space(), opts, optsPos);
	  arcOpts_.insert(arcOpts_.begin(),
			  opts.begin(), opts.begin() + opts.size());
	}
      }
    }
  }
}

void ArcProcessor::processArcQuant(const Text &text)
{
  Ptr<Syntax> newMetaSyntax;
  Vector<StringC> tokens;
  Vector<size_t> tokensPos;
  split(text, docSyntax_->space(), tokens, tokensPos);
  for (size_t i = 0; i < tokens.size(); i++) {
    docSyntax_->generalSubstTable()->subst(tokens[i]);
    Syntax::Quantity quantityName;
    if (!docSd_->lookupQuantityName(tokens[i], quantityName)) {
      setNextLocation(text.charLocation(tokensPos[i]));
      Messenger::message(ArcEngineMessages::invalidQuantity,
			 StringMessageArg(tokens[i]));
    }
    else if (i + 1 >= tokens.size()) {
      setNextLocation(text.charLocation(tokensPos[i]));
      Messenger::message(ArcEngineMessages::missingQuantityValue,
			 StringMessageArg(tokens[i]));
    }
    else {
      i++;
      unsigned long val = 0;
      if (tokens[i].size() > 8) {
	setNextLocation(text.charLocation(tokensPos[i] + 8));
	Messenger::message(ArcEngineMessages::quantityValueTooLong,
			   StringMessageArg(tokens[i]));
	tokens[i].resize(8);
      }
      for (size_t j = 0; j < tokens[i].size(); j++) {
	int weight = docSd_->digitWeight(tokens[i][j]);
	if (weight < 0) {
	  setNextLocation(text.charLocation(tokensPos[i] + j));
	  Char c = tokens[i][j];
	  Messenger::message(ArcEngineMessages::invalidDigit,
			     StringMessageArg(StringC(&c, 1)));
	  val = 0;
	  break;
	}
	else {
	  val *= 10;
	  val += weight;
	}
      }
      if (val > docSyntax_->quantity(quantityName)) {
	if (newMetaSyntax.isNull())
	  newMetaSyntax = new Syntax(*docSyntax_);
	newMetaSyntax->setQuantity(quantityName, val);
      }
    }
  }
  if (!newMetaSyntax.isNull())
    metaSyntax_ = newMetaSyntax;
}

Boolean ArcProcessor::processStartElement(const StartElementEvent &event,
					  const AttributeList *linkAttributes,
					  const Text *content,
					  Allocator &alloc)
{
  unsigned suppressFlags = (openElementFlags_.size() > 0
			    ? (openElementFlags_.back() & ~isArc)
			    : (unsigned)condIgnoreData);
  if ((suppressFlags & suppressForm)
      && (suppressFlags & suppressSupr)) {
    // Make this case efficient.
    openElementFlags_.push_back(suppressFlags);
    return 1;
  }
  const AttributeList &atts = event.attributes();
  const MetaMap &map = buildMetaMap(event.elementType(),
				    0,
				    atts,
				    linkAttributes,
				    suppressFlags);
  const ElementType *metaType;
  ConstPtr<AttributeValue> arcContent;
  if (map.attributed == 0) {
    if (!(tagLevel() == 0
	  && !currentElement().isFinished())) {
      if (!arcContent.isNull()
	  && (currentElement().declaredEmpty()
	      || !currentElement().tryTransitionPcdata()))
	Messenger::message(ArcEngineMessages::invalidArcContent);
      openElementFlags_.push_back(map.suppressFlags);
      return 1;
    }
    metaType = metaDtd_->documentElementType();
    mgr_->message(ArcEngineMessages::documentElementNotArc,
		  StringMessageArg(metaType->name()));
    attributeList_.init(metaType->attributeDef());
    attributeList_.finish(*this);
  }
  else {
    if (!mapAttributes(atts, linkAttributes, content, attributeList_,
		       arcContent, map))
      return 0;
    metaType = (const ElementType *)map.attributed;
    suppressFlags = map.suppressFlags;
  }
  StartElementEvent *genEvent
    = new (alloc) StartElementEvent(metaType,
					metaDtd_,
					&attributeList_,
					event.location(),
					0);
  if (metaType->definition()->undefined())
    Messenger::message(ArcEngineMessages::undefinedElement,
		       StringMessageArg(metaType->name()));
  else if (elementIsExcluded(metaType))
    Messenger::message(ArcEngineMessages::elementExcluded,
		       StringMessageArg(metaType->name()));
  else if (elementIsIncluded(metaType))
    genEvent->setIncluded();
  else if (!currentElement().tryTransition(metaType))
    Messenger::message(ArcEngineMessages::invalidElement,
		       StringMessageArg(metaType->name()));
		       
  pushElement(new (alloc) OpenElement(metaType,
					  0,
					  genEvent->included(),
					  0,
					  event.location()));
  docHandler_->startElement(genEvent);
  if (attributeList_.conref())
    currentElement().setConref();
  if (!arcContent.isNull() && arcContent->text() != 0) {
    if (currentElement().declaredEmpty()
	|| !currentElement().tryTransitionPcdata())
      Messenger::message(ArcEngineMessages::invalidArcContent);
    else
      emitArcContent(*arcContent->text(), docHandler(), alloc);
    suppressFlags |= (suppressForm|suppressSupr|ignoreData);
  }
  suppressFlags &= ~recoverData;
  openElementFlags_.push_back(suppressFlags | isArc);
  return 1;
}

void ArcProcessor::emitArcContent(const Text &text,
				  EventHandler &handler,
				  Allocator &alloc)
{
  TextIter iter(text);
  TextItem::Type type;
  const Char *s;
  size_t n;
  const Location *loc;
  while (iter.next(type, s, n, loc))
    switch (type) {
    case TextItem::data:
    case TextItem::cdata:
      // +1 because first dataEvent is the non-architectural data.
      if (type == TextItem::data)
	handler.data(new (alloc) ImmediateDataEvent(Event::characterData,
							s,
							n,
							*loc,
							0));
      else
			  
	handler.data(new (alloc)
		     CdataEntityEvent(loc->origin()->asEntityOrigin()
				      ->entity()->asInternalEntity(),
				      loc->origin()));
      break;
    case TextItem::sdata:
		     
      handler.sdataEntity(new (alloc)
			  SdataEntityEvent(loc->origin()->asEntityOrigin()
					   ->entity()->asInternalEntity(),
					   loc->origin()));
      break;
    default:
      break;
    }
}

Boolean ArcProcessor::processData()
{
  if (openElementFlags_.size() > 0
      && (openElementFlags_.back() & ignoreData))
    return 0;
  if (!currentElement().declaredEmpty()
      && currentElement().tryTransitionPcdata())
    return 1;
  else if (openElementFlags_.size() > 0
	   && (openElementFlags_.back() & condIgnoreData))
    return 0;
  else {
    // Only give this error once per element
    if (openElementFlags_.size() > 0) {
      if (openElementFlags_.back() & recoverData)
	return 1;
      openElementFlags_.back() |= recoverData;
    }
    Messenger::message(ArcEngineMessages::invalidData);
    return 1;
  }
}

Boolean ArcProcessor::mapAttributes(const AttributeList &from,
				    const AttributeList *fromLink,
				    const Text *content,
				    AttributeList &to,
				    ConstPtr<AttributeValue> &arcContent,
				    const MetaMap &map)
{
  arcContent = 0;
  if (map.attributed)
    to.init(map.attributed->attributeDef());
  for (size_t i = 0; i < map.attMapFrom.size(); i++) {
    unsigned fromIndex = map.attMapFrom[i];
    const AttributeList *fromList = &from;
    if (fromIndex != contentPseudoAtt && fromIndex >= fromList->size()) {
      fromList = fromLink;
      fromIndex -= from.size();
    }
    if (map.attMapTo[i] == contentPseudoAtt)
      arcContent = fromList->valuePointer(fromIndex);
    else {
      const Text *fromText = 0;
      Boolean fromTextTokenized = 0;
      if (map.attMapFrom[i] == contentPseudoAtt) {
	if (!content)
	  return 0;
	fromText = content;
	if (arcContent.isNull()) {
	  // if #CONTENT is specified, the architectural content 
          // will be empty unless #ARCCONT is specified
	  Text empty;
	  arcContent = new CdataAttributeValue(empty);
	}
      }
      else {
	const AttributeValue *value = fromList->value(fromIndex);
	if (value) {
	  fromText = value->text();
	  fromTextTokenized = fromList->tokenized(fromIndex);
	  if (fromText
	      && fromList == &from
	      && !from.specified(fromIndex)
	      && (map.attributed->attributeDef()->def(map.attMapTo[i])
		  ->missingValueWouldMatch(*fromText, *this)))
	    fromText = 0;
	}
      }
      if (fromText) {
	unsigned specLength = 0;
        Text tem1;
        if (map.attTokenMapBase[i] < map.attTokenMapBase[i + 1]) {
          Vector<StringC> tokens;
          Vector<size_t> tokensPos;
	  split(*fromText, docSyntax_->space(), tokens, tokensPos);
          Boolean replaced = 0; 
          for (size_t k = 0; k < tokens.size(); k++) 
	    for (size_t l = map.attTokenMapBase[i]; l < map.attTokenMapBase[i + 1]; l++) 
              if (tokens[k] == map.tokenMapFrom[l]) {
                tokens[k] = map.tokenMapTo[l];
                replaced = 1;
                break;
              }
          if (replaced) {
            for (size_t k = 0; k < tokens.size(); k++) {
              if (k > 0)
                tem1.addChar(docSyntax_->space(), fromText->charLocation(tokensPos[k + 1] - 1));
              tem1.addChars(tokens[k].data(), tokens[k].size(), fromText->charLocation(tokensPos[k]));
            }
            fromText = &tem1;
            fromTextTokenized = 1;
          }
        }
	Text tem;
	if (!fromTextTokenized && to.tokenized(map.attMapTo[i]))
	  fromText->tokenize(docSyntax_->space(), tem);
	else
	  tem = *fromText;
	to.setSpec(map.attMapTo[i], *this);
	to.setValue(map.attMapTo[i], tem, *this, specLength);
      }
    }
  }
  if (map.attributed)
    to.finish(*this);
  return 1;
}

const ArcProcessor::MetaMap &
ArcProcessor::buildMetaMap(const ElementType *docElementType,
			   const Notation *notation,
			   const AttributeList &atts,
			   const AttributeList *linkAtts,
			   unsigned suppressFlags)
{
  Boolean isNotation;
  const Attributed *attributed = docElementType;
  const StringC *nameP;
  if (!attributed) {
    attributed = notation;
    isNotation = 1;
    nameP = &notation->name();
  }
  else {
    isNotation = 0;
    nameP = &docElementType->name();
  }
  // Try to use cached entry.
  Boolean inhibitCache = 0;
  size_t cacheIndex;
  if (isNotation || docElementType->definition()->undefined()) {
    inhibitCache = 1;
    cacheIndex = (unsigned)-1;
  }
  else {
    cacheIndex = docElementType->index();
    const MetaMapCache *cache = metaMapCache_[cacheIndex].pointer();
    if (cache
	&& cache->suppressFlags == suppressFlags
	&& cache->linkAtts == linkAtts) {
      for (int i = 0;; i++) {
	if (i == MetaMapCache::nNoSpec)
	  return cache->map;
	unsigned attIndex = cache->noSpec[i];
	if (attIndex != invalidAtt && atts.specified(attIndex))
	  break;
      }
    }
  }
  // no valid cached MetaMap
  // Handle suppression.
  unsigned oldSuppressFlags = suppressFlags;
  unsigned newSuppressFlags = suppressFlags;
  unsigned arcSuprIndex;
  if (!isNotation)
    considerSupr(atts, linkAtts, suppressFlags, newSuppressFlags, inhibitCache,
		 arcSuprIndex);
  else
    arcSuprIndex = invalidAtt;
  // Handle ArcIgnD
  unsigned arcIgnDIndex;
  if (!isNotation)
    considerIgnD(atts, linkAtts, suppressFlags, newSuppressFlags, inhibitCache,
		 arcIgnDIndex);
  else
    arcIgnDIndex = invalidAtt;
  // Handle ArcForm.
  unsigned arcFormIndex;
  const Attributed *metaAttributed
    = considerForm(atts, linkAtts, *nameP, isNotation,
		   suppressFlags, newSuppressFlags,
		   inhibitCache, arcFormIndex);
  // See if there's a renamer that will inhibit cacheing.
  unsigned arcNamerIndex;
  const Text *namerText;
  if (metaAttributed)
    namerText = considerNamer(atts, inhibitCache, arcNamerIndex);
  else {
    arcNamerIndex = invalidAtt;
    namerText = 0;
  }
  MetaMap *mapP;
  if (inhibitCache) {
    noCacheMetaMap_.clear();
    mapP = &noCacheMetaMap_;
  }
  else {
    MetaMapCache *cache = metaMapCache_[cacheIndex].pointer();
    if (cache)
      cache->clear();
    else {
      cache = new MetaMapCache;
      metaMapCache_[cacheIndex] = cache;
    }
    cache->noSpec[0] = arcFormIndex;
    cache->noSpec[1] = arcNamerIndex;
    cache->noSpec[2] = arcSuprIndex;
    cache->noSpec[3] = arcIgnDIndex;
    cache->suppressFlags = oldSuppressFlags;
    cache->linkAtts = linkAtts;
    mapP = &cache->map;
  }
  mapP->attributed = metaAttributed;
  mapP->suppressFlags = newSuppressFlags;
  // Build the attribute map.
  if (metaAttributed) {
    ConstPtr<AttributeDefinitionList> metaAttDef
      = metaAttributed->attributeDef();
    Vector<PackedBoolean> renamed(metaAttDef.isNull() 
                                  ? 1 : metaAttDef->size() + 1, 
                                   PackedBoolean(0));
    Vector<PackedBoolean> substituted((atts.def().isNull() ? 1 : atts.def()->size() + 1) 
  	                             + (linkAtts && !linkAtts->def().isNull() ? linkAtts->def()->size() : 0),
		                     PackedBoolean(0));
    if (linkAtts) {
      Boolean specified;
      unsigned index;
      const Text *linkNamerText = considerNamer(*linkAtts, specified, index);
      if (linkNamerText)
	buildAttributeMapRename(*mapP, *linkNamerText, atts, linkAtts, renamed, substituted, isNotation);
    }
    if (namerText)
      buildAttributeMapRename(*mapP, *namerText, atts, 0, renamed, substituted, isNotation);
    buildAttributeMapRest(*mapP, atts, linkAtts, renamed);
  }
  return *mapP;
}

void ArcProcessor::considerSupr(const AttributeList &atts,
				const AttributeList *linkAtts,
				unsigned &thisSuppressFlags,
				unsigned &newSuppressFlags,
				Boolean &inhibitCache,
				unsigned &arcSuprIndex)
{
  arcSuprIndex = invalidAtt;
  if (thisSuppressFlags & suppressSupr)
    return;
  if (!supportAtts_[rArcSuprA].size())
    return;
  const AttributeValue *val;
  unsigned tem;
  if (linkAtts && linkAtts->attributeIndex(supportAtts_[rArcSuprA], tem))
    val = linkAtts->value(tem);
  else if (atts.attributeIndex(supportAtts_[rArcSuprA], arcSuprIndex)) {
    if (atts.current(arcSuprIndex) || atts.specified(arcSuprIndex))
      inhibitCache = 1;
    val = atts.value(arcSuprIndex);
  }
  else
    return;
  if (!val)
    return;
  const Text *textP = val->text();
  if (!textP)
    return;
  StringC token = textP->string();
  // FIXME trim spaces
  docSyntax_->generalSubstTable()->subst(token);
  // sArcForm suppress processing for all elements except
  // those that have a non-implied ArcSupr attribute.
  thisSuppressFlags &= ~suppressForm;
  newSuppressFlags &= ~(suppressForm|suppressSupr);
  if (matchName(token, "sArcForm"))
    newSuppressFlags |= suppressForm;
  else if (matchName(token, "sArcAll"))
    newSuppressFlags |= (suppressSupr|suppressForm);
  else if (!matchName(token, "sArcNone")) {
    Messenger::setNextLocation(textP->charLocation(0));
    Messenger::message(ArcEngineMessages::invalidSuppress,
		       StringMessageArg(token));
  }
}

void ArcProcessor::considerIgnD(const AttributeList &atts,
				const AttributeList *linkAtts,
				unsigned thisSuppressFlags,
				unsigned &newSuppressFlags,
				Boolean &inhibitCache,
				unsigned &arcIgnDIndex)
{
  arcIgnDIndex = invalidAtt;
  if (thisSuppressFlags & suppressSupr)
    return;
  if (!supportAtts_[rArcIgnDA].size())
    return;
  const AttributeValue *val;
  unsigned tem;
  if (linkAtts && linkAtts->attributeIndex(supportAtts_[rArcIgnDA], tem))
    val = linkAtts->value(tem);
  else if (atts.attributeIndex(supportAtts_[rArcIgnDA], arcIgnDIndex)) {
    if (atts.current(arcIgnDIndex) || atts.specified(arcIgnDIndex))
      inhibitCache = 1;
    val = atts.value(arcIgnDIndex);
  }
  else
    return;
  if (!val)
    return;
  const Text *textP = val->text();
  if (!textP)
    return;
  StringC token = textP->string();
  // FIXME trim spaces
  docSyntax_->generalSubstTable()->subst(token);
  newSuppressFlags &= ~(ignoreData|condIgnoreData);
  if (matchName(token, "ArcIgnD"))
    newSuppressFlags |= ignoreData;
  else if (matchName(token, "cArcIgnD"))
    newSuppressFlags |= condIgnoreData;
  else if (!matchName(token, "nArcIgnD")) {
    Messenger::setNextLocation(textP->charLocation(0));
    Messenger::message(ArcEngineMessages::invalidIgnD,
		       StringMessageArg(token));
  }
}

const Attributed *
ArcProcessor::considerForm(const AttributeList &atts,
			   const AttributeList *linkAtts,
			   const StringC &name,
			   Boolean isNotation,
			   unsigned thisSuppressFlags,
			   unsigned &newSuppressFlags,
			   Boolean &inhibitCache,
			   unsigned &arcFormIndex)
{
  arcFormIndex = invalidAtt;
  if ((thisSuppressFlags & suppressForm)
      && (supportAtts_[rArcSuprF].size() == 0
	  || (thisSuppressFlags & suppressSupr)
	  || isNotation))
    return 0;
  unsigned tem;
  const AttributeValue *val;
  if (linkAtts && linkAtts->attributeIndex(supportAtts_[rArcFormA], tem))
    val = linkAtts->value(tem);
  else if (atts.attributeIndex(supportAtts_[rArcFormA], arcFormIndex)) {
    if (atts.current(arcFormIndex) || atts.specified(arcFormIndex))
      inhibitCache = 1;
    val = atts.value(arcFormIndex);
  }
  else
    return autoForm(atts, name, isNotation,
		    thisSuppressFlags, newSuppressFlags,
		    inhibitCache, arcFormIndex);
    
  if (!val)
    return 0;
  const Text *textP = val->text();
  if (!textP)
    return 0;
  StringC metaName;
  metaName = textP->string();
  // FIXME should trim leading and trailing spaces
  metaSyntax_->generalSubstTable()->subst(metaName);
  if (!isNotation) {
    const Attributed *metaAttributed = metaDtd_->lookupElementType(metaName);
    if (!metaAttributed) // CONSTDTD
      metaAttributed = lookupCreateUndefinedElement(metaName, Location(), *metaDtd_);
    if (metaName == supportAtts_[rArcSuprF]) {
      newSuppressFlags |= suppressForm;
      return metaAttributed;
    }
    if (thisSuppressFlags & suppressForm)
      return 0;
    return metaAttributed;
  }
  else
    return metaDtd_->lookupNotation(metaName).pointer();
}

const Attributed *
ArcProcessor::autoForm(const AttributeList &atts,
		       const StringC &name,
		       Boolean isNotation,
		       unsigned thisSuppressFlags,
		       unsigned &newSuppressFlags,
		       Boolean &inhibitCache,
		       unsigned &idIndex)
{
  if (!isNotation) {
    const Attributed *metaAttributed;
    if (openElementFlags_.size() == 0) {
      metaAttributed = metaDtd_->documentElementType();
      inhibitCache = 1;
    }
    else {
      metaAttributed = 0;
      if (arcAuto_)
	metaAttributed = metaDtd_->lookupElementType(name);
      if (!metaAttributed
	  && supportAtts_[rArcBridF].size() > 0
	  && atts.idIndex(idIndex)
	  && atts.specified(idIndex)) {
	inhibitCache = 1;
	metaAttributed
	  = metaDtd_->lookupElementType(supportAtts_[rArcBridF]);
      }
    }
    if (metaAttributed
	&& name == supportAtts_[rArcSuprF]) {
      newSuppressFlags = suppressForm|ignoreData;
    }
    else if (thisSuppressFlags & suppressForm)
      return 0;
    return metaAttributed;
  }
  else if (thisSuppressFlags & suppressForm)
    return 0;
  else {
    const Attributed *metaAttributed = 0;
    if (arcAuto_)
      metaAttributed = metaDtd_->lookupNotation(name).pointer();
    if (!metaAttributed && supportAtts_[rArcDataF].size() > 0)
      metaAttributed
	= metaDtd_->lookupNotation(supportAtts_[rArcDataF]).pointer();
    return metaAttributed;
  }
}


const Text *
ArcProcessor::considerNamer(const AttributeList &atts,
			    Boolean &inhibitCache,
			    unsigned &arcNamerIndex)
{
  arcNamerIndex = invalidAtt;
  if (supportAtts_[rArcNamrA].size() == 0
      || !atts.attributeIndex(supportAtts_[rArcNamrA], arcNamerIndex))
    return 0;
  if (atts.current(arcNamerIndex) || atts.specified(arcNamerIndex))
    inhibitCache = 1;
  const AttributeValue *val = atts.value(arcNamerIndex);
  if (!val)
    return 0;
  return val->text();
}

void ArcProcessor::buildAttributeMapRename(MetaMap &map,
					   const Text &rename,
					   const AttributeList &atts,
					   const AttributeList *linkAtts,
					   Vector<PackedBoolean> &attRenamed,
					   Vector<PackedBoolean> &attSubstituted,
					   Boolean isNotation)
{
  Vector<StringC> tokens;
  Vector<size_t> tokensPos;
  split(rename, docSyntax_->space(), tokens, tokensPos);
  ConstPtr<AttributeDefinitionList> metaAttDef;
  if (map.attributed)
    metaAttDef = map.attributed->attributeDef();
  for (size_t i = 0; i < tokens.size(); i += 2) {
    unsigned fromIndex = invalidAtt;
    unsigned toIndex = invalidAtt;
    metaSyntax_->generalSubstTable()->subst(tokens[i]);
    if (!isNotation && tokens[i] == rniArcCont_) {
      if (attRenamed[0]) {
	setNextLocation(rename.charLocation(tokensPos[i]));
	Messenger::message(ArcEngineMessages::arcContDuplicate);
      } 
      else
	toIndex = contentPseudoAtt;
    }
    else if (metaAttDef.isNull()
	     || !metaAttDef->attributeIndex(tokens[i], toIndex)) {
      setNextLocation(rename.charLocation(tokensPos[i]));
      Messenger::message(ArcEngineMessages::renameToInvalid,
			 StringMessageArg(tokens[i]));
    }
    else if (attRenamed[toIndex + 1]) {
      toIndex = invalidAtt;
      setNextLocation(rename.charLocation(tokensPos[i]));
      Messenger::message(ArcEngineMessages::renameToDuplicate,
			 StringMessageArg(tokens[i]));
    }
    if (i + 1 >= tokens.size()) {
      setNextLocation(rename.charLocation(tokensPos[i]));
      Messenger::message(ArcEngineMessages::renameMissingAttName);
    }
    else {
      docSyntax_->generalSubstTable()->subst(tokens[i + 1]);
      if (!isNotation && tokens[i + 1] == rniContent_) {
	if (toIndex == contentPseudoAtt) {
	  setNextLocation(rename.charLocation(tokensPos[i + 1]));
	  Messenger::message(ArcEngineMessages::arcContInvalid,
			     StringMessageArg(tokens[i + 1]));
	}
	else if (attSubstituted[0]) {
	  setNextLocation(rename.charLocation(tokensPos[i + 1]));
	  Messenger::message(ArcEngineMessages::contentDuplicate);
	} 
	else
	  fromIndex = contentPseudoAtt;
      }
      else if (tokens[i + 1] == rniDefault_) {
	if (toIndex == contentPseudoAtt) {
	  setNextLocation(rename.charLocation(tokensPos[i + 1]));
	  Messenger::message(ArcEngineMessages::arcContInvalid,
			     StringMessageArg(tokens[i + 1]));
	}
	else if (toIndex != invalidAtt)
	  attRenamed[toIndex + 1] = 1;
      }
      else if (linkAtts
	       && linkAtts->attributeIndex(tokens[i + 1], fromIndex)) {
	fromIndex += atts.size();
	if (attSubstituted[fromIndex + 1]) {
	  fromIndex = invalidAtt;
	  setNextLocation(rename.charLocation(tokensPos[i + 1]));
	  Messenger::message(ArcEngineMessages::renameFromDuplicate,
			     StringMessageArg(tokens[i + 1]));
	}
      }
      else if (!atts.attributeIndex(tokens[i + 1], fromIndex)) {
 	setNextLocation(rename.charLocation(tokensPos[i + 1]));
	Messenger::message(ArcEngineMessages::renameFromInvalid,
			   StringMessageArg(tokens[i + 1]));
      } 
      else if (attSubstituted[fromIndex + 1]) {
	fromIndex = invalidAtt;
	setNextLocation(rename.charLocation(tokensPos[i + 1]));
	Messenger::message(ArcEngineMessages::renameFromDuplicate,
			   StringMessageArg(tokens[i + 1]));
      }
    }
    // NLR - Code used to not check if toIndex and fromIndex were
    // contentPseudoAtt, only invalidAtt.  Array indexing was bogus, because
    // contentPseudoAtt is defined as -2, but toIndex and fromIndex are
    // unsigned, so -2 becomes a very large number instead.  Skip this next
    // block if either fromIndex or toIndex is either invalidAtt OR
    // contentPseudoAtt.
    if (fromIndex != invalidAtt && toIndex != invalidAtt &&
	fromIndex != contentPseudoAtt && toIndex != contentPseudoAtt) {
      map.attMapFrom.push_back(fromIndex);
      map.attMapTo.push_back(toIndex);
      attRenamed[toIndex + 1] = 1;
      attSubstituted[fromIndex + 1] = 1;
      if (metaAttDef->def(toIndex)->isId()
	  && (fromIndex >= atts.size() || !atts.id(fromIndex)))
	Messenger::message(ArcEngineMessages::idMismatch,
			   StringMessageArg(metaAttDef->def(toIndex)->name()));
      for (;i + 4 < tokens.size(); i += 3) {
	docSyntax_->generalSubstTable()->subst(tokens[i + 2]);
	if (tokens[i + 2] != rniMaptoken_) 
	  break;
	// FIXME: should we check for duplicate from tokens ?
	map.tokenMapTo.push_back(tokens[i + 3]);
	map.tokenMapFrom.push_back(tokens[i + 4]);
      }
      map.attTokenMapBase.push_back(map.tokenMapFrom.size());
    }
  }
}

void ArcProcessor::buildAttributeMapRest(MetaMap &map,
					 const AttributeList &atts,
					 const AttributeList *linkAtts,
					 const Vector<PackedBoolean> &attRenamed)
{
  ConstPtr<AttributeDefinitionList> metaAttDef
    = map.attributed->attributeDef();
  if (metaAttDef.isNull())
    return;
  for (unsigned i = 0; i < metaAttDef->size(); i++)
    if (!attRenamed[i + 1]) {
      unsigned fromIndex;
      if (metaAttDef->def(i)->isId()) {
	for (unsigned j = 0; j < atts.size(); j++)
	  if (atts.id(j)) {
	    map.attMapFrom.push_back(j);
	    map.attMapTo.push_back(i);
            map.attTokenMapBase.push_back(map.tokenMapFrom.size());
	    break;
	  }
      }
      else if (linkAtts && linkAtts->attributeIndex(metaAttDef->def(i)->name(),
						    fromIndex)) {
	map.attMapFrom.push_back(fromIndex + atts.size());
	map.attMapTo.push_back(i);
        map.attTokenMapBase.push_back(map.tokenMapFrom.size());
      }
      else if (atts.attributeIndex(metaAttDef->def(i)->name(), fromIndex)) {
	map.attMapFrom.push_back(fromIndex);
	map.attMapTo.push_back(i);
        map.attTokenMapBase.push_back(map.tokenMapFrom.size());
      }
    }
}

Boolean ArcProcessor::matchName(const StringC &name, const char *key)
{
  if (name.size() != strlen(key))
    return 0;
  StringC tem(docSd_->execToInternal(key));
  docSyntax_->generalSubstTable()->subst(tem);
  return name == tem;
}

void ArcProcessor::split(const Text &text,
			 Char space,
			 Vector<StringC> &tokens,
			 Vector<size_t> &tokensPos)
{
  const StringC &str = text.string();
  for (size_t i = 0;;) {
    for (; i < str.size() && str[i] == space; i++)
      ;
    if (i >= str.size())
      break;
    size_t start = i;
    for (; i < str.size() && str[i] != space; i++)
      ;
    tokens.push_back(StringC(str.data() + start, i - start));
    tokensPos.push_back(start);
  }
}

void ArcProcessor::processEndElement(const EndElementEvent &event,
				     Allocator &alloc)
{
  Boolean wasArc = (openElementFlags_.back() & isArc);
  openElementFlags_.resize(openElementFlags_.size() - 1);
  if (wasArc) {
    EndElementEvent *genEvent
      = new (alloc) EndElementEvent(currentElement().type(),
					metaDtd_,
					event.location(),
					0);
    if (currentElement().included())
      genEvent->setIncluded();
    docHandler_->endElement(genEvent);
    if (!currentElement().isFinished())
      Messenger::message(ArcEngineMessages::unfinishedElement,
			 StringMessageArg(currentElement().type()->name()));
    popElement();
  }
}

void ArcProcessor::dispatchMessage(Message &msg)
{
  mgr_->dispatchMessage(msg);
}

void ArcProcessor::dispatchMessage(const Message &msg)
{
  mgr_->dispatchMessage(msg);
}

void ArcProcessor::initMessage(Message &msg)
{
  mgr_->initMessage(msg);
  if (valid_) {
    StringC rniPcdata = metaSyntax_->delimGeneral(Syntax::dRNI);
    rniPcdata += metaSyntax_->reservedName(Syntax::rPCDATA);
    getOpenElementInfo(msg.openElementInfo, rniPcdata);
  }
}

ArcProcessor::MetaMapCache::MetaMapCache()
{
  for (int i = 0; i < nNoSpec; i++)
    noSpec[i] = invalidAtt;
  linkAtts = 0;
}

void ArcProcessor::MetaMapCache::clear()
{
  for (int i = 0; i < nNoSpec; i++)
    noSpec[i] = invalidAtt;
  linkAtts = 0;
  map.clear();
}

ArcProcessor::MetaMap::MetaMap()
: attributed(0)
{
  attTokenMapBase.push_back(0);
}

void ArcProcessor::MetaMap::clear()
{
  attMapFrom.clear();
  attMapTo.clear();
  attTokenMapBase.clear();
  tokenMapFrom.clear();
  tokenMapTo.clear();
  attributed = 0;
  attTokenMapBase.push_back(0);
}

#ifdef SP_NAMESPACE
}
#endif
