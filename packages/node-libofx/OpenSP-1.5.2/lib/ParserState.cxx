// Copyright (c) 1994 James Clark, 2000 Matthias Clasen
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif
#include "splib.h"
#include "ParserState.h"
#include "InternalInputSource.h"
#include "MessageArg.h"
#include "macros.h"
#include "SgmlParser.h"
#include "IListIter.h"
#include "ParserMessages.h"
#include "Undo.h"
#include "Trie.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

const Location ParserState::nullLocation_;
sig_atomic_t ParserState::dummyCancel_ = 0;

static const size_t eventSizes[] = {
#define EVENT(c, f) sizeof(c),
#include "events.h"
#undef EVENT
};

static const size_t internalSizes[] = {
  sizeof(InternalInputSource),
  sizeof(OpenElement),
  sizeof(UndoStartTag),
  sizeof(UndoEndTag),
  sizeof(UndoTransition)
};

static
size_t maxSize(const size_t *v, size_t n, size_t max = 0)
{
  for (size_t i = 0; i < n; i++) {
    if (v[i] > max)
      max = v[i];
  }
  return max;
}

ParserState::ParserState(const Ptr<EntityManager> &em,
			 const ParserOptions &opt,
			 unsigned subdocLevel,
			 Phase finalPhase)
: entityManager_(em),
  options_(opt),
  inInstance_(0),
  inStartTag_(0),
  inEndTag_(0),
  keepingMessages_(0),
  eventAllocator_(maxSize(eventSizes, SIZEOF(eventSizes)), 50),
  internalAllocator_(maxSize(internalSizes, SIZEOF(internalSizes), EntityOrigin::allocSize), 50),
  handler_(&eventQueue_),
  subdocLevel_(subdocLevel),
  inputLevel_(0),
  specialParseInputLevel_(0),
  markedSectionLevel_(0),
  markedSectionSpecialLevel_(0),
  currentMode_(proMode),
  hadLpd_(0),
  resultAttributeSpecMode_(0),
  pass2_(0),
  activeLinkTypesSubsted_(0),
  allowPass2_(0),
  hadPass2Start_(0),
  pcdataRecovering_(0),
  currentMarkup_(0),
  cancelPtr_(&dummyCancel_),
  finalPhase_(finalPhase),
  hadAfdrDecl_(0),
  instantiatedDtds_(0)
{
}

void ParserState::inheritActiveLinkTypes(const ParserState &parent)
{
  activeLinkTypes_ = parent.activeLinkTypes_;
  activeLinkTypesSubsted_ = parent.activeLinkTypesSubsted_;
}

void ParserState::allDone()
{
  phase_ = noPhase;
}

void ParserState::setPass2Start()
{
  ASSERT(inputLevel_ == 1);
  if (hadPass2Start_)
    return;
  hadPass2Start_ = 1;
  if (!pass2() && sd().link() && activeLinkTypes_.size() > 0) {
    allowPass2_ = 1;
    pass1Handler_.init(handler_);
    handler_ = &pass1Handler_;
    const InputSourceOrigin *p
      = currentLocation().origin()->asInputSourceOrigin();
    pass2StartOffset_= p->startOffset(currentLocation().index());
  }
  else {
    allowPass2_ = 0;
    currentInput()->willNotRewind();
  }
}

void ParserState::allLinkTypesActivated()
{
  if (activeLinkTypes_.size() == 0 && inputLevel_ == 1)
    currentInput()->willNotRewind();
}

