// Copyright (c) 1996 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif

#include "splib.h"
#include "GenericEventHandler.h"
#include "macros.h"
#include "ExtendEntityManager.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SpOpenEntity : public SGMLApplication::OpenEntity {
public:
  SpOpenEntity(const ConstPtr<Origin> &origin);
  SGMLApplication::Location location(SGMLApplication::Position) const;
private:
  ConstPtr<Origin> origin_;
  StorageObjectLocation soLoc_;
};

inline
void GenericEventHandler::freeAll()
{
  if (allocBlocks_)
    freeAll1();
}

inline
void GenericEventHandler::clearNotation(SGMLApplication::Notation &to)
{
  clearString(to.name);
}

inline
void GenericEventHandler::setLocation(SGMLApplication::Position &pos,
				  const Location &loc)
{
  if (lastOrigin_ != loc.origin())
    setLocation1(pos, loc);
  else
    pos = loc.index();
}

GenericEventHandler::GenericEventHandler(SGMLApplication &app,
					 bool generalEntities)
: app_(&app), generalEntities_(generalEntities),
  freeBlocks_(0), allocBlocks_(0), firstBlockSpare_(0), firstBlockUsed_(0)
{
}

GenericEventHandler::~GenericEventHandler()
{
  freeAll();
  while (freeBlocks_) {
    Block *tem = freeBlocks_;
    freeBlocks_ = freeBlocks_->next;
    delete [] tem->mem;
    delete tem;
  }
}

void GenericEventHandler::freeAll1()
{
  Block **p;
  for (p = &allocBlocks_; *p; p = &(*p)->next)
    ;
  *p = freeBlocks_;
  freeBlocks_ = allocBlocks_;
  allocBlocks_ = 0;
  if (freeBlocks_)
    firstBlockSpare_ = freeBlocks_->size;
  else
    firstBlockSpare_ = 0;
  firstBlockUsed_ = 0;
}

void *GenericEventHandler::allocate(size_t n)
{
  if (n == 0)
    return 0;
  // round up to avoid alignment problems
  n = (n + sizeof(char *) - 1) & ~(sizeof(char *) - 1);
  enum { BIG = 1024 };
  if (n > firstBlockSpare_) {
    if (freeBlocks_ && firstBlockUsed_) {
      Block *tem = freeBlocks_;
      freeBlocks_ = freeBlocks_->next;
      tem->next = allocBlocks_;
      allocBlocks_ = tem;
    }
    if (!freeBlocks_ || freeBlocks_->size < n) {
      Block *tem = new Block;
      tem->size = n < BIG ? int(BIG) : n;
      tem->mem = new char[tem->size];
      tem->next = freeBlocks_;
      freeBlocks_ = tem;
    }
    firstBlockUsed_ = 0;
    firstBlockSpare_ = freeBlocks_->size;
  }
  char *tem = freeBlocks_->mem + firstBlockUsed_;
  firstBlockUsed_ += n;
  firstBlockSpare_ -= n;
  return tem;
}

void GenericEventHandler::startElement(StartElementEvent *event)
{
  SGMLApplication::StartElementEvent appEvent;
  setString(appEvent.gi, event->name());
  const ElementDefinition *def = event->elementType()->definition();
  switch (def->declaredContent()) {
  case ElementDefinition::modelGroup:
    appEvent.contentType
      = (def->compiledModelGroup()->containsPcdata()
	 ? SGMLApplication::StartElementEvent::mixed
	 : SGMLApplication::StartElementEvent::element);
    break;
  case ElementDefinition::any:
    appEvent.contentType = SGMLApplication::StartElementEvent::mixed;
    break;
  case ElementDefinition::cdata:
    appEvent.contentType = SGMLApplication::StartElementEvent::cdata;
    break;
  case ElementDefinition::rcdata:
    appEvent.contentType = SGMLApplication::StartElementEvent::rcdata;
    break;
  case ElementDefinition::empty:
    appEvent.contentType = SGMLApplication::StartElementEvent::empty;
    break;
  }
  appEvent.included = event->included();
  appEvent.nAttributes = event->attributes().size();
  if (appEvent.nAttributes != 0) {
    if (event->attributes().conref())
      appEvent.contentType = SGMLApplication::StartElementEvent::empty;
    setAttributes(appEvent.attributes, event->attributes());
  }
  setLocation(appEvent.pos, event->location());
  app_->startElement(appEvent);
  freeAll();
  delete event;
}

