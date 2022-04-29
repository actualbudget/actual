// Copyright (c) 1995 James Clark
// See the file COPYING for copying permission.

#ifndef SGMLApplication_INCLUDED
#define SGMLApplication_INCLUDED 1

#ifdef __GNUG__
#pragma interface
#endif

#include <limits.h>
#include <stddef.h>

#ifndef SP_API
#define SP_API /* as nothing */
#endif

class SP_API SGMLApplication {
public:
#ifdef SP_MULTI_BYTE
#if UINT_MAX >= 0xffffffffL /* 2^32 - 1 */
  typedef unsigned int Char;
#else
  typedef unsigned long Char;
#endif
#else
  typedef unsigned char Char;
#endif
  // A Position represents a position in an OpenEntity.
  // The meaning of a Position depends on the
  // particular implementation of OpenEntity.
  // It might be a line number or it might be
  // an offset in the entity.  The only thing
  // that can be done with Position is to use
  // it with an OpenEntityPtr to get a Location.
  typedef unsigned long Position;
  struct CharString {
    const Char *ptr;
    size_t len;
  };
  struct ExternalId {
    bool haveSystemId;
    bool havePublicId;
    bool haveGeneratedSystemId;
    CharString systemId;	// valid only if haveSystemId is true
    CharString publicId;	// valid only if havePublicId is true
    CharString generatedSystemId; // valid if haveGeneratedSystemId is true
  };
  struct Notation {
    CharString name;
    ExternalId externalId;
  };
  struct Attribute;
  struct Entity {
    CharString name;
    enum DataType { sgml, cdata, sdata, ndata, subdoc, pi };
    enum DeclType { general, parameter, doctype, linktype };
    DataType dataType;
    DeclType declType;
    bool isInternal;
    // Following valid if isInternal is true
    CharString text;
    // Following valid if isInternal is false
    ExternalId externalId;
    size_t nAttributes;
    const Attribute *attributes;
    Notation notation;
  };
  struct Attribute {
    CharString name;
    enum Type {
      invalid,
      implied,
      cdata,
      tokenized
      };
    Type type;
    enum Defaulted {
      specified,		// not defaulted
      definition,		// defaulted from definition
      current			// defaulted from current value
      };
    Defaulted defaulted;	// non-ESIS; valid only if type != implied
    struct CdataChunk {
      bool isSdata;
      // This rather awkward representation of non-SGML characters was chosen
      // for backwards compatibility.
      bool isNonSgml;		// valid only if !isSdata
      Char nonSgmlChar;		// valid only if isNonSgml
      CharString data;		// always valid; empty if isNonSgml
      CharString entityName;	// non-ESIS; optional for SDATA chunks
    };
    // Following valid if type == cdata
    size_t nCdataChunks;
    const CdataChunk *cdataChunks; // valid if type == cdata
    // Following valid if type == tokenized
    CharString tokens; // separated by spaces
    bool isId;	       // non-ESIS (probably)
    bool isGroup;      // non-ESIS
    size_t nEntities;
    const Entity *entities;
    // length of notation.name will be 0 if no notation
    Notation notation;
  };
  struct PiEvent {
    Position pos;
    CharString data;
    CharString entityName;	// non-ESIS; optional for PI entities
  };
  struct StartElementEvent {
    Position pos;
    enum ContentType {
      empty,			// declared EMPTY or with CONREF attribute
      cdata,
      rcdata,
      mixed,
      element
      };
    CharString gi;
    ContentType contentType;	// non-ESIS
    bool included;		// non-ESIS
    size_t nAttributes;
    const Attribute *attributes;
  };
      
