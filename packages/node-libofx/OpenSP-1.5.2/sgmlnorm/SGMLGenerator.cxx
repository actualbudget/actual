// Copyright (c) 1995 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif

#include "config.h"
#include "SGMLGenerator.h"

const SGMLApplication::Char RE = '\r';
const SGMLApplication::Char RS = '\n';
const SGMLApplication::Char TAB = '\t';

inline
SP_NAMESPACE_SCOPE OutputCharStream &
operator<<(SP_NAMESPACE_SCOPE OutputCharStream &os,
	   const SGMLApplication::CharString &str)
{
  return os.write(str.ptr, str.len);
}

inline
bool operator==(const SGMLApplication::CharString &str1,
		const SGMLApplication::CharString &str2)
{
  return (str1.len == str2.len
	  && (str1.len == 0
	      || memcmp(str1.ptr,
			str2.ptr,
			str1.len*sizeof(SGMLApplication::Char)) == 0));
}

inline
bool operator!=(const SGMLApplication::CharString &str1,
		const SGMLApplication::CharString &str2)
{
  return !(str1 == str2);
}
 
inline
SP_NAMESPACE_SCOPE OutputCharStream &SGMLGenerator::os()
{
  return *os_;
}

inline
void SGMLGenerator::outputRe()
{
  os().put(RE);
}

inline
void SGMLGenerator::flushRe()
{
  if (outputState_ == pendingRe) {
    outputRe();
    outputState_ = other;
  }
}

inline
bool SGMLGenerator::isSgmlChar(Char c)
{
  return c >= 256 || !nonSgml_[c];
}

static
void escape(SP_NAMESPACE_SCOPE OutputCharStream &s, SP_NAMESPACE_SCOPE Char c)
{
  s << "&#" << (unsigned long)c << ";";
}

SGMLGenerator::SGMLGenerator(SP_NAMESPACE_SCOPE OutputCharStream *os,
			     unsigned flags)
: os_(os), parseMode_(normalMode), outputState_(other), mustOmitEndTag_(0),
  inInstance_(0), flags_(flags)
{
  os_->setEscaper(escape);
  for (size_t i = 0; i < 256; i++)
    switch (i) {
    case RE:
    case RS:
    case TAB:
      nonSgml_[i] = 0;
      break;
    case 255:
      nonSgml_[i] = 1;
      break;
    default:
      nonSgml_[i] = (i < 32 || (i >= 127 && i < 160));
      break;
    }
}

SGMLGenerator::~SGMLGenerator()
{
  outputRe();
  delete os_;
}

void SGMLGenerator::startDtd(const StartDtdEvent &event)
{
  if (!(flags_ & generateDtd))
    return;
  if (event.haveExternalId) {
    os() << "<!DOCTYPE " << event.name << ' ';
    if (event.externalId.havePublicId)
      os() << "PUBLIC \"" << event.externalId.publicId << '\"';
    else
      os() << "SYSTEM";
    if (event.externalId.haveSystemId) {
      const CharString &str = event.externalId.systemId;
      bool useLit = 1;
      bool useLita = 1;
      for (size_t i = 0; i < str.len; i++)
	if (str.ptr[i] == '"')
	  useLit = 0;
	else if (str.ptr[i] == '\'')
	  useLita = 0;
      if (useLit)
	os() << " \"" << event.externalId.systemId << '"';
      else if (useLita)
	os() << " '" << event.externalId.systemId << '\'';
    }
    os() << '>';
    os().put(RE);
  }
}

