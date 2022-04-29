// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif
#include "splib.h"
#include "ExternalId.h"
#include "CharsetInfo.h"
#include "macros.h"
#include "ParserMessages.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

ExternalId::ExternalId()
: haveSystem_(0), havePublic_(0)
{
}

void ExternalId::setSystem(Text &text)
{
  text.swap(system_);
  haveSystem_ = 1;
}

PublicId::Type ExternalId::setPublic(Text &text, const CharsetInfo &charset,
	   		             Char space, 
                                     const MessageType1 *&fpierror,
                                     const MessageType1 *&urnerror)
{
  havePublic_ = 1;
  return public_.init(text, charset, space, fpierror, urnerror);
}

void ExternalId::setLocation(const Location &loc)
{
  loc_ = loc;
}

PublicId::PublicId()
: type_(PublicId::informal)
{
}

PublicId::Type PublicId::init(Text &text, const CharsetInfo &charset,
             		      Char space, 
                              const MessageType1 *&fpierror,
                              const MessageType1 *&urnerror)
{
  text.swap(text_);
  const StringC &str = text_.string();
  type_ = informal;
  if (initFpi(str, charset, space, fpierror)) 
    type_ = fpi;
  if (initUrn(str, charset, space, urnerror))
    type_ = urn;
  return type_;
}

Boolean PublicId::initUrn(const StringC &str, const CharsetInfo &charset,
             		  Char space, const MessageType1 *&error)
{
  const Char *next = str.data();
  const Char *lim = str.data() + str.size();
  Char sep = charset.execToDesc(':');
  Char lcU = charset.execToDesc('u');
  Char ucU = charset.execToDesc('U');
  Char lcR = charset.execToDesc('r');
  Char ucR = charset.execToDesc('R');
  Char lcN = charset.execToDesc('n');
  Char ucN = charset.execToDesc('N');
  const Char *fieldStart;
  size_t fieldLength;
  if (!nextField(sep, next, lim, fieldStart, fieldLength, 0)) {
    error = &ParserMessages::urnMissingField;
    return 0;
  }
  if (fieldLength != 3  
      || (fieldStart[0] != lcU && fieldStart[0] != ucU) 
      || (fieldStart[1] != lcR && fieldStart[1] != ucR) 
      || (fieldStart[2] != lcN && fieldStart[2] != ucN)) {
    error = &ParserMessages::urnMissingPrefix;
    return 0;
  }
  if (!nextField(sep, next, lim, fieldStart, fieldLength, 0)) {
    error = &ParserMessages::urnMissingField;
    return 0;
  }
  if (fieldLength < 1) {
    //FIXME I don't fully understand the regexp notation in rfc2141:
    // is fieldLength also supposed to be <= 31 ?
    error = &ParserMessages::urnInvalidNid;
    return 0;
  }
  UnivChar percent, lparen, rparen, plus, comma, minus, period, colon;
  UnivChar equal, at, semicolon, dollar, uline, bang, star, apos; 
  charset.descToUniv('%', percent);
  charset.descToUniv('(', lparen);
  charset.descToUniv(')', rparen);
  charset.descToUniv('+', plus);
  charset.descToUniv(',', comma);
  charset.descToUniv('-', minus);
  charset.descToUniv('.', period);
  charset.descToUniv(':', colon);
  charset.descToUniv('=', equal);
  charset.descToUniv('@', at);
  charset.descToUniv(';', semicolon);
  charset.descToUniv('$', dollar);
  charset.descToUniv('_', uline);
  charset.descToUniv('!', bang);
  charset.descToUniv('*', star);
  charset.descToUniv('\'', apos);
  for (size_t i = 0; i < fieldLength; i++) {
    UnivChar c;
    if (!charset.descToUniv(fieldStart[i], c)
      || ((!(c == minus) || i == 0) 
        && !(c >= UnivCharsetDesc::a && c < UnivCharsetDesc::a + 26) 
        && !(c >= UnivCharsetDesc::A && c < UnivCharsetDesc::A + 26) 
        && !(c >= UnivCharsetDesc::zero && c < UnivCharsetDesc::zero + 10))) {
      error = &ParserMessages::urnInvalidNid;
      return 0;
    }
  }
  nid_.assign(fieldStart, fieldLength);
  if (next == 0) {
    error = &ParserMessages::urnMissingField;
    return 0;
  }
  fieldStart = next;
  fieldLength = lim - next;
  if (fieldLength < 1) {
    error = &ParserMessages::urnInvalidNss;
    return 0;
  }
  for (size_t i = 0; i < fieldLength; i++) {
    UnivChar c;
    if (!charset.descToUniv(fieldStart[i], c)) {
      error = &ParserMessages::urnInvalidNss;
      return 0;
    }  
    if (c == percent) {
      if (fieldLength - i < 2) {
        error = &ParserMessages::urnInvalidNss;
        return 0;
      }
      Boolean zeros = 1;
      for (size_t j = 0; j < 2; j++) {
        i++;
        if (!charset.descToUniv(fieldStart[i], c)
         || (!(c >= UnivCharsetDesc::a && c < UnivCharsetDesc::a + 6) 
          && !(c >= UnivCharsetDesc::A && c < UnivCharsetDesc::A + 6) 
          && !(c >= UnivCharsetDesc::zero && c < UnivCharsetDesc::zero + 10))) {
          error = &ParserMessages::urnInvalidNss;
          return 0;
        }  
        if (c != UnivCharsetDesc::zero)
          zeros = 0;
      }
      if (zeros) {
        // FIXME we're not checking that other chars are escaped
        // which must not be escaped according to rfc2141
        error = &ParserMessages::urnInvalidNss;
        return 0;
      }
    } 
    else {
      if (!(c >= UnivCharsetDesc::a && c < UnivCharsetDesc::a + 26) 
       && !(c >= UnivCharsetDesc::A && c < UnivCharsetDesc::A + 26) 
       && !(c >= UnivCharsetDesc::zero && c < UnivCharsetDesc::zero + 10)
       && !(c == lparen) && !(c == rparen) && !(c == plus) && !(c == comma)
       && !(c == minus) && !(c == period) && !(c == colon) && !(c == equal) 
       && !(c == at) && !(c == semicolon) && !(c == dollar) && !(c == uline) 
       && !(c == bang) && !(c == star) && !(c == apos)) { 
        error = &ParserMessages::urnInvalidNss;
        return 0;
      }
    }
  } 
  nss_.assign(fieldStart, fieldLength);
  return 1;
}  

