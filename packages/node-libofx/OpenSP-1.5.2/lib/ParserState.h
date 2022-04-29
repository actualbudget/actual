// Copyright (c) 1994 James Clark, 2000 Matthias Clasen
// See the file COPYING for copying permission.

#ifndef ParserState_INCLUDED
#define ParserState_INCLUDED 1
#ifdef __GNUG__
#pragma interface
#endif

#include <stddef.h>
#include <signal.h>
#include "Allocator.h"
#include "Attribute.h"
#include "Boolean.h"
#include "Vector.h"
#include "StringC.h"
#include "Dtd.h"
#include "Entity.h"
#include "EntityCatalog.h"
#include "EntityManager.h"
#include "Event.h"
#include "EventQueue.h"
#include "Id.h"
#include "InputSource.h"
#include "IList.h"
#include "IQueue.h"
#include "Location.h"
#include "Message.h"
#include "Mode.h"
#include "OpenElement.h"
#include "OutputState.h"
#include "ParserOptions.h"
#include "Ptr.h"
#include "Recognizer.h"
#include "Sd.h"
#include "Syntax.h"
#include "NCVector.h"
#include "Owner.h"
#include "Lpd.h"
#include "LpdEntityRef.h"
#include "Markup.h"
#include "ContentState.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class ParserState : public ContentState, public AttributeContext { 
public:
  enum Phase {
    noPhase,
    initPhase,
    prologPhase,
    declSubsetPhase,
    instanceStartPhase,
    contentPhase
    };
  ParserState(const Ptr<EntityManager> &,
	      const ParserOptions &,
	      unsigned subdocLevel,
	      Phase finalPhase);
  void setHandler(EventHandler *, const volatile sig_atomic_t *cancelPtr);
  void unsetHandler();
  Boolean inInstance() const;
  Boolean inTag(Boolean &start) const;
  void enterTag(Boolean start);
  void leaveTag();
  Boolean hadDtd() const;
  void allDone();
  void startDtd(const StringC &);
  void endDtd();
  void startInstance();
  unsigned subdocLevel() const;
  Boolean haveDefLpd() const;
  Dtd &defDtd();
  const Ptr<Dtd> &defDtdPointer() const;
  Boolean haveCurrentDtd() const;
  const Dtd &currentDtd() const;
  Dtd &currentDtdNonConst() const;
  const ConstPtr<Dtd> &currentDtdPointer() const;
  void startLpd(Ptr<Lpd> &lpd);
  void endLpd();
  Lpd &defLpd();
  Ptr<Lpd> &defLpdPointer();
  Ptr<ComplexLpd> defComplexLpdPointer();
  size_t nActiveLink() const;
  const Lpd &activeLpd(size_t i) const;
  ComplexLpd &defComplexLpd();
  Ptr<Dtd> lookupDtd(const StringC &name);
  unsigned instantiateDtd(Ptr<Dtd> &dtd);
  Ptr<Dtd> baseDtd();
  void activateLinkType(const StringC &);
  void allLinkTypesActivated();
  void setResultAttributeSpecMode();
  void clearResultAttributeSpecMode();
  Boolean haveApplicableDtd() const;
  Boolean hadLpd() const;
  Boolean pass2() const;
  void setPass2Start();
  Boolean maybeStartPass2();
  void checkEntityStability();
  void noteReferencedEntity(const ConstPtr<Entity> &entity,
			    Boolean, Boolean);
  ConstPtr<Lpd> lookupLpd(const StringC &name) const;
  Boolean shouldActivateLink(const StringC &) const;
  Char currentChar() const;
  const Location &currentLocation() const;
  InputSource *currentInput() const;
  EntityManager &entityManager() const;
  Ptr<EntityManager> entityManagerPtr() const;
  const EntityCatalog &entityCatalog() const;
  ConstPtr<EntityCatalog> entityCatalogPtr() const;
  void setEntityCatalog(const ConstPtr<EntityCatalog> &);
  void setSyntax(ConstPtr<Syntax>);
  void setSyntaxes(ConstPtr<Syntax>, ConstPtr<Syntax>);
  void setSd(ConstPtr<Sd>);
  const Syntax &syntax() const;
  const Syntax &instanceSyntax() const;
  const ConstPtr<Syntax> &syntaxPointer() const;
  const ConstPtr<Syntax> &prologSyntaxPointer() const;
  const ConstPtr<Syntax> &instanceSyntaxPointer() const;
  const Sd &sd() const;
  const ConstPtr<Sd> &sdPointer() const;
  void setPhase(Phase phase);
  Phase phase() const;
  Phase finalPhase() const;
  Mode currentMode() const;
  void setRecognizer(Mode, ConstPtr<Recognizer>);
  void setNormalMap(const XcharMap<PackedBoolean> &);
  const XcharMap<PackedBoolean> &normalMap() const;
  Xchar getChar();
  void skipChar();
  Token getToken(Mode mode);
  StringC currentToken() const;
  void getCurrentToken(StringC &) const;
  void getCurrentToken(const SubstTable *, StringC &) const;
  unsigned inputLevel() const;
  unsigned specialParseInputLevel() const;
  unsigned markedSectionLevel() const;
  unsigned markedSectionSpecialLevel() const;
  unsigned currentInputElementIndex() const;
  const Location &currentMarkedSectionStartLocation() const;
  Boolean entityIsOpen(const EntityDecl *) const;
  void popInputStack();
  void pushInput(InputSource *);
  Boolean referenceDsEntity(const Location &);
  void setDsEntity(const ConstPtr<Entity> &);
  const ConstPtr<Entity> &dsEntity() const;
  Boolean eventQueueEmpty() const;
  Event *eventQueueGet();
  EventHandler &eventHandler();
  void pushElement(OpenElement *);
  OpenElement *popSaveElement();
  void popElement();
  void pcdataRecover();
  Boolean pcdataRecovering() const;
  ConstPtr<Entity> lookupEntity(Boolean isParameter,
				const StringC &name,
				const Location &,
				Boolean referenced);
  ConstPtr<Entity> createUndefinedEntity(const StringC &,
					 const Location &);
  Boolean appendCurrentRank(StringC &, const RankStem *) const;
  void setCurrentRank(const RankStem *, const StringC &);
  void startMarkedSection(const Location &);
  void startSpecialMarkedSection(Mode, const Location &);
  void endMarkedSection();
  void queueRe(const Location &);
  void noteMarkup();
  void noteData();
  void noteRs();
  void noteStartElement(Boolean included);
  void noteEndElement(Boolean included);
  // size of objects allocated with this must not exceed
  // sizeof(StartElementEvent)
  Allocator &eventAllocator();
  // size of objects allocated with this must not exceed
  // sizeof(OpenElement)
  Allocator &internalAllocator();
  AttributeList *allocAttributeList(const ConstPtr<AttributeDefinitionList> &,
				    unsigned i);

  static void freeEvent(void *);
  Boolean wantMarkup() const;
  const EventsWanted &eventsWanted() const;
  StringC &nameBuffer();
  typedef NamedTableIter<Id> IdTableIter;
  IdTableIter idTableIter();
  const ParserOptions &options() const;
  void enableImplydef();
  Sd::ImplydefElement implydefElement();
  Boolean implydefAttlist();
  void keepMessages();
  void releaseKeptMessages();
  void discardKeptMessages();
  Messenger &messenger();

  Markup *currentMarkup();
  const Location &markupLocation() const;
  Markup *startMarkup(Boolean, const Location &);
  void inheritActiveLinkTypes(const ParserState &parent);
  Boolean cancelled() const;

  // AFDR extensions
  void setHadAfdrDecl();
  Boolean hadAfdrDecl() const;

  // Implementation of AttributeContext.
  Boolean defineId(const StringC &, const Location &, Location &);
  void noteIdref(const StringC &, const Location &);
  void noteCurrentAttribute(size_t, AttributeValue *);
  ConstPtr<AttributeValue> getCurrentAttribute(size_t) const;
  ConstPtr<Entity> getAttributeEntity(const StringC &,
				      const Location &);
  ConstPtr<Notation> getAttributeNotation(const StringC &,
					  const Location &);
  const Syntax &attributeSyntax() const;

  friend class PiAttspecParser;
