// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef ExternalId_INCLUDED
#define ExternalId_INCLUDED 1
#ifdef __GNUG__
#pragma interface
#endif

#include "Boolean.h"
#include "StringC.h"
#include "Text.h"
#include "types.h"
#include "Message.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class CharsetInfo;

class SP_API PublicId {
public:
  enum Type {
    informal,
    fpi,
    urn
  };
  enum TextClass {
    CAPACITY,
    CHARSET,
    DOCUMENT,
    DTD,
    ELEMENTS,
    ENTITIES,
    LPD,
    NONSGML,
    NOTATION,
    SD,
    SHORTREF,
    SUBDOC,
    SYNTAX,
    TEXT
  };
  enum OwnerType {
    ISO,
    registered,
    unregistered
    };
  PublicId();
  // FPI parts
  Boolean getOwnerType(OwnerType &) const;
  Boolean getOwner(StringC &) const;
  Boolean getTextClass(TextClass &) const;
  Boolean getUnavailable(Boolean &) const;
  Boolean getDescription(StringC &) const;
  Boolean getLanguage(StringC &) const;
  Boolean getDesignatingSequence(StringC &) const;
  Boolean getDisplayVersion(StringC &) const;
  // URN parts
  Boolean getNamespaceIdentifier(StringC &) const;
  Boolean getNamespaceSpecificString(StringC &) const;
  // The return value describes what has been successfully parsed
  // charset describes the character set to use for parsing the
  // id.
  Type init(Text &, const CharsetInfo &, Char space,
	       const MessageType1 *&fpierror, 
               const MessageType1 *&urnerror);
  const StringC &string() const;
  const Text &text() const;
  const Type type() const { return type_; }
private:
  Boolean initFpi(const StringC &, const CharsetInfo &, Char, 
               const MessageType1 *&);
  Boolean initUrn(const StringC &, const CharsetInfo &, Char,
               const MessageType1 *&);
  static Boolean nextField(Char solidus,
			   const Char *&next,
			   const Char *lim,
			   const Char *&fieldStart,
			   size_t &fieldLength,
                           Boolean dup = 1);
  static Boolean lookupTextClass(const StringC &, const CharsetInfo &,
				 TextClass &);
  static const char *const textClasses[];

  Type type_;
  OwnerType ownerType_;
  StringC owner_;
  TextClass textClass_;
  PackedBoolean unavailable_;
  StringC description_;
  StringC languageOrDesignatingSequence_;
  PackedBoolean haveDisplayVersion_;
  StringC displayVersion_;
  Text text_;
  StringC nid_;
  StringC nss_;
};

class SP_API ExternalId {
public:
  ExternalId();
  const StringC *systemIdString() const;
  const StringC *publicIdString() const;
  const StringC &effectiveSystemId() const;
  const Text *systemIdText() const;
  const Text *publicIdText() const;
  const PublicId *publicId() const;
  void setSystem(Text &);
  void setEffectiveSystem(StringC &);
  // The return value tells what has been successfully parsed. 
  // charset describes the character set to use for parsing the
  // id.
  PublicId::Type setPublic(Text &, const CharsetInfo &, Char space,
		    const MessageType1 *&fpierror,
		    const MessageType1 *&urnerror);
  void setLocation(const Location &);
  // location of keyword
  const Location &location() const;
private:
  PackedBoolean haveSystem_;
  PackedBoolean havePublic_;
  Text system_;
  PublicId public_;
  Location loc_;
  StringC effectiveSystem_;
};

inline
const StringC &PublicId::string() const
{
  return text_.string();
}

inline
const Text &PublicId::text() const
{
  return text_;
}

inline
const StringC *ExternalId::systemIdString() const
{
  return haveSystem_ ? &system_.string() : 0;
}

inline
const StringC *ExternalId::publicIdString() const
{
  return havePublic_ ? &public_.string() : 0;
}

inline
const Text *ExternalId::systemIdText() const
{
  return haveSystem_ ? &system_ : 0;
}

inline
const Text *ExternalId::publicIdText() const
{
  return havePublic_ ? &public_.text() : 0;
}

inline
const PublicId *ExternalId::publicId() const
{
  return havePublic_ ? &public_ : 0;
}

inline
const Location &ExternalId::location() const
{
  return loc_;
}

inline
const StringC &ExternalId::effectiveSystemId() const
{
  return effectiveSystem_;
}

inline
void ExternalId::setEffectiveSystem(StringC &str)
{
  str.swap(effectiveSystem_);
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not ExternalId_INCLUDED */
