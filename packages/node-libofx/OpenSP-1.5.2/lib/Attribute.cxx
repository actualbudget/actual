// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif
#include "splib.h"
#include "Attribute.h"
#include "MessageArg.h"
#include "macros.h"
#include "ParserMessages.h"
#include "Syntax.h"
#include "Entity.h"
#include "Notation.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

DeclaredValue::DeclaredValue()
{
}

DeclaredValue::~DeclaredValue()
{
}

AttributeValue *DeclaredValue::makeValueFromToken(Text &text,
						  AttributeContext &context,
						  const StringC &name,
						  unsigned &specLength) const
{
  return makeValue(text, context, name, specLength);
}

AttributeSemantics *DeclaredValue::makeSemantics(const TokenizedAttributeValue &,
						 AttributeContext &,
						 const StringC &,
						 unsigned &,
						 unsigned &) const
{
  return 0;
}

Boolean DeclaredValue::containsToken(const StringC &) const
{
  return 0;
}

Boolean DeclaredValue::isNotation() const
{
  return 0;
}

Boolean DeclaredValue::isEntity() const
{
  return 0;
}

Boolean DeclaredValue::isId() const
{
  return 0;
}

Boolean DeclaredValue::isIdref() const
{
  return 0;
}

const Vector<StringC> *DeclaredValue::getTokens() const
{
  return 0;
}

const Vector<StringC> *DeclaredValue::getOrigTokens() const
{
  return 0;
}


CdataDeclaredValue::CdataDeclaredValue()
{
}

Boolean CdataDeclaredValue::tokenized() const
{
  return 0;
}

void CdataDeclaredValue::checkNormalizedLength(Text &text, 
                                               AttributeContext &context,
                                               unsigned &specLength) const
{
  const Syntax &syntax = context.attributeSyntax();
  size_t normsep = syntax.normsep();
  size_t normalizedLength = text.normalizedLength(normsep);
  specLength += normalizedLength;
  size_t litlen = syntax.litlen();
  // A length error will already have been given if
  // length > litlen - normsep.
  if (litlen >= normsep && text.size() <= litlen - normsep
      && normalizedLength > litlen)
    context.message(ParserMessages::normalizedAttributeValueLength,
		    NumberMessageArg(litlen),
		    NumberMessageArg(normalizedLength));
}

AttributeValue *CdataDeclaredValue::makeValue(Text &text, AttributeContext &context,
					      const StringC &,
					      unsigned &specLength) const
{
  checkNormalizedLength(text, context, specLength);
  return new CdataAttributeValue(text);
}

void CdataDeclaredValue::buildDesc(AttributeDefinitionDesc &desc) const
{
  desc.declaredValue = AttributeDefinitionDesc::cdata;
}

DeclaredValue *CdataDeclaredValue::copy() const
{
  return new CdataDeclaredValue(*this);
}

DataDeclaredValue::DataDeclaredValue(const ConstPtr<Notation> &nt,
                                     AttributeList &attributes)
: notation_(nt)
{
  attributes.swap(attributes_);
}

AttributeValue *DataDeclaredValue::makeValue(Text &text,
                                             AttributeContext &context,
                                             const StringC &,
                                             unsigned &specLength) const
{
  checkNormalizedLength(text, context, specLength);
  return new DataAttributeValue(text, notation_, attributes_);
}

DeclaredValue *DataDeclaredValue::copy() const
{
  return new DataDeclaredValue(*this);
}

TokenizedDeclaredValue::TokenizedDeclaredValue(TokenType type,
					       Boolean isList)
: type_(type), isList_(isList)
{
  switch (type) {
  case name:
  case entityName:
    initialCategories_ = Syntax::nameStartCategory;
    subsequentCategories_ = (Syntax::nameStartCategory|Syntax::digitCategory
			     | Syntax::otherNameCategory);
    break;
  case number:
    initialCategories_ = Syntax::digitCategory;
    subsequentCategories_ = Syntax::digitCategory;
    break;
  case nameToken:
    initialCategories_ = (Syntax::nameStartCategory|Syntax::digitCategory
			  | Syntax::otherNameCategory);
    subsequentCategories_ = initialCategories_;
    break;
  case numberToken:
    initialCategories_ = Syntax::digitCategory;
    subsequentCategories_ = (Syntax::nameStartCategory|Syntax::digitCategory
			     | Syntax::otherNameCategory);
    break;
  }
}

Boolean TokenizedDeclaredValue::tokenized() const
{
  return 1;
}

AttributeValue *TokenizedDeclaredValue::makeValue(Text &text,
						  AttributeContext &context,
						  const StringC &str,
						  unsigned &specLength) const
{
  return makeTokenizedValue(text, context, str, specLength);
}