void GenericEventHandler::endElement(EndElementEvent *event)
{
  SGMLApplication::EndElementEvent appEvent;
  setString(appEvent.gi, event->name());
  setLocation(appEvent.pos, event->location());
  app_->endElement(appEvent);
  delete event;
}

void GenericEventHandler::data(DataEvent *event)
{
  SGMLApplication::DataEvent appEvent;
  appEvent.data.ptr = event->data();
  appEvent.data.len = event->dataLength();
  setLocation(appEvent.pos, event->location());
  app_->data(appEvent);
  delete event;
}

void GenericEventHandler::pi(PiEvent *event)
{
  SGMLApplication::PiEvent appEvent;
  appEvent.data.ptr = event->data();
  appEvent.data.len = event->dataLength();
  const Entity *entity = event->entity();
  if (entity)
    setString(appEvent.entityName, entity->name());
  else
    appEvent.entityName.len = 0;
  setLocation(appEvent.pos, event->location());
  app_->pi(appEvent);
  delete event;
}

void GenericEventHandler::sdataEntity(SdataEntityEvent *event)
{
  SGMLApplication::SdataEvent appEvent;
  appEvent.text.ptr = event->data();
  appEvent.text.len = event->dataLength();
  setString(appEvent.entityName, event->entity()->name());
  // Don't want location of chars in entity.
  setLocation(appEvent.pos, event->location().origin()->parent());
  app_->sdata(appEvent);
  delete event;
}

void GenericEventHandler::externalDataEntity(ExternalDataEntityEvent *event)
{
  SGMLApplication::ExternalDataEntityRefEvent appEvent;
  setEntity(appEvent.entity, *event->entity());
  setLocation(appEvent.pos, event->location());
  app_->externalDataEntityRef(appEvent);
  freeAll();
  delete event;
}

void GenericEventHandler::subdocEntity(SubdocEntityEvent *event)
{
  SGMLApplication::SubdocEntityRefEvent appEvent;
  setEntity(appEvent.entity, *event->entity());
  setLocation(appEvent.pos, event->location());
  app_->subdocEntityRef(appEvent);
  freeAll();
  delete event;
}

void GenericEventHandler::nonSgmlChar(NonSgmlCharEvent *event)
{
  SGMLApplication::NonSgmlCharEvent appEvent;
  appEvent.c = event->character();
  setLocation(appEvent.pos, event->location());
  app_->nonSgmlChar(appEvent);
  delete event;
}

void GenericEventHandler::startDtd(StartDtdEvent *event)
{
  SGMLApplication::StartDtdEvent appEvent;
  setString(appEvent.name, event->name());
  const Entity *entity = event->entity().pointer();
  if (entity) {
    appEvent.haveExternalId = 1;
    setExternalId(appEvent.externalId,
		  entity->asExternalEntity()->externalId());
  }
  else
    appEvent.haveExternalId = 0;
  setLocation(appEvent.pos, event->location());
  app_->startDtd(appEvent);
  freeAll();
  delete event;
}

void GenericEventHandler::endDtd(EndDtdEvent *event)
{
  SGMLApplication::EndDtdEvent appEvent;
  setString(appEvent.name, event->dtd().name());
  setLocation(appEvent.pos, event->location());
  app_->endDtd(appEvent);
  delete event;
}

void GenericEventHandler::endProlog(EndPrologEvent *event)
{
  if (generalEntities_) {
    SGMLApplication::GeneralEntityEvent entityEvent;
    const Dtd &dtd = event->dtd();
    Dtd::ConstEntityIter iter(dtd.generalEntityIter());
    for (;;) {
      const Entity *entity = iter.nextTemp();
      if (!entity)
	break;
      setEntity(entityEvent.entity, *entity);
      app_->generalEntity(entityEvent);
    }
    freeAll();
  }
  SGMLApplication::EndPrologEvent appEvent;
  setLocation(appEvent.pos, event->location());
  app_->endProlog(appEvent);
  delete event;
}

void GenericEventHandler::entityDefaulted(EntityDefaultedEvent *event)
{
  if (generalEntities_) {
    SGMLApplication::GeneralEntityEvent appEvent;
    setEntity(appEvent.entity, event->entity());
    app_->generalEntity(appEvent);
  }
  delete event;
}

