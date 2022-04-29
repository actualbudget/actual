// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef Nsgmls_INCLUDED
#define Nsgmls_INCLUDED 1

#include "ParserApp.h"
#include "Boolean.h"

#ifdef SP_NAMESPACE
using namespace SP_NAMESPACE;
#endif

class SgmlsEventHander;

class NsgmlsApp : public ParserApp {
public:
  NsgmlsApp();
  int processArguments(int argc, AppChar **argv);
  ErrorCountEventHandler *makeEventHandler();
  void processOption(AppChar opt, const AppChar *arg);
  void allLinkTypesActivated();

  typedef struct {
    // Qualifier works around CodeWarrior bug
    const CmdLineApp::AppChar *name;
    const unsigned flag;
  } OptionFlags;
  static const OptionFlags outputOptions[];

private:
  Boolean suppressOutput_;
  Boolean prologOnly_;
  unsigned outputFlags_;
  String<AppChar> rastFile_;
  const AppChar *rastOption_;
  Boolean batchMode_;
};

#endif