private:
  ParserState(const ParserState &); // undefined
  void operator=(const ParserState &); // undefined
  void dispatchMessage(Message &);
  void dispatchMessage(const Message &);
  void initMessage(Message &);
  void queueMessage(MessageEvent *);
  Id *lookupCreateId(const StringC &);

  ParserOptions options_;
  EventHandler *handler_;
  Pass1EventHandler pass1Handler_;
  Boolean allowPass2_;
  Offset pass2StartOffset_;
  Boolean hadPass2Start_;
  EventQueue eventQueue_;
  OutputState outputState_;
  ConstPtr<Syntax> prologSyntax_;
  ConstPtr<Syntax> instanceSyntax_;
  ConstPtr<Sd> sd_;
  unsigned subdocLevel_;
  Ptr<EntityManager> entityManager_;
  ConstPtr<EntityCatalog> entityCatalog_;
  Phase phase_;
  Phase finalPhase_;
  Boolean inInstance_;
  Boolean inStartTag_;
  Boolean inEndTag_;
  Ptr<Dtd> defDtd_;
  Ptr<Lpd> defLpd_;
  Vector<ConstPtr<Lpd> > allLpd_;
  Vector<ConstPtr<Lpd> > lpd_; // active LPDs
  mutable Vector<StringC> activeLinkTypes_;
  mutable Boolean activeLinkTypesSubsted_;
  Boolean hadLpd_;
  Boolean resultAttributeSpecMode_;
  Boolean pass2_;
  typedef OwnerTable<LpdEntityRef, LpdEntityRef, LpdEntityRef, LpdEntityRef>
    LpdEntityRefSet;
  typedef OwnerTableIter<LpdEntityRef, LpdEntityRef, LpdEntityRef, LpdEntityRef>
    LpdEntityRefSetIter;
  LpdEntityRefSet lpdEntityRefs_;
  // external entity to be referenced at the end of the declaration subset
  ConstPtr<Entity> dsEntity_;
  Allocator eventAllocator_;
  Allocator internalAllocator_;
  NCVector<Owner<AttributeList> > attributeLists_;
  StringC nameBuffer_;
  Boolean keepingMessages_;
  IQueue<MessageEvent> keptMessages_;
  Mode currentMode_;
  Boolean pcdataRecovering_;
  // if in a special parse (cdata, rcdata, ignore), the input level
  // at which the special parse started.
  unsigned specialParseInputLevel_;
  Mode specialParseMode_;
  unsigned markedSectionLevel_;
  unsigned markedSectionSpecialLevel_;
  Vector<Location> markedSectionStartLocation_;
  ConstPtr<Recognizer> recognizers_[nModes];
  XcharMap<PackedBoolean> normalMap_;
  unsigned inputLevel_;
  IList<InputSource> inputStack_;
  Vector<unsigned> inputLevelElementIndex_;
  Ptr<Dtd> currentDtd_;
  ConstPtr<Dtd> currentDtdConst_;
  Vector<Ptr<Dtd> > dtd_;
  Ptr<Dtd> pass1Dtd_;
  unsigned instantiatedDtds_;
  ConstPtr<Syntax> syntax_;
  Vector<StringC> currentRank_;
  NamedTable<Id> idTable_;
  NamedResourceTable<Entity> instanceDefaultedEntityTable_;
  NamedResourceTable<Entity> undefinedEntityTable_;
  Vector<ConstPtr<AttributeValue> > currentAttributes_;
  Markup *currentMarkup_;
  Markup markup_;
  Location markupLocation_;
  Boolean hadAfdrDecl_;
  Sd::ImplydefElement implydefElement_;
  Boolean implydefAttlist_;
  const volatile sig_atomic_t *cancelPtr_;
  static sig_atomic_t dummyCancel_;
  static const Location nullLocation_;
};