void SGMLGenerator::startElement(const StartElementEvent &event)
{
  // This can happen with OMITTAG.
  if (parseMode_ != normalMode)
    os() << "]]><![ INCLUDE [";
  // The output is more readable if, within element content,
  // tags begin on a new line.
  if (isElementContentStack_.size() > 0
      && isElementContentStack_[isElementContentStack_.size() - 1])
    outputRe();
  isElementContentStack_
    += char(event.contentType == StartElementEvent::element);
  if (event.included) {
    if (outputState_ == pendingRe) {
      numCharRef(RE);		// would be moved otherwise
      outputState_ = other;
    }
    outputStateStack_ += char(outputState_);
  }
  else {
    outputStateStack_ += char(other);
    flushRe();
  }
  switch (event.contentType) {
  case StartElementEvent::cdata:
    parseMode_ = cdataMode;
    break;
  case StartElementEvent::rcdata:
    parseMode_ = rcdataMode;
    break;
  default:
    parseMode_ = normalMode;
    break;
  }
  outputState_ = afterStartTag;
  os() << '<' << event.gi;
  for (size_t i = 0; i < event.nAttributes; i++) {
    const Attribute &a = event.attributes[i];
    switch (a.type) {
    case Attribute::cdata:
      if (a.defaulted != Attribute::definition) {
	os() << ' ' << a.name << '=' << '"';
	for (size_t j = 0; j < a.nCdataChunks; j++)
	  if (a.cdataChunks[j].isSdata)
	    entityRef(a.cdataChunks[j].entityName);
	  else if (a.cdataChunks[j].isNonSgml)
	    numCharRefNum(a.cdataChunks[j].nonSgmlChar);
	  else
	    attributeChars(a.cdataChunks[j].data);
	os() << '"';
      }
      break;
    case Attribute::tokenized:
      if (a.defaulted != Attribute::definition) {
	if (a.isGroup && a.name == a.tokens)
	  os() << ' ' << a.tokens;
	else
	  os() << ' ' << a.name << '=' << '"' << a.tokens << '"';
      }
      break;
    default:
      break;
    }
  }
  os() << '>';
  mustOmitEndTag_ = (event.contentType == StartElementEvent::empty);
}

void SGMLGenerator::attributeChars(const CharString &str)
{
  const Char *p = str.ptr;
  for (size_t n = str.len; n > 0; n--, p++)
    switch (*p) {
    case '"':
    case '&':
    case RS:
    case RE:
    case TAB:
      numCharRef(*p);
      break;
    default:
      if (isSgmlChar(*p))
	os().put(*p);
      else
	numCharRef(*p);
      break;
    }
}

void SGMLGenerator::endElement(const EndElementEvent &event)
{
  if (mustOmitEndTag_)
    mustOmitEndTag_ = 0;
  else {
    if (outputState_ == pendingRe) {
      outputRe();
      outputRe();
    }
    else if (isElementContentStack_[isElementContentStack_.size() - 1])
      outputRe();
    os() << "</" << event.gi << '>';
  }
  outputState_ = outputStateStack_[outputStateStack_.size() - 1];
  outputStateStack_.resize(outputStateStack_.size() - 1);
  parseMode_ = normalMode;
  isElementContentStack_.resize(isElementContentStack_.size() - 1);
}

void SGMLGenerator::data(const DataEvent &event)
{
  const Char *p = event.data.ptr;
  for (size_t len = event.data.len; len > 0; len--, p++) {
    switch (*p) {
    case RE:
      flushRe();
      if (outputState_ == afterStartTag)
	outputRe();
      outputState_ = pendingRe;
      break;
    case '&':
    case '<':
    case '>':			// prevents recognition of MSE
      flushRe();
      outputState_ = other;
      if (parseMode_ == cdataMode)
	os().put(*p);
      else
	numCharRef(*p);
      break;
    default:
      flushRe();
      outputState_ = other;
      if (isSgmlChar(*p))
	os().put(*p);
      else if (parseMode_ == cdataMode) {
	// The output will not be valid, but I don't think this
	// situation can arise with valid SGML source.
	os().put(*p);
      }
      else
	numCharRef(*p);
      break;
    }
  }
}

void SGMLGenerator::nonSgmlChar(const NonSgmlCharEvent &event)
{
  flushRe();
  outputState_ = other;
  numCharRefNum(event.c);
}

void SGMLGenerator::sdata(const SdataEvent &event)
{
  flushRe();
  entityRef(event.entityName);
}

