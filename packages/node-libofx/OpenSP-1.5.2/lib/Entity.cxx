// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif
#include "splib.h"
#include "Entity.h"
#include "ParserState.h"
#include "macros.h"
#include "InternalInputSource.h"
#include "MessageArg.h"
#include "ParserMessages.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

Entity::Entity(const StringC &name, DeclType declType, DataType dataType,
	       const Location &defLocation)
: EntityDecl(name, declType, dataType, defLocation),
  used_(0), defaulted_(0)
{
}

void Entity::generateSystemId(ParserState &)
{
}

InternalEntity::InternalEntity(const StringC &name,
			       DeclType declType,
			       DataType dataType,
			       const Location &defLocation,
			       Text &text)
: Entity(name, declType, dataType, defLocation)
{
  text.swap(text_);
}

PiEntity::PiEntity(const StringC &name, DeclType declType,
		   const Location &defLocation, Text &text)
: InternalEntity(name, declType, pi, defLocation, text)
{
}

Entity *PiEntity::copy() const
{
  return new PiEntity(*this);
}

InternalDataEntity::InternalDataEntity(const StringC &name, DataType dataType,
				       const Location &defLocation, Text &text)
: InternalEntity(name, generalEntity, dataType, defLocation, text)
{
}


InternalCdataEntity::InternalCdataEntity(const StringC &name,
					 const Location &defLocation,
					 Text &text)
: InternalDataEntity(name, cdata, defLocation, text)
{
}

Entity *InternalCdataEntity::copy() const
{
  return new InternalCdataEntity(*this);
}

InternalSdataEntity::InternalSdataEntity(const StringC &name,
					 const Location &defLocation,
					 Text &text)
: InternalDataEntity(name, sdata, defLocation, text)
{
}

Entity *InternalSdataEntity::copy() const
{
  return new InternalSdataEntity(*this);
}

InternalTextEntity::InternalTextEntity(const StringC &name, DeclType declType,
				       const Location &defLocation, Text &text,
				       Bracketed bracketed)
: InternalEntity(name, declType, sgmlText, defLocation, text),
  bracketed_(bracketed)
{
}

Entity *InternalTextEntity::copy() const
{
  return new InternalTextEntity(*this);
}


ExternalEntity::ExternalEntity(const StringC &name,
			       DeclType declType,
			       DataType dataType,
			       const Location &defLocation,
			       const ExternalId &id)
: Entity(name, declType, dataType, defLocation), externalId_(id)
{
}

const ExternalEntity *ExternalEntity::asExternalEntity() const
{
  return this;
}

const StringC *ExternalEntity::systemIdPointer() const
{
  return externalId_.systemIdString();
}

const StringC *ExternalEntity::effectiveSystemIdPointer() const
{
  if (externalId_.effectiveSystemId().size() > 0)
    return &externalId_.effectiveSystemId();
  return 0;
}

const StringC *ExternalEntity::publicIdPointer() const
{
  return externalId_.publicIdString();
}

void ExternalEntity::generateSystemId(ParserState &parser)
{
  StringC str;
  if (parser.entityCatalog().lookup(*this,
				    parser.syntax(),
				    parser.sd().docCharset(),
				    parser.messenger(),
				    str))
    externalId_.setEffectiveSystem(str);
  // Don't generate warning when declType == sgml.
  else if (externalId_.publicIdString()) {
    if (declType() != sgml)
      parser.message(ParserMessages::cannotGenerateSystemIdPublic,
		     StringMessageArg(*externalId_.publicIdString()));
  }
  else {
    switch (declType()) {
    case generalEntity:
      parser.message(ParserMessages::cannotGenerateSystemIdGeneral,
		     StringMessageArg(name()));
      break;
    case parameterEntity:
      parser.message(ParserMessages::cannotGenerateSystemIdParameter,
		     StringMessageArg(name()));
      break;
    case doctype:
      parser.message(ParserMessages::cannotGenerateSystemIdDoctype,
		     StringMessageArg(name()));
      break;
    case linktype:
      parser.message(ParserMessages::cannotGenerateSystemIdLinktype,
		     StringMessageArg(name()));
      break;
    case sgml:
      break;
    default:
      CANNOT_HAPPEN();
    }
  }
}

