// Copyright (c) 1995, 1996 James Clark
// See the file COPYING for copying permission.

// FIXME usage message for bad -m option.

#include "config.h"
#include "SgmlParser.h"
#include "Event.h"
#include "OutputCharStream.h"
#include "ParserApp.h"
#include "Boolean.h"
#include "macros.h"
#include "SpamMessages.h"
#include "CopyEventHandler.h"
#include "InputSource.h"

#include "sptchar.h"

#include <stdlib.h>

#ifdef SP_NAMESPACE
using namespace SP_NAMESPACE;
#endif

class XCopyEventHandler : public CopyEventHandler {
public:
  XCopyEventHandler(OutputCharStream *os, unsigned normalizeFlags,
		    const StringC &outputEntity, Messenger *);
  void message(MessageEvent *);
private:
  void reportTagInSpecialMarkedSection(const Location &);
  Messenger *messenger_;
  OutputCharStream *os_;
};

static
struct {
  const ParserApp::AppChar *name;
  unsigned flag;
} normalizeTable[] = {
  { SP_T("omittag"), CopyEventHandler::normalizeOmittag },
  { SP_T("shortref"), CopyEventHandler::normalizeShortref },
  { SP_T("net"), CopyEventHandler::normalizeNet },
  { SP_T("emptytag"), CopyEventHandler::normalizeEmptytag },
  { SP_T("unclosed"), CopyEventHandler::normalizeUnclosed },
  { SP_T("attname"), CopyEventHandler::normalizeAttname },
  { SP_T("attvalue"), CopyEventHandler::normalizeAttvalue },
  { SP_T("attspec"), CopyEventHandler::normalizeAttspec },
  { SP_T("current"), CopyEventHandler::normalizeCurrent },
  { SP_T("shorttag"), CopyEventHandler::normalizeShorttag },
  { SP_T("rank"), CopyEventHandler::normalizeRank },
  { SP_T("reserved"), CopyEventHandler::normalizeReserved },
  { SP_T("ms"), CopyEventHandler::normalizeMarkedSection },
};

class SpamApp : public ParserApp {
public:
  SpamApp();
  ErrorCountEventHandler *makeEventHandler();
  void processOption(AppChar opt, const AppChar *arg);
private:
  unsigned normalizeFlags_;
  StringC outputEntity_;
  Boolean rawOutput_;
};

SP_DEFINE_APP(SpamApp)

SpamApp::SpamApp()
: rawOutput_(0), normalizeFlags_(0)
{
  options_.eventsWanted.addInstanceMarkup();
  options_.eventsWanted.addPrologMarkup();
  changeOptionRegistration('h', AppChar(255));
  registerOption('h', SP_T("hoist-omitted-tags"), SpamMessages::hHelp);
  registerOption('l', SP_T("lowercase"), SpamMessages::lHelp);
  registerOption('m', SP_T("markup-option"), SpamMessages::option, 
                 SpamMessages::mHelp);
  registerOption('o', SP_T("output-entity"), SpamMessages::name, 
                 SpamMessages::oHelp);
  registerOption('p', SP_T("output-prolog"), SpamMessages::pHelp);
  registerOption('r', SP_T("raw"), SpamMessages::rHelp);
  registerOption('x', SP_T("expand-references"), SpamMessages::xHelp);
  registerInfo(SpamMessages::info1);
  registerInfo(SpamMessages::info2);
  registerInfo(SpamMessages::info3);
}

void SpamApp::processOption(AppChar opt, const AppChar *arg)
{
  switch (opt) {
  case AppChar(255):
    ParserApp::processOption('h', arg);
    break; 
  case 'h':
    // hoist omitted tags out of entities
    normalizeFlags_ |= CopyEventHandler::normalizeOmittagHoist;
    break;
  case 'l':			// prefer lowercase
    normalizeFlags_ |= CopyEventHandler::normalizeLower;
    break;
  case 'm':
    {
      Boolean found = 0;
      for (size_t i = 0; i < SIZEOF(normalizeTable); i++)
	if (tcscmp(normalizeTable[i].name, arg) == 0) {
	  found = 1;
	  normalizeFlags_ |= normalizeTable[i].flag;
	  break;
	}
      if (!found) {
	message(SpamMessages::invalidMarkupArgument,
		StringMessageArg(convertInput(arg)));
	// usage(kit);
      }
    }
    break;
  case 'o':
    outputEntity_ = convertInput(arg);
    break;
  case 'p':
    if (normalizeFlags_ & CopyEventHandler::normalizeIncludeProlog)
      normalizeFlags_ |= CopyEventHandler::normalizeExpandProlog;
    else
      normalizeFlags_ |= CopyEventHandler::normalizeIncludeProlog;
    break;
  case 'r':
    rawOutput_ = 1;
    break;
  case 'x':
    if (normalizeFlags_ & CopyEventHandler::normalizeExpand)
      normalizeFlags_ |= CopyEventHandler::normalizeExpandAll;
    else
      normalizeFlags_ |= CopyEventHandler::normalizeExpand;
    break;
  default:
    ParserApp::processOption(opt, arg);
    break;
  }
}

ErrorCountEventHandler *SpamApp::makeEventHandler()
{
  OutputCharStream *os = makeStdOut();
  if (!rawOutput_)
    os = new RecordOutputCharStream(os);
  return new XCopyEventHandler(os, normalizeFlags_, outputEntity_, this);
}

XCopyEventHandler::XCopyEventHandler(OutputCharStream *os,
				     unsigned normalizeFlags,
				     const StringC &outputEntity,
				     Messenger *messenger)
: messenger_(messenger), os_(os),
  CopyEventHandler(os, normalizeFlags, outputEntity)
{
}

void XCopyEventHandler::message(MessageEvent *event)
{
  messenger_->dispatchMessage(event->message());
  CopyEventHandler::message(event);
}

void XCopyEventHandler::reportTagInSpecialMarkedSection(const Location &loc)
{
  messenger_->setNextLocation(loc);
  messenger_->message(SpamMessages::tagInSpecialMarkedSection);
}
