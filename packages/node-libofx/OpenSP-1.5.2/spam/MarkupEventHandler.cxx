// Copyright (c) 1995 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif

#include "config.h"
#include "MarkupEventHandler.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

MarkupEventHandler::MarkupEventHandler()
{
}

void MarkupEventHandler::startElement(StartElementEvent *event)
{
  if (event->markupPtr())
    markup(event->location(), *event->markupPtr());
  delete event;
}

void MarkupEventHandler::endElement(EndElementEvent *event)
{
  if (event->markupPtr())
    markup(event->location(), *event->markupPtr());
  delete event;
}

void MarkupEventHandler::uselink(UselinkEvent *event)
{
  markup(event->location(), event->markup());
  delete event;
}

void MarkupEventHandler::usemap(UsemapEvent *event)
{
  markup(event->location(), event->markup());
  delete event;
}

void MarkupEventHandler::startDtd(StartDtdEvent *event)
{
  markup(event->location(), event->markup());
  delete event;
}

void MarkupEventHandler::endDtd(EndDtdEvent *event)
{
  markup(event->location(), event->markup());
  delete event;
}

void MarkupEventHandler::startLpd(StartLpdEvent *event)
{
  markup(event->location(), event->markup());
  delete event;
}

void MarkupEventHandler::endLpd(EndLpdEvent *event)
{
  markup(event->location(), event->markup());
  delete event;
}

void MarkupEventHandler::sgmlDecl(SgmlDeclEvent *event)
{
  markup(event->location(), event->markup());
  delete event;
}

void MarkupEventHandler::commentDecl(CommentDeclEvent *event)
{
  markup(event->location(), event->markup());
  delete event;
}

void MarkupEventHandler::markedSectionStart(MarkedSectionStartEvent *event)
{
  markup(event->location(), event->markup());
  delete event;
}

void MarkupEventHandler::markedSectionEnd(MarkedSectionEndEvent *event)
{
  markup(event->location(), event->markup());
  delete event;
}

void MarkupEventHandler::notationDecl(NotationDeclEvent *event)
{
  markup(event->location(), event->markup());
  delete event;
}

void MarkupEventHandler::entityDecl(EntityDeclEvent *event)
{
  markup(event->location(), event->markup());
  delete event;
}

void MarkupEventHandler::elementDecl(ElementDeclEvent *event)
{
  markup(event->location(), event->markup());
  delete event;
}

void MarkupEventHandler::attlistDecl(AttlistDeclEvent *event)
{
  markup(event->location(), event->markup());
  delete event;
}

void MarkupEventHandler::linkAttlistDecl(LinkAttlistDeclEvent *event)
{
  markup(event->location(), event->markup());
  delete event;
}

void MarkupEventHandler::attlistNotationDecl(AttlistNotationDeclEvent *event)
{
  markup(event->location(), event->markup());
  delete event;
}

void MarkupEventHandler::linkDecl(LinkDeclEvent *event)
{
  markup(event->location(), event->markup());
  delete event;
}

void MarkupEventHandler::idLinkDecl(IdLinkDeclEvent *event)
{
  markup(event->location(), event->markup());
  delete event;
}

void MarkupEventHandler::shortrefDecl(ShortrefDeclEvent *event)
{
  markup(event->location(), event->markup());
  delete event;
}

void MarkupEventHandler::ignoredMarkup(IgnoredMarkupEvent *event)
{
  markup(event->location(), event->markup());
  delete event;
}

void MarkupEventHandler::markup(const Location &, const Markup &)
{
}

#ifdef SP_NAMESPACE
}
#endif
