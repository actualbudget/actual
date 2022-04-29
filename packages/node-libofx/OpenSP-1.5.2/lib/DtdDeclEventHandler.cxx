// Copyright (c) 1999 Matthias Clasen
// See the file COPYING for copying permission.

#include "splib.h"
#include "DtdDeclEventHandler.h"
#include "macros.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif
  
DtdDeclEventHandler::DtdDeclEventHandler(const StringC &pubid)
: pubid_(pubid), match_(0)
{
}

void DtdDeclEventHandler::message(MessageEvent *event)
{
  switch (event->message().type->severity()) {
  case MessageType::quantityError:
  case MessageType::error:
  case MessageType::idrefError:
    delete event;
    cancel();
    break;
  case MessageType::info:
  case MessageType::warning:
    delete event;
    break;
  }
}

void DtdDeclEventHandler::startDtd(StartDtdEvent *event)
{
  const Entity *entity = event->entity().pointer();
  if (entity) {
    const StringC *pubid = 
      entity->asExternalEntity()->externalId().publicIdString();
    if (pubid && pubid_ == *pubid) 
      match_ = 1;
  }
  delete event;
  cancel();
}

Boolean DtdDeclEventHandler::match() const
{
  return match_;
}

#ifdef SP_NAMESPACE
}
#endif