TokenizedAttributeValue *
TokenizedDeclaredValue::makeTokenizedValue(Text &text,
					   AttributeContext &context,
					   const StringC &name,
					   unsigned &specLength) const
{
  Vector<size_t> spaceIndex;
  const Syntax &syntax = context.attributeSyntax();
  Char space = syntax.space();
  text.subst(*(type_ == entityName
	       ? syntax.entitySubstTable()
	       : syntax.generalSubstTable()),
	     space);
  const StringC &value = text.string();
  size_t i = 0;
  size_t length = value.size();

  for (;;) {
    if (i >= length) {
      // ends with a space (which would have to have been entered
      // via a numeric character reference)
      if (context.validate())
	context.message(ParserMessages::attributeValueSyntax);
      break;
    }
    size_t startIndex = i;
    if (context.validate()) {
      if (!(syntax.charCategory(value[i]) & initialCategories_)) {
        context.Messenger::setNextLocation(text.charLocation(i));
        Char c = value[i];
	if (!(syntax.charCategory(value[i]) & subsequentCategories_))
	  context.message(ParserMessages::attributeValueChar,
	                  StringMessageArg(StringC(&c, 1)),
	                  StringMessageArg(name));
	else if (initialCategories_ == Syntax::digitCategory)
	  context.message(ParserMessages::attributeValueNumberToken,
	                  StringMessageArg(StringC(&c, 1)),
	                  StringMessageArg(name));
	else
	  context.message(ParserMessages::attributeValueName,
	                  StringMessageArg(StringC(&c, 1)),
	                  StringMessageArg(name));
      }
      else {
	for (++i;
             i < length
	     && (syntax.charCategory(value[i]) & subsequentCategories_);
	     i++)
	  ;
	if (i < length && value[i] != space) {
	  Char c = value[i];
	  // character value[i] is not allowed anywhere in the value
	  context.Messenger::setNextLocation(text.charLocation(i));
	  context.message(ParserMessages::attributeValueChar,
		          StringMessageArg(StringC(&c, 1)),
		          StringMessageArg(name));
	}
      }
    }
    while (i < length && value[i] != space)
      i++;
    if (i - startIndex > syntax.namelen()) {
      context.Messenger::setNextLocation(text.charLocation(i));
      context.message(ParserMessages::nameTokenLength,
		      NumberMessageArg(syntax.namelen()));
    }
    if (i == length)
      break;
    if (!isList_ && context.validate() && spaceIndex.size() == 0) {
      context.Messenger::setNextLocation(text.charLocation(i));
      context.message(ParserMessages::attributeValueMultiple,
		      StringMessageArg(name));
    }
    spaceIndex.push_back(i);
    i++;
  }
  size_t normsep = syntax.normsep();
  size_t litlen = syntax.litlen();
  size_t normalizedLength = normsep + length;
  // should we count CDATA and SDATA entities here?
  if (isList_) {
    normalizedLength += 1;
    // length is now the number of characters in each token in the list
    // + 1 for each token in the list; so add normsep - 1 for each
    // token in the list.
    if (normsep > 0)
      normalizedLength += (normsep - 1)*(spaceIndex.size() + 1);
    else
      normalizedLength -= spaceIndex.size() + 1;
  }
  specLength += normalizedLength;
  // A length error will already have been given if
  // length > litlen - normsep.
  if (litlen >= normsep && length <= litlen - normsep
      && normalizedLength > litlen)
    context.message(ParserMessages::normalizedAttributeValueLength,
		    NumberMessageArg(litlen),
		    NumberMessageArg(normalizedLength));
  return new TokenizedAttributeValue(text, spaceIndex);
}

Boolean TokenizedAttributeValue::recoverUnquoted(const StringC &str,
						 const Location &strLoc,
						 AttributeContext &context,
						 const StringC &name)
{
  TextIter iter(text_);
  TextItem::Type type;
  const Char *s;
  size_t len;
  const Location *loc;
  if (iter.next(type, s, len, loc)
      && type == TextItem::data
      && len == text_.size()
      && loc->origin().pointer() == strLoc.origin().pointer()
      && loc->index() + len == strLoc.index()
      && !iter.next(type, s, len, loc)) {
    context.Messenger::setNextLocation(strLoc);
    context.message(ParserMessages::attributeValueChar,
		    StringMessageArg(StringC(str.data(), 1)),
		    StringMessageArg(name));
    return 1;
  }
  return 0;
}

void TokenizedDeclaredValue::buildDesc(AttributeDefinitionDesc &desc) const
{
  desc.declaredValue = AttributeDefinitionDesc::DeclaredValue(
    type_ - name + (isList_
		    ? AttributeDefinitionDesc::names
		    : AttributeDefinitionDesc::name));
}

DeclaredValue *TokenizedDeclaredValue::copy() const
{
  return new TokenizedDeclaredValue(*this);
}

GroupDeclaredValue::GroupDeclaredValue(TokenType type,
				       Vector<StringC> &vec)
: TokenizedDeclaredValue(type, 0)
{
  vec.swap(allowedValues_);
}

void GroupDeclaredValue::buildDesc(AttributeDefinitionDesc &desc) const
{
  desc.allowedValues = allowedValues_;
  desc.origAllowedValues = origAllowedValues_;
}

DeclaredValue *GroupDeclaredValue::copy() const
{
  return new GroupDeclaredValue(*this);
}

void GroupDeclaredValue::setOrigAllowedValues(Vector<StringC> &origAllowedValues)
{
  origAllowedValues.swap(origAllowedValues_);
}