void GenericEventHandler::appinfo(AppinfoEvent *event)
{
  SGMLApplication::AppinfoEvent appEvent;
  const StringC *str;
  if (event->literal(str)) {
    setString(appEvent.string, *str);
    appEvent.none = 0;
  }
  else
    appEvent.none = 1;
  setLocation(appEvent.pos, event->location());
  app_->appinfo(appEvent);
  delete event;
}

void GenericEventHandler::commentDecl(CommentDeclEvent *event)
{
  SGMLApplication::CommentDeclEvent appEvent;
  appEvent.nComments = 0;
  {
    for (MarkupIter iter(event->markup()); iter.valid(); iter.advance())
      if (iter.type() == Markup::comment)
	appEvent.nComments++;
  }
  SGMLApplication::CharString *comments
    = (SGMLApplication::CharString *)allocate(appEvent.nComments * 2
					      * sizeof(SGMLApplication::CharString));
  appEvent.comments = comments;
  appEvent.seps = appEvent.comments + appEvent.nComments;
  size_t i = 0;
  for (MarkupIter iter(event->markup()); iter.valid(); iter.advance())
    switch (iter.type()) {
    case Markup::comment:
      comments[i].ptr = iter.charsPointer();
      comments[i].len = iter.charsLength();
      clearString(comments[appEvent.nComments + i]);
      i++;
      break;
    case Markup::s:
      comments[appEvent.nComments + i - 1].ptr = iter.charsPointer();
      comments[appEvent.nComments + i - 1].len = iter.charsLength();
      break;
    default:
      break;
    }
  setLocation(appEvent.pos, event->location());
  app_->commentDecl(appEvent);
  freeAll();
  delete event;
}

void GenericEventHandler::markedSectionStart(MarkedSectionStartEvent *event)
{
  SGMLApplication::MarkedSectionStartEvent appEvent;
  unsigned depth = 0;
  appEvent.nParams = 0;
  {
    for (MarkupIter iter(event->markup()); iter.valid(); iter.advance())
      switch (iter.type()) {
      case Markup::reservedName:
	if (!depth)
	  appEvent.nParams++;
	break;
      case Markup::entityStart:
	if (!depth)
	  appEvent.nParams++;
	depth++;
	break;
      case Markup::entityEnd:
	depth--;
	break;
      default:
	break;
      }
  }
  SGMLApplication::MarkedSectionStartEvent::Param *params
    = (SGMLApplication::MarkedSectionStartEvent::Param *)
      allocate(appEvent.nParams * sizeof(appEvent.params[0]));
  appEvent.params = params;
  size_t i = 0;
  for (MarkupIter iter(event->markup()); iter.valid(); iter.advance())
    switch (iter.type()) {
    case Markup::reservedName:
      if (!depth) {
	switch (iter.reservedName()) {
	case Syntax::rTEMP:
	  params[i].type
	    = SGMLApplication::MarkedSectionStartEvent::Param::temp;
	  break;
	case Syntax::rINCLUDE:
	  params[i].type
	    = SGMLApplication::MarkedSectionStartEvent::Param::include;
	  break;
	case Syntax::rRCDATA:
	  params[i].type
	    = SGMLApplication::MarkedSectionStartEvent::Param::rcdata;
	  break;
	case Syntax::rCDATA:
	  params[i].type
	    = SGMLApplication::MarkedSectionStartEvent::Param::cdata;
	  break;
	case Syntax::rIGNORE:
	  params[i].type
	    = SGMLApplication::MarkedSectionStartEvent::Param::ignore;
	  break;
	default:
	  CANNOT_HAPPEN();
	}
	clearString(params[i].entityName);
	i++;
      }
      break;
    case Markup::entityStart:
      if (!depth) {
	params[i].type
	  = SGMLApplication::MarkedSectionStartEvent::Param::entityRef;
	setString(params[i].entityName,
		  iter.entityOrigin()->entity()->name());
	i++;
      }
      depth++;
      break;
    case Markup::entityEnd:
      depth--;
      break;
    default:
      break;
    }
  switch (event->status()) {
  case MarkedSectionEvent::include:
    appEvent.status = SGMLApplication::MarkedSectionStartEvent::include;
    break;
  case MarkedSectionEvent::rcdata:
    appEvent.status = SGMLApplication::MarkedSectionStartEvent::rcdata;
    break;
  case MarkedSectionEvent::cdata:
    appEvent.status = SGMLApplication::MarkedSectionStartEvent::cdata;
    break;
  case MarkedSectionEvent::ignore:
    appEvent.status = SGMLApplication::MarkedSectionStartEvent::ignore;
    break;
  }
  setLocation(appEvent.pos, event->location());
  app_->markedSectionStart(appEvent);
  freeAll();
  delete event;
}

