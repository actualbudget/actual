// Copyright (c) 1996 James Clark
// See the file COPYING for copying permission.

#ifndef ParserApp_INCLUDED
#define ParserApp_INCLUDED 1

#ifdef __GNUG__
#pragma interface
#endif

#include "SgmlParser.h"
#include "ParserOptions.h"
#include "EntityApp.h"
#include "StringC.h"
#include "ErrorCountEventHandler.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API ParserApp : public EntityApp {
public:
  ParserApp(const char *requiredInternalCode = 0);
  void processOption(AppChar opt, const AppChar *arg);
  int processSysid(const StringC &);
  virtual ErrorCountEventHandler *makeEventHandler() = 0;
  Boolean enableWarning(const AppChar *s);
  void initParser(const StringC &sysid);
  SgmlParser &parser();
  // This calls the ArcEngine if the options have enabled that.
  void parseAll(SgmlParser &, EventHandler &,
		const volatile sig_atomic_t *cancelPtr);
  virtual void allLinkTypesActivated();
protected:
  virtual int generateEvents(ErrorCountEventHandler *);
  ParserOptions options_;
  SgmlParser parser_;
  unsigned errorLimit_;
  Vector<StringC> arcNames_;
  Vector<const AppChar *> activeLinkTypes_;
};

inline
SgmlParser &ParserApp::parser()
{
  return parser_;
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not ParserApp_INCLUDED */
