// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif
#include "splib.h"
#include "Event.h"
#include "Entity.h"
#include "Attribute.h"
#include "EventQueue.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

void Event::copyData()
{
}

LocatedEvent::LocatedEvent(Type type, const Location &location)
: location_(location), Event(type)
{
}

MarkupEvent::MarkupEvent(Type type)
: LocatedEvent(type, Location())
{
}

MarkupEvent::MarkupEvent(Type type, const Location &loc, Markup *markup)
: LocatedEvent(type, loc)
{
  if (markup)
    markup->swap(markup_);
}

StartElementEvent::StartElementEvent(const ElementType *elementType,
				     const ConstPtr<Dtd> &dtd,
				     AttributeList *attributes,
				     const Location &startLocation,
				     Markup *markup)
: LocatedEvent(startElement, startLocation),
  elementType_(elementType),
  dtd_(dtd),
  included_(0),
  copied_(0),
  markup_(markup),
  attributes_(attributes)
{
}

StartElementEvent::~StartElementEvent()
{
  if (copied_) {
    delete attributes_;
    delete markup_;
  }
}

void StartElementEvent::copyData()
{
  if (!copied_) {
    {
      AttributeList *p = new AttributeList;
      attributes_->swap(*p);
      attributes_ = p;
    }
    if (markup_) {
      Markup *p = new Markup;
      markup_->swap(*p);
      markup_ = p;
    }
    copied_ = 1;
  }
}

EndElementEvent::EndElementEvent(const ElementType *elementType,
				 const ConstPtr<Dtd> &dtd,
				 const Location &startLocation,
				 Markup *markup)
: LocatedEvent(endElement, startLocation),
  elementType_(elementType),
  dtd_(dtd),
  included_(0),
  copied_(0),
  markup_(markup)
{
}

EndElementEvent::~EndElementEvent()
{
  if (copied_)
    delete markup_;
}

void EndElementEvent::copyData()
{
  if (!copied_) {
    if (markup_) {
      Markup *p = new Markup;
      markup_->swap(*p);
      markup_ = p;
    }
    copied_ = 1;
  }
}

DataEvent::DataEvent(Type type, const Char *p, size_t length,
		     const Location &location)
: p_(p),length_(length), LocatedEvent(type, location)
{
}

const Entity *DataEvent::entity() const
{
  return 0;
}

Boolean DataEvent::isRe(unsigned long &) const
{
  return 0;
}

ImmediateDataEvent::ImmediateDataEvent(Type type, const Char *p, size_t length,
				       const Location &location,
				       Boolean copy)
: DataEvent(type, p, length, location), alloc_(0)
{
  if (copy) 
    ImmediateDataEvent::copyData();
}

ImmediateDataEvent::~ImmediateDataEvent()
{
  if (alloc_)
    delete [] alloc_;
}

void ImmediateDataEvent::copyData()
{
  if (!alloc_) {
    alloc_ = new Char[length_];
    memcpy(alloc_, p_, length_*sizeof(Char));
    p_ = alloc_;
  }
}

ReEvent::ReEvent(const Char *p, const Location &location, unsigned long serial)
: ImmediateDataEvent(characterData, p, 1, location, 0),
  serial_(serial)
{
}

Boolean ReEvent::isRe(unsigned long &serial) const
{
  serial = serial_;
  return 1;
}

DataEntityEvent::DataEntityEvent(Type type, const InternalEntity *entity,
				 const ConstPtr<Origin> &origin)
: DataEvent(type,
	    entity->string().data(),
	    entity->string().size(),
	    Location(origin, 0))
{
}

const Entity *DataEntityEvent::entity() const
{
  return location().origin()->asEntityOrigin()->entity();
}

CdataEntityEvent::CdataEntityEvent(const InternalEntity *entity,
				   const ConstPtr<Origin> &origin)
: DataEntityEvent(characterData, entity, origin)
{
}

SdataEntityEvent::SdataEntityEvent(const InternalEntity *entity,
				   const ConstPtr<Origin> &origin)
: DataEntityEvent(sdataEntity, entity, origin)
{
}

MessageEvent::MessageEvent(const Message &m)
: Event(Event::message), message_(m)
{
}

