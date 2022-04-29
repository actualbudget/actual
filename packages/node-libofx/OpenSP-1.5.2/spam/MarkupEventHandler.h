// Copyright (c) 1995 James Clark
// See the file COPYING for copying permission.

#ifndef MarkupEventHandler_INCLUDED
#define MarkupEventHandler_INCLUDED 1

#ifdef __GNUG__
#pragma interface
#endif

#include "Event.h"
#include "ErrorCountEventHandler.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class MarkupEventHandler : public ErrorCountEventHandler {
public:
  MarkupEventHandler();
  void startElement(StartElementEvent *);
  void endElement(EndElementEvent *);
  void uselink(UselinkEvent *);
  void usemap(UsemapEvent *);
  void startDtd(StartDtdEvent *);
  void endDtd(EndDtdEvent *);
  void startLpd(StartLpdEvent *);
  void endLpd(EndLpdEvent *);
  void sgmlDecl(SgmlDeclEvent *);
  void commentDecl(CommentDeclEvent *);
  void markedSectionStart(MarkedSectionStartEvent *);
  void markedSectionEnd(MarkedSectionEndEvent *);
  void notationDecl(NotationDeclEvent *);
  void entityDecl(EntityDeclEvent *);
  void elementDecl(ElementDeclEvent *);
  void attlistDecl(AttlistDeclEvent *);
  void linkAttlistDecl(LinkAttlistDeclEvent *);
  void attlistNotationDecl(AttlistNotationDeclEvent *);
  void linkDecl(LinkDeclEvent *);
  void idLinkDecl(IdLinkDeclEvent *);
  void shortrefDecl(ShortrefDeclEvent *);
  void ignoredMarkup(IgnoredMarkupEvent *);

  virtual void markup(const Location &, const Markup &);
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not MarkupEventHandler_INCLUDED */
