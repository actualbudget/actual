// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef Attribute_INCLUDED
#define Attribute_INCLUDED 1
#ifdef __GNUG__
#pragma interface
#endif

#include <stddef.h>
#include "Resource.h"
#include "Owner.h"
#include "StringC.h"
#include "Vector.h"
#include "CopyOwner.h"
#include "Boolean.h"
#include "Text.h"
#include "Ptr.h"
#include "Message.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class Entity;
class Notation;
class DeclaredValue;
class AttributeValue;
class TokenizedAttributeValue;
class AttributeSemantics;
class AttributeContext;
class Syntax;

 class SP_API AttributeValue : public Resource {
 public:
   enum Type {
     implied,
     cdata,
     tokenized
   };
   AttributeValue();
   virtual ~AttributeValue();
   virtual AttributeSemantics *makeSemantics(const DeclaredValue *,
                                             AttributeContext &,
                                             const StringC &,
                                             unsigned &,
                                             unsigned &) const;
   virtual Type info(const Text *&, const StringC *&) const = 0;
   virtual const Text *text() const;
   virtual Boolean recoverUnquoted(const StringC &, const Location &,
                                   AttributeContext &, const StringC &);
   static Boolean handleAsUnterminated(const Text &, AttributeContext &);
 };

class SP_API AttributeDefinitionDesc {
public:
  AttributeDefinitionDesc() { }
  enum DeclaredValue {
    cdata,
    name,
    number,
    nmtoken,
    nutoken,
    entity,
    idref,
    names,
    numbers,
    nmtokens,
    nutokens,
    entities,
    idrefs,
    id,
    notation,
    nameTokenGroup
  };
  DeclaredValue declaredValue;
  enum DefaultValueType {
    required,
    current,
    implied,
    conref,
    defaulted,
    fixed
  };
  DefaultValueType defaultValueType;
  ConstPtr<AttributeValue> defaultValue;
  Vector<StringC> allowedValues;
  Vector<StringC> origAllowedValues;
  // Attribute definitions whose default value type is current and
  // which have the same currentIndex share current values.
  size_t currentIndex;
private:
  AttributeDefinitionDesc(const AttributeDefinitionDesc &); // undefined
  void operator=(const AttributeDefinitionDesc &);	    // undefined
};

class DeclaredValue {
public:
  DeclaredValue();
  virtual ~DeclaredValue();
  // This performs syntactic checking on the value.
  virtual AttributeValue *makeValue(Text &, AttributeContext &,
				    const StringC &name,
				    unsigned &specLength) const = 0;
  // This is used to avoid unnecessary syntactic checking in the
  // case where the attribute name and vi have been omitted.
  virtual AttributeValue *makeValueFromToken(Text &,
					     AttributeContext &,
					     const StringC &name,
					     unsigned &specLength) const;
  // This performs semantic checking on the value.
  virtual AttributeSemantics *makeSemantics(const TokenizedAttributeValue &,
					    AttributeContext &,
					    const StringC &,
					    unsigned &nIdrefs,
					    unsigned &nEntityNames) const;
  virtual Boolean containsToken(const StringC &) const;
  virtual Boolean tokenized() const = 0;
  virtual Boolean isNotation() const;
  virtual Boolean isEntity() const;
  virtual Boolean isId() const;
  virtual Boolean isIdref() const;
  virtual const Vector<StringC> *getTokens() const;
  virtual const Vector<StringC> *getOrigTokens() const;
  virtual void buildDesc(AttributeDefinitionDesc &) const = 0;
  virtual DeclaredValue *copy() const = 0;
};

class CdataDeclaredValue : public DeclaredValue {
public:
  CdataDeclaredValue();
  Boolean tokenized() const;
  AttributeValue *makeValue(Text &, AttributeContext &, const StringC &,
			    unsigned &) const;
  void buildDesc(AttributeDefinitionDesc &) const;
  DeclaredValue *copy() const;
protected:
  void checkNormalizedLength(Text &, AttributeContext &, unsigned &) const; 
};


