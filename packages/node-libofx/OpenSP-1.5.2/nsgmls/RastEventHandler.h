// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef RastEventHandler_INCLUDED
#define RastEventHandler_INCLUDED 1
#ifdef __GNUG__
#pragma interface
#endif

#include "Event.h"
#include "Vector.h"
#include "Vector.h"
#include "Boolean.h"
#include "Vector.h"
#include "StringC.h"
#include "types.h"
#include "OutputCharStream.h"
#include "LinkProcess.h"
#include "Message.h"
#include "Link.h"
#include "IQueue.h"
#include "ErrorCountEventHandler.h"

#include <limits.h>
#include <stddef.h>

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class AttributeList;
class ExternalDataEntity;
class SubdocEntity;
class ExternalId;
class InternalEntity;
class SgmlParser;

class RastPrintable {
public:
  RastPrintable();
  int operator()(Char c) const;
private:
  char v_[UCHAR_MAX + 1];
};

class RastEventHandler;

class RastLinkProcess : public LinkProcess {
public:
  RastLinkProcess();
  void setHandler(RastEventHandler *);
  Boolean selectLinkRule(const Vector<const AttributeList *> &linkAttributes,
			 const Location &location,
			 size_t &selected);
  void swap(RastLinkProcess &);
private:
  Boolean selectLinkRulePi(const StringC &str,
			   const Location &loc,
			   const Vector<const AttributeList *> &linkAttributes,
			   size_t &selected);

  RastLinkProcess(const RastLinkProcess &); // undefined
  void operator=(RastLinkProcess &);	    // undefined
  RastEventHandler *rast_;
};

struct LinkRulePi : public Link {
  inline virtual ~LinkRulePi() {}
  StringC pi;
  Location loc;
};

class RastSubdocState {
public:
  RastSubdocState();
  RastSubdocState(SgmlParser *, RastEventHandler *);
  void init(SgmlParser *, RastEventHandler *);
  void swap(RastSubdocState &);
protected:
  SgmlParser *parser_;
  Boolean hadActiveLpdOrDtd_;
  Location activeLpdOrDtdLocation_;
  Vector<StringC> activeLinkTypes_;
  Boolean hadDocumentElement_;
  RastLinkProcess linkProcess_;
  Boolean haveLinkProcess_;
  Owner<EndPrologEvent> endPrologEvent_;
  Vector<PackedBoolean> parseSubdocQueue_;
  IQueue<LinkRulePi> linkRuleQueue_;
  enum AttributeType {
    dtdAttribute,
    linkAttribute,
    resultAttribute,
    simpleAttribute
    };
  enum { nAttributeType = simpleAttribute + 1 };
  Vector<Vector<size_t> > attributeSortOrder_[nAttributeType];
private:
  RastSubdocState(const RastSubdocState &); // undefined
  void operator=(const RastSubdocState &);  // undefined
  friend class RastLinkProcess;
};

class RastEventHandler : public ErrorCountEventHandler,
                         private RastSubdocState,
                         protected Messenger {
public:
  RastEventHandler(SgmlParser *, Messenger *);
  void data(DataEvent *);
  void startElement(StartElementEvent *);
  void endElement(EndElementEvent *);
  void pi(PiEvent *);
  void sdataEntity(SdataEntityEvent *);
  void externalDataEntity(ExternalDataEntityEvent *);
  void subdocEntity(SubdocEntityEvent *);
  void nonSgmlChar(NonSgmlCharEvent *);
  void sgmlDecl(SgmlDeclEvent *);
  void endProlog(EndPrologEvent *);
  void uselink(UselinkEvent *);
  virtual void truncateOutput();
  void end();
  void setOutputStream(OutputCharStream *os);
  static const char *messageText(int);
  static const char messageSource[];
protected:
  void initMessage(Message &);
  void dispatchMessage(const Message &);
private:
  RastEventHandler(const RastEventHandler &); // undefined
  void operator=(const RastEventHandler &);   // undefined

  enum LineType { dataLine = '|', markupLine = '!' };
  void lines(LineType, const Char *p, size_t length);
  enum { maxLineLength = 60 };
  enum { RS = '\n', RE = '\r', TAB = '\t' };
#if 0
  static const RastPrintable printable;
#else
  static RastPrintable printable;
#endif
  int lineLength_;
  OutputCharStream *os_;
  StringC rastParseSubdocYesString_;
  StringC rastParseSubdocNoString_;
  StringC rastActiveLpdString_;
  StringC rastLinkRuleString_;
  unsigned piErrorCount_;
  Messenger *mgr_;

  int lexCmp(const StringC &s1, const StringC &s2);
  void flushLine(LineType);
  void attributeInfo(const AttributeList &, AttributeType);
  void externalEntityInfo(const ExternalDataEntity *, AttributeType);
  void subdocEntityInfo(const SubdocEntity *,
			const Ptr<InputSourceOrigin> &entityOrigin,
			Boolean referenced);
  void externalIdInfo(const ExternalId &);
  void internalEntityInfo(const InternalEntity *);
  void queueParseSubdoc(Boolean);
  Boolean parseNextSubdoc();
  Boolean interpretRastPi(const Char *data, size_t dataLength,
			  const Location &);
  void activeLinks();
  void simpleLinkInfo();
  void impliedSourceLinkRules();
  
  OutputCharStream &os();
  friend class RastLinkProcess;
};

inline
int RastPrintable::operator()(Char c) const
{
  return c <= UCHAR_MAX ? v_[c] : 0;
}

inline
void RastEventHandler::setOutputStream(OutputCharStream *os)
{
  os_ = os;
}

inline
OutputCharStream &RastEventHandler::os()
{
  return *os_;
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not RastEventHandler_INCLUDED */
