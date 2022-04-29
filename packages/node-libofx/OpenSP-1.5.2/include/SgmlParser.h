// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef SgmlParser_INCLUDED
#define SgmlParser_INCLUDED 1

#ifdef __GNUG__
#pragma interface
#endif

#include "StringC.h"
#include "Ptr.h"
#include "Location.h"
#include "EntityManager.h"

#include <signal.h>

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class Event;
class Parser;
class UnivCharsetDesc;
class EventHandler;
struct ParserOptions;
template<class T> class Ptr;
template<class T> class ConstPtr;
class InputSourceOrigin;
class Sd;
class Syntax;
class Dtd;

class SP_API SgmlParser {
public:
  struct SP_API Params {
    enum EntityType {
      document,
      subdoc,
      dtd
    };
    Params();
    EntityType entityType;	// defaults to document
    StringC sysid;		// must be specified
    Ptr<InputSourceOrigin> origin;
    Ptr<EntityManager> entityManager;
    const SgmlParser *parent;
    ConstPtr<Sd> sd;
    ConstPtr<Syntax> prologSyntax;
    ConstPtr<Syntax> instanceSyntax;
    unsigned subdocLevel;
    const ParserOptions *options;
    PackedBoolean subdocInheritActiveLinkTypes;
    // referenced subdocs count against SUBDOC limit in SGML declaration
    PackedBoolean subdocReferenced;
    StringC doctypeName;
  };
  SgmlParser();			// must call init
  SgmlParser(const Params &params);
  void init(const Params &params);
  ~SgmlParser();
  Event *nextEvent();
  void parseAll(EventHandler &, const volatile sig_atomic_t *cancelPtr = 0);
  ConstPtr<Sd> sd() const;
  ConstPtr<Syntax> instanceSyntax() const;
  ConstPtr<Syntax> prologSyntax() const;
  EntityManager &entityManager() const;
  const EntityCatalog &entityCatalog() const;
  const ParserOptions &options() const;
  // Only to be called after the parse has ended.
  Ptr<Dtd> baseDtd();
  void activateLinkType(const StringC &);
  void allLinkTypesActivated();
  void swap(SgmlParser &);
  friend class Parser;
  friend class PiAttspecParser;
private:
  SgmlParser(const SgmlParser &);
  void operator=(const SgmlParser &);
  Parser *parser_;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not SgmlParser_INCLUDED */