AttributeValue *GroupDeclaredValue::makeValue(Text &text,
					      AttributeContext &context,
					      const StringC &name,
					      unsigned &specLength) const
{
  TokenizedAttributeValue *val = makeTokenizedValue(text, context, name,
						    specLength);
  if (!val || !context.validate())
    return val;
  for (size_t i = 0; i < allowedValues_.size(); i++)
    if (val->string() == allowedValues_[i])
      return val;
  context.message(ParserMessages::attributeValueNotInGroup,
		  StringMessageArg(val->string()),
		  StringMessageArg(name),
		  StringVectorMessageArg(allowedValues_));
  return val;
}

AttributeValue *GroupDeclaredValue::makeValueFromToken(Text &text,
						       AttributeContext &context,
						       const StringC &,
						       unsigned &specLength)
     const
{
  const Syntax &syntax = context.attributeSyntax();
  size_t litlen = syntax.litlen();
  size_t normsep = syntax.normsep();
  if (normsep > litlen || text.size() >  litlen - normsep)
    context.message(ParserMessages::normalizedAttributeValueLength,
		    NumberMessageArg(litlen),
		    NumberMessageArg(text.size() + normsep));
  specLength += text.size() + normsep;
  return new TokenizedAttributeValue(text, Vector<size_t>());
}

Boolean GroupDeclaredValue::containsToken(const StringC &token) const
{
  for (size_t i = 0; i < allowedValues_.size(); i++)
    if (allowedValues_[i] == token)
      return 1;
  return 0;
}

const Vector<StringC> *GroupDeclaredValue::getTokens() const
{
  return &allowedValues_;
}

const Vector<StringC> *GroupDeclaredValue::getOrigTokens() const
{
  return &origAllowedValues_;
}

NameTokenGroupDeclaredValue::NameTokenGroupDeclaredValue(Vector<StringC> &vec)
: GroupDeclaredValue(nameToken, vec)
{
}

void NameTokenGroupDeclaredValue::buildDesc(AttributeDefinitionDesc &desc) const
{
  GroupDeclaredValue::buildDesc(desc);
  desc.declaredValue = AttributeDefinitionDesc::nameTokenGroup;
}

DeclaredValue *NameTokenGroupDeclaredValue::copy() const
{
  return new NameTokenGroupDeclaredValue(*this);
}

NotationDeclaredValue::NotationDeclaredValue(Vector<StringC> &vec)
: GroupDeclaredValue(name, vec)
{
}

Boolean NotationDeclaredValue::isNotation() const
{
  return 1;
}

AttributeSemantics *
NotationDeclaredValue::makeSemantics(const TokenizedAttributeValue &value,
				     AttributeContext &context,
				     const StringC &,
				     unsigned &,
				     unsigned &) const
{
  ConstPtr<Notation> notation
    = context.getAttributeNotation(value.string(),
				   value.tokenLocation(0));
  if (notation.isNull()) {
    if (context.validate()) {
      context.setNextLocation(value.tokenLocation(0));
      context.message(ParserMessages::invalidNotationAttribute,
		      StringMessageArg(value.string()));
    }
    return 0;
  }
  return new NotationAttributeSemantics(notation);
}

void NotationDeclaredValue::buildDesc(AttributeDefinitionDesc &desc) const
{
  GroupDeclaredValue::buildDesc(desc);
  desc.declaredValue = AttributeDefinitionDesc::notation;
}

DeclaredValue *NotationDeclaredValue::copy() const
{
  return new NotationDeclaredValue(*this);
}

EntityDeclaredValue::EntityDeclaredValue(Boolean isList)
: TokenizedDeclaredValue(entityName, isList)
{
}

Boolean EntityDeclaredValue::isEntity() const
{
  return 1;
}

AttributeSemantics *
EntityDeclaredValue::makeSemantics(const TokenizedAttributeValue &value,
				   AttributeContext &context,
				   const StringC &,
				   unsigned &,
				   unsigned &nEntityNames) const
{
  Boolean valid = 1;
  size_t nTokens = value.nTokens();
  nEntityNames += nTokens;
  Vector<ConstPtr<Entity> > entities(nTokens);
  for (size_t i = 0; i < nTokens; i++) {
    entities[i] = context.getAttributeEntity(value.token(i),
					     value.tokenLocation(i));
    if (entities[i].isNull()) {
      if (context.validate()) {
	context.setNextLocation(value.tokenLocation(i));
	context.message(ParserMessages::invalidEntityAttribute,
		        StringMessageArg(value.token(i)));
      }
      valid = 0;
    }
    else if (!entities[i]->isDataOrSubdoc()) {
      if (context.validate()) {
        context.Messenger::setNextLocation(value.tokenLocation(i));
        context.message(ParserMessages::notDataOrSubdocEntity,
		        StringMessageArg(value.token(i)));
      }
      valid = 0;
    }
  }
  if (valid)
    return new EntityAttributeSemantics(entities);
  else
    return 0;
}

DeclaredValue *EntityDeclaredValue::copy() const
{
  return new EntityDeclaredValue(*this);
}

IdDeclaredValue::IdDeclaredValue()
: TokenizedDeclaredValue(name, 0)
{
}

Boolean IdDeclaredValue::isId() const
{
  return 1;
}

