// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef Event_INCLUDED
#define Event_INCLUDED 1
#ifdef __GNUG__
#pragma interface
#endif

#include "Link.h"
#include "Allocator.h"
#include "Location.h"
#include "Vector.h"
#include "Owner.h"
#include "Boolean.h"
#include "types.h"
#include "Ptr.h"
#include "StringC.h"
#include "Notation.h"
#include "Sd.h"
#include "Syntax.h"
#include "Dtd.h"
#include "ElementType.h"
#include "Text.h"
#include "Lpd.h"
#include "Message.h"
#include "Markup.h"
#include "ShortReferenceMap.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class EventHandler;

class SP_API Event : public Link {
public:
  enum Type {
    message,
    characterData,
    startElement,
    endElement,
    pi,
    sdataEntity,
    externalDataEntity,
    subdocEntity,
    nonSgmlChar,
    appinfo,
    startDtd,
    endDtd,
    startLpd,
    endLpd,
    endProlog,
    sgmlDecl,
    uselink,
    usemap,
    commentDecl,
    sSep,
    ignoredRs,
    ignoredRe,
    reOrigin,
    ignoredChars,
    markedSectionStart,
    markedSectionEnd,
    entityStart,
    entityEnd,
    notationDecl,
    entityDecl,
    elementDecl,
    attlistDecl,		// not #NOTATION and not in LPD
    attlistNotationDecl,
    linkAttlistDecl,
    linkDecl,
    idLinkDecl,
    shortrefDecl,
    ignoredMarkup,
    entityDefaulted,
    sgmlDeclEntity
    };
  Event(Type);
  virtual ~Event();
  virtual void handle(EventHandler &) = 0;
  virtual void copyData();
  void *operator new(size_t sz, Allocator &alloc) { return alloc.alloc(sz); }
  void *operator new(size_t sz) { return Allocator::allocSimple(sz); }
  void operator delete(void *p) { Allocator::free(p); }
#ifdef SP_HAVE_PLACEMENT_OPERATOR_DELETE
  void operator delete(void *p, Allocator &) { Allocator::free(p); }
#endif
  Type type() const;
private:
  Event(const Event &);		// undefined
  void operator=(const Event &); // undefined
  Type type_;
};

class LocatedEvent : public Event {
public:
  LocatedEvent(Type type, const Location &);
  const Location &location() const;
private:
  LocatedEvent(const LocatedEvent &); // undefined
  void operator=(const LocatedEvent &);	// undefined
  Location location_;
};

class MarkupEvent : public LocatedEvent {
public:
  MarkupEvent(Type type);
  MarkupEvent(Type type, const Location &, Markup *);
  const Markup &markup() const;
private:
  MarkupEvent(const MarkupEvent &); // undefined
  void operator=(const MarkupEvent &);	// undefined
  Markup markup_;
};

class SP_API MessageEvent : public Event {
public:
  MessageEvent(Message &);
  MessageEvent(const Message &);
  ~MessageEvent();
  const Message &message() const;
  void handle(EventHandler &);
private:
  MessageEvent(const MessageEvent &); // undefined
  void operator=(const MessageEvent &);	// undefined
  Message message_;
};

class AttributeList;

class StartElementEvent : public LocatedEvent {
public:
  StartElementEvent(const ElementType *,
		    const ConstPtr<Dtd> &,
		    AttributeList *,
		    const Location &,
		    Markup *);
  ~StartElementEvent();
  void handle(EventHandler &);
  Boolean mustOmitEnd() const;
  void setIncluded();
  Boolean included() const;
  const StringC &name() const;
  const ElementType *elementType() const;
  const Markup *markupPtr() const;
  const AttributeList &attributes() const;
  void copyData();
private:
  StartElementEvent(const StartElementEvent &);	// undefined
  void operator=(const StartElementEvent &);	// undefined
  const ElementType *elementType_;
  ConstPtr<Dtd> dtd_;
  PackedBoolean included_;
  PackedBoolean copied_;	// has copyData() been called
  Markup *markup_;
  AttributeList *attributes_;
};

class EndElementEvent : public LocatedEvent {
public:
  EndElementEvent(const ElementType *,
		  const ConstPtr<Dtd> &,
		  const Location &,
		  Markup *);
  ~EndElementEvent();
  void handle(EventHandler &);
  void setIncluded();
  Boolean included() const;
  const StringC &name() const;
  const ElementType *elementType() const;
  const Markup *markupPtr() const;
  void copyData();
private:
  EndElementEvent(const EndElementEvent &); // undefined
  void operator=(const EndElementEvent &);  // undefined
  const ElementType *elementType_;
  ConstPtr<Dtd> dtd_;
  PackedBoolean included_;
  PackedBoolean copied_;	// has copyData() been called
  Markup *markup_;
};