void SGMLGenerator::pi(const PiEvent &event)
{
  if (!inInstance_)
    return;
  if (outputState_ == pendingRe) {
    numCharRef(RE);		// would be moved otherwise
    outputState_ = other;
  }
  if (event.entityName.len)
    entityRef(event.entityName);
  else
    os() << "<?" << event.data << '>';
}

void SGMLGenerator::externalDataEntityRef(const ExternalDataEntityRefEvent &event)
{
  flushRe();
  entityRef(event.entity.name);
}

void SGMLGenerator::subdocEntityRef(const SubdocEntityRefEvent &event)
{
  flushRe();
  entityRef(event.entity.name);
}

void SGMLGenerator::endProlog(const EndPrologEvent &)
{
  inInstance_ = 1;
}

void SGMLGenerator::commentDecl(const CommentDeclEvent &event)
{
  if (!inInstance_)
    return;
  if (outputState_ == pendingRe) {
    numCharRef(RE);		// would be moved otherwise
    outputState_ = other;
  }
  os() << "<!";
  for (size_t i = 0; i < event.nComments; i++) {
    os() << "--" << event.comments[i] << "--";
    if (i + 1 < event.nComments)
      os() << event.seps[i];	// ensure comment declarations end with -->
  }
  os() << '>';
}

void SGMLGenerator::markedSectionStart(const MarkedSectionStartEvent &event)
{
  if (outputState_ == pendingRe) {
    numCharRef(RE);		// would be moved otherwise
    outputState_ = other;
  }
  os() << "<![";
  for (size_t i = 0; i < event.nParams; i++)
    switch (event.params[i].type) {
    case MarkedSectionStartEvent::Param::temp:
      os() << " TEMP";
      break;
    case MarkedSectionStartEvent::Param::include:
      os() << " INCLUDE";
      break;
    case MarkedSectionStartEvent::Param::rcdata:
      os() << " RCDATA";
      break;
    case MarkedSectionStartEvent::Param::cdata:
      os() << " CDATA";
      break;
    case MarkedSectionStartEvent::Param::ignore:
      os() << " IGNORE";
      break;
    case MarkedSectionStartEvent::Param::entityRef:
      os() << " %" << event.params[i].entityName << ";";
      break;
    }
  switch (event.status) {
  case MarkedSectionStartEvent::cdata:
    parseMode_ = cdataMode;
    break;
  case MarkedSectionStartEvent::rcdata:
    parseMode_ = rcdataMode;
    break;
  default:
    break;
  }
  os() << " [";
}

void SGMLGenerator::markedSectionEnd(const MarkedSectionEndEvent &)
{
  if (outputState_ == pendingRe) {
    numCharRef(RE);		// would be moved otherwise
    outputState_ = other;
  }
  os() << "]]>";
  parseMode_ = normalMode;
}

void SGMLGenerator::ignoredChars(const IgnoredCharsEvent &event)
{
  os() << event.data;
}

void SGMLGenerator::entityRef(const CharString &name)
{
  os() << '&' << name << ';';
}

void SGMLGenerator::numCharRef(Char c)
{
  const SP_NAMESPACE_SCOPE StringC *name = charEntityName(c);
  if (name && name->size())
    os() << '&' << *name << ';';
  else
    numCharRefNum(c);
}

void SGMLGenerator::numCharRefNum(unsigned long n)
{
  os() << "&#" << n << ';';
}

void SGMLGenerator::generalEntity(const GeneralEntityEvent &event)
{
  if (event.entity.isInternal
      && event.entity.text.len == 1
      && event.entity.dataType != Entity::sdata) {
    SP_NAMESPACE_SCOPE StringC *p = charEntityName(event.entity.text.ptr[0]);
    if (p)
      p->assign(event.entity.name.ptr, event.entity.name.len);
  }
}

SP_NAMESPACE_SCOPE StringC *SGMLGenerator::charEntityName(Char c)
{
  switch (c) {
  case '<':
    return &lt_;
  case '>':
    return &gt_;
  case '&':
    return &amp_;
  case '"':
    return &quot_;
  default:
    break;
  }
  return 0;
}