AttributeSemantics *
IdDeclaredValue::makeSemantics(const TokenizedAttributeValue &value,
			       AttributeContext &context,
			       const StringC &,
			       unsigned &,
			       unsigned &) const
{
  Location prevLoc;
  if (!context.defineId(value.string(), value.tokenLocation(0), prevLoc)) {
    context.setNextLocation(value.tokenLocation(0));
    context.message(ParserMessages::duplicateId,
		    StringMessageArg(value.string()),
		    prevLoc);
  }
  return 0;
}

void IdDeclaredValue::buildDesc(AttributeDefinitionDesc &desc) const
{
  desc.declaredValue = AttributeDefinitionDesc::id;
}

DeclaredValue *IdDeclaredValue::copy() const
{
  return new IdDeclaredValue(*this);
}

IdrefDeclaredValue::IdrefDeclaredValue(Boolean isList)
: TokenizedDeclaredValue(name, isList)
{
}

AttributeSemantics *
IdrefDeclaredValue::makeSemantics(const TokenizedAttributeValue &value,
				  AttributeContext &context,
				  const StringC &,
				  unsigned &nIdrefs,
				  unsigned &) const
{
  size_t nTokens = value.nTokens();
  nIdrefs += nTokens;
  for (size_t i = 0; i < nTokens; i++)
    context.noteIdref(value.token(i), value.tokenLocation(i));
  return 0;
}

Boolean IdrefDeclaredValue::isIdref() const
{
  return 1;
}

void IdrefDeclaredValue::buildDesc(AttributeDefinitionDesc &desc) const
{
  TokenizedDeclaredValue::buildDesc(desc);
  if (desc.declaredValue == AttributeDefinitionDesc::name)
    desc.declaredValue = AttributeDefinitionDesc::idref;
  else
    desc.declaredValue = AttributeDefinitionDesc::idrefs;
}

DeclaredValue *IdrefDeclaredValue::copy() const
{
  return new IdrefDeclaredValue(*this);
}


AttributeDefinition::AttributeDefinition(const StringC &name,
					 DeclaredValue *value)
: name_(name), declaredValue_(value), implicit_(0), all_(0)
{
}

void AttributeDefinition::setSpecified(Boolean implicit)
{
  (implicit ? implicit_ : all_) = 1;
}

Boolean AttributeDefinition::isSpecified(Boolean &implicit)
{
  implicit = implicit_;
  return implicit_ || all_;
}

void AttributeDefinition::setOrigName(StringC &origName)
{
  if (&origName != NULL)
    origName.swap(origName_);
}

AttributeDefinition::~AttributeDefinition()
{
}

AttributeValue *AttributeDefinition::checkValue(AttributeValue *p,
						AttributeContext &) const
{
  return p;
}

Boolean AttributeDefinition::missingValueWouldMatch(const Text &,
						    const AttributeContext &) const
{
  return 0;
}

const AttributeValue *
AttributeDefinition::defaultValue(const AttributeValue *) const
{
  return 0;
}

void AttributeDefinition::getDesc(AttributeDefinitionDesc &desc) const
{
  desc.allowedValues.clear();
  desc.defaultValue.clear();
  desc.currentIndex = 0;
  buildDesc(desc);
  declaredValue_->buildDesc(desc);
}

Boolean AttributeDefinition::isConref() const
{
  return 0;
}

Boolean AttributeDefinition::isCurrent() const
{
  return 0;
}

Boolean AttributeDefinition::isFixed() const
{
  return 0;
}

RequiredAttributeDefinition::RequiredAttributeDefinition(const StringC &name,
							 DeclaredValue *value)
: AttributeDefinition(name, value)
{
}

ConstPtr<AttributeValue>
RequiredAttributeDefinition::makeMissingValue(AttributeContext &context) const
{
  if (context.validate())
    context.message(ParserMessages::requiredAttributeMissing,
		    StringMessageArg(name()));
  return 0;
}

void RequiredAttributeDefinition::buildDesc(AttributeDefinitionDesc &desc) const
{
  desc.defaultValueType = AttributeDefinitionDesc::required;
}

AttributeDefinition *RequiredAttributeDefinition::copy() const
{
  return new RequiredAttributeDefinition(*this);
}

CurrentAttributeDefinition::CurrentAttributeDefinition(const StringC &name, DeclaredValue *value, size_t index)
: AttributeDefinition(name, value), currentIndex_(index)
{
}

ConstPtr<AttributeValue>
CurrentAttributeDefinition::makeMissingValue(AttributeContext &context) const
{
  if (context.mayDefaultAttribute()) {
    ConstPtr<AttributeValue> currentValue
      = context.getCurrentAttribute(currentIndex_);
    if (currentValue.isNull() && context.validate())
      context.message(ParserMessages::currentAttributeMissing,
		      StringMessageArg(name()));
    return currentValue;
  }
  if (context.validate())
    context.message(ParserMessages::attributeMissing,
		    StringMessageArg(name()));
  return 0;
}

