// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef Entity_INCLUDED
#define Entity_INCLUDED 1
#ifdef __GNUG__
#pragma interface
#endif

#include "types.h"
#include "StringC.h"
#include "NamedResource.h"
#include "Location.h"
#include "Owner.h"
#include "Attribute.h"
#include "ExternalId.h"
#include "Text.h"
#include "SubstTable.h"
#include "StringResource.h"
#include "Allocator.h"
#include "EntityDecl.h"
#include "Markup.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class Messenger;
class InputSource;
class EntityOrigin;
class ParserState;
class ExternalEntity;
class ExternalDataEntity;
class SubdocEntity;
class InternalEntity;
class Notation;

class SP_API Entity : public EntityDecl {
public:
  Entity(const StringC &name, DeclType declType, DataType dataType,
	 const Location &defLocation);
  // reference in a literal
  virtual void litReference(Text &, ParserState &,
			    const Ptr<EntityOrigin> &,
			    Boolean squeezeSpaces)
    const;
  // reference in a declaration
  virtual void declReference(ParserState &,
			     const Ptr<EntityOrigin> &)
    const;
  // reference in a declaration subset
  virtual void dsReference(ParserState &,
			   const Ptr<EntityOrigin> &)
    const;
  // reference in content
  virtual void contentReference(ParserState &,
				const Ptr<EntityOrigin> &)
    const;
  // reference in rcdata
  virtual void rcdataReference(ParserState &,
			       const Ptr<EntityOrigin> &)
    const;
  // for entity name attribute checking
  virtual Boolean isDataOrSubdoc() const;
  // for determining whether we need to validate as character data
  virtual Boolean isCharacterData() const;
  virtual const ExternalDataEntity *asExternalDataEntity() const;
  virtual const SubdocEntity *asSubdocEntity() const;
  virtual const InternalEntity *asInternalEntity() const;
  virtual const ExternalEntity *asExternalEntity() const;
  // needed for default entity
  virtual Entity *copy() const = 0;
  virtual void generateSystemId(ParserState &);
  void setUsed();
  Boolean used() const;
  void setDefaulted();
  Boolean defaulted() const;
protected:
  virtual void checkRef(ParserState &) const;
  static void checkEntlvl(ParserState &);
  Boolean checkNotOpen(ParserState &) const;
private:
  virtual void normalReference(ParserState &,
			       const Ptr<EntityOrigin> &,
			       Boolean generateEvent) const = 0;
  PackedBoolean used_;
  PackedBoolean defaulted_;
};

class SP_API InternalEntity : public Entity {
public:
  InternalEntity(const StringC &, DeclType declType, DataType dataType,
		 const Location &, Text &);
  const StringC &string() const;
  const Text &text() const;
  const InternalEntity *asInternalEntity() const;
protected:
  void checkRef(ParserState &) const;
  Text text_;
};

class SP_API PiEntity : public InternalEntity {
public:
  PiEntity(const StringC &, DeclType, const Location &, Text &);
  void litReference(Text &, ParserState &,
		    const Ptr<EntityOrigin> &,
		    Boolean) const;
  void normalReference(ParserState &,
		       const Ptr<EntityOrigin> &,
		       Boolean) const;
  void declReference(ParserState &,
		     const Ptr<EntityOrigin> &) const;
  void rcdataReference(ParserState &,
		       const Ptr<EntityOrigin> &) const;
  Entity *copy() const;
};

class SP_API InternalDataEntity : public InternalEntity {
public:
  InternalDataEntity(const StringC &, DataType, const Location &, Text &);
  void declReference(ParserState &,
		     const Ptr<EntityOrigin> &) const;
  Boolean isDataOrSubdoc() const;
};

class SP_API InternalCdataEntity : public InternalDataEntity {
public:
  InternalCdataEntity(const StringC &, const Location &, Text &);
  void normalReference(ParserState &,
		       const Ptr<EntityOrigin> &,
		       Boolean) const;
  void litReference(Text &, ParserState &,
		    const Ptr<EntityOrigin> &,
		    Boolean) const;
  Entity *copy() const;
  Boolean isCharacterData() const;
};

class SP_API PredefinedEntity : public InternalCdataEntity {
public:
  PredefinedEntity(const StringC &s, const Location &l, Text &t)
   : InternalCdataEntity(s,l,t) { }
protected:
  void checkRef(ParserState &) const;
};

class SP_API InternalSdataEntity : public InternalDataEntity {
public:
  InternalSdataEntity(const StringC &, const Location &, Text &);
  void normalReference(ParserState &,
		       const Ptr<EntityOrigin> &,
		       Boolean) const;
  void litReference(Text &, ParserState &,
		    const Ptr<EntityOrigin> &,
		    Boolean) const;
  Entity *copy() const;
  Boolean isCharacterData() const;
};