Boolean ParserState::maybeStartPass2()
{
  if (pass2_ || !allowPass2_)
    return 0;
  handler_ = pass1Handler_.origHandler();
  if (!nActiveLink() || pass1Handler_.hadError()) {
    while (!pass1Handler_.empty()) {
      if (cancelled())
	return 0;
      pass1Handler_.get()->handle(*handler_);
    }
    InputSource *top = 0;
    for (IListIter<InputSource> iter(inputStack_);
	 !iter.done();
	 iter.next())
      top = iter.cur();
    if (top)
      top->willNotRewind();
    return 0;
  }
  pass1Handler_.clear();
  while (inputLevel_ > 1) {
    InputSource *p = inputStack_.get();
    inputLevel_--;
    delete p;
  }
  // Caller will call allDone() if inputLevel_ is 0.
  if (inputLevel_ == 0)
    return 0;
  if (!inputStack_.head()->rewind(*this)) {
    inputLevel_ = 0;
    delete inputStack_.get();
    return 0;
  }
  inputStack_.head()->willNotRewind();
  for (; pass2StartOffset_ > 0; pass2StartOffset_--)
    if (inputStack_.head()->get(messenger()) == InputSource::eE) {
      message(ParserMessages::pass2Ee);
      inputLevel_ = 0;
      delete inputStack_.get();
      return 0;
    }
  specialParseInputLevel_ = 0;
  markedSectionLevel_ = 0;
  markedSectionSpecialLevel_ = 0;
  currentMode_ = proMode;
  hadLpd_ = 0;
  allowPass2_ = 0;
  hadPass2Start_ = 0;
  currentMarkup_ = 0;
  inputLevel_ = 1;
  inInstance_ = 0;
  inStartTag_ = 0;
  inEndTag_ = 0;
  defDtd_.clear();
  defLpd_.clear();
  dtd_[0].swap(pass1Dtd_);
  dtd_.clear();
  dsEntity_.clear();
  currentDtd_.clear();
  currentDtdConst_.clear();
  phase_ = noPhase;
  pass2_ = 1;
  lpd_.clear();
  allLpd_.clear();
  return 1;
}

Boolean ParserState::referenceDsEntity(const Location &loc)
{
  if (dsEntity_.isNull())
    return 0;
  Ptr<EntityOrigin> origin
    = EntityOrigin::make(internalAllocator(), dsEntity_, loc);
  dsEntity_->dsReference(*this, origin);
  dsEntity_.clear();
  return inputLevel() > 1;
}

void ParserState::startDtd(const StringC &name)
{
  defDtd_ = new Dtd(name, dtd_.size() == 0);
  defLpd_.clear();
  for (size_t i = 0; i < options().includes.size(); i++) {
    StringC name = options().includes[i];
    syntax().entitySubstTable()->subst(name);
    Text text;
    text.addChars(syntax().reservedName(Syntax::rINCLUDE), Location());
    Entity *entity
      = new InternalTextEntity(name,
			       Entity::parameterEntity,
			       Location(),
			       text,
			       InternalTextEntity::none);
    entity->setUsed();
    defDtd_->insertEntity(entity);
  }
  size_t nEntities = instanceSyntax_->nEntities();
  for (size_t i = 0; i < nEntities; i++) {
    Text text;
    text.addChar(instanceSyntax_->entityChar(i), Location());
    Entity *entity
      = new PredefinedEntity(instanceSyntax_->entityName(i),
				Location(),
				text);
    defDtd_->insertEntity(entity);
  }
  currentDtd_ = defDtd_;
  currentDtdConst_ = defDtd_;
  currentMode_ = dsMode;
}

void ParserState::enterTag(Boolean start)
{
  (start ? inStartTag_ : inEndTag_) = 1;
}

void ParserState::leaveTag()
{
  inStartTag_ = 0;
  inEndTag_ = 0;
}

Boolean ParserState::inTag(Boolean &start) const
{
  start = inStartTag_;
  return inStartTag_ || inEndTag_;
}

void ParserState::endDtd()
{
  dtd_.push_back(defDtd_);
  defDtd_.clear();
  currentDtd_.clear();
  currentDtdConst_.clear();
  currentMode_ = proMode;
}

void ParserState::startLpd(Ptr<Lpd> &lpd)
{
  defLpd_ = lpd;
  defDtd_ = defLpd_->sourceDtd();
  currentDtd_ = defLpd_->sourceDtd();
  currentDtdConst_ = defLpd_->sourceDtd();
  currentMode_ = dsMode;
}