Boolean CurrentAttributeDefinition::missingValueWouldMatch(const Text &text,
							   const AttributeContext &context) const
{
  if (!context.mayDefaultAttribute())
    return 0;
  ConstPtr<AttributeValue> currentValue
    = context.getCurrentAttribute(currentIndex_);
  if (currentValue.isNull())
    return 0;
  return text.fixedEqual(*currentValue->text());
}

AttributeValue *
CurrentAttributeDefinition::checkValue(AttributeValue *value,
				       AttributeContext &context) const
{
  context.noteCurrentAttribute(currentIndex_, value);
  return value;
}

void CurrentAttributeDefinition::buildDesc(AttributeDefinitionDesc &desc) const
{
  desc.defaultValueType = AttributeDefinitionDesc::current;
  desc.currentIndex = currentIndex_;
}

AttributeDefinition *CurrentAttributeDefinition::copy() const
{
  return new CurrentAttributeDefinition(*this);
}

Boolean CurrentAttributeDefinition::isCurrent() const
{
  return 1;
}

ImpliedAttributeDefinition::ImpliedAttributeDefinition(const StringC &name,
						       DeclaredValue *value)
: AttributeDefinition(name, value)
{
}

ConstPtr<AttributeValue>
ImpliedAttributeDefinition::makeMissingValue(AttributeContext &context) const
{
  return context.makeImpliedAttributeValue();
}

void ImpliedAttributeDefinition::buildDesc(AttributeDefinitionDesc &desc) const
{
  desc.defaultValueType = AttributeDefinitionDesc::implied;
}

AttributeDefinition *ImpliedAttributeDefinition::copy() const
{
  return new ImpliedAttributeDefinition(*this);
}

const AttributeValue *
ImpliedAttributeDefinition::defaultValue(const AttributeValue *impliedValue)
     const
{
  return impliedValue;
}

ConrefAttributeDefinition::ConrefAttributeDefinition(const StringC &name,
						     DeclaredValue *value)
: ImpliedAttributeDefinition(name, value)
{
}

Boolean ConrefAttributeDefinition::isConref() const
{
  return 1;
}

void ConrefAttributeDefinition::buildDesc(AttributeDefinitionDesc &desc) const
{
  desc.defaultValueType = AttributeDefinitionDesc::conref;
}

AttributeDefinition *ConrefAttributeDefinition::copy() const
{
  return new ConrefAttributeDefinition(*this);
}

DefaultAttributeDefinition::DefaultAttributeDefinition(const StringC &name,
							DeclaredValue *declaredValue,
							AttributeValue *defaultValue)
: AttributeDefinition(name, declaredValue),
  value_(defaultValue)
{
}

ConstPtr<AttributeValue>
DefaultAttributeDefinition::makeMissingValue(AttributeContext &context) const
{
  if (context.mayDefaultAttribute())
    return value_;
  if (context.validate())
    context.message(ParserMessages::attributeMissing,
		    StringMessageArg(name()));
  return 0;
}

Boolean DefaultAttributeDefinition::missingValueWouldMatch(const Text &text,
							   const AttributeContext &context) const
{
  return context.mayDefaultAttribute() && text.fixedEqual(*value_->text());
}

void DefaultAttributeDefinition::buildDesc(AttributeDefinitionDesc &desc) const
{
  desc.defaultValueType = AttributeDefinitionDesc::defaulted;
  desc.defaultValue = value_;
}

AttributeDefinition *DefaultAttributeDefinition::copy() const
{
  return new DefaultAttributeDefinition(*this);
}

FixedAttributeDefinition:: FixedAttributeDefinition(const StringC &name,
						    DeclaredValue *declaredValue,
						    AttributeValue *defaultValue)
: DefaultAttributeDefinition(name, declaredValue, defaultValue)
{
}

Boolean FixedAttributeDefinition::isFixed() const
{
  return 1;
}

AttributeValue *FixedAttributeDefinition::checkValue(AttributeValue *value,
						     AttributeContext &context)
     const
{
  const AttributeValue *fixedValue
    = DefaultAttributeDefinition::defaultValue(0);
  if (value && fixedValue && context.validate()) {
    const Text *text;
    const StringC *str;
    const Text *fixedText;
    const StringC *fixedStr;
    switch (value->info(text, str)) {
    case AttributeValue::implied:
      CANNOT_HAPPEN();
    case AttributeValue::cdata:
      if (fixedValue->info(fixedText, fixedStr) == AttributeValue::cdata) {
	if (!text->fixedEqual(*fixedText))
	  context.message(ParserMessages::notFixedValue, StringMessageArg(name()));
      }
      break;
    case AttributeValue::tokenized:
      if (fixedValue->info(fixedText, fixedStr) == AttributeValue::tokenized) {
	if (*str != *fixedStr)
	  context.message(ParserMessages::notFixedValue, StringMessageArg(name()));
      }
      break;
    }
  }
  return value;
}

void FixedAttributeDefinition::buildDesc(AttributeDefinitionDesc &desc) const
{
  // get the fixed value
  DefaultAttributeDefinition::buildDesc(desc);
  desc.defaultValueType = AttributeDefinitionDesc::fixed;
}

AttributeDefinition *FixedAttributeDefinition::copy() const
{
  return new FixedAttributeDefinition(*this);
}