class DataEvent : public LocatedEvent {
public:
  DataEvent(Type, const Char *, size_t, const Location &);
  void handle(EventHandler &);
  const Char *data() const;
  size_t dataLength() const;
  virtual Boolean isRe(unsigned long &serial) const;
  virtual const Entity *entity() const;
protected:
  const Char *p_;
  size_t length_;
private:
  DataEvent(const DataEvent &);	// undefined
  void operator=(const DataEvent &); // undefined
};

class ImmediateDataEvent : public DataEvent {
public:
  ImmediateDataEvent(Type type, const Char *, size_t, const Location &,
		     Boolean copy);
  ~ImmediateDataEvent();
  void copyData();
private:
  ImmediateDataEvent(const ImmediateDataEvent &); // undefined
  void operator=(const ImmediateDataEvent &);	  // undefined
  Char *alloc_;
};

class InternalDataEntity;

class DataEntityEvent : public DataEvent {
public:
  DataEntityEvent(Type type, const InternalEntity *,
		  const ConstPtr<Origin> &);
  const Entity *entity() const;
private:
  DataEntityEvent(const DataEntityEvent &); // undefined
  void operator=(const DataEntityEvent &);  // undefined
};

class InternalCdataEntity;

class CdataEntityEvent : public DataEntityEvent {
public:
  CdataEntityEvent(const InternalEntity *,
		   const ConstPtr<Origin> &);
private:
  CdataEntityEvent(const CdataEntityEvent &); // undefined
  void operator=(const CdataEntityEvent &);   // undefined
};

class InternalSdataEntity;

class SdataEntityEvent : public DataEntityEvent {
public:
  SdataEntityEvent(const InternalEntity *,
		   const ConstPtr<Origin> &);
  void handle(EventHandler &);
private:
  SdataEntityEvent(const SdataEntityEvent &); // undefined
  void operator=(const SdataEntityEvent &);   // undefined
};

class PiEntity;

class PiEvent : public LocatedEvent {
public:
  PiEvent(const Char *, size_t, const Location &);
  const Char *data() const;
  size_t dataLength() const;
  virtual const Entity *entity() const;
  void handle(EventHandler &);
private:
  PiEvent(const PiEvent &);	// undefined
  void operator=(const PiEvent &); // undefined
  const Char *data_;
  size_t dataLength_;
};

class ImmediatePiEvent : public PiEvent {
public:
  ImmediatePiEvent(StringC &, const Location &);
private:
  ImmediatePiEvent(const ImmediatePiEvent &); // undefined
  void operator=(const ImmediatePiEvent &);   // undefined
  StringC string_;
};

class PiEntityEvent : public PiEvent {
public:
  PiEntityEvent(const PiEntity *entity,
		const ConstPtr<Origin> &origin);
  const Entity *entity() const;
private:
  PiEntityEvent(const PiEntityEvent &);	// undefined
  void operator=(const PiEntityEvent &); // undefined
};

class ExternalNonTextEntity;
class ExternalDataEntity;
class SubdocEntity;

class ExternalEntityEvent : public Event {
public:
  ExternalEntityEvent(Type type,
		      const ConstPtr<EntityOrigin> &);
  const ConstPtr<EntityOrigin> &entityOrigin() const;
  const Location &location() const;
private:
  ExternalEntityEvent(const ExternalEntityEvent &); // undefined
  void operator=(const ExternalEntityEvent &);	    // undefined
  ConstPtr<EntityOrigin> origin_;
};

class ExternalDataEntityEvent : public ExternalEntityEvent {
public:
  ExternalDataEntityEvent(const ExternalDataEntity *,
			  const ConstPtr<EntityOrigin> &);
  void handle(EventHandler &);
  const ExternalDataEntity *entity() const;
private:
  ExternalDataEntityEvent(const ExternalDataEntityEvent &); // undefined
  void operator=(const ExternalDataEntityEvent &);	    // undefined
  const ExternalDataEntity *dataEntity_;
};

class SubdocEntityEvent : public ExternalEntityEvent {
public:
  SubdocEntityEvent(const SubdocEntity *,
		    const ConstPtr<EntityOrigin> &);
  void handle(EventHandler &);
  const SubdocEntity *entity() const;
private:
  SubdocEntityEvent(const SubdocEntityEvent &);	// undefined
  void operator=(const SubdocEntityEvent &);	// undefined
  const SubdocEntity *subdocEntity_;
};

class NonSgmlCharEvent : public LocatedEvent {
public:
  NonSgmlCharEvent(Char c, const Location &);
  Char character() const;
  void handle(EventHandler &);
private:
  NonSgmlCharEvent(const NonSgmlCharEvent &); // undefined
  void operator=(const NonSgmlCharEvent &);   // undefined
  Char c_;
};