class TokenizedDeclaredValue : public DeclaredValue {
public:
  // must be in same order as AttributeDefinitionDesc
  enum TokenType {
    name,
    number,
    nameToken,
    numberToken,
    entityName
  };
  TokenizedDeclaredValue(TokenType type, Boolean isList);
  AttributeValue *makeValue(Text &, AttributeContext &, const StringC &,
			    unsigned &) const;
  TokenizedAttributeValue *makeTokenizedValue(Text &, AttributeContext &,
					      const StringC &, unsigned &) const;
  Boolean tokenized() const;
  void buildDesc(AttributeDefinitionDesc &) const;
  DeclaredValue *copy() const;
private:
  TokenType type_;
  Boolean isList_;
  unsigned initialCategories_;
  unsigned subsequentCategories_;
};

class GroupDeclaredValue : public TokenizedDeclaredValue {
public:
  GroupDeclaredValue(TokenType, Vector<StringC> &);
  Boolean containsToken(const StringC &) const;
  AttributeValue *makeValue(Text &, AttributeContext &, const StringC &,
			    unsigned &) const;
  AttributeValue *makeValueFromToken(Text &,
				     AttributeContext &,
				     const StringC &name,
				     unsigned &) const;
  const Vector<StringC> *getTokens() const;
  const Vector<StringC> *getOrigTokens() const;
  void buildDesc(AttributeDefinitionDesc &) const;
  DeclaredValue *copy() const;
  void setOrigAllowedValues(Vector<StringC> &origAllowedValues);

private:
  Vector<StringC> allowedValues_;
  Vector<StringC> origAllowedValues_;
};

class NameTokenGroupDeclaredValue : public GroupDeclaredValue {
public:
  NameTokenGroupDeclaredValue(Vector<StringC> &);
  void buildDesc(AttributeDefinitionDesc &) const;
  DeclaredValue *copy() const;
};

class NotationDeclaredValue : public GroupDeclaredValue {
public:
  NotationDeclaredValue(Vector<StringC> &);
  AttributeSemantics *makeSemantics(const TokenizedAttributeValue &,
				    AttributeContext &,
				    const StringC &,
				    unsigned &nIdrefs,
				    unsigned &nEntityNames) const;
  Boolean isNotation() const;
  void buildDesc(AttributeDefinitionDesc &) const;
  DeclaredValue *copy() const;
};

class EntityDeclaredValue : public TokenizedDeclaredValue {
public:
  EntityDeclaredValue(Boolean isList);
  AttributeSemantics *makeSemantics(const TokenizedAttributeValue &,
				    AttributeContext &,
				    const StringC &,
				    unsigned &nIdrefs,
				    unsigned &nEntityNames) const;
  Boolean isEntity() const;
  DeclaredValue *copy() const;
};

class IdDeclaredValue : public TokenizedDeclaredValue {
public:
  IdDeclaredValue();
  AttributeSemantics *makeSemantics(const TokenizedAttributeValue &,
				    AttributeContext &,
				    const StringC &,
				    unsigned &nIdrefs,
				    unsigned &nEntityNames) const;
  Boolean isId() const;
  void buildDesc(AttributeDefinitionDesc &) const;
  DeclaredValue *copy() const;
};

class IdrefDeclaredValue : public TokenizedDeclaredValue {
public:
  IdrefDeclaredValue(Boolean isList);
  AttributeSemantics *makeSemantics(const TokenizedAttributeValue &,
				    AttributeContext &,
				    const StringC &,
				    unsigned &nIdrefs,
				    unsigned &nEntityNames) const;
  Boolean isIdref() const;
  void buildDesc(AttributeDefinitionDesc &) const;
  DeclaredValue *copy() const;
};

class SP_API AttributeDefinition {
public:
  AttributeDefinition(const StringC &, DeclaredValue *);
  virtual ~AttributeDefinition();
  virtual ConstPtr<AttributeValue>
    makeMissingValue(AttributeContext &) const = 0;
  virtual Boolean missingValueWouldMatch(const Text &,
					 const AttributeContext &) const;
  virtual const AttributeValue *
    defaultValue(const AttributeValue *impliedValue) const;
  AttributeValue *makeValue(Text &, AttributeContext &, unsigned &) const;
  AttributeValue *makeValueFromToken(Text &,
				     AttributeContext &,
				     unsigned &) const;

