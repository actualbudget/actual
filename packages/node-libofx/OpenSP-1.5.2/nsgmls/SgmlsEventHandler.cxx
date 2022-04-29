// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#include "config.h"
#include "SgmlsEventHandler.h"
#include "SgmlParser.h"
#include "ParserOptions.h"
#include "Entity.h"
#include "Notation.h"
#include "Attribute.h"
#include "ExtendEntityManager.h"
#include "StorageManager.h"
#include "macros.h"
#include "sptchar.h"
#include "nsgmls.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

const char dataCode = '-';
const char piCode = '?';
const char conformingCode = 'C';
const char appinfoCode = '#';
const char startElementCode = '(';
const char endElementCode = ')';
const char referenceEntityCode = '&';
const char attributeCode = 'A';
const char dataAttributeCode = 'D';
const char linkAttributeCode = 'a';
const char defineNotationCode = 'N';
const char defineExternalEntityCode = 'E';
const char defineInternalEntityCode = 'I';
const char defineSubdocEntityCode = 'S';
const char defineExternalTextEntityCode = 'T';
const char pubidCode = 'p';
const char sysidCode = 's';
const char startSubdocCode = '{';
const char endSubdocCode = '}';
const char fileCode = 'f';
const char locationCode = 'L';
const char includedElementCode = 'i';
const char emptyElementCode = 'e';
const char commentCode = '_';
const char omissionCode = 'o';
const char featuresCode = 'V';
const char featuresSubCodeOptions = 'o';
const char featuresSubCodeVersion = 'v';
const char featuresSubCodePackage = 'p';
const char featuresSubCodePossibleCodes = 'c';

const OutputCharStream::Newline nl = OutputCharStream::newline;

const char space = ' ';
const char re = '\r';
const Char reChar = re;
const char escapePrefix = '\\';
const Char escapePrefixChar = escapePrefix;
const char sdataDelim = '|';
const char nonSgmlEscape = '%';
const char newlineEscape = 'n';
const char numEscape = '#';
const char escapeEnd = ';';

inline
void SgmlsEventHandler::startData()
{
  if (!haveData_) {
    os() << dataCode;
    haveData_ = 1;
  }
}

inline
void SgmlsEventHandler::flushData()
{
  if (haveData_) {
    os() << nl;
    haveData_ = 0;
  }
}

inline
void SgmlsEventHandler::outputLocation(const Location &loc)
{
  if (outputLine_)
    outputLocation1(loc);
}

SgmlsEventHandler::SgmlsEventHandler(const SgmlParser *parser,
				     OutputCharStream *os,
				     Messenger *messenger,
				     unsigned outputFlags)
: SgmlsSubdocState(parser), os_(os), messenger_(messenger),
  outputLine_((outputFlags & outputLine) != 0),
  outputEntity_((outputFlags & outputEntity) != 0),
  outputId_((outputFlags & outputId) != 0),
  outputNotationSysid_((outputFlags & outputNotationSysid) != 0),
  outputIncluded_((outputFlags & outputIncluded) != 0),
  outputNonSgml_((outputFlags & outputNonSgml) != 0),
  outputEmpty_((outputFlags & outputEmpty) != 0),
  outputDataAtt_((outputFlags & outputDataAtt) != 0),
  outputComment_((outputFlags & outputComment) != 0),
  outputTagOmission_((outputFlags & outputTagOmission) != 0),
  outputAttributeOmission_((outputFlags & outputAttributeOmission) != 0),
  outputParserInformation_((outputFlags & outputParserInformation) != 0),

  haveData_(0), lastSos_(0), inDocument_(0)
{
  os_->setEscaper(escaper);
  if (outputParserInformation_)
    features(outputFlags);
}

SgmlsEventHandler::~SgmlsEventHandler()
{
  flushData();
  if (errorCount() == 0)
    os() << conformingCode << nl;
  delete os_;
}

void SgmlsEventHandler::message(MessageEvent *event)
{
  messenger_->dispatchMessage(event->message());
  ErrorCountEventHandler::message(event);
}