inline
Messenger &ParserState::messenger()
{
  return *this;
}

inline
Boolean ParserState::wantMarkup() const
{
  return (inInstance_
	  ? options_.eventsWanted.wantInstanceMarkup()
	  : options_.eventsWanted.wantPrologMarkup());
}



inline
const EventsWanted &ParserState::eventsWanted() const
{
  return options_.eventsWanted;
}

inline
InputSource *ParserState::currentInput() const
{
  return inputStack_.head();
}

inline
const Location &ParserState::currentLocation() const
{
  InputSource *in = currentInput();
  return in ? in->currentLocation() : nullLocation_;
}

inline
Boolean ParserState::pcdataRecovering() const
{
  return pcdataRecovering_;
}

inline
unsigned ParserState::inputLevel() const
{
  return inputLevel_;
}

inline
unsigned ParserState::specialParseInputLevel() const
{
  return specialParseInputLevel_;
}

inline
unsigned ParserState::markedSectionLevel() const
{
  return markedSectionLevel_;
}

inline
unsigned ParserState::markedSectionSpecialLevel() const
{
  return markedSectionSpecialLevel_;
}

inline
const Location &ParserState::currentMarkedSectionStartLocation() const
{
  return markedSectionStartLocation_.back();
}

inline
unsigned ParserState::currentInputElementIndex() const
{
  return inputLevelElementIndex_.back();
}