class AppinfoEvent : public LocatedEvent {
public:
  AppinfoEvent(const Location &);
  AppinfoEvent(const Text &, const Location &);
  void handle(EventHandler &);
  Boolean literal(const StringC *&) const;
private:
  AppinfoEvent(const AppinfoEvent &); // undefined
  void operator=(const AppinfoEvent &);	// undefined
  Boolean appinfoNone_;
  Text appinfo_;
};

class UselinkEvent : public MarkupEvent {
public:
  UselinkEvent(const ConstPtr<Lpd> &,
	       const LinkSet *,
	       Boolean restore,
	       const Location &,
	       Markup *);
  void handle(EventHandler &);
  const ConstPtr<Lpd> &lpd() const;
  const LinkSet *linkSet() const;
  Boolean restore() const;
private:
  UselinkEvent(const UselinkEvent &); // undefined
  void operator=(const UselinkEvent &);	// undefined
  ConstPtr<Lpd> lpd_;
  const LinkSet *linkSet_;
  Boolean restore_;
};

class UsemapEvent : public MarkupEvent {
public:
  UsemapEvent(const ShortReferenceMap *,
	      Vector<const ElementType *> &,
	      const ConstPtr<Dtd> &,
	      const Location &,
	      Markup *);
  void handle(EventHandler &);
  const ShortReferenceMap *map() const;
  const Vector<const ElementType *> &elements() const;
private:
  UsemapEvent(const UsemapEvent &); // undefined
  void operator=(const UsemapEvent &); // undefined
  ConstPtr<Dtd> dtd_;
  Vector<const ElementType *> elements_;
  const ShortReferenceMap *map_;
};

class StartSubsetEvent : public MarkupEvent {
public:
  StartSubsetEvent(Type,
		   const StringC &,
		   const ConstPtr<Entity> &entity,
		   Boolean hasInternalSubset,
		   const Location &,
		   Markup *);
  const StringC &name() const;
  const ConstPtr<Entity> &entity() const;
  Boolean hasInternalSubset() const;
private:
  StartSubsetEvent(const StartSubsetEvent &);	// undefined
  void operator=(const StartSubsetEvent &); // undefined
  StringC name_;
  ConstPtr<Entity> entity_;
  Boolean hasInternalSubset_;
};

class StartDtdEvent : public StartSubsetEvent {
public:
  StartDtdEvent(const StringC &,
		const ConstPtr<Entity> &entity,
		Boolean hasInternalSubset,
		const Location &,
		Markup *);
  void handle(EventHandler &);
private:
  StartDtdEvent(const StartDtdEvent &);	// undefined
  void operator=(const StartDtdEvent &); // undefined
};

class StartLpdEvent : public StartSubsetEvent {
public:
  StartLpdEvent(Boolean active,
		const StringC &,
		const ConstPtr<Entity> &entity,
		Boolean hasInternalSubset,
		const Location &,
		Markup *);
  void handle(EventHandler &);
  Boolean active() const;
private:
  StartLpdEvent(const StartLpdEvent &);	// undefined
  void operator=(const StartLpdEvent &); // undefined
  Boolean active_;
};

class EndDtdEvent : public MarkupEvent {
public:
  EndDtdEvent(const ConstPtr<Dtd> &, const Location &,
	      Markup *);
  void handle(EventHandler &);
  const Dtd &dtd() const;
  const ConstPtr<Dtd> &dtdPointer() const;
private:
  EndDtdEvent(const EndDtdEvent &); // undefined
  void operator=(const EndDtdEvent &); // undefined
  ConstPtr<Dtd> dtd_;
};

class EndLpdEvent : public MarkupEvent {
public:
  EndLpdEvent(const ConstPtr<Lpd> &, const Location &,
	      Markup *);
  void handle(EventHandler &);
  const Lpd &lpd() const;
  const ConstPtr<Lpd> &lpdPointer() const;
private:
  EndLpdEvent(const EndLpdEvent &); // undefined
  void operator=(const EndLpdEvent &); // undefined
  ConstPtr<Lpd> lpd_;
};

