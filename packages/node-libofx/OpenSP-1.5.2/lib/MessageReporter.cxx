// Copyright (c) 1994, 1995 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif

#include "splib.h"
#include "MessageReporter.h"
#include "MessageReporterMessages.h"
#include "ExtendEntityManager.h"
#include "StorageManager.h"
#include "macros.h"

#include <string.h>


#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

const OutputCharStream::Newline nl = OutputCharStream::newline;

MessageReporter::MessageReporter(OutputCharStream *os)
: os_(os), options_(0)
{
}
XMLMessageReporter::XMLMessageReporter(OutputCharStream* os) :
	MessageReporter(os) , id(0) , msgmode(SP_MESSAGES_TRADITIONAL) {
  char* fmt = getenv("SP_MESSAGE_FORMAT") ;
  if ( fmt )
    if ( !strcmp(fmt, "XML") )
      msgmode = SP_MESSAGES_XML ;
    else if ( !strcmp(fmt, "NONE") )
      msgmode = SP_MESSAGES_NONE ;
}

MessageReporter::~MessageReporter()
{
  delete os_;
}

void MessageReporter::setMessageStream(OutputCharStream *os)
{
  if (os != os_) {
    delete os_;
    os_ = os;
  }
}

void MessageReporter::addOption(Option option)
{
  options_ |= option;
}
void XMLMessageReporter::dispatchMessage(const Message& message) {
  switch ( msgmode ) {
    case SP_MESSAGES_TRADITIONAL:
      MessageReporter::dispatchMessage(message) ;
    case SP_MESSAGES_NONE:
      return ;
    case SP_MESSAGES_XML:
      break ;
  }
  Offset off ;

  const ExternalInfo *externalInfo = locationHeader(message.loc, off);

  os() << "<sp:message sp:id=\"mid" << id++ << '"' ;
  if (externalInfo)
    printLocation(externalInfo, off);
  switch (message.type->severity()) {
    case MessageType::info:
      XMLformatFragment(MessageReporterMessages::infoTag, os());
      break;
    case MessageType::warning:
      XMLformatFragment(MessageReporterMessages::warningTag, os());
      break;
    case MessageType::quantityError:
      XMLformatFragment(MessageReporterMessages::quantityErrorTag, os());
      break;
    case MessageType::idrefError:
      XMLformatFragment(MessageReporterMessages::idrefErrorTag, os());
      break;
    case MessageType::error:
      XMLformatFragment(MessageReporterMessages::errorTag, os());
      break;
    default:
      CANNOT_HAPPEN();
  }
  formatMessage(*message.type, message.args, os());

  if (options_ & openEntities)
    showOpenEntities(message.loc, off) ;

  if ((options_ & clauses) && message.type->clauses() != 0) {
    os() << "\n  <sp:clause> " << message.type->clauses()
	<< " </sp:clause>" ;
  }
  if (!message.auxLoc.origin().isNull()) {
    os() << "\n  <sp:reference " ;
    Offset off;
    const ExternalInfo *externalInfo = locationHeader(message.auxLoc, off);
    if (externalInfo) {
      printLocation(externalInfo, off);
    }
    formatMessage(message.type->auxFragment(), message.args, os());
    os() << "\n  </sp:reference>" ;
  }
  if ((options_ & openElements) && message.openElementInfo.size() > 0) {
    formatOpenElements(message.openElementInfo, os());
  }
  os() << "\n</sp:message>\n" ;
  os().flush();
}
void MessageReporter::dispatchMessage(const Message &message)
{
  Offset off;
  const ExternalInfo *externalInfo = locationHeader(message.loc, off);
  if (programName_.size())
    os() << programName_ << ':';
  if (externalInfo) {
    printLocation(externalInfo, off);
    os() << ':';
  }
  if (options_ & messageNumbers)
    os() << (unsigned long)message.type->module() << "." 
      << (unsigned long)message.type->number() << ":";
  switch (message.type->severity()) {
  case MessageType::info:
    formatFragment(MessageReporterMessages::infoTag, os());
    break;
  case MessageType::warning:
    formatFragment(MessageReporterMessages::warningTag, os());
    break;
  case MessageType::quantityError:
    formatFragment(MessageReporterMessages::quantityErrorTag, os());
    break;
  case MessageType::idrefError:
    formatFragment(MessageReporterMessages::idrefErrorTag, os());
    break;
  case MessageType::error:
    formatFragment(MessageReporterMessages::errorTag, os());
    break;
  default:
    CANNOT_HAPPEN();
  }
  os() << ": ";
  formatMessage(*message.type, message.args, os());
  os() << nl;
  if ((options_ & clauses) && message.type->clauses() != 0) {
    if (programName_.size())
      os() << programName_ << ':';
    if (externalInfo) {
      printLocation(externalInfo, off);
      os() << ": ";
    }
    formatFragment(MessageReporterMessages::relevantClauses, os());
    os() << " " << message.type->clauses() << nl;
  }
  if (!message.auxLoc.origin().isNull()) {
    Offset off;
    const ExternalInfo *externalInfo = locationHeader(message.auxLoc, off);
    if (programName_.size())
      os() << programName_ << ':';
    if (externalInfo) {
      printLocation(externalInfo, off);
      os() << ": ";
    }
    formatMessage(message.type->auxFragment(), message.args, os());
    os() << nl;
  }
  if ((options_ & openElements) && message.openElementInfo.size() > 0) {
    if (programName_.size())
      os() << programName_ << ':';
    if (externalInfo) {
      printLocation(externalInfo, off);
      os() << ": ";
    }
    formatFragment(MessageReporterMessages::openElements, os());
    os() << ':';
    formatOpenElements(message.openElementInfo, os());
    os() << nl;
  }
  os().flush();
}

