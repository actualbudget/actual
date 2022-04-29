// Copyright (c) 1997 James Clark
// See the file COPYING for copying permission.

#include "config.h"
#include "sptchar.h"
#include "OutputCharStream.h"
#include "ParserApp.h"
#include "macros.h"
#include "XmlOutputEventHandler.h"
#include "SxMessages.h"

#include <stdlib.h>

#ifdef SP_NAMESPACE
using namespace SP_NAMESPACE;
#endif

static
struct {
  const ParserApp::AppChar *name;
  PackedBoolean XmlOutputEventHandler::Options::*ptr;
} outputOptionsTable[] = {
  { SP_T("nl-in-tag"), &XmlOutputEventHandler::Options::nlInTag },
  { SP_T("id"), &XmlOutputEventHandler::Options::id },
  { SP_T("notation"), &XmlOutputEventHandler::Options::notation },
  { SP_T("ndata"), &XmlOutputEventHandler::Options::ndata },
  { SP_T("cdata"), &XmlOutputEventHandler::Options::cdata },
  { SP_T("comment"), &XmlOutputEventHandler::Options::comment },
  { SP_T("lower"), &XmlOutputEventHandler::Options::lower },
  { SP_T("pi-escape"), &XmlOutputEventHandler::Options::piEscape },
  { SP_T("empty"), &XmlOutputEventHandler::Options::empty },
  { SP_T("attlist"), &XmlOutputEventHandler::Options::attlist },
  { SP_T("report-entities"), &XmlOutputEventHandler::Options::reportEnts },
  { SP_T("report-input-sources"), &XmlOutputEventHandler::Options::reportIS },
  { SP_T("expand-external"), &XmlOutputEventHandler::Options::expExt },
  { SP_T("expand-internal"), &XmlOutputEventHandler::Options::expInt },
  { SP_T("internal-decl"), &XmlOutputEventHandler::Options::intDecl },
  { SP_T("external-decl"), &XmlOutputEventHandler::Options::extDecl },
  { SP_T("sdata-as-pis"), &XmlOutputEventHandler::Options::sdataAsPi },
  { SP_T("preserve-case"), &XmlOutputEventHandler::Options::preserveCase },
  { SP_T("overwrite"), &XmlOutputEventHandler::Options::overwrite },
  { SP_T("write-outside-outdir"), &XmlOutputEventHandler::Options::writeOutsideOutDir },
};

class SxApp : public ParserApp {
public:
  SxApp();
  ErrorCountEventHandler *makeEventHandler();
  void processOption(AppChar opt, const AppChar *arg);
  int processSysid(const StringC &);
private:
  XmlOutputEventHandler::Options outputOptions_;
  StringC encodingName_;

  // These could be StringCs, which would be a lot of work (getting
  // the right encoding). It doesn't seem to me to be worth it, since
  // these strings are coming in from the OS and only being used to make
  // a file, so they should always be in the encoding that the OS
  // expects. -jphekman
  const char *outputDir_;
  const char *dtdLoc_;
};

SP_DEFINE_APP(SxApp)

SxApp::SxApp()
: ParserApp("unicode")
{
  outputCodingSystem_ = codingSystemKit_->makeCodingSystem("UTF-8", 0);
  changeOptionRegistration('x', AppChar(255));
  registerOption('x', SP_T("xml-output-option"), SxMessages::option,
                 SxMessages::xHelp);
  registerOption('d', SP_T("entity_output_location"), SxMessages::option,
		 SxMessages::xHelp);
  registerOption('l', SP_T("dtd_location"), SxMessages::option,
		 SxMessages::xHelp);
  registerInfo(SxMessages::info1);
  registerInfo(SxMessages::info2);
  registerInfo(SxMessages::info3);
  outputOptions_.nlInTag = 1;
  outputOptions_.intDecl = 1;
  outputOptions_.extDecl = 1;
  outputOptions_.expInt = 1;
  outputOptions_.expExt = 1;
  outputOptions_.overwrite = 1;
  outputOptions_.writeOutsideOutDir = 1;
  outputDir_ = NULL;
  dtdLoc_ = NULL;
}

int SxApp::processSysid(const StringC &sysid)
{
  if (outputOptions_.comment)
    options_.eventsWanted.addCommentDecls();
  if (outputOptions_.notation)
    options_.warnNotationSystemId = 1;
  if (outputOptions_.cdata)
    options_.eventsWanted.addMarkedSections();
  return ParserApp::processSysid(sysid);
}

void SxApp::processOption(AppChar opt, const AppChar *arg)
{
  switch (opt) {
  case AppChar(255):
    ParserApp::processOption('x', arg);
    break;
  case 'x':
    {
      PackedBoolean value;
      if (arg[0] == 'n' && arg[1] == 'o' && arg[2] == '-') {
	value = 0;
	arg += 3;
      }
      else
	value = 1;
      Boolean found = 0;
      for (size_t i = 0; i < SIZEOF(outputOptionsTable); i++) {
	if (tcscmp(outputOptionsTable[i].name, arg) == 0) {
	  found = 1;
	  outputOptions_.*(outputOptionsTable[i].ptr) = value;
 	  break;
	}
      }
      if (!found)
	message(SxMessages::unknownOutputOption, StringMessageArg(convertInput(arg)));
      break;
    }
  case 'b':
    {
      // Need to generate appropriate encoding declaration.
      ParserApp::processOption(opt, arg);
      if (outputCodingSystem_)
	encodingName_ = convertInput(arg);
      else
	encodingName_.resize(0);
      break;
    }
  case 'd':
    {
      outputDir_ = (const char *)arg;
      break;
    }
  case 'l':
    {
      dtdLoc_ = (const char *)arg;
      break;
    }
  default:
    ParserApp::processOption(opt, arg);
    break;
  }
}

ErrorCountEventHandler *SxApp::makeEventHandler()
{
  return new XmlOutputEventHandler(outputOptions_,
				   new RecordOutputCharStream(makeStdOut()),
				   encodingName_,
				   outputDir_,
				   dtdLoc_,
                                   entityManager(),
				   systemCharset(),
				   this);
}