class EndPrologEvent : public LocatedEvent {
public:
  EndPrologEvent(const ConstPtr<Dtd> &dtd,
		 const ConstPtr<ComplexLpd> &lpd,
		 Vector<StringC> &simpleLinkNames,
		 Vector<AttributeList> &simpleLinkAttributes,
		 const Location &);
  EndPrologEvent(const ConstPtr<Dtd> &dtd,
		 const Location &);
  void handle(EventHandler &);
  const Dtd &dtd() const;
  const ConstPtr<Dtd> &dtdPointer() const;
  const ConstPtr<ComplexLpd> &lpdPointer() const;
  const Vector<StringC> &simpleLinkNames() const;
  const Vector<AttributeList> &simpleLinkAttributes() const;
private:
  EndPrologEvent(const EndPrologEvent &); // undefined
  void operator=(const EndPrologEvent &); // undefined
  ConstPtr<Dtd> dtd_;
  ConstPtr<ComplexLpd> lpd_;
  Vector<StringC> simpleLinkNames_;
  Vector<AttributeList> simpleLinkAttributes_;
};

class SgmlDeclEvent : public MarkupEvent {
public:
  // for an implied SGML declaration
  SgmlDeclEvent(const ConstPtr<Sd> &,
		const ConstPtr<Syntax> &syntax);
  // for an explicit SGML declaration
  SgmlDeclEvent(const ConstPtr<Sd> &,
		const ConstPtr<Syntax> &syntax,
		const ConstPtr<Syntax> &instanceSyntax,
		const ConstPtr<Sd> &refSd,
		const ConstPtr<Syntax> &refSyntax,
		Index nextIndex,
		const StringC &implySystemId,
		const Location &,
		Markup *);
  void handle(EventHandler &);
  const Sd &sd() const;
  const ConstPtr<Sd> &sdPointer() const;
  const Syntax &prologSyntax() const;
  const ConstPtr<Syntax> &prologSyntaxPointer() const;
  const Syntax &instanceSyntax() const;
  const ConstPtr<Syntax> &instanceSyntaxPointer() const;
  const ConstPtr<Sd> &refSdPointer() const;
  const ConstPtr<Syntax> &refSyntaxPointer() const;
  const StringC &implySystemId() const;
private:
  SgmlDeclEvent(const SgmlDeclEvent &);	// undefined
  void operator=(const SgmlDeclEvent &); // undefined
  ConstPtr<Sd> sd_;
  ConstPtr<Syntax> prologSyntax_;
  ConstPtr<Syntax> instanceSyntax_;
  ConstPtr<Sd> refSd_;
  ConstPtr<Syntax> refSyntax_;
  Index nextIndex_;
  StringC implySystemId_;
};

class CommentDeclEvent : public MarkupEvent {
public:
  CommentDeclEvent(const Location &, Markup *);
  void handle(EventHandler &);
private:
  CommentDeclEvent(const CommentDeclEvent &); // undefined
  void operator=(const CommentDeclEvent &);   // undefined
};

class SSepEvent : public ImmediateDataEvent {
public:
  SSepEvent(const Char *, size_t, const Location &, Boolean copy);
  void handle(EventHandler &);
private:
  SSepEvent(const SSepEvent &);	// undefined
  void operator=(const SSepEvent &); // undefined
};

class IgnoredRsEvent : public LocatedEvent {
public:
  IgnoredRsEvent(Char c, const Location &);
  void handle(EventHandler &);
  Char rs() const;
private:
  IgnoredRsEvent(const IgnoredRsEvent &); // undefined
  void operator=(const IgnoredRsEvent &); // undefined
  Char c_;
};

class IgnoredReEvent : public LocatedEvent {
public:
  IgnoredReEvent(Char c, const Location &, unsigned long serial);
  void handle(EventHandler &);
  Char re() const;
  unsigned long serial() const;
private:
  IgnoredReEvent(const IgnoredReEvent &); // undefined
  void operator=(const IgnoredReEvent &); // undefined
  unsigned long serial_;
  Char c_;
};

class ReEvent : public ImmediateDataEvent {
public:
  ReEvent(const Char *, const Location &, unsigned long serial);
  Boolean isRe(unsigned long &serial) const;
private:
  ReEvent(const ReEvent &);	// undefined
  void operator=(const ReEvent &); // undefined
  unsigned long serial_;
};

class ReOriginEvent : public LocatedEvent {
public:
  ReOriginEvent(Char c, const Location &, unsigned long serial);
  void handle(EventHandler &);
  Char re() const;
  unsigned long serial() const;
private:
  ReOriginEvent(const ReOriginEvent &);	// undefined
  void operator=(const ReOriginEvent &); // undefined
  unsigned long serial_;
  Char c_;
};

class IgnoredCharsEvent : public ImmediateDataEvent {
public:
  IgnoredCharsEvent(const Char *, size_t, const Location &, Boolean copy);
  void handle(EventHandler &);
private:
  IgnoredCharsEvent(const IgnoredCharsEvent &);	// undefined
  void operator=(const IgnoredCharsEvent &);	// undefined
};