void GenericEventHandler::ignoredChars(IgnoredCharsEvent *event)
{
  SGMLApplication::IgnoredCharsEvent appEvent;
  appEvent.data.ptr = event->data();
  appEvent.data.len = event->dataLength();
  setLocation(appEvent.pos, event->location());
  app_->ignoredChars(appEvent);
  delete event;
}

void GenericEventHandler::markedSectionEnd(MarkedSectionEndEvent *event)
{
  SGMLApplication::MarkedSectionEndEvent appEvent;
  switch (event->status()) {
  case MarkedSectionEvent::include:
    appEvent.status = SGMLApplication::MarkedSectionEndEvent::include;
    break;
  case MarkedSectionEvent::rcdata:
    appEvent.status = SGMLApplication::MarkedSectionEndEvent::rcdata;
    break;
  case MarkedSectionEvent::cdata:
    appEvent.status = SGMLApplication::MarkedSectionEndEvent::cdata;
    break;
  case MarkedSectionEvent::ignore:
    appEvent.status = SGMLApplication::MarkedSectionEndEvent::ignore;
    break;
  }
  setLocation(appEvent.pos, event->location());
  app_->markedSectionEnd(appEvent);
  delete event;
}

void GenericEventHandler::message(MessageEvent *event)
{
  SGMLApplication::ErrorEvent appEvent;
  switch (event->message().type->severity()) {
  case MessageType::quantityError:
    appEvent.type = SGMLApplication::ErrorEvent::quantity;
    break;
  case MessageType::idrefError:
    appEvent.type = SGMLApplication::ErrorEvent::idref;
    break;
  case MessageType::error:
    appEvent.type = SGMLApplication::ErrorEvent::otherError;
    break;
  case MessageType::info:
    appEvent.type = SGMLApplication::ErrorEvent::info;
    break;
  case MessageType::warning:
    appEvent.type = SGMLApplication::ErrorEvent::warning;
    break;
  }
  setLocation(appEvent.pos, event->message().loc);
  StringC str;
  reportMessage(event->message(), str);
  setString(appEvent.message, str);
  app_->error(appEvent);
  ErrorCountEventHandler::message(event);
}

void GenericEventHandler::setLocation1(SGMLApplication::Position &pos,
				   const Location &loc)
{
  const Location *locp = &loc;
  for (;;) {
    if (locp->origin().isNull()) {
      lastOrigin_.clear();
      openEntityPtr_ = (SpOpenEntity *)0;
      return;
    }
    const InputSourceOrigin *origin = locp->origin()->asInputSourceOrigin();
    if (origin && origin->externalInfo())
      break;
    locp = &locp->origin()->parent();
  }
  lastOrigin_ = locp->origin();
  pos = locp->index();
  openEntityPtr_ = new SpOpenEntity(locp->origin());
  app_->openEntityChange(openEntityPtr_);
}