ExternalTextEntity::ExternalTextEntity(const StringC &name,
				       DeclType declType,
				       const Location &defLocation,
				       const ExternalId &id)
: ExternalEntity(name, declType, sgmlText, defLocation, id)
{
}

Entity *ExternalTextEntity::copy() const
{
  return new ExternalTextEntity(*this);
}

ExternalNonTextEntity::ExternalNonTextEntity(const StringC &name,
					     DeclType declType,
					     DataType dataType,
					     const Location &defLocation,
					     const ExternalId &id)
: ExternalEntity(name, declType, dataType, defLocation, id)
{
}

ExternalDataEntity::ExternalDataEntity(const StringC &name,
				       DataType dataType,
				       const Location &defLocation,
				       const ExternalId &id,
				       const ConstPtr<Notation> &nt,
				       AttributeList &attributes,
				       DeclType declType)
: ExternalNonTextEntity(name, declType, dataType, defLocation, id),
  notation_(nt)
{
  attributes.swap(attributes_);
}

void ExternalDataEntity::setNotation(const ConstPtr<Notation> &notation,
				     AttributeList &attributes)
{
  notation_ = notation;
  attributes.swap(attributes_);
}

Entity *ExternalDataEntity::copy() const
{
  return new ExternalDataEntity(*this);
}

SubdocEntity::SubdocEntity(const StringC &name,
			   const Location &defLocation,
			   const ExternalId &id)
: ExternalNonTextEntity(name, generalEntity, subdoc, defLocation, id)
{
}

Entity *SubdocEntity::copy() const
{
  return new SubdocEntity(*this);
}

Boolean Entity::isDataOrSubdoc() const
{
  return 0;
}

Boolean Entity::isCharacterData() const
{
  return 0;
}

const ExternalEntity *Entity::asExternalEntity() const
{
  return 0;
}

const ExternalDataEntity *Entity::asExternalDataEntity() const
{
  return 0;
}

const SubdocEntity *Entity::asSubdocEntity() const
{
  return 0;
}

const InternalEntity *Entity::asInternalEntity() const
{
  return 0;
}

void Entity::dsReference(ParserState &parser,
			 const Ptr<EntityOrigin> &origin)
     const
{
  normalReference(parser, origin, 1);
}

void Entity::declReference(ParserState &parser,
			   const Ptr<EntityOrigin> &origin)
     const
{
  normalReference(parser, origin, 0);
  if (parser.currentMarkup())
    parser.currentMarkup()->addEntityStart(origin);
}

void Entity::contentReference(ParserState &parser,
			      const Ptr<EntityOrigin> &origin)
     const
{
  normalReference(parser, origin, 1);
}

void Entity::rcdataReference(ParserState &parser,
			   const Ptr<EntityOrigin> &origin)
     const
{
  normalReference(parser, origin, 1);
}

void Entity::litReference(Text &, ParserState &parser,
			  const Ptr<EntityOrigin> &origin,
			  Boolean)
     const
{
  normalReference(parser, origin, 0);
}

const InternalEntity *InternalEntity::asInternalEntity() const
{
  return this;
}

void PiEntity::litReference(Text &, ParserState &parser,
			    const Ptr<EntityOrigin> &,
			    Boolean) const
{
  parser.message(ParserMessages::piEntityReference);
}

void PiEntity::normalReference(ParserState &parser,
			       const Ptr<EntityOrigin> &origin,
			       Boolean) const
{
  parser.noteMarkup();
  parser.eventHandler().pi(new (parser.eventAllocator())
			   PiEntityEvent(this, origin.pointer()));
}

void PiEntity::declReference(ParserState &parser,
			     const Ptr<EntityOrigin> &) const
{
  parser.message(ParserMessages::piEntityReference);
}

void PiEntity::rcdataReference(ParserState &parser,
			       const Ptr<EntityOrigin> &) const
{
  parser.message(ParserMessages::piEntityRcdata);
}

void InternalDataEntity::declReference(ParserState &parser,
				       const Ptr<EntityOrigin> &) const
{
  parser.message(ParserMessages::internalDataEntityReference);
}

Boolean InternalDataEntity::isDataOrSubdoc() const
{
  return 1;
}