  virtual Boolean isConref() const;
  virtual Boolean isCurrent() const;
  virtual Boolean isFixed() const;
  AttributeSemantics *makeSemantics(const AttributeValue *,
				    AttributeContext &,
				    unsigned &nIdrefs,
				    unsigned &nEntityNames) const;
  Boolean tokenized() const;
  const StringC &name() const;
  const StringC &origName() const;
  Boolean containsToken(const StringC &) const;
  Boolean isNotation() const;
  Boolean isEntity() const;
  Boolean isId() const;
  Boolean isIdref() const;
  void getDesc(AttributeDefinitionDesc &) const;
  const Vector<StringC> *getTokens() const;
  const Vector<StringC> *getOrigTokens() const;
  virtual AttributeDefinition *copy() const = 0;
  void setDeclaredValue(DeclaredValue *);
  void setSpecified(Boolean implicit);
  Boolean isSpecified(Boolean &implicit);
  void setOrigName(StringC &origName);
private:
  virtual void buildDesc(AttributeDefinitionDesc &) const = 0;
  virtual AttributeValue *checkValue(AttributeValue *, AttributeContext &) const;
  PackedBoolean implicit_;
  PackedBoolean all_;
  StringC name_;
  StringC origName_;
  CopyOwner<DeclaredValue> declaredValue_;
};

class RequiredAttributeDefinition : public AttributeDefinition {
public:
  RequiredAttributeDefinition(const StringC &, DeclaredValue *);
  ConstPtr<AttributeValue> makeMissingValue(AttributeContext &) const;
  void buildDesc(AttributeDefinitionDesc &) const;
  AttributeDefinition *copy() const;
};

class CurrentAttributeDefinition : public AttributeDefinition {
public:
  CurrentAttributeDefinition(const StringC &, DeclaredValue *, size_t index);
  ConstPtr<AttributeValue> makeMissingValue(AttributeContext &) const;
  Boolean missingValueWouldMatch(const Text &, const AttributeContext &) const;
  AttributeValue *checkValue(AttributeValue *, AttributeContext &) const;
  void buildDesc(AttributeDefinitionDesc &) const;
  Boolean isCurrent() const;
  AttributeDefinition *copy() const;
private:
  size_t currentIndex_;
};

class ImpliedAttributeDefinition : public AttributeDefinition {
public:
  ImpliedAttributeDefinition(const StringC &, DeclaredValue *);
  ConstPtr<AttributeValue> makeMissingValue(AttributeContext &) const;
  const AttributeValue *defaultValue(const AttributeValue *) const;
  void buildDesc(AttributeDefinitionDesc &) const;
  AttributeDefinition *copy() const;
};

class ConrefAttributeDefinition : public ImpliedAttributeDefinition {
public:
  ConrefAttributeDefinition(const StringC &, DeclaredValue *);
  Boolean isConref() const;
  void buildDesc(AttributeDefinitionDesc &) const;
  AttributeDefinition *copy() const;
};

class DefaultAttributeDefinition : public AttributeDefinition {
public:
  DefaultAttributeDefinition(const StringC &, DeclaredValue *,
			     AttributeValue *);
  ConstPtr<AttributeValue> makeMissingValue(AttributeContext &) const;
  Boolean missingValueWouldMatch(const Text &, const AttributeContext &) const;
  void buildDesc(AttributeDefinitionDesc &) const;
  AttributeDefinition *copy() const;
  const AttributeValue *defaultValue(const AttributeValue *) const;
private:
  ConstPtr<AttributeValue> value_;
};

class FixedAttributeDefinition : public DefaultAttributeDefinition {
public:
  FixedAttributeDefinition(const StringC &, DeclaredValue *,
			   AttributeValue *);
  // check that it's equal to the default
  AttributeValue *checkValue(AttributeValue *, AttributeContext &) const;
  void buildDesc(AttributeDefinitionDesc &) const;
  Boolean isFixed() const;
  AttributeDefinition *copy() const;
};