void 
GenericEventHandler::setAttributes(const SGMLApplication::Attribute *&attributes,
			       const AttributeList &attributeList)
{
  size_t nAttributes = attributeList.size();
  SGMLApplication::Attribute *to
    = (SGMLApplication::Attribute *)allocate(nAttributes * sizeof(*to));
  attributes = to;
  for (size_t i = 0; i < nAttributes; i++) {
    SGMLApplication::Attribute *p = to + i;
    setString(p->name, attributeList.name(i));
    const AttributeValue *value = attributeList.value(i);
    if (!value)
      p->type = SGMLApplication::Attribute::invalid;
    else {
      const Text *text;
      const StringC *string;
      switch (value->info(text, string)) {
      case AttributeValue::implied:
	p->type = SGMLApplication::Attribute::implied;
	break;
      case AttributeValue::tokenized:
	{
	  if (attributeList.specified(i))
	    p->defaulted = SGMLApplication::Attribute::specified;
	  else if (attributeList.current(i))
	    p->defaulted = SGMLApplication::Attribute::current;
	  else
	    p->defaulted = SGMLApplication::Attribute::definition;
	  p->type = SGMLApplication::Attribute::tokenized;
	  p->nEntities = 0;
	  p->notation.name.len = 0;
	  p->isId = attributeList.id(i);
	  p->isGroup = (attributeList.getAllowedTokens(i) != 0);
	  setString(p->tokens, *string);
	  const AttributeSemantics *semantics = attributeList.semantics(i);
	  if (semantics) {
	    ConstPtr<Notation> notation = semantics->notation();
	    if (!notation.isNull())
	      setNotation(p->notation, *notation);
	    else {
	      size_t nEntities = semantics->nEntities();
	      if (nEntities) {
		SGMLApplication::Entity *v
		  = (SGMLApplication::Entity *)allocate(nEntities * sizeof(*v));
		p->entities = v;
		p->nEntities = nEntities;
		for (size_t i = 0; i < nEntities; i++)
		  setEntity(v[i], *semantics->entity(i));
	      }
	    }
	  }
	}
	break;
      case AttributeValue::cdata:
	{
	  p->type = SGMLApplication::Attribute::cdata;
	  if (attributeList.specified(i))
	    p->defaulted = SGMLApplication::Attribute::specified;
	  else if (attributeList.current(i))
	    p->defaulted = SGMLApplication::Attribute::current;
	  else
	    p->defaulted = SGMLApplication::Attribute::definition;
	  TextItem::Type type;
	  const Char *s;
	  size_t length;
	  const Location *loc;
	  size_t nChunks = 0;
	  {
	    TextIter iter(*text);
	    while (iter.next(type, s, length, loc))
	      switch (type) {
	      case TextItem::data:
	      case TextItem::sdata:
	      case TextItem::cdata:
	      case TextItem::nonSgml:
		nChunks++;
		break;
	      default:
		break;
	      }
	  }
	  p->cdataChunks
	    = (SGMLApplication::Attribute::CdataChunk *)allocate(nChunks * sizeof(SGMLApplication::Attribute::CdataChunk));
	  p->nCdataChunks = nChunks;

	  {
	    size_t i = 0;
	    for (TextIter iter(*text); iter.next(type, s, length, loc);) {
	      switch (type) {
	      case TextItem::data:
	      case TextItem::sdata:
	      case TextItem::cdata:
		{
		  SGMLApplication::Attribute::CdataChunk *chunk
		    = (SGMLApplication::Attribute::CdataChunk *)(p->cdataChunks + i++);
		  if (type != TextItem::sdata) {
		    chunk->isSdata = 0;
		    chunk->isNonSgml = 0;
		  }
		  else {
		    chunk->isSdata = 1;
		    setString(chunk->entityName,
			      *loc->origin()->asInputSourceOrigin()->entityName());
		  }
		  chunk->data.ptr = s;
		  chunk->data.len = length;
		}
		break;
	      case TextItem::nonSgml:
		{
		  SGMLApplication::Attribute::CdataChunk *chunk
		    = (SGMLApplication::Attribute::CdataChunk *)(p->cdataChunks + i++);
		  chunk->isSdata = 0;
		  chunk->isNonSgml = 1;
		  chunk->nonSgmlChar = *s;
		  chunk->data.len = 0;
		  chunk->data.ptr = 0;
		}
		break;
	      default:
		break;
	      }
	    }
	  }
	}
	break;
      }
    }
  }
}