void InternalCdataEntity::normalReference(ParserState &parser,
					  const Ptr<EntityOrigin> &origin,
					  Boolean) const
{
  checkRef(parser);
  checkEntlvl(parser);
  if (string().size() > 0) {
    parser.noteData();
    parser.eventHandler().data(new (parser.eventAllocator())
			       CdataEntityEvent(this, origin.pointer()));
  }
}

Boolean InternalCdataEntity::isCharacterData() const
{
  return string().size() > 0;
}

void InternalCdataEntity::litReference(Text &text,
				       ParserState &parser,
				       const Ptr<EntityOrigin> &origin,
				       Boolean squeeze) const
{
  checkRef(parser);
  checkEntlvl(parser);
  if (squeeze) {
    Location loc(origin.pointer(), 0);
    text.addEntityStart(loc);
    text.addCharsTokenize(text_.string(), loc, parser.syntax().space());
    loc += text_.size();
    text.addEntityEnd(loc);
  }
  else
    text.addCdata(string(), origin.pointer());
}


void InternalSdataEntity::normalReference(ParserState &parser,
					  const Ptr<EntityOrigin> &origin,
					  Boolean) const
{
  checkRef(parser);
  checkEntlvl(parser);
  parser.noteData();
  parser.eventHandler().sdataEntity(new (parser.eventAllocator())
				    SdataEntityEvent(this,
						     origin.pointer()));
}

Boolean InternalSdataEntity::isCharacterData() const
{
  return 1;
}

void InternalSdataEntity::litReference(Text &text,
				       ParserState &parser,
				       const Ptr<EntityOrigin> &origin,
				       Boolean squeeze) const
{
  checkRef(parser);
  checkEntlvl(parser);
  if (squeeze) {
    Location loc(origin.pointer(), 0);
    text.addEntityStart(loc);
    text.addCharsTokenize(text_.string(), loc, parser.syntax().space());
    loc += text_.size();
    text.addEntityEnd(loc);
  }
  else
    text.addSdata(string(), origin.pointer());
}

void InternalTextEntity::normalReference(ParserState &parser,
					 const Ptr<EntityOrigin> &origin,
					 Boolean generateEvent) const
{
  checkRef(parser);
  checkEntlvl(parser);
  if (checkNotOpen(parser)) {
    if (generateEvent && parser.wantMarkup())
      parser.eventHandler().entityStart(new (parser.eventAllocator())
					EntityStartEvent(origin));
    parser.pushInput(new (parser.internalAllocator())
		     InternalInputSource(text_.string(), origin.pointer()));
  }
}

void InternalTextEntity::litReference(Text &text,
				      ParserState &parser,
				      const Ptr<EntityOrigin> &origin,
				      Boolean) const
{
  text.addEntityStart(Location(origin.pointer(), 0));
  normalReference(parser, origin, 0);
}

void ExternalTextEntity::normalReference(ParserState &parser,
					 const Ptr<EntityOrigin> &origin,
					 Boolean generateEvent) const
{
  checkRef(parser);
  checkEntlvl(parser);
  if (checkNotOpen(parser)) {
    if (generateEvent && parser.wantMarkup())
      parser.eventHandler().entityStart(new (parser.eventAllocator())
					EntityStartEvent(origin));
    if (externalId().effectiveSystemId().size())
      parser.pushInput(parser.entityManager()
		       .open(externalId().effectiveSystemId(),
			     parser.sd().docCharset(),
			     origin.pointer(),
			     0,
			     parser.messenger()));
    else
      parser.message(ParserMessages::nonExistentEntityRef,
		     StringMessageArg(name()),
		     defLocation());
  }
}

void ExternalTextEntity::litReference(Text &text,
				      ParserState &parser,
				      const Ptr<EntityOrigin> &origin,
				      Boolean) const
{
  if (parser.options().warnAttributeValueExternalEntityRef
      && declType() == generalEntity)
    parser.message(ParserMessages::attributeValueExternalEntityRef);
  text.addEntityStart(Location(origin.pointer(), 0));
  normalReference(parser, origin, 0);
}

const ExternalDataEntity *ExternalDataEntity::asExternalDataEntity() const
{
  return this;
}