Boolean PublicId::initFpi(const StringC &str, const CharsetInfo &charset,
             		  Char space, const MessageType1 *&error)
{
  const Char *next = str.data();
  const Char *lim = str.data() + str.size();
  Char solidus = charset.execToDesc('/');
  Char minus = charset.execToDesc('-');
  Char plus = charset.execToDesc('+');
  const Char *fieldStart;
  size_t fieldLength;
  if (!nextField(solidus, next, lim, fieldStart, fieldLength)) {
    error = &ParserMessages::fpiMissingField;
    return 0;
  }
  if (fieldLength == 1 && (*fieldStart == minus || *fieldStart == plus)) {
    ownerType_ = (*fieldStart == plus ? registered : unregistered);
    if (!nextField(solidus, next, lim, fieldStart, fieldLength)) {
      error = &ParserMessages::fpiMissingField;
      return 0;
    }
  }
  else
    ownerType_ = ISO;
  owner_.assign(fieldStart, fieldLength);
  if (!nextField(solidus, next, lim, fieldStart, fieldLength)) {
    error = &ParserMessages::fpiMissingField;
    return 0;
  }
  size_t i;
  for (i = 0; i < fieldLength; i++)
    if (fieldStart[i] == space)
      break;
  if (i >= fieldLength) {
    error = &ParserMessages::fpiMissingTextClassSpace;
    return 0;
  }
  StringC textClassString(fieldStart, i);
  if (!lookupTextClass(textClassString, charset, textClass_)) {
    error = &ParserMessages::fpiInvalidTextClass;
    return 0;
  }
  i++;				// skip the space
  fieldStart += i;
  fieldLength -= i;
  if (fieldLength  == 1 && *fieldStart == minus) {
    unavailable_ = 1;
    if (!nextField(solidus, next, lim, fieldStart, fieldLength)) {
      error = &ParserMessages::fpiMissingField;
      return 0;
    }
  }
  else
    unavailable_ = 0;
  description_.assign(fieldStart, fieldLength);
  if (!nextField(solidus, next, lim, fieldStart, fieldLength)) {
    error = &ParserMessages::fpiMissingField;
    return 0;
  }
  if (textClass_ != CHARSET) {
    for (i = 0; i < fieldLength; i++) {
      UnivChar c;
      if (!charset.descToUniv(fieldStart[i], c)
	  || c < UnivCharsetDesc::A || c >= UnivCharsetDesc::A + 26) {
	error = &ParserMessages::fpiInvalidLanguage;
	return 0;
      }
    }
    // The public text language must be a name.
    // Names cannot be empty.
    if (fieldLength == 0) {
      error = &ParserMessages::fpiInvalidLanguage;
      return 0;
    }
  }
  languageOrDesignatingSequence_.assign(fieldStart, fieldLength);
  if (nextField(solidus, next, lim, fieldStart, fieldLength)) {
    switch (textClass_) {
    case CAPACITY:
    case CHARSET:
    case NOTATION:
    case SYNTAX:
      error = &ParserMessages::fpiIllegalDisplayVersion;
      return 0;
    default:
      break;
    }
    haveDisplayVersion_ = 1;
    displayVersion_.assign(fieldStart, fieldLength);
  }
  else
    haveDisplayVersion_ = 0;
  if (next != 0) {
    error = &ParserMessages::fpiExtraField;
    return 0;
  }
  return 1;
}