void SgmlsEventHandler::features(unsigned outputFlags)
{
    os() << featuresCode << featuresSubCodePackage << space
         << SP_PACKAGE
         << nl;
    
    os() << featuresCode << featuresSubCodeVersion << space
         << SP_VERSION
         << nl;
    
    os() << featuresCode << featuresSubCodePossibleCodes << space;
    os() << dataCode;
    os() << piCode;
    os() << conformingCode;
    os() << appinfoCode;
    os() << startElementCode;
    os() << endElementCode;
    os() << referenceEntityCode;
    os() << attributeCode;
    os() << dataAttributeCode;
    os() << linkAttributeCode;
    os() << defineNotationCode;
    os() << defineExternalEntityCode;
    os() << defineInternalEntityCode;
    os() << defineSubdocEntityCode;
    os() << defineExternalTextEntityCode;
    os() << pubidCode;
    os() << sysidCode;
    os() << startSubdocCode;
    os() << endSubdocCode;
    os() << fileCode;
    os() << locationCode;
    os() << includedElementCode;
    os() << emptyElementCode;
    os() << commentCode;
    os() << omissionCode;
    os() << featuresCode;
    
    os() << nl;

    os() << featuresCode << featuresSubCodeOptions
         << space << SP_T("esis");
    for (size_t i = 1; NsgmlsApp::outputOptions[i].flag != 0; i++) {
      if (NsgmlsApp::outputOptions[i].flag == 0)
        break;
      if (0 != (outputFlags & NsgmlsApp::outputOptions[i].flag)) {
        os() << space << NsgmlsApp::outputOptions[i].name;
      }
    }
    os() << nl;
}

void SgmlsEventHandler::appinfo(AppinfoEvent *event)
{
  const StringC *str;
  if (event->literal(str)) {
    outputLocation(event->location());
    flushData();
    os() << appinfoCode;
    outputString(*str);
    os() << nl;
  }
  delete event;
}

void SgmlsEventHandler::endProlog(EndPrologEvent *event)
{
  if (outputEntity_) {
    flushData();
    const Dtd &dtd = event->dtd();
    Dtd::ConstEntityIter iter(dtd.generalEntityIter());
    for (;;) {
      const Entity *entity = iter.next().pointer();
      if (!entity)
	break;
      defineEntity(entity);
    }
  }
  if (outputComment_)
    inDocument_ = true;
  if (!event->lpdPointer().isNull()) {
    linkProcess_.init(event->lpdPointer());
    haveLinkProcess_ = 1;
    flushData();
  }
  for (size_t i = 0; i < event->simpleLinkNames().size(); i++) {
    flushData();
    attributes(event->simpleLinkAttributes()[i],
	       linkAttributeCode,
	       &event->simpleLinkNames()[i]);
  }
  delete event;
}

void SgmlsEventHandler::entityDefaulted(EntityDefaultedEvent *event)
{
  if (outputEntity_) {
    flushData();
    defineEntity(event->entityPointer().pointer());
  }
  delete event;
}

void SgmlsEventHandler::uselink(UselinkEvent *event)
{
  linkProcess_.uselink(event->linkSet(),
		       event->restore(),
		       event->lpd().pointer());
  delete event;
}

void SgmlsEventHandler::sgmlDecl(SgmlDeclEvent *event)
{
  sd_ = event->sdPointer();
  syntax_ = event->instanceSyntaxPointer(); // FIXME which syntax?
  delete event;
}

void SgmlsEventHandler::data(DataEvent *event)
{
  outputLocation(event->location());
  startData();
  outputString(event->data(), event->dataLength());
  delete event;
}

void SgmlsEventHandler::sdataEntity(SdataEntityEvent *event)
{
  outputLocation(event->location());
  startData();
  os() << escapePrefix << sdataDelim;
  outputString(event->data(), event->dataLength());
  os() << escapePrefix << sdataDelim;
  delete event;
}

void SgmlsEventHandler::pi(PiEvent *event)
{
  outputLocation(event->location());
  flushData();
  os() << piCode;
  outputString(event->data(), event->dataLength());
  os() << nl;
  delete event;
}

void SgmlsEventHandler::commentDecl(CommentDeclEvent *event)
{
  if (inDocument_) {  //only receive this event if outputComment_ true
    outputLocation(event->location());
    flushData();
    MarkupIter iter(event->markup());
    for (; iter.valid(); iter.advance()) {
      if (iter.type() == Markup::comment) {
        os() << commentCode;
        outputString(iter.charsPointer(), iter.charsLength());
        os() << nl;
      }
    }
  }
  delete event;
}

void SgmlsEventHandler::nonSgmlChar(NonSgmlCharEvent *event)
{
  if (outputNonSgml_) {
    outputLocation(event->location());
    startData();
    os() << escapePrefix << nonSgmlEscape << (unsigned long)event->character() << escapeEnd;
  }
  delete event;
}