AttributeDefinitionList
::AttributeDefinitionList(Vector<CopyOwner<AttributeDefinition> > &vec,
			  size_t index,
			  Boolean anyCurrent,
			  size_t idIndex,
			  size_t notationIndex)
: index_(index), anyCurrent_(anyCurrent), idIndex_(idIndex),
  notationIndex_(notationIndex)
{
  defs_.swap(vec);
}

AttributeDefinitionList:: AttributeDefinitionList(const ConstPtr<AttributeDefinitionList> &def)
: prev_(def), index_(size_t(-1))
{
  if (def.isNull()) {
    anyCurrent_ = 0;
    notationIndex_ = size_t(-1);
    idIndex_ = size_t(-1);
  }
  else {
    anyCurrent_ = def->anyCurrent_;
    notationIndex_ = def->notationIndex_;
    idIndex_ = def->idIndex_;
    defs_ = def->defs_;
  }
}

AttributeDefinitionList::~AttributeDefinitionList() {}

Boolean AttributeDefinitionList::tokenIndex(const StringC &token, unsigned &index) const
{
  for (size_t i = 0; i < defs_.size(); i++)
    if (defs_[i]->containsToken(token)) {
      index = i;
      return 1;
    }
  return 0;
}

Boolean AttributeDefinitionList::tokenIndexUnique(const StringC &token, unsigned i) const
{
  for (++i; i < defs_.size(); i++)
    if (defs_[i]->containsToken(token))
      return 0;
  return 1;
}


Boolean AttributeDefinitionList::attributeIndex(const StringC &name,
						unsigned &index) const
{
  for (size_t i = 0; i < defs_.size(); i++)
    if (defs_[i]->name() == name) {
      index = i;
      return 1;
    }
  return 0;
}

void AttributeDefinitionList::append(AttributeDefinition *def)
{
  if (def->isId() && idIndex_ == size_t(-1))
    idIndex_ = defs_.size();
  if (def->isNotation() && notationIndex_ == size_t(-1))
    notationIndex_ = defs_.size();
  if (def->isCurrent())
    anyCurrent_ = 1;
  defs_.resize(defs_.size() + 1);
  defs_.back() = def;
}

AttributeSemantics::AttributeSemantics()
{
}

AttributeSemantics::~AttributeSemantics()
{
}

size_t AttributeSemantics::nEntities() const
{
  return 0;
}

ConstPtr<Entity> AttributeSemantics::entity(size_t) const
{
  return 0;
}

ConstPtr<Notation> AttributeSemantics::notation() const
{
  return 0;
}


NotationAttributeSemantics::NotationAttributeSemantics(const ConstPtr<Notation> &notation)
: notation_(notation)
{
}

ConstPtr<Notation> NotationAttributeSemantics::notation() const
{
  return notation_;
}

AttributeSemantics *NotationAttributeSemantics::copy() const
{
  return new NotationAttributeSemantics(*this);
}

EntityAttributeSemantics::EntityAttributeSemantics(Vector<ConstPtr<Entity> > &entity)
{
  entity.swap(entity_);
}

size_t EntityAttributeSemantics::nEntities() const
{
  return entity_.size();
}

ConstPtr<Entity> EntityAttributeSemantics::entity(size_t i) const
{
  return entity_[i];
}

AttributeSemantics *EntityAttributeSemantics::copy() const
{
  return new EntityAttributeSemantics(*this);
}

AttributeValue::AttributeValue()
{
}

AttributeValue::~AttributeValue()
{
}

AttributeSemantics *AttributeValue::makeSemantics(const DeclaredValue *,
						  AttributeContext &,
						  const StringC &,
						  unsigned &,
						  unsigned &) const
{
  return 0;
}

const Text *AttributeValue::text() const
{
  return 0;
}

Boolean AttributeValue::recoverUnquoted(const StringC &, const Location &,
					AttributeContext &, const StringC &)
{
  return 0;
}

ImpliedAttributeValue::ImpliedAttributeValue()
{
}

AttributeValue::Type ImpliedAttributeValue::info(const Text *&,
						 const StringC *&) const
{
  return implied;
}

TokenizedAttributeValue::TokenizedAttributeValue(Text &text,
						 const Vector<size_t> &spaceIndex)
: spaceIndex_(spaceIndex)
{
  text.swap(text_);
}

AttributeValue::Type TokenizedAttributeValue::info(const Text *&,
						   const StringC *&string) const
{
  string = &text_.string();
  return tokenized;
}

const Text *TokenizedAttributeValue::text() const
{
  return &text_;
}

AttributeSemantics *
TokenizedAttributeValue::makeSemantics(const DeclaredValue *value,
				       AttributeContext &context,
				       const StringC &name,
				       unsigned &nIdrefs,
				       unsigned &nEntityNames) const
{
  if (text_.size() == 0)
    return 0;
  return value->makeSemantics(*this, context, name, nIdrefs, nEntityNames);
}

CdataAttributeValue::CdataAttributeValue(Text &text)
{
  text.swap(text_);
}

AttributeValue::Type CdataAttributeValue::info(const Text *&text,
					       const StringC *&) const
{
  text = &text_;
  return cdata;
}

const Text *CdataAttributeValue::text() const
{
  return &text_;
}