Boolean PublicId::nextField(Char solidus,
				  const Char *&next,
				  const Char *lim,
				  const Char *&fieldStart,
				  size_t &fieldLength,
				  Boolean dup)
{
  if (next == 0)
    return 0;
  fieldStart = next;
  for (; next < lim; next++) {
    if (next[0] == solidus && next + dup < lim && next[dup] == solidus) {
      fieldLength = next - fieldStart;
      next += 1 + dup;
      return 1;
    }
  }
  fieldLength = lim - fieldStart;
  next = 0;
  return 1;
}

const char *const PublicId::textClasses[] = {
  "CAPACITY",
  "CHARSET",
  "DOCUMENT",
  "DTD",
  "ELEMENTS",
  "ENTITIES",
  "LPD",
  "NONSGML",
  "NOTATION",
  "SD",
  "SHORTREF",
  "SUBDOC",
  "SYNTAX",
  "TEXT",
};

Boolean PublicId::lookupTextClass(const StringC &str,
					const CharsetInfo &charset,
					TextClass &textClass)
{
  for (size_t i = 0; i < SIZEOF(textClasses); i++)
    if (str == charset.execToDesc(textClasses[i])) {
      textClass = TextClass(i);
      return 1;
    }
  return 0;
}

Boolean PublicId::getOwnerType(OwnerType &result) const
{
  if (type_ != fpi)
    return 0;
  result = ownerType_;
  return 1;
}

Boolean PublicId::getOwner(StringC &result) const
{
  if (type_ != fpi)
    return 0;
  result = owner_;
  return 1;
}

Boolean PublicId::getTextClass(TextClass &result) const
{
  if (type_ != fpi)
    return 0;
  result = textClass_;
  return 1;
}

Boolean PublicId::getUnavailable(Boolean &result) const
{
  if (type_ != fpi)
    return 0;
  result = unavailable_;
  return 1;
}

Boolean PublicId::getDescription(StringC &result) const
{
  if (type_ != fpi)
    return 0;
  result = description_;
  return 1;
}

Boolean PublicId::getLanguage(StringC &result) const
{
  if ((type_ != fpi) || textClass_ == CHARSET)
    return 0;
  result = languageOrDesignatingSequence_;
  return 1;
}

Boolean PublicId::getDesignatingSequence(StringC &result) const
{
  if ((type_ != fpi) || textClass_ != CHARSET)
    return 0;
  result = languageOrDesignatingSequence_;
  return 1;
}

Boolean PublicId::getDisplayVersion(StringC &result) const
{
  if (type_ != fpi)
    return 0;
  if (haveDisplayVersion_)
    result = displayVersion_;
  return 1;
}

Boolean PublicId::getNamespaceIdentifier(StringC &result) const
{
  if (type_ != urn)
    return 0;
  result = nid_;
  return 1;
}

Boolean PublicId::getNamespaceSpecificString(StringC &result) const
{
  if (type_ != urn)
    return 0;
  result = nss_;
  return 1;
}


#ifdef SP_NAMESPACE
}
#endif