  struct EndElementEvent {
    Position pos;
    CharString gi;
  };
  struct DataEvent {
    Position pos;
    CharString data;
  };
  struct SdataEvent {
    Position pos;
    CharString text;
    CharString entityName;	// non-ESIS; optional
  };
  struct ExternalDataEntityRefEvent {
    Position pos;
    Entity entity;
  };
  struct SubdocEntityRefEvent {
    Position pos;
    Entity entity;
  };
  struct NonSgmlCharEvent {
    Position pos;
    Char c;
  };
  struct ErrorEvent {
    Position pos;
    enum Type {
      info,			// not an error
      warning,			// not an error
      quantity,
      idref,
      capacity,
      otherError
      };
    Type type;
    CharString message;
  };
  struct AppinfoEvent {
    Position pos;
    bool none;
    CharString string;
  };
  struct StartDtdEvent {
    Position pos;
    CharString name;
    bool haveExternalId;
    ExternalId externalId;
  };
  struct EndDtdEvent {
    Position pos;
    CharString name;
  };
  struct EndPrologEvent {
    Position pos;
  };
  // non-ESIS
  struct GeneralEntityEvent {
    // no position
    Entity entity;
  };
  // non-ESIS
  struct CommentDeclEvent {
    Position pos;
    size_t nComments;
    const CharString *comments;
    const CharString *seps;
  };
  // non-ESIS
  struct MarkedSectionStartEvent {
    Position pos;
    enum Status {
      include,
      rcdata,
      cdata,
      ignore
    };
    Status status;
    struct Param {
      enum Type {
	temp,
	include,
	rcdata,
	cdata,
	ignore,
	entityRef
	};
      Type type;
      CharString entityName;
    };
    size_t nParams;
    const Param *params;
  };
  // non-ESIS
  struct MarkedSectionEndEvent {
    Position pos;
    enum Status {
      include,
      rcdata,
      cdata,
      ignore
    };
    Status status;
  };
  struct IgnoredCharsEvent {
    Position pos;
    CharString data;
  };
  class OpenEntityPtr;
  struct SP_API Location {
    Location();
    Location(const OpenEntityPtr &, Position);
    void init();

    unsigned long lineNumber;
    unsigned long columnNumber;
    unsigned long byteOffset;
    unsigned long entityOffset;
    CharString entityName;
    CharString filename;
    const void *other;
  };
  class OpenEntity;
  class SP_API OpenEntityPtr {
  public:
    OpenEntityPtr();
    OpenEntityPtr(const OpenEntityPtr &);
    void operator=(const OpenEntityPtr &);
    void operator=(OpenEntity *);
    ~OpenEntityPtr();
    const OpenEntity *operator->() const;
    operator int() const;
  private:
    OpenEntity *ptr_;
  };
  class SP_API OpenEntity {
  public:
    OpenEntity();
    virtual ~OpenEntity();
    virtual Location location(Position) const = 0;
  private:
    OpenEntity(const OpenEntity &); // undefined
    void operator=(const OpenEntity &);	// undefined
    unsigned count_;
    friend class OpenEntityPtr;
  };
  virtual ~SGMLApplication();
  virtual void appinfo(const AppinfoEvent &);
  virtual void startDtd(const StartDtdEvent &);
  virtual void endDtd(const EndDtdEvent &);
  virtual void endProlog(const EndPrologEvent &);
  virtual void startElement(const StartElementEvent &);
  virtual void endElement(const EndElementEvent &);
  virtual void data(const DataEvent &);
  virtual void sdata(const SdataEvent &);
  virtual void pi(const PiEvent &);
  virtual void externalDataEntityRef(const ExternalDataEntityRefEvent &);
  virtual void subdocEntityRef(const SubdocEntityRefEvent &);
  virtual void nonSgmlChar(const NonSgmlCharEvent &);
  virtual void commentDecl(const CommentDeclEvent &);
  virtual void markedSectionStart(const MarkedSectionStartEvent &);
  virtual void markedSectionEnd(const MarkedSectionEndEvent &);
  virtual void ignoredChars(const IgnoredCharsEvent &);
  virtual void generalEntity(const GeneralEntityEvent &);
  virtual void error(const ErrorEvent &);
  virtual void openEntityChange(const OpenEntityPtr &);
};

inline
const SGMLApplication::OpenEntity *
SGMLApplication::OpenEntityPtr::operator->() const
{
  return ptr_;
}

inline
void SGMLApplication::OpenEntityPtr::operator=(const OpenEntityPtr &ptr)
{
  *this = ptr.ptr_;
}

inline
SGMLApplication::OpenEntityPtr::operator int() const
{
  return ptr_ != 0;
}

#endif /* not SGMLApplication_INCLUDED */