MessageEvent::MessageEvent(Message &m)
: Event(Event::message)
{
  m.swap(message_);
}

MessageEvent::~MessageEvent()
{
}

PiEvent::PiEvent(const Char *data, size_t dataLength, const Location &location)
: data_(data), dataLength_(dataLength), LocatedEvent(pi, location)
{
}

const Entity *PiEvent::entity() const
{
  return 0;
}

PiEntityEvent::PiEntityEvent(const PiEntity *entity,
			     const ConstPtr<Origin> &origin)
: PiEvent(entity->string().data(), entity->string().size(),
	  Location(origin, 0))
{
}

const Entity *PiEntityEvent::entity() const
{
  return location().origin()->asEntityOrigin()->entity();
}

ImmediatePiEvent::ImmediatePiEvent(StringC &str, const Location &loc)
: PiEvent(str.data(), str.size(), loc)
{
  str.swap(string_);
}

ExternalEntityEvent::ExternalEntityEvent(Type type, 
					 const ConstPtr<EntityOrigin> &origin)
: origin_(origin), Event(type)
{
}

ExternalDataEntityEvent::ExternalDataEntityEvent(const ExternalDataEntity *entity,
						 const ConstPtr<EntityOrigin> &origin)
: dataEntity_(entity), ExternalEntityEvent(externalDataEntity, origin)
{
}

SubdocEntityEvent::SubdocEntityEvent(const SubdocEntity *entity,
				     const ConstPtr<EntityOrigin> &origin)
: subdocEntity_(entity), ExternalEntityEvent(subdocEntity, origin)
{
}

NonSgmlCharEvent::NonSgmlCharEvent(Char c, const Location &location)
: LocatedEvent(nonSgmlChar, location), c_(c)
{
}

AppinfoEvent::AppinfoEvent(const Location &location)
: LocatedEvent(appinfo, location), appinfoNone_(1)
{
}

AppinfoEvent::AppinfoEvent(const Text &text, const Location &location)
: LocatedEvent(appinfo, location), appinfoNone_(0), appinfo_(text)
{
}

UselinkEvent::UselinkEvent(const ConstPtr<Lpd> &lpd,
			   const LinkSet *linkSet,
			   Boolean restore,
			   const Location &loc,
			   Markup *markup)
: MarkupEvent(uselink, loc, markup),
  lpd_(lpd),
  linkSet_(linkSet),
  restore_(restore)
{
}

UsemapEvent::UsemapEvent(const ShortReferenceMap *map,
			 Vector<const ElementType *> &elements,
			 const ConstPtr<Dtd> &dtd,
			 const Location &loc,
			 Markup *markup)
: MarkupEvent(usemap, loc, markup),
  map_(map),
  dtd_(dtd)
{
  elements.swap(elements_);
}

StartSubsetEvent::StartSubsetEvent(Type type,
				   const StringC &name,
				   const ConstPtr<Entity> &entity,
				   Boolean hasInternalSubset,
				   const Location &loc,
				   Markup *markup)
: name_(name), entity_(entity), hasInternalSubset_(hasInternalSubset),
  MarkupEvent(type, loc, markup)
{
}

StartDtdEvent::StartDtdEvent(const StringC &name,
			     const ConstPtr<Entity> &entity,
			     Boolean hasInternalSubset,
			     const Location &loc,
			     Markup *markup)
: StartSubsetEvent(startDtd, name, entity, hasInternalSubset, loc, markup)
{
}

StartLpdEvent::StartLpdEvent(Boolean active,
			     const StringC &name,
			     const ConstPtr<Entity> &entity,
			     Boolean hasInternalSubset,
			     const Location &loc,
			     Markup *markup)
: StartSubsetEvent(startLpd, name, entity, hasInternalSubset, loc, markup),
  active_(active)
{
}

EndDtdEvent::EndDtdEvent(const ConstPtr<Dtd> &dtd,
			 const Location &loc,
			 Markup *markup)
:  MarkupEvent(endDtd, loc, markup), dtd_(dtd)
{
}

EndLpdEvent::EndLpdEvent(const ConstPtr<Lpd> &lpd,
			 const Location &loc,
			 Markup *markup)