class MarkedSectionEvent : public MarkupEvent {
public:
  enum Status { include, rcdata, cdata, ignore }; // in priority order
  MarkedSectionEvent(Type, Status, const Location &, Markup *);
  Status status() const;
private:
  MarkedSectionEvent(const MarkedSectionEvent &); // undefined
  void operator=(const MarkedSectionEvent &);	  // undefined
  Status status_;
};

class MarkedSectionStartEvent : public MarkedSectionEvent {
public:
  MarkedSectionStartEvent(Status, const Location &, Markup *);
  void handle(EventHandler &);
private:
  MarkedSectionStartEvent(const MarkedSectionStartEvent &); // undefined
  void operator=(const MarkedSectionStartEvent &);	    // undefined
};

class MarkedSectionEndEvent : public MarkedSectionEvent {
public:
  MarkedSectionEndEvent(Status, const Location &, Markup *);
  void handle(EventHandler &);
private:
  MarkedSectionEndEvent(const MarkedSectionEndEvent &); // undefined
  void operator=(const MarkedSectionEndEvent &);	    // undefined
};

class EntityStartEvent : public Event {
public:
  EntityStartEvent(const ConstPtr<EntityOrigin> &origin);
  void handle(EventHandler &);
  const Entity *entity() const;
  const ConstPtr<EntityOrigin> &entityOrigin() const;
private:
  EntityStartEvent(const EntityStartEvent &); // undefined
  void operator=(const EntityStartEvent &); // undefined

  ConstPtr<EntityOrigin> origin_;
};

class EntityEndEvent : public LocatedEvent {
public:
  EntityEndEvent(const Location &);
  void handle(EventHandler &);
private:
  EntityEndEvent(const EntityEndEvent &); // undefined
  void operator=(const EntityEndEvent &); // undefined
};

class EntityDeclEvent : public MarkupEvent {
public:
  EntityDeclEvent(const ConstPtr<Entity> &,
		  Boolean ignored,
		  const Location &,
		  Markup *);
  void handle(EventHandler &);
  const Entity &entity() const;
  const ConstPtr<Entity> &entityPointer() const;
  Boolean ignored() const;
  // The name of the entity will be empty if this is the default entity.
private:
  Boolean ignored_;
  // This will actually point to an external entity.
  ConstPtr<Entity> entity_;
};

class NotationDeclEvent : public MarkupEvent {
public:
  NotationDeclEvent(const ConstPtr<Notation> &,
		    const Location &,
		    Markup *);
  void handle(EventHandler &);
  const Notation &notation() const;
  const ConstPtr<Notation> &notationPointer() const;
private:
  NotationDeclEvent(const NotationDeclEvent &);	// undefined
  void operator=(const NotationDeclEvent &);	// undefined
  ConstPtr<Notation> notation_;
};

class ElementDeclEvent : public MarkupEvent {
public:
  ElementDeclEvent(Vector<const ElementType *> &elements,
		   const ConstPtr<Dtd> &,
		   const Location &,
		   Markup *);
  void handle(EventHandler &);
  const Vector<const ElementType *> &elements() const;
private:
  ElementDeclEvent(const ElementDeclEvent &); // undefined
  void operator=(const ElementDeclEvent &);   // undefined
  Vector<const ElementType *> elements_;
  ConstPtr<Dtd> dtd_;
};

class AttlistDeclEvent : public MarkupEvent {
public:
  AttlistDeclEvent(Vector<const ElementType *> &elements,
		   const ConstPtr<Dtd> &,
		   const Location &,
		   Markup *);
  void handle(EventHandler &);
  const Vector<const ElementType *> &elements() const;
private:
  AttlistDeclEvent(const AttlistDeclEvent &); // undefined
  void operator=(const AttlistDeclEvent &);   // undefined
  Vector<const ElementType *> elements_;
  ConstPtr<Dtd> dtd_;
};

class AttlistNotationDeclEvent : public MarkupEvent {
public:
  AttlistNotationDeclEvent(Vector<ConstPtr<Notation> > &notations,
			   const Location &,
			   Markup *);
  void handle(EventHandler &);
  const Vector<ConstPtr<Notation> > &notations() const;
private:
  AttlistNotationDeclEvent(const AttlistNotationDeclEvent &); // undefined
  void operator=(const AttlistDeclEvent &);		      // undefined
  Vector<ConstPtr<Notation> > notations_;
};

class LinkAttlistDeclEvent : public MarkupEvent {
public:
  LinkAttlistDeclEvent(Vector<const ElementType *> &elements,
		       const ConstPtr<Lpd> &,
		       const Location &,
		       Markup *);
  void handle(EventHandler &);
  const Vector<const ElementType *> &elements() const;
  const Lpd &lpd() const;
private:
  LinkAttlistDeclEvent(const LinkAttlistDeclEvent &); // undefined
  void operator=(const LinkAttlistDeclEvent &);   // undefined
  Vector<const ElementType *> elements_;
  ConstPtr<Lpd> lpd_;
};