// Note this is written so as not to change any reference counts.

const ExternalInfo *MessageReporter::locationHeader(const Location &loc,
						    Offset &off)
{
  return locationHeader(loc.origin().pointer(), loc.index(), off);
}

const ExternalInfo* XMLMessageReporter::locationHeader(
	const Origin *origin, Index index, Offset &off) {
  switch ( msgmode ) {
    case SP_MESSAGES_TRADITIONAL:
      return MessageReporter::locationHeader(origin, index, off) ;
    case SP_MESSAGES_NONE:
      return 0 ;
    case SP_MESSAGES_XML:
      break ;
  }
// take out the context printing 'cos we'll do that later
    while (origin) {
      const ExternalInfo *externalInfo = origin->externalInfo();
      if (externalInfo) {
  	off = origin->startOffset(index);
	return externalInfo;
      }
      const Location &loc = origin->parent();
      if (loc.origin().isNull()) {
	if (!origin->defLocation(origin->startOffset(index), origin, index))
	  break;
      }
      else {
	if (origin->asEntityOrigin())
	  index = loc.index() + origin->refLength();
	else
	  // Must be re-running the parser over something using
	  // something like PiAttspecParser.
	  index += loc.index();
	origin = loc.origin().pointer();
      }
    }
  return 0 ;
}
void XMLMessageReporter::showOpenEntities(
	const Origin *origin, Index index, Offset &off) {
/* this function is XMLMessageReporter-only */
  while (origin) {
   if (origin->entityName() || origin->parent().origin().isNull()) {
      Offset parentOff;
      const Location &parentLoc = origin->parent();
      const ExternalInfo *parentInfo
	    = locationHeader(parentLoc.origin().pointer(),
		     parentLoc.index() + origin->refLength(), parentOff);
      if ( parentInfo ) {
	os() << "\n  <sp:context" ;
	printLocation(parentInfo, parentOff);
	os() << "\n	sp:entity=\"" << *origin->entityName()
		<< "\" />" ;
      }
      break ;
    } else {
	const Location &loc = origin->parent();
	if (origin->asEntityOrigin())
	  index = loc.index() + origin->refLength();
	else
	  // Must be re-running the parser over something using
	  // something like PiAttspecParser.
	  index += loc.index();
	origin = loc.origin().pointer();
    }
  }
}
const ExternalInfo *MessageReporter::locationHeader(const Origin *origin,
						    Index index,
						    Offset &off)
{
   if (!(options_ & openEntities)) {
    while (origin) {
      const ExternalInfo *externalInfo = origin->externalInfo();
      if (externalInfo) {
  	off = origin->startOffset(index);
	return externalInfo;
      }
      const Location &loc = origin->parent();
      if (loc.origin().isNull()) {
	if (!origin->defLocation(origin->startOffset(index), origin, index))
	  break;
      }
      else {
	if (origin->asEntityOrigin())
	  index = loc.index() + origin->refLength();
	else
	  // Must be re-running the parser over something using
	  // something like PiAttspecParser.
	  index += loc.index();
	origin = loc.origin().pointer();
      }
    }
  }
  else {
    Boolean doneHeader = 0;
    while (origin) {
      if (origin->entityName() || origin->parent().origin().isNull()) {
	if (!doneHeader) {
	  Offset parentOff;
	  const Location &parentLoc = origin->parent();
	  const ExternalInfo *parentInfo
	    = locationHeader(parentLoc.origin().pointer(),
			     parentLoc.index() + origin->refLength(),
			     parentOff);
	  if (parentInfo) {
	    StringC text;
	    if (getMessageText(origin->entityName()
			       ? MessageReporterMessages::inNamedEntity
			       : MessageReporterMessages::inUnnamedEntity,
				text)) {
	      for (size_t i = 0; i < text.size(); i++) {
		if (text[i] == '%') {
		  if (i + 1 < text.size()) {
		    i++;
		    if (text[i] == '1')
		      os() << *origin->entityName();
		    else if (text[i] == '2')
		      printLocation(parentInfo, parentOff);
		    else if (text[i] >= '3' && text[i] <= '9')
		      ;
		    else
		      os().put(text[i]);
		  }
		}
		else
		  os().put(text[i]);
	      }
	      os() << nl;
	    }
	  }
	  doneHeader = 1;
	}
	off = origin->startOffset(index);
	const ExternalInfo *externalInfo = origin->externalInfo();
	if (externalInfo)
	  return externalInfo;
	if (!origin->defLocation(off, origin, index))
	  break;
      }
      else {
	const Location &loc = origin->parent();
	if (origin->asEntityOrigin())
	  index = loc.index() + origin->refLength();
	else
	  // Must be re-running the parser over something using
	  // something like PiAttspecParser.
	  index += loc.index();
	origin = loc.origin().pointer();
      }
    }
  }
  return 0;
}