:  MarkupEvent(endLpd, loc, markup), lpd_(lpd)
{
}

EndPrologEvent::EndPrologEvent(const ConstPtr<Dtd> &dtd,
			       const ConstPtr<ComplexLpd> &lpd,
			       Vector<StringC> &simpleLinkNames,
			       Vector<AttributeList> &simpleLinkAttributes,
			       const Location &location)
: LocatedEvent(endProlog, location), dtd_(dtd), lpd_(lpd)
{
  simpleLinkAttributes.swap(simpleLinkAttributes_);
  simpleLinkNames.swap(simpleLinkNames_);
}

EndPrologEvent::EndPrologEvent(const ConstPtr<Dtd> &dtd,
			       const Location &location)
: LocatedEvent(endProlog, location), dtd_(dtd)
{
}

SgmlDeclEvent::SgmlDeclEvent(const ConstPtr<Sd> &sd,
			     const ConstPtr<Syntax> &syntax)

: sd_(sd), prologSyntax_(syntax), instanceSyntax_(syntax),
  nextIndex_(0), MarkupEvent(sgmlDecl)
{
}

SgmlDeclEvent::SgmlDeclEvent(const ConstPtr<Sd> &sd,
			     const ConstPtr<Syntax> &prologSyntax,
			     const ConstPtr<Syntax> &instanceSyntax,
			     const ConstPtr<Sd> &refSd,
			     const ConstPtr<Syntax> &refSyntax,
			     Index nextIndex,
			     const StringC &implySystemId,
			     const Location &loc,
			     Markup *markup)
: sd_(sd), prologSyntax_(prologSyntax), instanceSyntax_(instanceSyntax),
  refSd_(refSd), refSyntax_(refSyntax),
  nextIndex_(nextIndex), implySystemId_(implySystemId),
  MarkupEvent(sgmlDecl, loc, markup)
{
}

CommentDeclEvent::CommentDeclEvent(const Location &loc,
				   Markup *markup)
: MarkupEvent(commentDecl, loc, markup)
{
}

SSepEvent::SSepEvent(const Char *p, size_t length,
		     const Location &location, Boolean copy)
: ImmediateDataEvent(sSep, p, length, location, copy)
{
}

IgnoredRsEvent::IgnoredRsEvent(Char c, const Location &location)
: LocatedEvent(ignoredRs, location), c_(c)
{
}

IgnoredReEvent::IgnoredReEvent(Char c, const Location &location,
			       unsigned long serial)
: LocatedEvent(ignoredRe, location),
  c_(c),
  serial_(serial)
{
}

ReOriginEvent::ReOriginEvent(Char c, const Location &location,
			     unsigned long serial)
: LocatedEvent(reOrigin, location), c_(c), serial_(serial)
{
}


IgnoredCharsEvent::IgnoredCharsEvent(const Char *p, size_t length,
				     const Location &location, Boolean copy)
: ImmediateDataEvent(ignoredChars, p, length, location, copy)
{
}

MarkedSectionEvent::MarkedSectionEvent(Type type, Status status,
				       const Location &loc,
				       Markup *markup)
: MarkupEvent(type, loc, markup),
  status_(status)
{
}

MarkedSectionStartEvent::MarkedSectionStartEvent(Status status,
						 const Location &loc,
						 Markup *markup)
: MarkedSectionEvent(markedSectionStart, status, loc, markup)
{
}

MarkedSectionEndEvent::MarkedSectionEndEvent(Status status,
					     const Location &loc,
					     Markup *markup)
: MarkedSectionEvent(markedSectionEnd, status, loc, markup)
{
}

EntityStartEvent::EntityStartEvent(const ConstPtr<EntityOrigin> &origin)
: Event(entityStart), origin_(origin)
{
}

EntityEndEvent::EntityEndEvent(const Location &location)
: LocatedEvent(entityEnd, location)
{
}

EntityDeclEvent:: EntityDeclEvent(const ConstPtr<Entity> &entity,
				  Boolean ignored, const Location &loc,
				  Markup *markup)
: MarkupEvent(entityDecl, loc, markup),
  entity_(entity),
  ignored_(ignored)
{
}