void ParserState::endLpd()
{
  hadLpd_ = 1;
  if (defLpd_->active())
    lpd_.push_back(defLpd_);
  allLpd_.push_back(defLpd_);
  defLpd_.clear();
  currentDtd_.clear();
  currentDtdConst_.clear();
  currentMode_ = proMode;
}

void ParserState::popInputStack()
{
  ASSERT(inputLevel_ > 0);
  InputSource *p = inputStack_.get();

  if (handler_ != 0 && inputLevel_ > 1) {
    handler_->inputClosed(p);
  }

  inputLevel_--;
  delete p;
  if (specialParseInputLevel_ > 0 && inputLevel_ == specialParseInputLevel_)
    currentMode_ = specialParseMode_;
  if (currentMode_ == dsiMode
      && inputLevel_ == 1
      && markedSectionLevel_ == 0)
    currentMode_ = dsMode;
  if (inputLevelElementIndex_.size())
    inputLevelElementIndex_.resize(inputLevelElementIndex_.size() - 1);
}

void ParserState::setSd(ConstPtr<Sd> sd)
{
  sd_ = sd;
  mayDefaultAttribute_ = (sd_->omittag() || sd_->attributeDefault());
  validate_ = sd_->typeValid();
  implydefElement_ = sd_->implydefElement();
  implydefAttlist_ = sd_->implydefAttlist();
}

void ParserState::setSyntax(ConstPtr<Syntax> syntax)
{
  syntax_ = syntax;
  prologSyntax_ = syntax;
  instanceSyntax_ = syntax;
}

void ParserState::setSyntaxes(ConstPtr<Syntax> prologSyntax,
			      ConstPtr<Syntax> instanceSyntax)
{
  syntax_ = prologSyntax;
  prologSyntax_ = prologSyntax;
  instanceSyntax_ = instanceSyntax;
}

void ParserState::pushInput(InputSource *in)
{
  if (!in)
    return;

  if (handler_ != 0 && inputLevel_ > 0) {
    handler_->inputOpened(in);
  }

  if (!syntax_.isNull() && syntax_->multicode())
    in->setMarkupScanTable(syntax_->markupScanTable());
  inputStack_.insert(in);
  inputLevel_++;
  if (specialParseInputLevel_ > 0 && inputLevel_ > specialParseInputLevel_)
    currentMode_ = rcconeMode;	// mode for rcdata in an entity
  else if (currentMode_ == dsMode)
    currentMode_ = dsiMode;
  if (inInstance_ && sd().integrallyStored())
    inputLevelElementIndex_.push_back(tagLevel() ? currentElement().index() : 0);
}

void ParserState::startMarkedSection(const Location &loc)
{
  markedSectionLevel_++;
  markedSectionStartLocation_.push_back(loc);
  if (currentMode_ == dsMode)
    currentMode_ = dsiMode;
  if (markedSectionSpecialLevel_)
    markedSectionSpecialLevel_++;
}

void ParserState::startSpecialMarkedSection(Mode mode, const Location &loc)
{
  markedSectionLevel_++;
  markedSectionStartLocation_.push_back(loc);
  specialParseInputLevel_ = inputLevel_;
  markedSectionSpecialLevel_ = 1;
  specialParseMode_ = currentMode_ = mode;
}

void ParserState::endMarkedSection()
{
  ASSERT(markedSectionLevel_ > 0);
  markedSectionLevel_--;
  markedSectionStartLocation_.resize(markedSectionStartLocation_.size()
					- 1);
  if (markedSectionSpecialLevel_ > 0) {
    markedSectionSpecialLevel_--;
    if (markedSectionSpecialLevel_ > 0)
      return;			// remain in imsMode
    specialParseInputLevel_ = 0;
    if (inInstance_)
      currentMode_ = contentMode();
    else
      currentMode_ = dsiMode;
  }
  if (currentMode_ == dsiMode
      && inputLevel_ == 1
      && markedSectionLevel_ == 0)
    currentMode_ = dsMode;
}