inline
Char ParserState::currentChar() const
{
  return currentInput()->currentTokenStart()[0];
}

inline
StringC ParserState::currentToken() const
{
  return StringC(currentInput()->currentTokenStart(),
		 currentInput()->currentTokenLength());
}

inline
void ParserState::getCurrentToken(StringC &str) const
{
  InputSource *in = currentInput();
  str.assign(in->currentTokenStart(), in->currentTokenLength());
}

inline
void ParserState::setRecognizer(Mode mode, ConstPtr<Recognizer> p)
{
  recognizers_[mode] = p;
}

inline
void ParserState::setNormalMap(const XcharMap<PackedBoolean> &map)
{
  normalMap_ = map;
}

inline
const XcharMap<PackedBoolean> &ParserState::normalMap() const
{
  return normalMap_;
}

inline
Boolean ParserState::haveDefLpd() const
{
  return !defLpd_.isNull();
}

inline
Boolean ParserState::haveCurrentDtd() const
{
  return !currentDtd_.isNull();
}

inline
Dtd &ParserState::defDtd()
{
  return *defDtd_;
}

inline
const Dtd &ParserState::currentDtd() const
{
  return *currentDtd_;
}

inline
Dtd &ParserState::currentDtdNonConst() const
{
  return *currentDtd_;
}

inline
const Ptr<Dtd> &ParserState::defDtdPointer() const
{
  return defDtd_;
}

inline
const ConstPtr<Dtd> &ParserState::currentDtdPointer() const
{
  return currentDtdConst_;
}

inline
Boolean ParserState::inInstance() const
{
  return inInstance_;
}

inline
const Syntax &ParserState::syntax() const
{
  return *syntax_;
}

inline
const Syntax &ParserState::instanceSyntax() const
{
  return *instanceSyntax_;
}

inline
const ConstPtr<Syntax> &ParserState::syntaxPointer() const
{
  return syntax_;
}

inline
const ConstPtr<Syntax> &ParserState::instanceSyntaxPointer() const
{
  return instanceSyntax_;
}

inline
const ConstPtr<Syntax> &ParserState::prologSyntaxPointer() const
{
  return prologSyntax_;
}

inline
const Sd &ParserState::sd() const
{
  return *sd_;
}

inline
const ConstPtr<Sd> &ParserState::sdPointer() const
{
  return sd_;
}

inline
void ParserState::setPhase(Phase phase)
{
  phase_ = phase;
}

inline
Mode ParserState::currentMode() const
{
  return currentMode_;
}

inline
Xchar ParserState::getChar()
{
  return inputStack_.head()->get(messenger());
}

inline
void ParserState::skipChar()
{
  (void)getChar();
}

inline
Token ParserState::getToken(Mode mode)
{
  return recognizers_[mode]->recognize(inputStack_.head(), messenger());
}

inline
Boolean ParserState::hadDtd() const
{
  return dtd_.size() > 0;
}

inline
Boolean ParserState::eventQueueEmpty() const
{
  return eventQueue_.empty();
}

inline
Event *ParserState::eventQueueGet()
{
  return eventQueue_.get();
}

inline
ParserState::Phase ParserState::phase() const
{
  return phase_;
}

inline
ParserState::Phase ParserState::finalPhase() const
{
  return finalPhase_;
}

inline
EntityManager &ParserState::entityManager() const
{
  return *entityManager_;
}

inline
Ptr<EntityManager> ParserState::entityManagerPtr() const
{
  return entityManager_;
}

inline
const EntityCatalog &ParserState::entityCatalog() const
{
  return *entityCatalog_;
}

inline
ConstPtr<EntityCatalog> ParserState::entityCatalogPtr() const
{
  return entityCatalog_;
}

inline
void ParserState::setEntityCatalog(const ConstPtr<EntityCatalog> &catalog)
{
  entityCatalog_ = catalog;
}

inline
void ParserState::setDsEntity(const ConstPtr<Entity> &entity)
{
  dsEntity_ = entity;
}

inline
Allocator &ParserState::eventAllocator()
{
  return eventAllocator_;
}

inline
Allocator &ParserState::internalAllocator()
{
  return internalAllocator_;
}

inline
StringC &ParserState::nameBuffer()
{
  return nameBuffer_;
}