void GenericEventHandler::setEntity(SGMLApplication::Entity &to,
				const Entity &from)
{
  setString(to.name, from.name());
  switch (from.declType()) {
  case Entity::generalEntity:
    to.declType = SGMLApplication::Entity::general;
    break;
  case Entity::parameterEntity:
    to.declType = SGMLApplication::Entity::parameter;
    break;
  case Entity::doctype:
    to.declType = SGMLApplication::Entity::doctype;
    break;
  case Entity::linktype:
    to.declType = SGMLApplication::Entity::linktype;
    break;
  default:
    CANNOT_HAPPEN();
  }
  switch (from.dataType()) {
  case Entity::sgmlText:
    to.dataType = SGMLApplication::Entity::sgml;
    break;
  case Entity::cdata:
    to.dataType = SGMLApplication::Entity::cdata;
    break;
  case Entity::sdata:
    to.dataType = SGMLApplication::Entity::sdata;
    break;
  case Entity::ndata:
    to.dataType = SGMLApplication::Entity::ndata;
    break;
  case Entity::subdoc:
    to.dataType = SGMLApplication::Entity::subdoc;
    break;
  case Entity::pi:
    to.dataType = SGMLApplication::Entity::pi;
    break;
  }
  const InternalEntity *internal = from.asInternalEntity();
  if (internal) {
    to.isInternal = 1;
    setString(to.text, internal->string());
  }
  else {
    const ExternalEntity *external = from.asExternalEntity();
    to.isInternal = 0;
    setExternalId(to.externalId, external->externalId());
    const ExternalDataEntity *externalData = from.asExternalDataEntity();
    if (externalData) {
      setNotation(to.notation, *externalData->notation());
      to.nAttributes = externalData->attributes().size();
      if (to.nAttributes)
	setAttributes(to.attributes, externalData->attributes());
    }
    else {
      to.notation.name.len = 0;
      to.nAttributes = 0;
    }
  }
}


void GenericEventHandler::setNotation(SGMLApplication::Notation &to,
				      const Notation &from)
{
  setString(to.name, from.name());
  setExternalId(to.externalId, from.externalId());
}

void GenericEventHandler::setExternalId(SGMLApplication::ExternalId &to,
					const ExternalId &from)
{
  const StringC *str;
  str = from.systemIdString();
  if (str) {
    to.haveSystemId = 1;
    setString(to.systemId, *str);
  }
  else
    to.haveSystemId = 0;
  str = from.publicIdString();
  if (str) {
    to.havePublicId = 1;
    setString(to.publicId, *str);
  }
  else
    to.havePublicId = 0;
  str = &from.effectiveSystemId();
  if (str->size()) {
    to.haveGeneratedSystemId = 1;
    setString(to.generatedSystemId, *str);
  }
  else
    to.haveGeneratedSystemId = 0;
}

MsgGenericEventHandler::MsgGenericEventHandler(SGMLApplication &app, 
					       bool generalEntities,
					       MessageReporter &reporter,
					       const bool *messagesInhibitedPtr)
: GenericEventHandler(app, generalEntities),
  reporter_(&reporter),
  messagesInhibitedPtr_(messagesInhibitedPtr)
{
}

void MsgGenericEventHandler::reportMessage(const Message &msg, StringC &str)
{
  WrapReporter wrap(reporter_);
  reporter_->dispatchMessage(msg);
  wrap.strStream.extractString(str);
  if (!*messagesInhibitedPtr_)
    *wrap.origStream << str;
}

SpOpenEntity::SpOpenEntity(const ConstPtr<Origin> &origin)
: origin_(origin)
{
}

SGMLApplication::Location
SpOpenEntity::location(SGMLApplication::Position pos) const
{
  SGMLApplication::Location loc;
  const Origin *origin = origin_.pointer();
  const InputSourceOrigin *inputSourceOrigin;
  const ExternalInfo *externalInfo;
  Index index = Index(pos);
  for (;;) {
    if (!origin)
      return loc;
    inputSourceOrigin = origin->asInputSourceOrigin();
    if (inputSourceOrigin) {
      externalInfo = inputSourceOrigin->externalInfo();
      if (externalInfo)
	break;
    }
    // Qualifier is for CodeWarrior
    const ::SP_NAMESPACE_SCOPE Location &loc = origin->parent();
    index = loc.index();
    origin = loc.origin().pointer();
  }
  const StringC *entityName = inputSourceOrigin->entityName();
  if (entityName)
    GenericEventHandler::setString(loc.entityName, *entityName);
  Offset off = inputSourceOrigin->startOffset(index);
  loc.entityOffset = off;
  if (!ExtendEntityManager::externalize(externalInfo, off, ((SpOpenEntity *)this)->soLoc_))
    return loc;
  loc.lineNumber = soLoc_.lineNumber;
  GenericEventHandler::setString(loc.filename, soLoc_.actualStorageId);
  loc.columnNumber = soLoc_.columnNumber;
  loc.byteOffset = soLoc_.byteIndex;
  loc.other = soLoc_.storageObjectSpec;
  return loc;
}

#ifdef SP_NAMESPACE
}
#endif