class SP_API InternalTextEntity : public InternalEntity {
public:
  enum Bracketed {
    none,
    starttag,
    endtag,
    ms,
    md
    };
  InternalTextEntity(const StringC &, DeclType, const Location &, Text &,
		     Bracketed);
  Entity *copy() const;
private:
  void normalReference(ParserState &,
		       const Ptr<EntityOrigin> &,
		       Boolean) const;
  void litReference(Text &, ParserState &,
		    const Ptr<EntityOrigin> &,
		    Boolean) const;
  Bracketed bracketed_;
};

class SP_API ExternalEntity : public Entity {
public:
  ExternalEntity(const StringC &, DeclType, DataType, const Location &,
		 const ExternalId &);
  const ExternalId &externalId() const;
  const ExternalEntity *asExternalEntity() const;
  void generateSystemId(ParserState &);
  const StringC *systemIdPointer() const;
  const StringC *effectiveSystemIdPointer() const;
  const StringC *publicIdPointer() const;
protected:
  void checkRef(ParserState &) const;
private:
  ExternalId externalId_;
};

class SP_API ExternalTextEntity : public ExternalEntity {
public:
  ExternalTextEntity(const StringC &, DeclType, const Location &,
		     const ExternalId &);
  Entity *copy() const;
private:
  void normalReference(ParserState &,
		       const Ptr<EntityOrigin> &,
		       Boolean) const;
  void litReference(Text &, ParserState &,
		    const Ptr<EntityOrigin> &,
		    Boolean) const;
};

class SP_API ExternalNonTextEntity : public ExternalEntity {
public:
  ExternalNonTextEntity(const StringC &, DeclType, DataType,
			const Location &, const ExternalId &);
  Boolean isDataOrSubdoc() const;
  void litReference(Text &, ParserState &,
		    const Ptr<EntityOrigin> &,
		    Boolean) const;
  void rcdataReference(ParserState &,
		       const Ptr<EntityOrigin> &) const;
  void normalReference(ParserState &,
		       const Ptr<EntityOrigin> &,
		       Boolean) const;
  void dsReference(ParserState &,
		   const Ptr<EntityOrigin> &) const;
  Boolean isCharacterData() const;
};

class SP_API ExternalDataEntity : public ExternalNonTextEntity {
public:
  ExternalDataEntity(const StringC &, DataType, const Location &,
		     const ExternalId &, const ConstPtr<Notation> &,
		     AttributeList &, DeclType = generalEntity);
  const AttributeList &attributes() const;
  const Notation *notation() const;
  const ExternalDataEntity *asExternalDataEntity() const;
  Entity *copy() const;
  void contentReference(ParserState &,
			const Ptr<EntityOrigin> &) const;
  void setNotation(const ConstPtr<Notation>  &, AttributeList &);
private:
  ConstPtr<Notation> notation_;
  AttributeList attributes_;
};

class SP_API SubdocEntity : public ExternalNonTextEntity {
public:
  SubdocEntity(const StringC &, const Location &, const ExternalId &);
  const SubdocEntity *asSubdocEntity() const;
  Entity *copy() const;
  void contentReference(ParserState &,
			const Ptr<EntityOrigin> &) const;
private:
};

class SP_API IgnoredEntity : public Entity {
public:
  IgnoredEntity(const StringC &, DeclType declType);
  Entity *copy() const;
  void litReference(Text &, ParserState &,
		    const Ptr<EntityOrigin> &,
		    Boolean squeezeSpaces) const;
  void declReference(ParserState &,
		     const Ptr<EntityOrigin> &) const;
private:
  void normalReference(ParserState &,
		       const Ptr<EntityOrigin> &,
		       Boolean generateEvent) const;
};

class SP_API EntityOrigin : public InputSourceOrigin {
public:
  virtual ~EntityOrigin();
  static EntityOrigin *make(Allocator &, const ConstPtr<Entity> &);
  static EntityOrigin *make(Allocator &,
			    const ConstPtr<Entity> &,
			    const Location &refLocation);
  static EntityOrigin *make(Allocator &,
			    const ConstPtr<Entity> &,
			    const Location &refLocation,
			    Index refLength,
			    Owner<Markup> &markup);
  static EntityOrigin *make(const ConstPtr<Entity> &,
			    const Location &refLocation,
			    Index refLength,
			    Owner<Markup> &markup);
  static EntityOrigin *make(const ConstPtr<Entity> &,
			    const Location &refLocation);
  static const size_t allocSize;
};

inline
Boolean Entity::used() const
{
  return used_;
}

inline
void Entity::setUsed()
{
  used_ = 1;
}

inline
Boolean Entity::defaulted() const
{
  return defaulted_;
}

inline
void Entity::setDefaulted()
{
  defaulted_ = 1;
}

inline
const StringC &InternalEntity::string() const
{
  return text_.string();
}

inline
const Text &InternalEntity::text() const
{
  return text_;
}

inline
const ExternalId &ExternalEntity::externalId() const
{
  return externalId_;
}

inline
const AttributeList &ExternalDataEntity::attributes() const
{
  return attributes_;
}

inline
const Notation *ExternalDataEntity::notation() const
{
  return notation_.pointer();
}


#ifdef SP_NAMESPACE
}
#endif

#endif /* not Entity_INCLUDED */