void XMLMessageReporter::printLocation(const ExternalInfo *externalInfo,
				    Offset off)
{
  switch ( msgmode ) {
    case SP_MESSAGES_TRADITIONAL:
	MessageReporter::printLocation(externalInfo, off) ;
    case SP_MESSAGES_NONE:
	return ;
    case SP_MESSAGES_XML:
	break ;
  }
  if (!externalInfo) {
    return;
  }
  StorageObjectLocation soLoc;
  if (!ExtendEntityManager::externalize(externalInfo, off, soLoc)) {
    return;
  }
/* Ugly hack to suppress full pathnames for local files
	on general principles for security for Site Valet

  Since jjc's String class is rather primitive, we have to do the work here
*/
  if ( soLoc.actualStorageId[0] == '/' ) {
    StringC filename ;
    StringC nullname ;
    for (int i=0; i<soLoc.actualStorageId.size(); ++i) {
      if ( soLoc.actualStorageId[i] == '/' )
	filename = nullname ;
      else
	filename += soLoc.actualStorageId[i] ;
    }
    os() << "\n	sp:location=\"" << filename << '"' ;
  } else {
    os() << "\n	sp:location=\"" << soLoc.actualStorageId << '"' ;
  }
  if (soLoc.lineNumber == (unsigned long)-1) {
    formatFragment(MessageReporterMessages::offset, os());
    os() << soLoc.storageObjectOffset;
  } else {
    os() << "\n	sp:line=\"" << soLoc.lineNumber << '"' ;
    if (soLoc.columnNumber != 0 && soLoc.columnNumber != (unsigned long)-1)
      os() << "\n	sp:column=\"" << soLoc.columnNumber - 1 << '"' ;
  }
}
void MessageReporter::printLocation(const ExternalInfo *externalInfo,
				    Offset off)
{
  if (!externalInfo) {
    formatFragment(MessageReporterMessages::invalidLocation, os());
    return;
  }
  StorageObjectLocation soLoc;
  if (!ExtendEntityManager::externalize(externalInfo, off, soLoc)) {
    formatFragment(MessageReporterMessages::invalidLocation, os());
    return;
  }
  
  if (strcmp(soLoc.storageObjectSpec->storageManager->type(), "OSFILE") != 0)
    os() << '<' << soLoc.storageObjectSpec->storageManager->type() << '>';
  os() << soLoc.actualStorageId;
  if (soLoc.lineNumber == (unsigned long)-1) {
    os() << ": ";
    formatFragment(MessageReporterMessages::offset, os());
    os() << soLoc.storageObjectOffset;
  }
  else {
    os() << ':' << soLoc.lineNumber;
    if (soLoc.columnNumber != 0 && soLoc.columnNumber != (unsigned long)-1)
      os() << ':' << soLoc.columnNumber - 1;
  }
#if 0
  if (soLoc.byteIndex != (unsigned long)-1)
    os() << ':' << soLoc.byteIndex;
#endif
}