class SP_API AttributeDefinitionList : public Resource {
public:
  AttributeDefinitionList(Vector<CopyOwner<AttributeDefinition> > &,
			  size_t listIndex,
			  Boolean anyCurrent = 0,
			  size_t idIndex = size_t(-1),
			  size_t notationIndex = size_t(-1));
  AttributeDefinitionList(const ConstPtr<AttributeDefinitionList> &);
  ~AttributeDefinitionList();
  size_t size() const;
  AttributeDefinition *def(size_t);
  const AttributeDefinition *def(size_t) const;
  Boolean tokenIndex(const StringC &, unsigned &) const;
  Boolean tokenIndexUnique(const StringC &, unsigned) const;
  Boolean attributeIndex(const StringC &, unsigned &) const;
  size_t index() const;
  size_t idIndex() const;
  size_t notationIndex() const;
  Boolean anyCurrent() const;
  void setIndex(size_t);
  void append(AttributeDefinition *);
private:
  Vector<CopyOwner<AttributeDefinition> > defs_;
  size_t index_;
  size_t idIndex_;		// -1 if no ID attribute
  size_t notationIndex_;	// -1 if no notation attribute
  Boolean anyCurrent_;
  ConstPtr<AttributeDefinitionList> prev_;
};

class AttributeSemantics {
public:
  AttributeSemantics();
  virtual ~AttributeSemantics();
  virtual size_t nEntities() const;
  virtual ConstPtr<Entity> entity(size_t) const;
  virtual ConstPtr<Notation> notation() const;
  virtual AttributeSemantics *copy() const = 0;
};

class EntityAttributeSemantics  : public AttributeSemantics {
public:
  EntityAttributeSemantics(Vector<ConstPtr<Entity> > &);
  size_t nEntities() const;
  ConstPtr<Entity> entity(size_t) const;
  AttributeSemantics *copy() const;
private:
  Vector<ConstPtr<Entity> > entity_;
};

class NotationAttributeSemantics : public AttributeSemantics {
public:
  NotationAttributeSemantics(const ConstPtr<Notation> &);
  ConstPtr<Notation> notation() const;
  AttributeSemantics *copy() const;
private:
  ConstPtr<Notation> notation_;
};

class SP_API ImpliedAttributeValue : public AttributeValue {
public:
  ImpliedAttributeValue();
  Type info(const Text *&, const StringC *&) const;
};

class CdataAttributeValue : public AttributeValue {
public:
  CdataAttributeValue(Text &);
  Type info(const Text *&, const StringC *&) const;
  const Text *text() const;
  Boolean recoverUnquoted(const StringC &, const Location &,
			  AttributeContext &, const StringC &);
  virtual const Notation *notation() const;
private:
  Text text_;
};


class TokenizedAttributeValue : public AttributeValue {
public:
  TokenizedAttributeValue(Text &, const Vector<size_t> &);
  size_t nTokens() const;
  AttributeSemantics *makeSemantics(const DeclaredValue *,
				    AttributeContext &,
				    const StringC &,
				    unsigned &,
				    unsigned &) const;
  Type info(const Text *&, const StringC *&) const;
  const Text *text() const;
  const StringC &string() const;
  StringC token(size_t) const;
  void token(size_t, const Char *&, size_t &) const;
  Location tokenLocation(size_t) const;
  Boolean tokenLocation(size_t, const ConstPtr<Origin> *&, Index &) const;
  Boolean recoverUnquoted(const StringC &, const Location &,
			  AttributeContext &, const StringC &);
private:
  TokenizedAttributeValue(const TokenizedAttributeValue &); // undefined
  void operator=(const TokenizedAttributeValue &);	    // undefined
  Text text_;
  // index into value of each space
  // length is number of tokens - 1
  Vector<size_t> spaceIndex_;
};

