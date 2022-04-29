// Copyright (c) 1995 James Clark
// See the file COPYING for copying permission.

#ifndef SGMLGenerator_INCLUDED
#define SGMLGenerator_INCLUDED 1
#ifdef __GNUG__
#pragma interface
#endif

#include "Boolean.h"
#include "OutputCharStream.h"
#include "StringOf.h"
#include "StringC.h"

#include "SGMLApplication.h"

class SGMLGenerator : public SGMLApplication {
public:
  enum {
    generateDtd = 01
  };
  SGMLGenerator(SP_NAMESPACE_SCOPE OutputCharStream *, unsigned flags = 0);
  ~SGMLGenerator();
  void startElement(const StartElementEvent &);
  void endElement(const EndElementEvent &);
  void data(const DataEvent &);
  void sdata(const SdataEvent &);
  void pi(const PiEvent &);
  void externalDataEntityRef(const ExternalDataEntityRefEvent &);
  void subdocEntityRef(const SubdocEntityRefEvent &);
  void nonSgmlChar(const NonSgmlCharEvent &);
  void endProlog(const EndPrologEvent &);
  void commentDecl(const CommentDeclEvent &);
  void markedSectionStart(const MarkedSectionStartEvent &);
  void markedSectionEnd(const MarkedSectionEndEvent &);
  void ignoredChars(const IgnoredCharsEvent &);
  void generalEntity(const GeneralEntityEvent &);
  void startDtd(const StartDtdEvent &);
private:
  SP_NAMESPACE_SCOPE OutputCharStream &os();
  void numCharRef(Char);
  void numCharRefNum(unsigned long n);
  void entityRef(const CharString &);
  void flushRe();
  void outputRe();
  bool isSgmlChar(Char);
  void attributeChars(const CharString &str);
  SP_NAMESPACE_SCOPE StringC *charEntityName(Char);

  SP_NAMESPACE_SCOPE OutputCharStream *os_;
  enum {
    other,
    pendingRe,
    afterStartTag
    };
  char outputState_;
  SP_NAMESPACE_SCOPE String<char> outputStateStack_;
  SP_NAMESPACE_SCOPE String<char> isElementContentStack_;
  SP_NAMESPACE_SCOPE StringC lt_;
  SP_NAMESPACE_SCOPE StringC gt_;
  SP_NAMESPACE_SCOPE StringC amp_;
  SP_NAMESPACE_SCOPE StringC quot_;
  bool mustOmitEndTag_;
  enum {
    normalMode,
    cdataMode,
    rcdataMode
    } parseMode_;
  char nonSgml_[256];		// bool
  bool inInstance_;
  unsigned flags_;
};

#endif /* not SGMLGenerator_INCLUDED */