Boolean CdataAttributeValue::recoverUnquoted(const StringC &str,
					     const Location &strLoc,
					     AttributeContext &context,
					     const StringC &)
{
  TextIter iter(text_);
  TextItem::Type type;
  const Char *s;
  size_t len;
  const Location *loc;
  if (iter.next(type, s, len, loc)
      && type == TextItem::data
      && len == text_.size()
      && loc->origin().pointer() == strLoc.origin().pointer()
      && loc->index() + len == strLoc.index()
      && !iter.next(type, s, len, loc)) {
    text_.addChars(str, strLoc);
    context.Messenger::setNextLocation(strLoc);
    context.message(ParserMessages::unquotedAttributeValue);
    return 1;
  }
  return 0;
}

const Notation *CdataAttributeValue::notation() const
{
  return 0;
}

DataAttributeValue::DataAttributeValue(Text &text,
                                       const ConstPtr<Notation> &nt,
                                       const AttributeList &attributes)
: CdataAttributeValue(text), notation_(nt), attributes_(&attributes)
{
}

const AttributeList &DataAttributeValue::attributes() const
{
  return *attributes_;
}

const Notation *DataAttributeValue::notation() const
{
  return notation_.pointer();
}

Attribute::Attribute()
: specIndexPlus_(0)
{
}

Attribute::Attribute(const Attribute& x)
	: specIndexPlus_(x.specIndexPlus_),
	  value_(x.value_),
	  semantics_(x.semantics_)
{
}

Attribute::~Attribute()
{
}

Attribute& Attribute::operator=(const Attribute& x)
{
  if (this != &x) {
    specIndexPlus_ = x.specIndexPlus_;
    value_ = x.value_;
    semantics_ = x.semantics_;
  }
  return *this;
}

void Attribute::clear()
{
  specIndexPlus_ = 0;
  value_.clear();
  semantics_.clear();
}

AttributeList::AttributeList(const ConstPtr<AttributeDefinitionList> &def)
: def_(def), vec_(def.isNull() ? 0 : def->size()), nSpec_(0), conref_(0),
  nIdrefs_(0), nEntityNames_(0)
{
}

AttributeList::AttributeList()
: nSpec_(0), conref_(0)
{
}

void AttributeList::init(const ConstPtr<AttributeDefinitionList> &def)
{
  def_ = def;
  nSpec_ = 0;
  conref_ = 0;
  nIdrefs_ = 0;
  nEntityNames_ = 0;
  if (def_.isNull())
    vec_.resize(0);
  else {
    size_t newLength = def_->size();
    size_t clearLim = vec_.size();
    if (clearLim > newLength)
      clearLim = newLength;
    vec_.resize(newLength);
    for (size_t i = 0; i < clearLim; i++)
      vec_[i].clear();
  }
}

void AttributeList::changeDef(const ConstPtr<AttributeDefinitionList> &def)
{
  vec_.resize(def.isNull() ? 0 : def->size());
  def_ = def;
}

void AttributeList::swap(AttributeList &to)
{
  vec_.swap(to.vec_);
  def_.swap(to.def_);
  {
    unsigned tem = to.nIdrefs_;
    to.nIdrefs_ = nIdrefs_;
    nIdrefs_ = tem;
  }
  {
    unsigned tem = to.nEntityNames_;
    to.nEntityNames_ = nEntityNames_;
    nEntityNames_ = tem;
  }
  {
    size_t tem = to.nSpec_;
    to.nSpec_ = nSpec_;
    nSpec_ = tem;
  }
  {
    PackedBoolean tem = to.conref_;
    to.conref_ = conref_;
    conref_ = tem;
  }
}

void AttributeList::finish(AttributeContext &context)
{
  for (size_t i = 0; i < vec_.size(); i++)
    if (!vec_[i].specified()) {
      ConstPtr<AttributeValue> value
	= def(i)->makeMissingValue(context);
      if (!conref_ || def_->notationIndex() != i) {
	vec_[i].setValue(value);
        if (!value.isNull())
      	  vec_[i].setSemantics(def(i)->makeSemantics(value.pointer(),
						     context,
						     nIdrefs_,
						     nEntityNames_));
      }
    }
  const Syntax &syntax = context.attributeSyntax();
  if (nIdrefs_ > syntax.grpcnt())
    context.message(ParserMessages::idrefGrpcnt,
		   NumberMessageArg(syntax.grpcnt()));
  if (nEntityNames_ > syntax.grpcnt())
    context.message(ParserMessages::entityNameGrpcnt,
		   NumberMessageArg(syntax.grpcnt()));
  if (context.validate()
      && conref_
      && def_->notationIndex() != size_t(-1)
      && specified(def_->notationIndex()))
    context.message(ParserMessages::conrefNotation);
}

void AttributeList::setSpec(unsigned i, AttributeContext &context)
{
  if (vec_[i].specified())
    context.message(ParserMessages::duplicateAttributeSpec,
		   StringMessageArg(def(i)->name()));
  else
    vec_[i].setSpec(nSpec_++);
}

void AttributeList::noteInvalidSpec()
{
  // This is needed for error recovery.
  // We don't want nSpec_ to be > 0, if there is no attribute definition.
  if (nSpec_)
    nSpec_++;
}