class SP_API Attribute {
public:
  Attribute();
  Attribute(const Attribute&);
  ~Attribute();
  Attribute& operator=(const Attribute&);
  Boolean specified() const;
  size_t specIndex() const;
  const AttributeValue *value() const;
  const ConstPtr<AttributeValue> &valuePointer() const;
  const AttributeSemantics *semantics() const;
  void setSpec(size_t);
  void setValue(const ConstPtr<AttributeValue> &);
  void setSemantics(AttributeSemantics *);
  void clear();
private:
  size_t specIndexPlus_;
  ConstPtr<AttributeValue> value_;
  CopyOwner<AttributeSemantics> semantics_;
};

class SP_API AttributeList  {
public:
  AttributeList();
  AttributeList(const ConstPtr<AttributeDefinitionList> &);
  inline ~AttributeList() {}
  void init(const ConstPtr<AttributeDefinitionList> &);
  // was a conref attribute specified?
  Boolean conref() const;
  size_t size() const;
  const StringC &name(unsigned) const;
  const AttributeValue *value(unsigned) const;
  size_t specIndex(size_t) const;
  const ConstPtr<AttributeValue> &valuePointer(unsigned) const;
  const AttributeSemantics *semantics(unsigned) const;
  Boolean tokenized(unsigned index) const;
  Boolean tokenIndex(const StringC &, unsigned &) const;
  Boolean tokenIndexUnique(const StringC &, unsigned) const;
  Boolean attributeIndex(const StringC &, unsigned &) const;
  void finish(AttributeContext &);
  Boolean setValue(unsigned index, Text &, AttributeContext &,
		   unsigned &specLength);
  void setValueToken(unsigned index, Text &, AttributeContext &,
		     unsigned &specLength);
  void setSpec(unsigned index, AttributeContext &);
  Boolean recoverUnquoted(const StringC &, const Location &,
			  AttributeContext &);
  Boolean handleAsUnterminated(AttributeContext &context);
  void swap(AttributeList &);
  size_t nSpec() const;
  size_t defIndex() const;
  // is the attribute #current
  Boolean current(unsigned) const;
  Boolean anyCurrent() const;
  Boolean specified(unsigned) const;
  Boolean id(unsigned) const;
  Boolean idref(unsigned) const;
  const Vector<StringC> *getAllowedTokens(unsigned) const;
  const StringC *getId() const;	// null if none
  Boolean idIndex(unsigned &) const;
  void noteInvalidSpec();
  void changeDef(const ConstPtr<AttributeDefinitionList> &);
  const ConstPtr<AttributeDefinitionList> &def() const;
private:
  const AttributeDefinition *def(size_t) const;
  PackedBoolean conref_;
  unsigned nIdrefs_;
  unsigned nEntityNames_;
  size_t nSpec_;
  Vector<Attribute> vec_;
  ConstPtr<AttributeDefinitionList> def_;
};

class DataDeclaredValue : public CdataDeclaredValue {
public:
  DataDeclaredValue(const ConstPtr<Notation> &, AttributeList &);
  AttributeValue *makeValue(Text &, AttributeContext &, const StringC &,
                            unsigned &) const;
  DeclaredValue *copy() const;
private:
  ConstPtr<Notation> notation_;
  AttributeList attributes_;
};

class SP_API DataAttributeValue : public CdataAttributeValue {
public:
  DataAttributeValue(Text &, const ConstPtr<Notation> &, const AttributeList &);
  const AttributeList &attributes() const;
  const Notation *notation() const;
private:
  const ConstPtr<Notation> notation_;
  const AttributeList *attributes_;
};

class SP_API AttributeContext : public Messenger {
public:
  AttributeContext();
  virtual ~AttributeContext();
  virtual Boolean defineId(const StringC &, const Location &, Location &);
  virtual void noteIdref(const StringC &, const Location &);
  virtual void noteCurrentAttribute(size_t, AttributeValue *);
  virtual ConstPtr<AttributeValue> getCurrentAttribute(size_t) const;
  virtual ConstPtr<Entity> getAttributeEntity(const StringC &,
					      const Location &);
  virtual ConstPtr<Notation> getAttributeNotation(const StringC &,
						  const Location &);
  virtual const Syntax &attributeSyntax() const = 0;