class LinkDeclEvent : public MarkupEvent {
public:
  LinkDeclEvent(const LinkSet *linkSet,
		const ConstPtr<ComplexLpd> &,
		const Location &,
		Markup *);
  void handle(EventHandler &);
  const LinkSet *linkSet() const;
  const ComplexLpd &lpd() const;
private:
  LinkDeclEvent(const LinkDeclEvent &); // undefined
  void operator=(const LinkDeclEvent &); // undefined
  const LinkSet *linkSet_;
  ConstPtr<ComplexLpd> lpd_;
};

class IdLinkDeclEvent : public MarkupEvent {
public:
  IdLinkDeclEvent(const ConstPtr<ComplexLpd> &,
		  const Location &,
		  Markup *);
  void handle(EventHandler &);
  const ComplexLpd &lpd() const;
private:
  IdLinkDeclEvent(const IdLinkDeclEvent &); // undefined
  void operator=(const IdLinkDeclEvent &); // undefined
  ConstPtr<ComplexLpd> lpd_;
};

class ShortrefDeclEvent : public MarkupEvent {
public:
  ShortrefDeclEvent(const ShortReferenceMap *,
		    const ConstPtr<Dtd> &,
		    const Location &,
		    Markup *);
  void handle(EventHandler &);
  const ShortReferenceMap *map() const;
private:
  ShortrefDeclEvent(const ShortrefDeclEvent &);	// undefined
  void operator=(const ShortrefDeclEvent &);	// undefined
  const ShortReferenceMap *map_;
  ConstPtr<Dtd> dtd_;
};

class IgnoredMarkupEvent : public MarkupEvent {
public:
  IgnoredMarkupEvent(const Location &, Markup *);
  void handle(EventHandler &);
private:
  IgnoredMarkupEvent(const IgnoredMarkupEvent &); // undefined
  void operator=(const IgnoredMarkupEvent &);	  // undefined
};

// This is for an undeclared entity whose first occurrence
// is in the instance, when there is a default entity:
// ie it extends the namespace of general entities after
// the end of the prolog.

class EntityDefaultedEvent : public LocatedEvent {
public:
  EntityDefaultedEvent(const ConstPtr<Entity> &,
		       const Location &);
  void handle(EventHandler &);
  const Entity &entity() const;
  const ConstPtr<Entity> &entityPointer() const;
private:
  EntityDefaultedEvent(const EntityDefaultedEvent &); // undefined
  void operator=(const EntityDefaultedEvent &);	      // undefined
  ConstPtr<Entity> entity_;
};

class SgmlDeclEntityEvent : public LocatedEvent {
public:
  SgmlDeclEntityEvent(const PublicId &publicId,
		      PublicId::TextClass entityType,
		      const StringC &effectiveSystemId,
		      const Location &);
  void handle(EventHandler &);
  const PublicId &publicId() const;
  PublicId::TextClass entityType() const;
  const StringC &effectiveSystemId() const;
private:
  SgmlDeclEntityEvent(const SgmlDeclEntityEvent &); // undefined
  void operator=(const SgmlDeclEntityEvent &);	    // undefined
  PublicId publicId_;
  PublicId::TextClass entityType_;
  StringC effectiveSystemId_;
};