Boolean AttributeList::setValue(unsigned i, Text &text,
				AttributeContext &context,
				unsigned &specLength)
{
  AttributeValue *value = def(i)->makeValue(text, context, specLength);
  if (def(i)->isConref())
    conref_ = 1;
  vec_[i].setValue(value);
  if (value)
    vec_[i].setSemantics(def(i)->makeSemantics(value, context,
					       nIdrefs_, nEntityNames_));
  else if (AttributeValue::handleAsUnterminated(text, context))
    return 0;
  return 1;
}

void AttributeList::setValueToken(unsigned i, Text &text,
				  AttributeContext &context,
				  unsigned &specLength)
{
  AttributeValue *value = def(i)->makeValueFromToken(text, context,
						     specLength);
  if (def(i)->isConref())
    conref_ = 1;
  vec_[i].setValue(value);
  if (value)
    vec_[i].setSemantics(def(i)->makeSemantics(value, context,
					       nIdrefs_, nEntityNames_));
}

const StringC *AttributeList::getId() const
{
  // Check for no attributes
  if (def_.isNull())
    return 0;
  // Check for no ID declared
  size_t i = def_->idIndex();
  if (i == size_t(-1))
    return 0;
  // Check for invalid value
  const AttributeValue *v = value(i);
  if (!v)
    return 0;
  // Check for implied value
  const Text *t = v->text();
  if (!t)
    return 0;
  return &t->string();
}

Boolean AttributeList::recoverUnquoted(const StringC &str,
				       const Location &strLoc,
				       AttributeContext &context)
{
  if (nSpec_ > 0) {
    for (size_t i = 0; i < vec_.size(); i++)
      if (vec_[i].specified() && vec_[i].specIndex() == nSpec_ - 1) {
	const AttributeValue *val = vec_[i].value();
	if (val)
	  // I wish I could avoid casting away const here.
	  return ((AttributeValue *)val)->recoverUnquoted(str, strLoc, context,
							  name(i));
	break;
      }
    return 1;
  }
  return 0;
}

Boolean AttributeList::handleAsUnterminated(AttributeContext &context)
{
  if (nSpec_ > 0) {
    for (size_t i = 0; i < vec_.size(); i++) {
      if (vec_[i].specified() && vec_[i].specIndex() == nSpec_ - 1) {
	const AttributeValue *val = vec_[i].value();
	const Text *ptr;
	if (val && (ptr = val->text()) != 0
	    && AttributeValue::handleAsUnterminated(*ptr, context))
	  return 1;
	break;
      }
    }
  }
  return 0;
}

// This tries to guess this attribute value looks like if it had
// a missing ending quote.

Boolean AttributeValue::handleAsUnterminated(const Text &text,
					     AttributeContext &context)
{
  TextIter iter(text);
  const Char *lastStr = 0;
  size_t lastLen;
  Location startLoc;
  const Location *loc;
  TextItem::Type type;
  const Char *str;
  size_t len;
  while (iter.next(type, str, len, loc)) {
    if (startLoc.origin().isNull() && !loc->origin().isNull())
      startLoc = *loc;
    switch (type) {
    case TextItem::data:
      if (len != 1 || *str != context.attributeSyntax().space()) {
	lastStr = str;
	lastLen = len;
      }
      break;
    case TextItem::endDelim:
    case TextItem::endDelimA:
    case TextItem::ignore:
      break;
    default:
      lastStr = 0;
      break;
    }
  }
  if (lastStr) {
    while (lastLen > 0
	   && lastStr[lastLen - 1] == context.attributeSyntax().space())
      lastLen--;
    const StringC &vi = context.attributeSyntax().delimGeneral(Syntax::dVI);
    if (lastLen >= vi.size()
	&& (vi
	    == StringC(lastStr + (lastLen - vi.size()), vi.size()))) {
      context.Messenger::setNextLocation(startLoc);
      context.message(ParserMessages::literalClosingDelimiter);
      return 1;
    }
  }
  return 0;
}

AttributeContext::AttributeContext()
: mayDefaultAttribute_(0), validate_(1)
{
}

AttributeContext::~AttributeContext()
{
}

Boolean AttributeContext::defineId(const StringC &, const Location &,
				   Location &)
{
  return 1;
}

void AttributeContext::noteIdref(const StringC &, const Location &)
{
}

void AttributeContext::noteCurrentAttribute(size_t, AttributeValue *)
{
}

ConstPtr<AttributeValue> AttributeContext::getCurrentAttribute(size_t) const
{
  return 0;
}

ConstPtr<Entity> AttributeContext::getAttributeEntity(const StringC &,
						      const Location &)
{
  return 0;
}

ConstPtr<Notation> AttributeContext::getAttributeNotation(const StringC &,
							  const Location &)
{
  return 0;
}

ConstPtr<AttributeValue> AttributeContext::makeImpliedAttributeValue()
{
  if (impliedAttributeValue_.isNull())
    impliedAttributeValue_ = new ImpliedAttributeValue;
  return impliedAttributeValue_;
}

#ifdef SP_NAMESPACE
}
#endif