  ConstPtr<AttributeValue> makeImpliedAttributeValue();
  Boolean mayDefaultAttribute() const;
  Boolean validate() const;
protected:
  Boolean mayDefaultAttribute_;
  Boolean validate_;
private:
  ConstPtr<AttributeValue> impliedAttributeValue_;
};

inline
Boolean AttributeDefinition::tokenized() const
{
  return declaredValue_->tokenized();
}

inline
Boolean AttributeDefinition::isNotation() const
{
  return declaredValue_->isNotation();
}

inline
Boolean AttributeDefinition::isEntity() const
{
  return declaredValue_->isEntity();
}

inline
Boolean AttributeDefinition::isId() const
{
  return declaredValue_->isId();
}

inline
Boolean AttributeDefinition::isIdref() const
{
  return declaredValue_->isIdref();
}

inline
const Vector<StringC> *AttributeDefinition::getTokens() const
{
  return declaredValue_->getTokens();
}

inline
const Vector<StringC> *AttributeDefinition::getOrigTokens() const
{
  return declaredValue_->getOrigTokens();
}

inline
AttributeSemantics *
AttributeDefinition::makeSemantics(const AttributeValue *value,
				   AttributeContext &context,
				   unsigned &nIdrefs,
				   unsigned &nEntityNames) const
{
  return value->makeSemantics(declaredValue_.pointer(), context, name_,
			      nIdrefs, nEntityNames);
}

inline
AttributeValue *AttributeDefinition::makeValue(Text &text,
					       AttributeContext &context,
					       unsigned &specLength) const
{
  return checkValue(declaredValue_->makeValue(text, context, name_,
					      specLength),
		    context);
}

inline
AttributeValue *
AttributeDefinition::makeValueFromToken(Text &text,
					AttributeContext &context,
					unsigned &specLength) const
{
  return checkValue(declaredValue_->makeValueFromToken(text, context,
						       name_, specLength),
		    context);
}

inline
Boolean AttributeDefinition::containsToken(const StringC &token) const
{
  return declaredValue_->containsToken(token);
}

inline
const StringC &AttributeDefinition::name() const
{
  return name_;
}

inline
const StringC &AttributeDefinition::origName() const
{
  return origName_;
}

inline
void AttributeDefinition::setDeclaredValue(DeclaredValue *declaredValue)
{
  declaredValue_ = declaredValue;
}

inline
size_t AttributeDefinitionList::size() const
{
  return defs_.size();
}

inline
size_t AttributeDefinitionList::index() const
{
  return index_;
}

inline
void AttributeDefinitionList::setIndex(size_t index)
{
  index_ = index;
}

inline
size_t AttributeDefinitionList::idIndex() const
{
  return idIndex_;
}

inline
size_t AttributeDefinitionList::notationIndex() const
{
  return notationIndex_;
}

inline
Boolean AttributeDefinitionList::anyCurrent() const
{
  return anyCurrent_;
}

inline
AttributeDefinition *AttributeDefinitionList::def(size_t i)
{
  return defs_[i].pointer();
}

inline
const AttributeDefinition *AttributeDefinitionList::def(size_t i) const
{
  return defs_[i].pointer();
}

inline
size_t TokenizedAttributeValue::nTokens() const
{
  return spaceIndex_.size() + 1;
}

inline
const StringC &TokenizedAttributeValue::string() const
{
  return text_.string();
}

inline
void TokenizedAttributeValue::token(size_t i,
				    const Char *&ptr, size_t &len) const
{
  size_t startIndex = i == 0 ? 0 : spaceIndex_[i - 1] + 1;
  ptr = text_.string().data() + startIndex;
  len = (i == spaceIndex_.size() ? text_.size() : spaceIndex_[i]) - startIndex;
}

inline
StringC TokenizedAttributeValue::token(size_t i) const
{
  const Char *ptr;
  size_t len;
  token(i, ptr, len);
  return StringC(ptr, len);
}


inline
Location TokenizedAttributeValue::tokenLocation(size_t i) const
{
  return text_.charLocation(i == 0 ? 0 : spaceIndex_[i - 1] + 1);
}