void ParserState::pushElement(OpenElement *e)
{
  ContentState::pushElement(e);
  pcdataRecovering_ = 0;
  // the start tag of this element may have been implied by data
  // inside a cdata or rcdata marked section
  if (markedSectionSpecialLevel_ == 0) {
    currentMode_ = contentMode();
    if (e->requiresSpecialParse()) {
      specialParseMode_ = currentMode_;
      specialParseInputLevel_ = inputLevel_;
    }
  }
}

// PCDATA was encountered somewhere where it was not allowed.
// Change the current mode to improve recovery.

void ParserState::pcdataRecover()
{
  switch (currentMode_) {
  case econMode:
    currentMode_ = mconMode;
    break;
  case econnetMode:
    currentMode_ = mconnetMode;
    break;
  default:
    break;
  }
  pcdataRecovering_ = 1;
}

OpenElement *ParserState::popSaveElement()
{
  OpenElement *e = ContentState::popSaveElement();
  // the end tag of this element may have been implied by data
  // inside a cdata or rcdata marked section
  if (markedSectionSpecialLevel_ == 0) {
    currentMode_ = contentMode();
    specialParseInputLevel_ = 0;
  }
  pcdataRecovering_ = 0;
  return e;
}

void ParserState::popElement()
{
  delete popSaveElement();
}
			      
Boolean ParserState::entityIsOpen(const EntityDecl *entityDecl) const
{
  for (IListIter<InputSource> iter(inputStack_); !iter.done(); iter.next())
    if (iter.cur()->currentLocation().origin()->entityDecl() == entityDecl)
      return 1;
  return 0;
}

void ParserState::startInstance()
{
  if (!instanceSyntax_.isNull())
    syntax_ = instanceSyntax_;
  currentMode_ = econMode;

  currentDtd_.clear();
  for (size_t i = 0; i < dtd_.size(); i++) {
    if (shouldActivateLink(dtd_[i]->name())) {
      if (nActiveLink() > 0) {
	message(ParserMessages::activeDocLink);
	break;
      }
      else if (!currentDtd_.isNull()) {
	message(ParserMessages::sorryActiveDoctypes);
	break;
      }
      else 
	currentDtd_ = dtd_[i];
    }  
  }  
  if (currentDtd_.isNull())
    currentDtd_ = dtd_[0];
  currentDtdConst_ = currentDtd_;

  startContent(currentDtd());
  inInstance_ = 1;
  if (sd().rank())
    currentRank_.assign(currentDtd().nRankStem(), StringC());
  currentAttributes_.clear();
  currentAttributes_.resize(currentDtd().nCurrentAttribute());
  idTable_.clear();
}

Id *ParserState::lookupCreateId(const StringC &name)
{
  Id *id = idTable_.lookup(name);
  if (!id) {
    id = new Id(name);
    idTable_.insert(id);
  }
  return id;
}