Boolean MessageReporter::getMessageText(const MessageFragment &frag,
					StringC &str)
{
  const char *p = frag.text();
  if (!p)
    return 0;
  str.resize(0);
  for (; *p; p++)
    str += Char((unsigned char)*p);
  return 1;
}
Boolean XMLMessageReporter::XMLformatFragment(const MessageFragment &frag,
	OutputCharStream &os) {
/* This function is XMLMessageReporter only */
  switch ( msgmode ) {
    case SP_MESSAGES_TRADITIONAL:
	return MessageReporter::formatFragment(frag, os) ;
    case SP_MESSAGES_NONE:
	return 1 ;
    case SP_MESSAGES_XML:
	break ;
  }
  StringC text;
  if (!getMessageText(frag, text))
	return 0 ;
  os << "\n	sp:severity=\"" << text << '"' ;
  return 1 ;
}
void XMLMessageReporter::formatMessage(const MessageFragment &frag,
	const Vector<CopyOwner<MessageArg> > &args,
	OutputCharStream &os, bool noquote) {
  switch ( msgmode ) {
    case SP_MESSAGES_TRADITIONAL:
	MessageReporter::formatMessage(frag, args, os, noquote) ;
    case SP_MESSAGES_NONE:
	return ;
    case SP_MESSAGES_XML:
	break ;
  }
  StringC text;
  if (!getMessageText(frag, text)) {
//    XMLformatFragment(MessageFormatterMessages::invalidMessage, os);
    os << "\n>(Invalid Message)\n" ;
    return;
  }
  os << "\n>\n" ;
  Builder builder(this, os, noquote || (text.size() == 2));
  size_t i = 0;
  while (i < text.size()) {
    if (text[i] == '%') {
      i++;
      if (i >= text.size())
        break;
      if (text[i] >= '1' && text[i] <= '9') {
        if (unsigned(text[i] - '1') < args.size())
          args[text[i] - '1']->append(builder);
      }
      else
        os.put(text[i]);
      i++;
    }
    else {
      os.put(text[i]);
      i++;
    }
  }
}
void XMLMessageReporter::formatOpenElements(
	const Vector<OpenElementInfo> &openElementInfo ,
	OutputCharStream &os) {
  switch ( msgmode ) {
    case SP_MESSAGES_TRADITIONAL:
	MessageReporter::formatOpenElements(openElementInfo, os) ;
    case SP_MESSAGES_NONE:
	return ;
    case SP_MESSAGES_XML:
	break ;
  }
  unsigned nOpenElements = openElementInfo.size();
  for (unsigned i = 0;; i++) {
    if (i > 0
      && (i == nOpenElements || openElementInfo[i].included)) {
      // describe last match in previous open element
      const OpenElementInfo &prevInfo = openElementInfo[i - 1];
      if (prevInfo.matchType.size() != 0) {
	os << "\n  <sp:prevelement" ;
	int n = prevInfo.matchIndex ;
	if (n != 0)
	  os << " sp:matchindex=\"" << n << '"' ;
	os << "> " << prevInfo.matchType;
	os << " </sp:prevelement>" ;
      }
    }
    if (i == nOpenElements)
      break;
    const OpenElementInfo &e = openElementInfo[i];
    os << "\n  <sp:openelement" ;
    if (i > 0 && !e.included) {
      unsigned long n = openElementInfo[i - 1].matchIndex;
      if (n != 0)
	os << " sp:matchindex=\"" << n << '"' ;
    }
    os << "> " << e.gi << " </sp:openelement>" ;
  }
}


#ifdef SP_NAMESPACE
}
#endif