void SgmlsEventHandler::startElement(StartElementEvent *event)
{
  flushData();
  currentLocation_ = event->location();
  if (haveLinkProcess_) {
    const AttributeList *linkAttributes;
    const ResultElementSpec *resultElementSpec;
    linkProcess_.startElement(event->elementType(),
			      event->attributes(),
			      event->location(),
			      *this, // Messenger &
			      linkAttributes,
			      resultElementSpec);
    if (linkAttributes)
      attributes(*linkAttributes, linkAttributeCode, &linkProcess_.name());
  }
  attributes(event->attributes(), attributeCode, 0);
  currentLocation_.clear();
  if (outputTagOmission_ && !event->markupPtr())
    os() << omissionCode << nl;
  if (outputIncluded_ && event->included())
    os() << includedElementCode << nl;
  if (outputEmpty_ && event->mustOmitEnd())
    os() << emptyElementCode << nl;
  outputLocation(event->location());
  os() << startElementCode << event->name() << nl;
  delete event;
}

void SgmlsEventHandler::attributes(const AttributeList &attributes,
				   char code,
				   const StringC *ownerName)
{
  size_t nAttributes = attributes.size();
  for (size_t i = 0; i < nAttributes; i++) {
    const Text *text;
    const StringC *string;
    const AttributeValue *value = attributes.value(i);
    if (value) {
      if (outputAttributeOmission_) {
        if (! attributes.specified(i)) {
          os() << omissionCode << nl;
        }
      }
      switch (value->info(text, string)) {
      case AttributeValue::implied:
	startAttribute(attributes.name(i), code, ownerName);
	os() << "IMPLIED" << nl;
	break;
      case AttributeValue::tokenized:
	{
	  const char *typeString = "TOKEN";
	  const AttributeSemantics *semantics = attributes.semantics(i);
	  if (semantics) {
	    ConstPtr<Notation> notation
	      = semantics->notation();
	    if (!notation.isNull()) {
	      defineNotation(notation.pointer());
	      typeString = "NOTATION";
	    }
	    else {
	      size_t nEntities = semantics->nEntities();
	      if (nEntities) {
		typeString = "ENTITY";
		if (!outputEntity_)
		  for (size_t i = 0; i < nEntities; i++) {
		    const Entity *entity = semantics->entity(i).pointer();
		    if (!markEntity(entity))
		      defineEntity(entity);
		  }
	      }
	    }
	  }
	  if (outputId_ && attributes.id(i))
	    typeString = "ID";
	  startAttribute(attributes.name(i), code, ownerName);
	  os() << typeString << space << *string << nl;
	}
	break;
      case AttributeValue::cdata:
	{
	  startAttribute(attributes.name(i), code, ownerName);
	  CdataAttributeValue *cdataValue = (CdataAttributeValue *)value;
	  if (outputDataAtt_ && cdataValue->notation())
	    os() << "DATA " << cdataValue->notation()->name() << " "; 
	  else
	    os() << "CDATA ";
	  TextIter iter(*text);
	  TextItem::Type type;
	  const Char *p;
	  size_t length;
	  const Location *loc;
	  while (iter.next(type, p, length, loc))
	    switch (type) {
	    case TextItem::data:
	    case TextItem::cdata:
	      outputString(p, length);
	      break;
	    case TextItem::sdata:
	      os() << escapePrefix << sdataDelim;
	      outputString(p, length);
	      os() << escapePrefix << sdataDelim;
	      break;
	    case TextItem::nonSgml:
	      if (outputNonSgml_)
		os() << escapePrefix << nonSgmlEscape << (unsigned long)*p << escapeEnd;
	      break;
	    default:
	      break;
	    }
	  os() << nl;
	  if (outputDataAtt_ && cdataValue->notation()) {
	    defineNotation(cdataValue->notation());
	    DataAttributeValue *dataValue = (DataAttributeValue *)cdataValue;
	    SgmlsEventHandler::attributes(dataValue->attributes(), 
					  dataAttributeCode, 
					  &attributes.name(i));
	  }
	}
	break;
      }
    }
  }
}

void SgmlsEventHandler::startAttribute(const StringC &name,
				       char code,
				       const StringC *ownerName)
{
  os() << code;
  if (ownerName)
    os() << *ownerName << space;
  os() << name << space;
}