ConstPtr<Entity>
ParserState::lookupEntity(Boolean isParameter,
			  const StringC &name,
			  const Location &useLocation,
			  Boolean referenced)
{
  Dtd *dtd;
  if (resultAttributeSpecMode_)
    dtd = defComplexLpd().resultDtd().pointer();
  else
    dtd = currentDtd_.pointer();
  if (dtd) {
    Ptr<Entity> entity(dtd->lookupEntity(isParameter, name));
    // Did we find it in pass1Dtd?
    // Did we look at the defaultEntity?
    if (!inInstance_ && pass2() && dtd->isBase()
	&& !resultAttributeSpecMode_
	&& (entity.isNull() || !entity->declInActiveLpd())) {
      ConstPtr<Entity> entity1
	= pass1Dtd_->lookupEntity(isParameter, name);
      if (!entity1.isNull() && entity1->declInActiveLpd()
	  && !entity1->defaulted()) {
	if (referenced)
	  noteReferencedEntity(entity1, 1, 0);
	return entity1;
      }
      else if (!entity.isNull()) {
	if (referenced)
	  noteReferencedEntity(entity, 0, 0);
	entity->setUsed();
	return entity;
      }
    }
    else if (!entity.isNull()) {
      entity->setUsed();
      eventHandler().entityDefaulted
	(new (eventAllocator())EntityDefaultedEvent
	 (entity, useLocation));
      return entity;
    }
    if (!isParameter) {
      ConstPtr<Entity> entity(dtd->defaultEntity());
      Boolean note = 0;
      Boolean usedPass1 = 0;
      if (!inInstance_ && pass2() && dtd->isBase()
	  && !resultAttributeSpecMode_
	  && (entity.isNull() || !entity->declInActiveLpd())) {
	if (referenced)
	  note = 1;
	ConstPtr<Entity> entity1 = pass1Dtd_->defaultEntity();
	if (!entity1.isNull() && entity1->declInActiveLpd()) {
	  usedPass1 = 1;
	  entity = entity1;
	}
      }
      if (!entity.isNull()) {
	Boolean mustCopy = 1;
	if (inInstance_) {
	  ConstPtr<Entity> tem 
	    = instanceDefaultedEntityTable_.lookupConst(name);
	  if (!tem.isNull()) {
	    entity = tem;
	    mustCopy = 0;
	  }
	}
	if (mustCopy) {
	  Ptr<Entity> p(entity->copy());
	  p->setName(name);
	  p->generateSystemId(*this);
	  p->setDefaulted();
	  entity = p;
	  if (inInstance_) {
	    instanceDefaultedEntityTable_.insert(p);
	    eventHandler().entityDefaulted(new (eventAllocator())
					   EntityDefaultedEvent(entity,
								useLocation));
	  }
	  else
	    dtd->insertEntity(p);
	}
	if (note)
	  noteReferencedEntity(entity, usedPass1, 1);
      }
      else
	entity = undefinedEntityTable_.lookupConst(name);
      return entity;
    }
  }
  return (Entity *)0;
}

ConstPtr<Entity> ParserState::createUndefinedEntity(const StringC &name, const Location &loc)
{
  ExternalId extid;
  Ptr<Entity> entity(new ExternalTextEntity(name, EntityDecl::generalEntity, 
					    loc, extid));
  undefinedEntityTable_.insert(entity);
  entity->generateSystemId(*this);
  return entity;
}

void ParserState::noteReferencedEntity(const ConstPtr<Entity> &entity,
				       Boolean foundInPass1Dtd,
				       Boolean lookedAtDefault)
{
  LpdEntityRef ref;
  ref.entity = entity;
  ref.lookedAtDefault = lookedAtDefault;
  ref.foundInPass1Dtd = foundInPass1Dtd;
  LpdEntityRef *old = lpdEntityRefs_.lookup(ref);
  if (!old)
    lpdEntityRefs_.insert(new LpdEntityRef(ref));
}

// Compare entity definitions.
// e1 is the original (will not be an external non-text entity).
// FIXME should look at generated sysids as well.
static
Boolean sameEntityDef(const Entity *e1, const Entity *e2)
{
  if (e1->dataType() != e2->dataType())
    return 0;
  const InternalEntity *i1 = e1->asInternalEntity();
  const InternalEntity *i2 = e2->asInternalEntity();
  if (i1) {
    if (!i2)
      return 0;
    if (i1->string() != i2->string())
      return 0;
    return 1;
  }
  else if (i2)
    return 0;
  const ExternalEntity *x1 = e1->asExternalEntity();
  const ExternalEntity *x2 = e2->asExternalEntity();
  const StringC *s1 = x1->externalId().systemIdString();
  const StringC *s2 = x2->externalId().systemIdString();
  if (s1) {
    if (!s2)
      return 0;
    if (*s1 != *s2)
      return 0;
  }
  else if (s2)
    return 0;
  s1 = x1->externalId().publicIdString();
  s2 = x2->externalId().publicIdString();
  if (s1) {
    if (!s2)
      return 0;
    if (*s1 != *s2)
      return 0;
  }
  else if (s2)
    return 0;
  return 1;
}

