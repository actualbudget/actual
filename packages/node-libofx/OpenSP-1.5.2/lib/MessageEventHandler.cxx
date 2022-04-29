// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#include "splib.h"
#include "MessageEventHandler.h"
#include "SgmlParser.h"
#include "ParserOptions.h"
#ifdef __GNUG__
#include "Entity.h"
#endif

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

MessageEventHandler::MessageEventHandler(Messenger *messenger,
					 const SgmlParser *parser)
: messenger_(messenger), parser_(parser)
{
}

void MessageEventHandler::subdocEntity(SubdocEntityEvent *event)
{
  const SubdocEntity *entity = event->entity();
  if (entity && parser_) {
    SgmlParser::Params params;
    params.subdocReferenced = 1;
    params.subdocInheritActiveLinkTypes = 1;
    params.origin = event->entityOrigin()->copy();
    params.parent = parser_;
    params.sysid = entity->externalId().effectiveSystemId();
    params.entityType = SgmlParser::Params::subdoc;
    SgmlParser parser(params);
    const SgmlParser *oldParser = parser_;
    parser_ = &parser;
    parser.parseAll(*this);
    parser_ = oldParser;
  }
  delete event;
}

void MessageEventHandler::message(MessageEvent *event)
{
  messenger_->dispatchMessage(event->message());
  ErrorCountEventHandler::message(event);
}

#ifdef SP_NAMESPACE
}
#endif