void ExternalDataEntity::contentReference(ParserState &parser,
					  const Ptr<EntityOrigin> &origin) const
{
  if (parser.options().warnExternalDataEntityRef)
    parser.message(ParserMessages::externalDataEntityRef);
  checkRef(parser);
  checkEntlvl(parser);
  parser.noteData();
  parser.eventHandler().externalDataEntity(new (parser.eventAllocator())
					   ExternalDataEntityEvent(this, origin.pointer()));
}

Boolean ExternalNonTextEntity::isDataOrSubdoc() const
{
  return 1;
}

Boolean ExternalNonTextEntity::isCharacterData() const
{
  return 1;
}


void ExternalNonTextEntity::dsReference(ParserState &parser,
					const Ptr<EntityOrigin> &) const
{
  parser.message(ParserMessages::dtdDataEntityReference);
}

void ExternalNonTextEntity::normalReference(ParserState &parser,
					    const Ptr<EntityOrigin> &,
					    Boolean) const
{
  parser.message(ParserMessages::externalNonTextEntityReference);
}

void ExternalNonTextEntity::litReference(Text &,
					 ParserState &parser,
					 const Ptr<EntityOrigin> &,
					 Boolean) const
{
  parser.message(ParserMessages::externalNonTextEntityRcdata);
}

void ExternalNonTextEntity::rcdataReference(ParserState &parser,
					    const Ptr<EntityOrigin> &) const
{
  parser.message(ParserMessages::externalNonTextEntityRcdata);
}

void SubdocEntity::contentReference(ParserState &parser,
				    const Ptr<EntityOrigin> &origin) const
{
  checkRef(parser);
  checkEntlvl(parser);
  parser.noteData();
  parser.eventHandler().subdocEntity(new (parser.eventAllocator())
				     SubdocEntityEvent(this, origin.pointer()));
}

const SubdocEntity *SubdocEntity::asSubdocEntity() const
{
  return this;
}

IgnoredEntity::IgnoredEntity(const StringC &name, DeclType declType)
: Entity(name, declType, sgmlText, Location())
{
}

Entity *IgnoredEntity::copy() const
{
  return new IgnoredEntity(*this);
}

void IgnoredEntity::declReference(ParserState &parser,
				  const Ptr<EntityOrigin> &origin)
     const
{
  if (parser.currentMarkup()) {
    parser.currentMarkup()->addEntityStart(origin);
    parser.currentMarkup()->addEntityEnd();
  }
}

void IgnoredEntity::litReference(Text &text,
				 ParserState &,
				 const Ptr<EntityOrigin> &origin,
				 Boolean) const
{
  text.addEntityStart(Location(origin.pointer(), 0));
  text.addEntityEnd(Location(origin.pointer(), 0));
}

void IgnoredEntity::normalReference(ParserState &parser,
				    const Ptr<EntityOrigin> &origin,
				    Boolean generateEvent) const
{
  if (generateEvent && parser.wantMarkup()) {
    parser.eventHandler().entityStart(new (parser.eventAllocator())
				      EntityStartEvent(origin));
    Location loc(origin.pointer(), 0);
    parser.eventHandler().entityEnd(new (parser.eventAllocator())
				    EntityEndEvent(loc));
  }
}

void Entity::checkEntlvl(ParserState &parser)
{
  // -1 because document entity isn't counted
  if (parser.inputLevel() - 1 == parser.syntax().entlvl())
    parser.message(ParserMessages::entlvl, 
                   NumberMessageArg(parser.syntax().entlvl()));
}

Boolean Entity::checkNotOpen(ParserState &parser) const
{
  if (parser.entityIsOpen(this)) {
    parser.message(ParserMessages::recursiveEntityReference,
		   StringMessageArg(name()));
    return 0;
  }
  return 1;
}

void InternalEntity::checkRef(ParserState &parser) const
{
  if (parser.sd().entityRef() == Sd::entityRefNone)
    parser.message(ParserMessages::entityRefNone);
}

void ExternalEntity::checkRef(ParserState &parser) const
{
  if (parser.sd().entityRef() != Sd::entityRefAny)
    parser.message(ParserMessages::entityRefInternal);
}

void PredefinedEntity::checkRef(ParserState &parser) const
{
}

void Entity::checkRef(ParserState &parser) const
{
}


#ifdef SP_NAMESPACE
}
#endif