inline
Boolean TokenizedAttributeValue::tokenLocation(size_t i,
					       const ConstPtr<Origin> *&origin,
					       Index &index) const
{
  return text_.charLocation(i == 0 ? 0 : spaceIndex_[i - 1] + 1, origin, index);
}

inline
size_t Attribute::specIndex() const
{
  return specIndexPlus_ - 1;
}

inline
Boolean Attribute::specified() const
{
  return specIndexPlus_ != 0;
}

inline
const AttributeValue *Attribute::value() const
{
  return value_.pointer();
}

inline
const ConstPtr<AttributeValue> &Attribute::valuePointer() const
{
  return value_;
}

inline
const AttributeSemantics *Attribute::semantics() const
{
  return semantics_.pointer();
}

inline
void Attribute::setSpec(size_t index)
{
  specIndexPlus_ = index + 1;
}

inline
void Attribute::setValue(const ConstPtr<AttributeValue> &value)
{
  value_ = value;
}

inline
void Attribute::setSemantics(AttributeSemantics *semantics)
{
  semantics_ = semantics;
}

inline
size_t AttributeList::size() const
{
  return vec_.size();
}

inline
const AttributeDefinition *AttributeList::def(size_t i) const
{
  return def_->def(i);
}

inline
const ConstPtr<AttributeDefinitionList> &AttributeList::def() const
{
  return def_;
}

inline
Boolean AttributeList::tokenized(unsigned i) const
{
  return def(i)->tokenized();
}

inline
Boolean AttributeList::tokenIndex(const StringC &name, unsigned &index) const
{
  return !def_.isNull() && def_->tokenIndex(name, index);
}

inline
Boolean AttributeList::tokenIndexUnique(const StringC &name, unsigned index) const
{
  return def_->tokenIndexUnique(name, index);
}

inline
Boolean AttributeList::attributeIndex(const StringC &name, unsigned &index) const
{
  return !def_.isNull() && def_->attributeIndex(name, index);
}

inline
const StringC &AttributeList::name(unsigned i) const
{
  return def(i)->name();
}

inline
const Vector<StringC> *AttributeList::getAllowedTokens(unsigned i) const
{
  return def(i)->getTokens();
}

inline
const AttributeValue *AttributeList::value(unsigned i) const
{
  return vec_[i].value();
}

inline
const ConstPtr<AttributeValue> &AttributeList::valuePointer(unsigned i)
     const
{
  return vec_[i].valuePointer();
}

inline
const AttributeSemantics *AttributeList::semantics(unsigned i) const
{
  return vec_[i].semantics();
}

inline
size_t AttributeList::specIndex(size_t i) const
{
  return vec_[i].specIndex();
}

inline
size_t AttributeList::nSpec() const
{
  return nSpec_;
}

inline
Boolean AttributeList::conref() const
{
  return conref_;
}

inline
size_t AttributeList::defIndex() const
{
  return def_.isNull() ? size_t(-1) : def_->index();
}

inline
Boolean AttributeList::current(unsigned i) const
{
  return def(i)->isCurrent();
}

inline
Boolean AttributeList::anyCurrent() const
{
  return !def_.isNull() && def_->anyCurrent();
}

inline
const AttributeValue *
DefaultAttributeDefinition::defaultValue(const AttributeValue *)
     const
{
  return value_.pointer();
}

inline
Boolean AttributeList::idIndex(unsigned &ind) const
{
  if (def_.isNull() || def_->idIndex() == size_t(-1))
    return 0;
  else {
    ind = def_->idIndex();
    return 1;
  }
}

inline
Boolean AttributeList::id(unsigned i) const
{
  return def(i)->isId();
}

inline
Boolean AttributeList::idref(unsigned i) const
{
  return def(i)->isIdref();
}

inline
Boolean AttributeList::specified(unsigned i) const
{
  return vec_[i].specified();
}

inline
Boolean AttributeContext::mayDefaultAttribute() const
{
  return mayDefaultAttribute_;
}

inline
Boolean AttributeContext::validate() const
{
  return validate_;
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not Attribute_INCLUDED */