class SP_API EventHandler {
public:
  virtual ~EventHandler();
  virtual void message(MessageEvent *) = 0;
  virtual void data(DataEvent *);
  virtual void startElement(StartElementEvent *);
  virtual void endElement(EndElementEvent *);
  virtual void pi(PiEvent *);
  virtual void sdataEntity(SdataEntityEvent *);
  virtual void externalDataEntity(ExternalDataEntityEvent *);
  virtual void subdocEntity(SubdocEntityEvent *);
  virtual void nonSgmlChar(NonSgmlCharEvent *);
  virtual void appinfo(AppinfoEvent *);
  virtual void uselink(UselinkEvent *);
  virtual void usemap(UsemapEvent *);
  virtual void startDtd(StartDtdEvent *);
  virtual void endDtd(EndDtdEvent *);
  virtual void startLpd(StartLpdEvent *);
  virtual void endLpd(EndLpdEvent *);
  virtual void endProlog(EndPrologEvent *);
  virtual void sgmlDecl(SgmlDeclEvent *);
  virtual void commentDecl(CommentDeclEvent *);
  virtual void sSep(SSepEvent *);
  virtual void ignoredRs(IgnoredRsEvent *);
  virtual void ignoredRe(IgnoredReEvent *);
  virtual void reOrigin(ReOriginEvent *);
  virtual void ignoredChars(IgnoredCharsEvent *);
  virtual void markedSectionStart(MarkedSectionStartEvent *);
  virtual void markedSectionEnd(MarkedSectionEndEvent *);
  virtual void entityStart(EntityStartEvent *);
  virtual void entityEnd(EntityEndEvent *);
  virtual void notationDecl(NotationDeclEvent *);
  virtual void entityDecl(EntityDeclEvent *);
  virtual void elementDecl(ElementDeclEvent *);
  virtual void attlistDecl(AttlistDeclEvent *);
  virtual void linkAttlistDecl(LinkAttlistDeclEvent *);
  virtual void attlistNotationDecl(AttlistNotationDeclEvent *);
  virtual void linkDecl(LinkDeclEvent *);
  virtual void idLinkDecl(IdLinkDeclEvent *);
  virtual void shortrefDecl(ShortrefDeclEvent *);
  virtual void ignoredMarkup(IgnoredMarkupEvent *);
  virtual void entityDefaulted(EntityDefaultedEvent *);
  virtual void inputClosed(InputSource *in);
  virtual void inputOpened(InputSource *in);
  virtual void sgmlDeclEntity(SgmlDeclEntityEvent *);
};

inline
Event::Event(Type type)
: type_(type)
{
}

inline
Event::~Event()
{
}

inline
Event::Type Event::type() const
{
  return type_;
}

inline
const Location &LocatedEvent::location() const
{
  return location_;
}

inline
const Markup &MarkupEvent::markup() const
{
  return markup_;
}

inline
const Message &MessageEvent::message() const
{
  return message_;
}

inline
const ElementType *StartElementEvent::elementType() const
{
  return elementType_;
}

inline
const StringC &StartElementEvent::name() const
{
  return elementType_->name();
}

inline
void StartElementEvent::setIncluded()
{
  included_ = 1;
}

inline
Boolean StartElementEvent::included() const
{
  return included_;
}

inline
const Markup *StartElementEvent::markupPtr() const
{
  return markup_;
}

inline
const AttributeList &StartElementEvent::attributes() const
{
  return *attributes_;
}

inline
Boolean StartElementEvent::mustOmitEnd() const
{
  return ((elementType()->definition()->declaredContent()
	   == ElementDefinition::empty)
	  ||  attributes_->conref());
}

inline
const ElementType *EndElementEvent::elementType() const
{
  return elementType_;
}

inline
const StringC &EndElementEvent::name() const
{
  return elementType_->name();
}

inline
void EndElementEvent::setIncluded()
{
  included_ = 1;
}

inline
Boolean EndElementEvent::included() const
{
  return included_;
}

inline
const Markup *EndElementEvent::markupPtr() const
{
  return markup_;
}

inline
const Char *DataEvent::data() const
{
  return p_;
}

inline
size_t DataEvent::dataLength() const
{
  return length_;
}

inline
const Char *PiEvent::data() const
{
  return data_;
}

inline
size_t PiEvent::dataLength() const
{
  return dataLength_;
}

inline
const ConstPtr<EntityOrigin> &
ExternalEntityEvent::entityOrigin() const
{
  return origin_;
}

inline
const Location &ExternalEntityEvent::location() const
{
  return origin_->parent();
}

inline
const ExternalDataEntity *ExternalDataEntityEvent::entity() const
{
  return dataEntity_;
}

inline
const SubdocEntity *SubdocEntityEvent::entity() const
{
  return subdocEntity_;
}

inline
Char NonSgmlCharEvent::character() const
{
  return c_;
}

inline
Boolean AppinfoEvent::literal(const StringC *&p) const
{
  if (appinfoNone_)
    return 0;
  p = &appinfo_.string();
  return 1;
}

inline
const ConstPtr<Lpd> &UselinkEvent::lpd() const
{
  return lpd_;
}

inline
const LinkSet *UselinkEvent::linkSet() const
{
  return linkSet_;
}

inline
Boolean UselinkEvent::restore() const
{
  return restore_;
}

inline
const ShortReferenceMap *UsemapEvent::map() const
{
  return map_;
}

inline
const StringC &StartSubsetEvent::name() const
{
  return name_;
}

inline
const ConstPtr<Entity> &StartSubsetEvent::entity() const
{
  return entity_;
}

inline
Boolean StartSubsetEvent::hasInternalSubset() const
{
  return hasInternalSubset_;
}

inline
Boolean StartLpdEvent::active() const
{
  return active_;
}

inline
const Dtd &EndDtdEvent::dtd() const
{
  return *dtd_;
}

inline
const ConstPtr<Dtd> &EndDtdEvent::dtdPointer() const
{
  return dtd_;
}