void ParserState::checkEntityStability()
{
  LpdEntityRefSetIter iter(lpdEntityRefs_);
  LpdEntityRef *ref;
  while ((ref = iter.next()) != 0) {
    ConstPtr<Entity> entity
      = dtd_[0]->lookupEntity(ref->entity->declType()
			      == Entity::parameterEntity,
			      ref->entity->name());
    if (entity.isNull() && ref->lookedAtDefault)
      entity = dtd_[0]->defaultEntity();
    if (entity.isNull()
	? ref->foundInPass1Dtd
	: !sameEntityDef(ref->entity.pointer(), entity.pointer()))
      message(((ref->entity->declType()
		== Entity::parameterEntity)
	       ? ParserMessages::unstableLpdParameterEntity
	       : ParserMessages::unstableLpdGeneralEntity),
	      StringMessageArg(ref->entity->name()));
  }
  {
    // Ensure that the memory is released.
    LpdEntityRefSet tem;
    lpdEntityRefs_.swap(tem);
  }
}    

Boolean ParserState::appendCurrentRank(StringC &str, const RankStem *stem)
     const
{
  const StringC &suffix = currentRank_[stem->index()];
  if (suffix.size() > 0) {
    str += suffix;
    return 1;
  }
  return 0;
}

void ParserState::setCurrentRank(const RankStem *stem, const StringC &suffix)
{
  currentRank_[stem->index()] = suffix;
}

void ParserState::getCurrentToken(const SubstTable *subst,
				  StringC &str) const
{
  InputSource *in = currentInput();
  const Char *p = in->currentTokenStart();
  size_t count = in->currentTokenLength();
  str.resize(count);
  StringC::iterator s = str.begin();
  for (; count > 0; --count)
    *s++ = (*subst)[*p++];
}

void ParserState::queueMessage(MessageEvent *event)
{
  if (cancelled()) {
    delete event;
    return;
  }
  if (keepingMessages_)
    keptMessages_.append(event);
  else
    handler_->message(event);
}

void ParserState::releaseKeptMessages()
{
  keepingMessages_ = 0;
  while (!keptMessages_.empty()) {
    if (cancelled()) {
      allDone();
      return;
    }
    handler_->message(keptMessages_.get());
  }
}

void ParserState::discardKeptMessages()
{
  keepingMessages_ = 0;
  keptMessages_.clear();
}

void ParserState::initMessage(Message &msg)
{
  if (inInstance()) {
    StringC rniPcdata = syntax().delimGeneral(Syntax::dRNI);
    rniPcdata += syntax().reservedName(Syntax::rPCDATA);
    getOpenElementInfo(msg.openElementInfo, rniPcdata);
  }
  msg.loc = currentLocation();
}

void ParserState::dispatchMessage(Message &msg)
{
  queueMessage(new MessageEvent(msg));
}

void ParserState::dispatchMessage(const Message &msg)
{
  queueMessage(new MessageEvent(msg));
}

AttributeList *
ParserState::allocAttributeList(const ConstPtr<AttributeDefinitionList> &def,
				unsigned i)
{
  if (i < attributeLists_.size())
    attributeLists_[i]->init(def);
  else {
    attributeLists_.resize(i + 1);
    attributeLists_[i] = new AttributeList(def);
  }
  return attributeLists_[i].pointer();
}

void ParserState::activateLinkType(const StringC &name)
{
  if (!hadPass2Start_ && !pass2_)
    activeLinkTypes_.push_back(name);
  else
    message(ParserMessages::linkActivateTooLate);
}