inline
void ParserState::setHandler(EventHandler *handler,
			     const volatile sig_atomic_t *cancelPtr)
{
  handler_ = handler;
  cancelPtr_ = cancelPtr ? cancelPtr : &dummyCancel_;
}

inline
void ParserState::unsetHandler()
{
  handler_ = &eventQueue_;
  cancelPtr_ = &dummyCancel_;
}

inline
void ParserState::queueRe(const Location &location)
{
  outputState_.handleRe(*handler_, eventAllocator_, options_.eventsWanted,
			syntax().standardFunction(Syntax::fRE),
			location);
}

inline
void ParserState::noteMarkup()
{
  if (inInstance_)
    outputState_.noteMarkup(*handler_, eventAllocator_, options_.eventsWanted);
}

inline
void ParserState::noteRs()
{
  outputState_.noteRs(*handler_, eventAllocator_, options_.eventsWanted);
}

inline
void ParserState::noteStartElement(Boolean included)
{
  outputState_.noteStartElement(included, *handler_, eventAllocator_,
				options_.eventsWanted);
}

inline
void ParserState::noteEndElement(Boolean included)
{
  outputState_.noteEndElement(included, *handler_, eventAllocator_,
			      options_.eventsWanted);
}

inline
void ParserState::noteData()
{
  outputState_.noteData(*handler_, eventAllocator_, options_.eventsWanted);
}

inline
unsigned ParserState::subdocLevel() const
{
  return subdocLevel_;
}

inline
EventHandler &ParserState::eventHandler()
{
  return *handler_;
}

inline
ParserState::IdTableIter ParserState::idTableIter()
{
  // Avoid use of typedef to work around MSVC 2.0 bug.
  return NamedTableIter<Id>(idTable_);
}

inline
const ParserOptions &ParserState::options() const
{
  return options_;
}

inline
Sd::ImplydefElement ParserState::implydefElement()
{
  return implydefElement_;
}

inline
Boolean ParserState::implydefAttlist()
{
  return implydefAttlist_;
}

inline
void ParserState::enableImplydef()
{
  implydefElement_ = Sd::implydefElementYes;
  implydefAttlist_ = 1;
}

inline
void ParserState::keepMessages()
{
  keepingMessages_ = 1;
}

inline
Boolean ParserState::haveApplicableDtd() const
{
  return !currentDtd_.isNull();
}

inline
Boolean ParserState::hadLpd() const
{
  return hadLpd_;
}

inline
Boolean ParserState::pass2() const
{
  return pass2_;
}

inline
size_t ParserState::nActiveLink() const
{
  return lpd_.size();
}

inline
const Lpd &ParserState::activeLpd(size_t i) const
{
  return *lpd_[i];
}

inline
Lpd &ParserState::defLpd()
{
  return *defLpd_;
}

inline
Ptr<Lpd> &ParserState::defLpdPointer()
{
  return defLpd_;
}

inline
Ptr<ComplexLpd> ParserState::defComplexLpdPointer()
{
  return (ComplexLpd *)defLpd_.pointer();
}

inline
ComplexLpd &ParserState::defComplexLpd()
{
  return (ComplexLpd &)defLpd();
}

inline
Ptr<Dtd> ParserState::baseDtd() 
{
  if (dtd_.size() > 0)
    return dtd_[0];
  else
    return Ptr<Dtd>();
}

inline
void ParserState::setResultAttributeSpecMode()
{
  resultAttributeSpecMode_ = 1;
}

inline
void ParserState::clearResultAttributeSpecMode()
{
  resultAttributeSpecMode_ = 0;
}

inline
Markup *ParserState::currentMarkup()
{
  return currentMarkup_;
}

inline
const Location &ParserState::markupLocation() const
{
  return markupLocation_;
}

inline
Markup *ParserState::startMarkup(Boolean storing, const Location &loc)
{
  markupLocation_ = loc;
  if (storing) {
    markup_.clear();
    return currentMarkup_ = &markup_;
  }
  else
    return currentMarkup_ = 0;
}

inline
Boolean ParserState::cancelled() const
{
  return *cancelPtr_ != 0;
}

inline
void ParserState::setHadAfdrDecl()
{
  hadAfdrDecl_ = 1;
}

inline
Boolean ParserState::hadAfdrDecl() const
{
  return hadAfdrDecl_;
}

inline
const ConstPtr<Entity> &ParserState::dsEntity() const
{
  return dsEntity_;
}


#ifdef SP_NAMESPACE
}
#endif

#endif /* not ParserState_INCLUDED */