void SgmlsEventHandler::endElement(EndElementEvent *event)
{
  flushData();
  if (haveLinkProcess_)
    linkProcess_.endElement();
  outputLocation(event->location());
  if (outputTagOmission_ && !event->markupPtr())
    os() << omissionCode << nl;
  os() << endElementCode << event->name() << nl;
  delete event;
}

void SgmlsEventHandler::externalDataEntity(ExternalDataEntityEvent *event)
{
  currentLocation_ = event->location();
  outputLocation(event->location());
  flushData();
  if (!outputEntity_ && !markEntity(event->entity()))
    defineExternalDataEntity(event->entity());
  currentLocation_.clear();
  os() << referenceEntityCode << event->entity()->name() << nl;
  delete event;
}

void SgmlsEventHandler::subdocEntity(SubdocEntityEvent *event)
{
  currentLocation_ = event->location();
  outputLocation(event->location());
  flushData();
  const SubdocEntity *entity = event->entity();
  if (!outputEntity_ && !markEntity(entity))
    defineSubdocEntity(entity);
  currentLocation_.clear();
  os() << startSubdocCode << entity->name() << nl;
  SgmlParser::Params params;
  params.subdocInheritActiveLinkTypes = 1;
  params.subdocReferenced = 1;
  params.origin = event->entityOrigin()->copy();
  params.parent = parser_;
  params.sysid = entity->externalId().effectiveSystemId();
  params.entityType = SgmlParser::Params::subdoc;
  SgmlParser parser(params);
  SgmlsSubdocState oldState;
  SgmlsSubdocState::swap(oldState);
  SgmlsSubdocState::init(&parser);
  parser.parseAll(*this);
  oldState.swap(*this);
  os() << endSubdocCode << entity->name() << nl;
  delete event;
}

void SgmlsEventHandler::defineEntity(const Entity *entity)
{
  const InternalEntity *internalEntity = entity->asInternalEntity();
  if (internalEntity)
    defineInternalEntity(internalEntity);
  else {
    switch (entity->dataType()) {
    case Entity::cdata:
    case Entity::sdata:
    case Entity::ndata:
      defineExternalDataEntity(entity->asExternalDataEntity());
      break;
    case Entity::subdoc:
      defineSubdocEntity(entity->asSubdocEntity());
      break;
    case Entity::sgmlText:
      defineExternalTextEntity(entity->asExternalEntity());
      break;
    default:
      CANNOT_HAPPEN();
    }
  }
}

void SgmlsEventHandler::defineExternalDataEntity(const ExternalDataEntity *entity)
{
  const Notation *notation = entity->notation();
  defineNotation(notation);
  externalId(entity->externalId());
  const char *typeString;
  switch (entity->dataType()) {
  case Entity::cdata:
    typeString = "CDATA";
    break;
  case Entity::sdata:
    typeString = "SDATA";
    break;
  case Entity::ndata:
    typeString = "NDATA";
    break;
  default:
    CANNOT_HAPPEN();
  }
  os() << defineExternalEntityCode << entity->name()
       << space << typeString
       << space << notation->name()
       << nl;
  attributes(entity->attributes(), dataAttributeCode, &entity->name());
}

void SgmlsEventHandler::defineSubdocEntity(const SubdocEntity *entity)
{
  externalId(entity->externalId());
  os() << defineSubdocEntityCode << entity->name() << nl;
}

void SgmlsEventHandler::defineExternalTextEntity(const ExternalEntity *entity)
{
  externalId(entity->externalId());
  os() << defineExternalTextEntityCode << entity->name() << nl;
}

void SgmlsEventHandler::defineInternalEntity(const InternalEntity *entity)
{
  os() << defineInternalEntityCode << entity->name() << space;
  const char *s;
  switch (entity->dataType()) {
  case Entity::sdata:
    s = "SDATA";
    break;
  case Entity::cdata:
    s = "CDATA";
    break;
  case Entity::sgmlText:
    s = "TEXT";
    break;
  case Entity::pi:
    s = "PI";
    break;
  default:
    CANNOT_HAPPEN();
  }
  os() << s << space;
  outputString(entity->string());
  os() << nl;
}

void SgmlsEventHandler::defineNotation(const Notation *notation)
{
  if (markNotation(notation))
    return;
  externalId(notation->externalId(), outputNotationSysid_);
  os() << defineNotationCode << notation->name() << nl;
}