Boolean ParserState::shouldActivateLink(const StringC &name) const
{
  if (!activeLinkTypesSubsted_) {
    for (size_t i = 0; i < activeLinkTypes_.size(); i++)
      syntax().generalSubstTable()->subst(
#ifndef HAVE_MUTABLE
	((ParserState *)this)-> 
#endif
	activeLinkTypes_[i]
	);
#ifndef HAVE_MUTABLE
    ((ParserState *)this)-> 
#endif
      activeLinkTypesSubsted_ = 1;
  }
  for (size_t i = 0; i < activeLinkTypes_.size(); i++)
    if (name == activeLinkTypes_[i])
      return 1;
  return 0;
}

Ptr<Dtd> ParserState::lookupDtd(const StringC &name)
{
  for (size_t i = 0; i < dtd_.size(); i++)
    if (dtd_[i]->name() == name)
      return dtd_[i];
  return Ptr<Dtd>();
}

ConstPtr<Lpd> ParserState::lookupLpd(const StringC &name) const
{
  for (size_t i = 0; i < allLpd_.size(); i++)
    if (allLpd_[i]->name() == name)
      return allLpd_[i];
  return ConstPtr<Lpd>();
}

ConstPtr<Notation> ParserState::getAttributeNotation(const StringC &name,
						     const Location &)
{
  ConstPtr<Notation> notation;
  if (haveCurrentDtd()) {
    notation = currentDtd().lookupNotation(name);
    if (notation.isNull() && sd().implydefNotation()) {
      Ptr<Notation> nt = new Notation(name, 
				      currentDtd().namePointer(), 
				      currentDtd().isBase());
      ExternalId id;
      nt->setExternalId(id, Location());
      nt->generateSystemId(*this);				       
      nt->setAttributeDef(currentDtdNonConst().implicitNotationAttributeDef());
      currentDtdNonConst().insertNotation(nt);
      notation = currentDtd().lookupNotation(name);      
    }
  }
  else if (resultAttributeSpecMode_) {
    const Dtd *resultDtd = defComplexLpd().resultDtd().pointer();
    if (!resultDtd)
      return 0;
    notation = resultDtd->lookupNotation(name);
  }
  return notation; 
}

ConstPtr<Entity> ParserState::getAttributeEntity(const StringC &str,
						 const Location &loc)
{
  ConstPtr<Entity> entity = lookupEntity(0, str, loc, 0);
  if (!entity.isNull()
      && entity->defaulted()
      && options().warnDefaultEntityReference) {
    setNextLocation(loc);
    message(ParserMessages::defaultEntityInAttribute,
	    StringMessageArg(str));
  }
  return entity;
}

Boolean ParserState::defineId(const StringC &str, const Location &loc,
			      Location &prevLoc)
{
  if (!inInstance() || !validate())
    return 1;
  Id *id = lookupCreateId(str);
  if (id->defined()) {
    prevLoc = id->defLocation();
    return 0;
  }
  id->define(loc);
  return 1;
}

void ParserState::noteIdref(const StringC &str, const Location &loc)
{
  if (!inInstance() || !options().errorIdref || !validate())
    return;
  Id *id = lookupCreateId(str);
  if (!id->defined())
    id->addPendingRef(loc);
}

void ParserState::noteCurrentAttribute(size_t i, AttributeValue *value)
{
  if (inInstance())
    currentAttributes_[i] = value;
}

ConstPtr<AttributeValue> ParserState::getCurrentAttribute(size_t i) const
{
  if (!inInstance())
    return ConstPtr<AttributeValue>();
  return currentAttributes_[i];
}

const Syntax &ParserState::attributeSyntax() const
{
  return syntax();
}

unsigned ParserState::instantiateDtd(Ptr<Dtd> &dtd)
{
  if (!dtd->isInstantiated()) {
    dtd->instantiate();
    if (instantiatedDtds_ == sd().concur())
      message(ParserMessages::concurrentInstances,
              NumberMessageArg(sd().concur()));
    instantiatedDtds_++;
  }
  return instantiatedDtds_;
}

#ifdef SP_NAMESPACE
}
#endif
