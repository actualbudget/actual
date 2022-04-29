#ifndef EntityCatalog_INCLUDED
#define EntityCatalog_INCLUDED 1

#ifdef __GNUG__
#pragma interface
#endif

#include "types.h"
#include "StringC.h"
#include "Resource.h"
#include "SubstTable.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class Messenger;
class CharsetInfo;
class EntityDecl;

class SP_API EntityCatalog : public Resource {
public:
  class SP_API Syntax {
  public:
    virtual Boolean namecaseGeneral() const = 0;
    virtual Boolean namecaseEntity() const = 0;
    virtual const SubstTable &upperSubstTable() const = 0;
    virtual const StringC &peroDelim() const = 0;
    virtual ~Syntax() = 0;
  };
  virtual ~EntityCatalog();
  virtual Boolean sgmlDecl(const CharsetInfo &,
			   Messenger &,
			   const StringC &,
			   StringC &) const;
  virtual Boolean lookup(const EntityDecl &,
			 const Syntax &,
			 const CharsetInfo &,
			 Messenger &,
			 StringC &) const;
  virtual Boolean lookupPublic(const StringC &,
			       const CharsetInfo &,
			       Messenger &,
			       StringC &) const;
  // This is for a character described by a minimum literal
  // in the SGML declaration.
  virtual Boolean lookupChar(const StringC &,
                             const CharsetInfo &,
			     Messenger &,
			     UnivChar &) const;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not EntityCatalog_INCLUDED */
