// Copyright (c) 1996 James Clark
// See the file COPYING for copying permission.

#include "config.h"
#include "sptchar.h"
#include "ParserApp.h"
#include "GenericEventHandler.h"
#include "SGMLGenerator.h"
#include "SgmlnormMessages.h"

#ifdef SP_NAMESPACE
using namespace SP_NAMESPACE;
#endif

class SGMLGeneratorEH : public SGMLGenerator, public GenericEventHandler {
public:
  SGMLGeneratorEH(OutputCharStream *, unsigned genFlags, Messenger *);
  void reportMessage(const Message &msg, StringC &);
private:
  Messenger *mgr_;
};

class SgmlnormApp : public ParserApp {
public:
  SgmlnormApp();
  void processOption(AppChar opt, const AppChar *arg);
  ErrorCountEventHandler *makeEventHandler();
private:
  unsigned genFlags_;
  Boolean rawOutput_;
};

SP_DEFINE_APP(SgmlnormApp)

SgmlnormApp::SgmlnormApp()
: rawOutput_(0), genFlags_(0)
{
  changeOptionRegistration('n', AppChar(255));
  registerOption('d', SP_T("dtd"), SgmlnormMessages::dHelp);
  registerOption('m', SP_T("marked-sections"), SgmlnormMessages::mHelp);
  registerOption('n', SP_T("comments"), SgmlnormMessages::nHelp);
  registerOption('r', SP_T("raw"), SgmlnormMessages::rHelp);
  registerInfo(SgmlnormMessages::info1);
  registerInfo(SgmlnormMessages::info2);
  registerInfo(SgmlnormMessages::info3);
}

void SgmlnormApp::processOption(AppChar opt, const AppChar *arg)
{
  switch (opt) {
  case AppChar(255):
    ParserApp::processOption('n', arg);
    break;
  case 'd':
    genFlags_ |= SGMLGenerator::generateDtd;
    break;
  case 'm':
    options_.eventsWanted.addMarkedSections();
    break;
  case 'n':
    options_.eventsWanted.addCommentDecls();
    break;
  case 'r':
    rawOutput_ = 1;
    break;
  default:
    ParserApp::processOption(opt, arg);
    break;
  }
}

ErrorCountEventHandler *SgmlnormApp::makeEventHandler()
{
  OutputCharStream *os = makeStdOut();
  if (!rawOutput_)
    os = new RecordOutputCharStream(os);
  return new SGMLGeneratorEH(os, genFlags_, this);
}

SGMLGeneratorEH::SGMLGeneratorEH(OutputCharStream *os, unsigned genFlags,
				 Messenger *mgr)
: SGMLGenerator(os, genFlags), GenericEventHandler(*this, 1), mgr_(mgr)
{
}

void SGMLGeneratorEH::reportMessage(const Message &msg, StringC &)
{
  mgr_->dispatchMessage(msg);
}
