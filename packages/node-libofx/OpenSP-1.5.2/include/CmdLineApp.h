// Copyright (c) 1996 James Clark, 1999 Matthias Clasen
// See the file COPYING for copying permission.

#ifndef CmdLineApp_INCLUDED
#define CmdLineApp_INCLUDED 1

#ifdef SP_XML
#define SP_REPORTER_CLASS XMLMessageReporter
#else
#define SP_REPORTER_CLASS MessageReporter
#endif

#ifdef __GNUG__
#pragma interface
#endif

#include "MessageReporter.h"
#include "Vector.h"
#include "StringOf.h"
#include "Boolean.h"
#include "CodingSystem.h"
#include "OutputByteStream.h"
#include "OutputCharStream.h"
#include "CodingSystemKit.h"
#include "Options.h"

#ifdef SP_WIDE_SYSTEM
// for wchar_t
#include <stddef.h>
#endif

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API CmdLineApp  : public SP_REPORTER_CLASS {
public:
#ifdef SP_WIDE_SYSTEM
  typedef wchar_t AppChar;
#else
  typedef char AppChar;
#endif
  CmdLineApp(const char *requiredInternalCode = 0);
  int run(int argc, AppChar **argv);
  virtual int processOptions(int argc, AppChar **argv, int &nextArg);
  virtual void processOption(AppChar opt, const AppChar *arg);
  virtual int processArguments(int argc, AppChar **files) = 0;
  static const MessageType2 &openFileErrorMessage();
  static const MessageType2 &closeFileErrorMessage();
  void usage();
  const CodingSystem *codingSystem();
  const CodingSystem *outputCodingSystem();
  const CharsetInfo &systemCharset();
  ConstPtr<InputCodingSystemKit> inputCodingSystemKit();
  StringC convertInput(const AppChar *s);
  OutputCharStream *makeStdOut();
  OutputCharStream *makeStdErr();
protected:
  virtual void registerOption(AppChar c, const AppChar *name, 
                              const MessageType1 &doc);
  virtual void registerOption(AppChar c, const AppChar *name, 
                              const MessageFragment &arg, 
                              const MessageType1 &doc);
  virtual void changeOptionRegistration(AppChar oldc, AppChar newc);
  virtual void registerUsage(const MessageType1 &u);
  virtual void registerInfo(const MessageType1 &i, bool pre = 0);
  // This is for backwards compability. Note that the second argument is the */
  // argument name and not the long option name as above.
  virtual void registerOption(AppChar c, const AppChar* argName =0);
  virtual int init(int argc, AppChar **argv);
  void resetCodingSystemKit();
  static Boolean stringMatches(const AppChar *s, const char *key);
  const AppChar *errorFile_;
  const CodingSystem *outputCodingSystem_;
  Vector<LongOption<AppChar> > opts_;
  Vector<MessageType1> optDocs_;
  Vector<MessageFragment> optArgs_;
  Vector<MessageType1> usages_;
  Vector<MessageType1> preInfos_;
  Vector<MessageType1> infos_;
  Boolean internalCharsetIsDocCharset_;
  Ptr<CodingSystemKit> codingSystemKit_;
  enum {
    normalAction,
    usageAction
  };
  int action_;
private:
  Boolean getMessageText(const MessageFragment &, StringC &);
  void initCodingSystem(const char *requiredInternalCode);
  const CodingSystem *lookupCodingSystem(const AppChar *codingName);
  const CodingSystem *codingSystem_;
};

#ifdef SP_WIDE_SYSTEM
#define SP_DEFINE_APP(CLASS) \
  extern "C" \
  wmain(int argc, wchar_t **argv) { CLASS app; return app.run(argc, argv); }
#else
#define SP_DEFINE_APP(CLASS) \
 extern "C" \
 int main(int argc, char **argv) { CLASS app; return app.run(argc, argv); }
#endif

inline
const CodingSystem *CmdLineApp::codingSystem()
{
  return codingSystem_;
}

inline
const CodingSystem *CmdLineApp::outputCodingSystem()
{
  return outputCodingSystem_;
}

inline
ConstPtr<InputCodingSystemKit> CmdLineApp::inputCodingSystemKit()
{
  return codingSystemKit_.pointer();
}

inline
const CharsetInfo &CmdLineApp::systemCharset()
{
  return codingSystemKit_->systemCharset();
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not CmdLineApp_INCLUDED */
