// Copyright (c) 1997 James Clark
// See the file COPYING for copying permission.

#ifndef XmlOutputEventHandler_INCLUDED
#define XmlOutputEventHandler_INCLUDED 1

#ifdef __GNUG__
#pragma interface
#endif

#include "ErrorCountEventHandler.h"
#include "Message.h"
#include "OutputCharStream.h"
#include "Boolean.h"
#include "CharsetInfo.h"
#include "ExtendEntityManager.h"
#include "IList.h"
#include "Ptr.h"
#include "SubstTable.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class CharsetInfo;

class XmlOutputEventHandler : public ErrorCountEventHandler {
public:
  struct Options {
    Options();
    PackedBoolean nlInTag;
    PackedBoolean id;
    PackedBoolean notation;
    PackedBoolean ndata;
    PackedBoolean comment;
    PackedBoolean cdata;
    PackedBoolean lower;
    PackedBoolean piEscape;
    PackedBoolean empty;
    PackedBoolean attlist;
    PackedBoolean reportEnts;
    PackedBoolean reportIS;
    PackedBoolean expExt;
    PackedBoolean expInt;
    PackedBoolean intDecl;
    PackedBoolean extDecl;
    PackedBoolean sdataAsPi;
    PackedBoolean preserveCase;
    PackedBoolean overwrite;
    PackedBoolean writeOutsideOutDir;
  };
  XmlOutputEventHandler(const Options &,
			OutputCharStream *,
			const StringC &encodingName,
			const char *outputDir,
			const char *dtdLoc,
		        const Ptr<ExtendEntityManager> &,
	  		const CharsetInfo &,
			CmdLineApp *);
  ~XmlOutputEventHandler();
  void data(DataEvent *);
  void startElement(StartElementEvent *);
  void endElement(EndElementEvent *);
  void pi(PiEvent *);
  void startDtd(StartDtdEvent *);
  void endDtd(EndDtdEvent *);
  void endProlog(EndPrologEvent *event);
  void sdataEntity(SdataEntityEvent *);
  void externalDataEntity(ExternalDataEntityEvent *);
  void subdocEntity(SubdocEntityEvent *);
  void commentDecl(CommentDeclEvent *);
  void markedSectionStart(MarkedSectionStartEvent *);
  void markedSectionEnd(MarkedSectionEndEvent *);
  void message(MessageEvent *);
  void sgmlDecl(SgmlDeclEvent *);
private:
  XmlOutputEventHandler(const XmlOutputEventHandler &); // undefined
  void operator=(const XmlOutputEventHandler &); // undefined
  OutputCharStream &os();
  void outputData(const Char *s, size_t n, Boolean inLit, Boolean inSuperLit);
  void outputData(const Char *s, size_t n, Boolean inLit);
  void outputCdata(const Char *s, size_t n);
  void outputExternalId(const EntityDecl &decl);
  void outputAttribute(const AttributeList &attributes, size_t i);
  int fsiToUrl(const StringC &fsi, const Location &loc, StringC &url);
  int filenameToUrl(const StringC &filename, const Location &loc, StringC &url);
  void maybeStartDoctype(Boolean &doctypeStarted, const Dtd &dtd);
  void closeCdataSection();
  void entityDefaulted(EntityDefaultedEvent *event);
  void inputOpened(InputSource *in);
  void inputClosed(InputSource *in);
  const StringC &generalName(const StringC &name, StringC &buf);
  Boolean equalsIgnoreCase(const StringC &str1, StringC &str2);
  char *convertSuffix(char *name);
  int maybeCreateDirectories(char *path);
  Boolean checkFirstSeen(const StringC &name);
  void uniqueFilename(char *filename);
  char getQuoteMark(const StringC *contents);

  CmdLineApp *app_;
  Ptr<ExtendEntityManager> entityManager_;
  IList<OutputCharStream> outputStack_;
  IList<OutputByteStream> outputFileStack_;
  Vector<StringC> filesCreated_;
  Vector<StringC> originalFilePaths_;
  const CharsetInfo *systemCharset_;
  OutputCharStream *os_;
  OutputCharStream *extEnts_;
  OutputCharStream *intEnts_;
  FileOutputByteStream *extEntFile_;
  FileOutputByteStream *intEntFile_;
  const char *outputDir_;
  const char *dtdLoc_;
  Boolean inDtd_;
  Boolean useCdata_;
  Boolean inCdata_;
  int nCdataEndMatched_;
  Options options_;
  Boolean namecaseGeneral_;
  SubstTable lowerSubst_;
  StringC nameBuf_;
  NamedTable<Named> entTable_;
};

inline
OutputCharStream &XmlOutputEventHandler::os()
{
  return *os_;
}

class NullOutputByteStream : public OutputByteStream {
public:
  NullOutputByteStream();
  virtual ~NullOutputByteStream();
  void flush();
  void sputc(char c);
  void sputn(const char *, size_t);
  OutputByteStream &operator<<(char);
  OutputByteStream &operator<<(unsigned char);
  OutputByteStream &operator<<(const char *);
  OutputByteStream &operator<<(int);
  OutputByteStream &operator<<(unsigned);
  OutputByteStream &operator<<(long);
  OutputByteStream &operator<<(unsigned long);
  OutputByteStream &operator<<(const String<char> &);
  char *getBufferPtr() const;
  size_t getBufferSize() const;
  void usedBuffer(size_t);
  void flushBuf(char);
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not XmlOutputEventHandler_INCLUDED */