void SgmlsEventHandler::externalId(const ExternalId &id, Boolean outputFile)
{
  const StringC *str = id.publicIdString();
  if (str) {
    os() << pubidCode;
    outputString(*str);
    os() << nl;
  }
  str = id.systemIdString();
  if (str) {
    os() << sysidCode;
    outputString(*str);
    os() << nl;
  }
  if (outputFile && id.effectiveSystemId().size()) {
    os() << fileCode;
    outputString(id.effectiveSystemId());
    os() << nl;
  }
}

Boolean SgmlsEventHandler::markEntity(const Entity *entity)
{
  return definedEntities_.add(entity->name());
}

Boolean SgmlsEventHandler::markNotation(const Notation *notation)
{
  return definedNotations_.add(notation->name());
}

void SgmlsEventHandler::outputString(const Char *p, size_t n)
{
  for (; n > 0; p++, n--) {
    switch (*p) {
    case escapePrefixChar:
      os() << escapePrefix << escapePrefix;
      break;
    case reChar:
      os() << escapePrefix << newlineEscape;
      if (outputLine_ && haveData_)
	lastLineno_++;
      break;
    default:
      // FIXME not clear what to do here given possibility of wide characters
      unsigned long c = *p;
      if (c < 040) {
	static const char digits[] = "0123456789";
	os() << escapePrefix << '0' << digits[(c / 8) % 8] << digits[c % 8];
      }
      else
	os().put(*p);
      break;
    }
  }
}

void SgmlsEventHandler::escaper(OutputCharStream &s, Char c)
{
  s << escapePrefix << numEscape << (unsigned long)c << escapeEnd;
}

void SgmlsEventHandler::outputLocation1(const Location &loc)
{
  const Origin *origin = loc.origin().pointer();
  const InputSourceOrigin *inputSourceOrigin;
  const ExternalInfo *info;
  Index index = loc.index();
  for (;;) {
    if (!origin)
      return;
    inputSourceOrigin = origin->asInputSourceOrigin();
    if (inputSourceOrigin) {
      info = inputSourceOrigin->externalInfo();
      if (info)
	break;
    }
    const Location &loc = origin->parent();
    index = loc.index();
    origin = loc.origin().pointer();
  }
  Offset off = inputSourceOrigin->startOffset(index);
  StorageObjectLocation soLoc;
  if (!ExtendEntityManager::externalize(info, off, soLoc))
    return;
  if (soLoc.lineNumber == (unsigned long)-1)
    return;
  if (soLoc.storageObjectSpec == lastSos_) {
    if (soLoc.lineNumber == lastLineno_)
      return;
    flushData();
    os() << locationCode << soLoc.lineNumber << nl;
    lastLineno_ = soLoc.lineNumber;
  }
  else {
    flushData();
    os() << locationCode << soLoc.lineNumber << space;
    outputString(soLoc.actualStorageId);
    os() << nl;
    lastLineno_ = soLoc.lineNumber;
    lastSos_ = soLoc.storageObjectSpec;
    lastLoc_ = loc;		// make sure lastSos_ doesn't get freed
  }
}

void SgmlsEventHandler::dispatchMessage(const Message &msg)
{
  if (!cancelled()) {
    noteMessage(msg);
    messenger_->dispatchMessage(msg);
  }
}

void SgmlsEventHandler::initMessage(Message &msg)
{
  msg.loc = currentLocation_;
}

SgmlsSubdocState::SgmlsSubdocState()
: haveLinkProcess_(0), parser_(0)
{
}

SgmlsSubdocState::SgmlsSubdocState(const SgmlParser *parser)
: haveLinkProcess_(0), parser_(parser)
{
}

void SgmlsSubdocState::init(const SgmlParser *parser)
{
  parser_ = parser;
  definedNotations_.clear();
  definedEntities_.clear();
  haveLinkProcess_ = 0;
  linkProcess_.clear();
}

void SgmlsSubdocState::swap(SgmlsSubdocState &to)
{
  {
    const SgmlParser *tem = to.parser_;
    to.parser_ = parser_;
    parser_ = tem;
  }
  {
    Boolean tem = to.haveLinkProcess_;
    to.haveLinkProcess_ = haveLinkProcess_;
    haveLinkProcess_ = tem;
  }
  linkProcess_.swap(to.linkProcess_);
  definedNotations_.swap(to.definedNotations_);
  definedEntities_.swap(to.definedEntities_);
}

#ifdef SP_NAMESPACE
}
#endif
