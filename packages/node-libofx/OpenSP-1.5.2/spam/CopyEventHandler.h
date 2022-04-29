// Copyright (c) 1995 James Clark
// See the file COPYING for copying permission.

#ifndef CopyEventHandler_INCLUDED
#define CopyEventHandler_INCLUDED 1
#ifdef __GNUG__
#pragma interface
#endif

#include "Event.h"
#include "OutputCharStream.h"
#include "Vector.h"
#include "NCVector.h"
#include "MarkupEventHandler.h"

// This should be local to CopyEventHandler, but some compilers
// can't handle this.

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

struct CopyEventHandlerEntityInfo {
  StrOutputCharStream str;
  ConstPtr<EntityOrigin> ref;
};

class CopyEventHandler : public MarkupEventHandler {
public:
  enum NormalizeFlags {
    normalizeOmittag = 01,
    normalizeShortref = 02,
    normalizeNet = 04,
    normalizeEmptytag = 010,
    normalizeUnclosed = 020,
    normalizeAttname = 040,
    normalizeAttvalue = 0100,
    normalizeAttspec = 0200,
    normalizeShorttag = (normalizeNet|normalizeEmptytag|normalizeUnclosed
			 |normalizeAttname|normalizeAttvalue|normalizeAttspec),
    normalizeRank = 0400,
    normalizeOmittagHoist = 01000,
    normalizeExpand = 02000,
    normalizeExpandAll = 04000,
    normalizeCurrent = 010000,
    normalizeLower = 020000,
    normalizeReserved = 040000,
    normalizeExpandProlog = 0100000,
    normalizeIncludeProlog = 0200000,
    normalizeMarkedSection = 0400000
    };
  CopyEventHandler(OutputCharStream *, unsigned flags,
		   const StringC &outputEntity);
  ~CopyEventHandler();
  void reOrigin(ReOriginEvent *);
  void sSep(SSepEvent *);
  void ignoredRs(IgnoredRsEvent *);
  void data(DataEvent *);
  void startElement(StartElementEvent *);
  void endElement(EndElementEvent *);
  void sdataEntity(SdataEntityEvent *);
  void externalDataEntity(ExternalDataEntityEvent *);
  void subdocEntity(SubdocEntityEvent *);
  void nonSgmlChar(NonSgmlCharEvent *);
  void pi(PiEvent *);
  void endProlog(EndPrologEvent *);
  void markedSectionStart(MarkedSectionStartEvent *);
  void markedSectionEnd(MarkedSectionEndEvent *);
  void entityStart(EntityStartEvent *);
  void entityEnd(EntityEndEvent *);
  void ignoredChars(IgnoredCharsEvent *);
  void sgmlDecl(SgmlDeclEvent *);
  void usemap(UsemapEvent *);
  void uselink(UselinkEvent *);
  void startDtd(StartDtdEvent *);
  void startLpd(StartLpdEvent *);
  void endDtd(EndDtdEvent *);
  void endLpd(EndLpdEvent *);
  void entityDecl(EntityDeclEvent *);
  void shortrefDecl(ShortrefDeclEvent *);
  void markup(const Location &loc, const Markup &markup);
private:
  virtual void reportTagInSpecialMarkedSection(const Location &) = 0;
  OutputCharStream &os();
  void startSubset(StartSubsetEvent *);
  void endSubset(MarkupEvent *);
  void literal(const Text &text);
  void attributeSpecList(MarkupIter &, const AttributeList &);
  void unspecifiedAttributeValues(const AttributeList &atts,
				  const StringC &beforeFirst);
  void withNamedCharRef(const StringC &, const Location &loc);
  void withNamedCharRef(const Char *p, size_t n, const Location &loc);
  void writeData(const Char *p, size_t n, const Location &loc);
  void sdParamLiteral(const SdText &text);
  void entityRef(const EntityOrigin *);
  Boolean doNothing(Event *);
  Boolean noOutput();
  Boolean isSgmlChar(Char);
  const StringC &elementTypeOrigName(const ElementType *, StringC &buf);
  const StringC &generalName(const StringC &name, StringC &buf);
  const StringC &entityName(const StringC &name, StringC &buf);
  const StringC &lowerCaseName(const StringC &name, StringC &buf);
  void handleChange();
  void outputMarkup(const Location &loc, const Markup &markup);
  OutputCharStream *os_;
  OutputCharStream *topOs_;
  Boolean inInstance_;
  unsigned entityLevel_;
  unsigned outputEntityLevel_;
  ConstPtr<Syntax> syntax_;
  ConstPtr<Syntax> instanceSyntax_;
  ConstPtr<Sd> sd_;
  SubstTable lowerSubst_;
  unsigned normalizeFlags_;
  StringC outputEntity_;
  Vector<StringC> elementTypeOrigNames_;
  unsigned omittagHoist_;
  ConstPtr<EntityOrigin> entityOrigin_;
  NCVector<CopyEventHandlerEntityInfo> entityStack_;
  Boolean inSpecialMarkedSection_;
  Boolean hasInternalSubset_;
  Boolean mustOmitEnd_;
  Boolean emptyElementNormal_;
  const AttributeList *currentAttributes_;
};

inline
OutputCharStream &CopyEventHandler::os()
{
  return *os_;
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not CopyEventHandler_INCLUDED */