NotationDeclEvent:: NotationDeclEvent(const ConstPtr<Notation> &notation,
				      const Location &loc,
				      Markup *markup)
: MarkupEvent(notationDecl, loc, markup), notation_(notation)
{
}

ElementDeclEvent::ElementDeclEvent(Vector<const ElementType *> &elements,
				   const ConstPtr<Dtd> &dtd,
				   const Location &loc,
				   Markup *markup)
: MarkupEvent(elementDecl, loc, markup), dtd_(dtd)
{
  elements.swap(elements_);
}

AttlistDeclEvent::AttlistDeclEvent(Vector<const ElementType *> &elements,
				   const ConstPtr<Dtd> &dtd,
				   const Location &loc,
				   Markup *markup)
: MarkupEvent(attlistDecl, loc, markup), dtd_(dtd)
{
  elements.swap(elements_);
}

AttlistNotationDeclEvent::AttlistNotationDeclEvent(
  Vector<ConstPtr<Notation> > &notations, const Location &loc,
						   Markup *markup)
: MarkupEvent(attlistNotationDecl, loc, markup)
{
  notations.swap(notations_);
}

LinkAttlistDeclEvent
::LinkAttlistDeclEvent(Vector<const ElementType *> &elements,
		       const ConstPtr<Lpd> &lpd,
		       const Location &loc,
		       Markup *markup)
: MarkupEvent(linkAttlistDecl, loc, markup), lpd_(lpd)
{
  elements.swap(elements_);
}

LinkDeclEvent::LinkDeclEvent(const LinkSet *linkSet,
			     const ConstPtr<ComplexLpd> &lpd,
			     const Location &loc,
			     Markup *markup)
: MarkupEvent(linkDecl, loc, markup), lpd_(lpd), linkSet_(linkSet)
{
}

IdLinkDeclEvent::IdLinkDeclEvent(const ConstPtr<ComplexLpd> &lpd,
				 const Location &loc,
				 Markup *markup)
: MarkupEvent(linkDecl, loc, markup), lpd_(lpd)
{
}

ShortrefDeclEvent::ShortrefDeclEvent(const ShortReferenceMap *map,
				     const ConstPtr<Dtd> &dtd,
				     const Location &loc,
				     Markup *markup)
: MarkupEvent(shortrefDecl, loc, markup), map_(map), dtd_(dtd)
{
}

IgnoredMarkupEvent::IgnoredMarkupEvent(const Location &loc,
				       Markup *markup)
: MarkupEvent(ignoredMarkup, loc, markup)
{
}

EntityDefaultedEvent::EntityDefaultedEvent(const ConstPtr<Entity> &entity,
					   const Location &loc)
: LocatedEvent(entityDefaulted, loc), entity_(entity)
{
}

SgmlDeclEntityEvent::  SgmlDeclEntityEvent(const PublicId &publicId,
					   PublicId::TextClass entityType,
					   const StringC &effectiveSystemId,
					   const Location &loc)
: LocatedEvent(sgmlDeclEntity, loc), publicId_(publicId),
  entityType_(entityType), effectiveSystemId_(effectiveSystemId)
{
}

EventHandler::~EventHandler()
{
}

// By default, do nothing when an input opens or closes.
void EventHandler::inputClosed(InputSource *in) {}

void EventHandler::inputOpened(InputSource *in) {}

EventQueue::EventQueue()
{
}

#define EVENT(c, f) \
  void EventHandler::f(c *event) { delete event; } \
  void EventQueue::f(c *event) { append(event); } \
  void c::handle(EventHandler &handler) { handler.f(this); }
#include "events.h"
#undef EVENT

Pass1EventHandler::Pass1EventHandler()
: hadError_(0), origHandler_(0)
{
}

void Pass1EventHandler::init(EventHandler *origHandler)
{
  hadError_ = 0;
  origHandler_ = origHandler;
}

void Pass1EventHandler::message(MessageEvent *event)
{
  if (event->message().isError()) {
    hadError_ = 1;
    origHandler_->message(event);
  }
  else
    IQueue<Event>::append(event);
}

#ifdef SP_NAMESPACE
}
#endif