inline
const Lpd &EndLpdEvent::lpd() const
{
  return *lpd_;
}

inline
const ConstPtr<Lpd> &EndLpdEvent::lpdPointer() const
{
  return lpd_;
}

inline
const Dtd &EndPrologEvent::dtd() const
{
  return *dtd_;
}

inline
const ConstPtr<Dtd> &EndPrologEvent::dtdPointer() const
{
  return dtd_;
}

inline
const ConstPtr<ComplexLpd> &EndPrologEvent::lpdPointer() const
{
  return lpd_;
}

inline
const Vector<StringC> &EndPrologEvent::simpleLinkNames() const
{
  return simpleLinkNames_;
}

inline
const Vector<AttributeList> &EndPrologEvent::simpleLinkAttributes() const
{
  return simpleLinkAttributes_;
}

inline
const Sd &SgmlDeclEvent::sd() const
{
  return *sd_;
}

inline
const ConstPtr<Sd> &SgmlDeclEvent::sdPointer() const
{
  return sd_;
}

inline
const ConstPtr<Sd> &SgmlDeclEvent::refSdPointer() const
{
  return refSd_;
}

inline
const Syntax &SgmlDeclEvent::prologSyntax() const
{
  return *prologSyntax_;
}

inline
const ConstPtr<Syntax> &SgmlDeclEvent::prologSyntaxPointer() const
{
  return prologSyntax_;
}

inline
const Syntax &SgmlDeclEvent::instanceSyntax() const
{
  return *instanceSyntax_;
}

inline
const ConstPtr<Syntax> &SgmlDeclEvent::instanceSyntaxPointer() const
{
  return instanceSyntax_;
}

inline
const ConstPtr<Syntax> &SgmlDeclEvent::refSyntaxPointer() const
{
  return refSyntax_;
}

inline
const StringC &SgmlDeclEvent::implySystemId() const
{
  return implySystemId_;
}

inline
Char IgnoredRsEvent::rs() const
{
  return c_;
}

inline
Char IgnoredReEvent::re() const
{
  return c_;
}

inline
unsigned long IgnoredReEvent::serial() const
{
  return serial_;
}

inline
Char ReOriginEvent::re() const
{
  return c_;
}

inline
unsigned long ReOriginEvent::serial() const
{
  return serial_;
}

inline
MarkedSectionEvent::Status MarkedSectionEvent::status() const
{
  return status_;
}

inline
const Entity *EntityStartEvent::entity() const
{
  return origin_->entity();
}

inline
const ConstPtr<EntityOrigin> &
EntityStartEvent::entityOrigin() const
{
  return origin_;
}

inline
const ConstPtr<Entity> &EntityDeclEvent::entityPointer() const
{
  return entity_;
}

inline
const Entity &EntityDeclEvent::entity() const
{
  return *entity_;
}

inline
Boolean EntityDeclEvent::ignored() const
{
  return ignored_;
}

inline
const Notation &NotationDeclEvent::notation() const
{
  return *notation_;
}

inline
const ConstPtr<Notation> &NotationDeclEvent::notationPointer() const
{
  return notation_;
}

inline
const Vector<const ElementType *> &ElementDeclEvent::elements() const
{
  return elements_;
}

inline
const Vector<const ElementType *> &AttlistDeclEvent::elements() const
{
  return elements_;
}

inline
const Vector<const ElementType *> &LinkAttlistDeclEvent::elements() const
{
  return elements_;
}

inline
const Lpd &LinkAttlistDeclEvent::lpd() const
{
  return *lpd_;
}

inline
const LinkSet *LinkDeclEvent::linkSet() const
{
  return linkSet_;
}

inline
const ComplexLpd &LinkDeclEvent::lpd() const
{
  return *lpd_;
}

inline
const ComplexLpd &IdLinkDeclEvent::lpd() const
{
  return *lpd_;
}

inline
const Vector<ConstPtr<Notation> > &
AttlistNotationDeclEvent::notations() const
{
  return notations_;
}

inline
const ShortReferenceMap *ShortrefDeclEvent::map() const
{
  return map_;
}

inline
const Entity &EntityDefaultedEvent::entity() const
{
  return *entity_;
}

inline
const ConstPtr<Entity> &EntityDefaultedEvent::entityPointer()
     const
{
  return entity_;
}

inline
const PublicId &SgmlDeclEntityEvent::publicId() const
{
  return publicId_;
}

inline
PublicId::TextClass SgmlDeclEntityEvent::entityType() const
{
  return entityType_;
}

inline
const StringC &SgmlDeclEntityEvent::effectiveSystemId() const
{
  return effectiveSystemId_;
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not Event_INCLUDED */
